// rag-ingest-agent — H-002: verify the declared MIME type against the file's
// magic bytes before we trust it for parsing. A client-controlled mimetype is
// not sufficient; mismatched content (e.g. a zip renamed to .pdf) can steer
// parsers into unsafe code paths.
//
// We validate only the formats the ingestion pipeline actually supports:
// plain text / markdown, PDF, DOCX (PK zip container). Everything else is
// rejected by assertMimeMatchesMagic.

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UTF16_LE_BOM = Buffer.from([0xff, 0xfe]);
const UTF16_BE_BOM = Buffer.from([0xfe, 0xff]);

/**
 * AI-02: Decide whether the buffer is plausibly text in any common encoding
 * (UTF-8, UTF-16 LE/BE, or ASCII). The previous implementation only accepted
 * 7-bit printable ASCII in the first 512 bytes, which rejected legitimate
 * UTF-8 documents containing accented characters, em-dashes, smart quotes,
 * BOMs, or any non-Latin script.
 *
 * Strategy:
 *   1. Recognise BOMs as a strong positive signal.
 *   2. Reject buffers containing NUL bytes outside a UTF-16 pattern (a
 *      reliable binary indicator).
 *   3. Use Node's built-in `TextDecoder('utf-8', { fatal: true })` to verify
 *      UTF-8 well-formedness on a 4 KiB sample. Truncate at the sample edge
 *      so a multi-byte sequence split mid-character does not cause a false
 *      negative.
 *   4. Reject if the U+FFFD replacement-character ratio in a tolerant decode
 *      exceeds 1% — a stronger signal of true binary content than ASCII-only.
 */
function isLikelyText(buf: Buffer): boolean {
  if (buf.length === 0) return true;

  if (buf.subarray(0, 3).equals(UTF8_BOM)) return true;
  if (buf.subarray(0, 2).equals(UTF16_LE_BOM)) return true;
  if (buf.subarray(0, 2).equals(UTF16_BE_BOM)) return true;

  const sample = buf.subarray(0, Math.min(4096, buf.length));

  // Detect UTF-16 without BOM by looking for the alternating-zero pattern
  // dominant in Latin-script UTF-16 text. Accept only when the pattern is
  // overwhelming so we do not misclassify binaries that happen to have NULs.
  const halfLen = Math.floor(sample.length / 2);
  if (halfLen >= 16) {
    let leZeroes = 0;
    let beZeroes = 0;
    for (let i = 0; i < halfLen; i += 1) {
      if (sample[i * 2 + 1] === 0x00) leZeroes += 1;
      if (sample[i * 2] === 0x00) beZeroes += 1;
    }
    if (leZeroes / halfLen > 0.9 || beZeroes / halfLen > 0.9) return true;
  }

  // Hard NUL guard: a real UTF-8 / ASCII text file should not contain raw
  // NUL bytes; finding even one strongly indicates binary content.
  if (sample.includes(0x00)) return false;

  // Trim back to the last byte that cannot be the start of a multi-byte
  // sequence so a split codepoint at the sample edge is not flagged as
  // malformed UTF-8 by the strict decoder.
  let truncate = sample.length;
  while (truncate > 0) {
    const b = sample[truncate - 1] ?? 0;
    if ((b & 0x80) === 0x00) break; // ASCII byte, safe boundary
    if ((b & 0xc0) === 0xc0) {
      // Multi-byte START byte at the very end — drop it.
      truncate -= 1;
      break;
    }
    truncate -= 1;
  }
  const safeSample = sample.subarray(0, truncate);

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(safeSample);
    return true;
  } catch {
    // Fall through to replacement-ratio scoring — handles legacy single-byte
    // encodings (Latin-1, Windows-1252) that are still plausibly "text".
  }
  const lossy = new TextDecoder('utf-8', { fatal: false }).decode(safeSample);
  let replacements = 0;
  for (const ch of lossy) {
    if (ch === '\uFFFD') replacements += 1;
  }
  return lossy.length > 0 && replacements / lossy.length < 0.01;
}

function startsWith(buf: Buffer, magic: Buffer): boolean {
  if (buf.length < magic.length) return false;
  for (let i = 0; i < magic.length; i += 1) {
    if (buf[i] !== magic[i]) return false;
  }
  return true;
}

export function sniffMime(buf: Buffer): 'pdf' | 'zip' | 'text' | 'unknown' {
  if (startsWith(buf, PDF_MAGIC)) return 'pdf';
  if (startsWith(buf, ZIP_MAGIC)) return 'zip';
  if (isLikelyText(buf)) return 'text';
  return 'unknown';
}

/**
 * Throws if the declared mimetype/filename disagrees with the file's magic
 * bytes. Returns silently on match.
 */
export function assertMimeMatchesMagic(buf: Buffer, declaredMime: string, filename: string): void {
  const sniff = sniffMime(buf);
  const lower = filename.toLowerCase();
  const saysPdf = declaredMime === 'application/pdf' || lower.endsWith('.pdf');
  const saysDocx =
    declaredMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx');
  const saysText =
    declaredMime.startsWith('text/') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    declaredMime === 'text/markdown';

  if (saysPdf && sniff !== 'pdf') {
    throw new Error('File content does not match application/pdf');
  }
  if (saysDocx && sniff !== 'zip') {
    throw new Error('File content does not match .docx (expected zip container)');
  }
  if (saysText && sniff !== 'text') {
    throw new Error('File content is not plain text');
  }
  if (!saysPdf && !saysDocx && !saysText) {
    throw new Error(`Unsupported mimetype: ${declaredMime}`);
  }
}

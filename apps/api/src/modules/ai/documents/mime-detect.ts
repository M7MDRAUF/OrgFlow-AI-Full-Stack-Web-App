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

function isAscii(buf: Buffer): boolean {
  // Treat as text if the first 512 bytes are all printable / whitespace ASCII.
  const sample = buf.subarray(0, Math.min(512, buf.length));
  for (const byte of sample) {
    const isPrintable = byte >= 0x20 && byte <= 0x7e;
    const isWhitespace = byte === 0x09 || byte === 0x0a || byte === 0x0d;
    if (!isPrintable && !isWhitespace) return false;
  }
  return true;
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
  if (isAscii(buf)) return 'text';
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

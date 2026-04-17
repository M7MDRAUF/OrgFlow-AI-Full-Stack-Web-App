// rag-ingest-agent — Text extraction from uploaded buffers.
// Supports plain text (.txt), markdown (.md), and PDF (.pdf).
// Non-text formats fail fast with a clear error.

interface ParseOutput {
  text: string;
}

function decodeUtf8(buffer: Buffer): string {
  return buffer.toString('utf8');
}

async function parsePdf(buffer: Buffer): Promise<string> {
  // Dynamic import so missing optional dependency fails only at runtime for PDFs.
  const mod = (await import('pdf-parse').catch(() => null)) as {
    default: (buf: Buffer) => Promise<{ text: string }>;
  } | null;
  if (mod === null) {
    throw new Error('PDF support requires the pdf-parse package');
  }
  const result = await mod.default(buffer);
  return result.text;
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ParseOutput> {
  const lowerName = filename.toLowerCase();
  const isMarkdown = mimeType === 'text/markdown' || lowerName.endsWith('.md');
  const isText = mimeType.startsWith('text/') || lowerName.endsWith('.txt');
  const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf');

  if (isPdf) {
    const text = await parsePdf(buffer);
    return { text };
  }
  if (isMarkdown || isText) {
    return { text: decodeUtf8(buffer) };
  }
  throw new Error(`Unsupported file type: ${mimeType || filename}`);
}

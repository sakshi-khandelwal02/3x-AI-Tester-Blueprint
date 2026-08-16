const SUPPORTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt"] as const;

const MIME_TO_EXT: Record<string, SupportedResumeExtension> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
};

export type SupportedResumeExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function getFileExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export function resolveResumeExtension(filename: string, mimeType?: string): string {
  const fromName = getFileExtension(filename);
  if (SUPPORTED_EXTENSIONS.includes(fromName as SupportedResumeExtension)) return fromName;
  if (mimeType && MIME_TO_EXT[mimeType]) return MIME_TO_EXT[mimeType];
  return fromName;
}

export function isSupportedResumeFile(filename: string, mimeType?: string): boolean {
  const ext = resolveResumeExtension(filename, mimeType);
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedResumeExtension);
}

export async function extractTextFromResumeFile(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const ext = resolveResumeExtension(filename, mimeType);

  switch (ext) {
    case ".pdf":
      return extractFromPdf(buffer);
    case ".docx":
      return extractFromDocx(buffer);
    case ".doc":
      return extractFromDoc(buffer);
    case ".txt":
      return buffer.toString("utf-8");
    default:
      throw new Error(
        `Unsupported file type "${ext || "unknown"}". Please upload PDF, Word (.doc/.docx), or .txt`
      );
  }
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (
    data: Buffer
  ) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text.trim();
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

async function extractFromDoc(buffer: Buffer): Promise<string> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  return doc.getBody().trim();
}

export const SUPPORTED_RESUME_FORMATS_LABEL = "PDF, Word (.doc, .docx), or .txt";

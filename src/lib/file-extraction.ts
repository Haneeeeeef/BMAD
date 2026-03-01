/**
 * File Extraction Utilities
 * Converts uploaded files to markdown for OpenClaw indexing
 */

export type SupportedFileType = "pdf" | "docx" | "xlsx" | "image" | "markdown" | "text"

export interface ExtractedFile {
  filename: string
  type: SupportedFileType
  content: string
  metadata: {
    pages?: number
    words?: number
    extractedAt: number
  }
}

/**
 * Detect file type from extension
 */
export function getFileType(filename: string): SupportedFileType | null {
  const ext = filename.split(".").pop()?.toLowerCase()

  switch (ext) {
    case "pdf":
      return "pdf"
    case "docx":
    case "doc":
      return "docx"
    case "xlsx":
    case "xls":
      return "xlsx"
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return "image"
    case "md":
    case "markdown":
      return "markdown"
    case "txt":
      return "text"
    default:
      return null
  }
}

/**
 * Get accepted file types for upload input
 */
export const ACCEPTED_FILE_TYPES = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".md",
  ".txt",
].join(",")

/**
 * Max file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const type = getFileType(file.name)

  if (!type) {
    return { valid: false, error: `Unsupported file type: ${file.name}` }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${file.name} (max 10MB)` }
  }

  return { valid: true }
}

/**
 * Convert extracted content to markdown format
 */
export function toMarkdown(extracted: ExtractedFile): string {
  const header = `# ${extracted.filename}

> Extracted: ${new Date(extracted.metadata.extractedAt).toISOString()}
> Type: ${extracted.type}${extracted.metadata.pages ? ` | Pages: ${extracted.metadata.pages}` : ""}${extracted.metadata.words ? ` | Words: ${extracted.metadata.words}` : ""}

---

`
  return header + extracted.content
}

/**
 * Generate a safe filename for storage
 */
export function safeFilename(original: string): string {
  return original
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

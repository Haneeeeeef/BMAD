// Context generation utilities for OpenClaw memory integration
import type { ExtractedFile } from "./file-extraction"

/**
 * Generate sources-index.md content
 * Lists all uploaded files with their types and word counts
 */
export function generateSourcesIndex(files: ExtractedFile[]): string {
  if (files.length === 0) {
    return "# Source Documents\n\nNo source documents uploaded yet.\n"
  }

  const lines = [
    "# Source Documents",
    "",
    `> ${files.length} document${files.length > 1 ? "s" : ""} uploaded`,
    "",
    "## Files",
    "",
    "| File | Type | Words | Extracted |",
    "|------|------|-------|-----------|",
  ]

  for (const file of files) {
    const words = file.metadata.words?.toLocaleString() || "—"
    const extracted = new Date(file.metadata.extractedAt).toLocaleDateString()
    lines.push(`| ${file.filename} | ${file.type} | ${words} | ${extracted} |`)
  }

  lines.push("")
  lines.push("## Summaries")
  lines.push("")

  for (const file of files) {
    lines.push(`### ${file.filename}`)
    lines.push("")

    // Generate a brief summary (first 500 chars or so)
    const preview = file.content.slice(0, 500).trim()
    if (preview.length < file.content.length) {
      lines.push(`${preview}...`)
    } else {
      lines.push(preview)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Generate context.md content
 * Core working context that Jarvis always loads
 */
export function generateContext(
  projectName: string,
  description: string,
  files: ExtractedFile[]
): string {
  const lines = [
    `# ${projectName || "Project"} Context`,
    "",
    "## Project Description",
    "",
    description || "No description provided.",
    "",
  ]

  if (files.length > 0) {
    lines.push("## Source Materials")
    lines.push("")
    lines.push(`${files.length} source document${files.length > 1 ? "s" : ""} provided:`)
    lines.push("")

    for (const file of files) {
      const words = file.metadata.words ? ` (${file.metadata.words.toLocaleString()} words)` : ""
      lines.push(`- **${file.filename}**${words}`)
    }

    lines.push("")
    lines.push("See `sources-index.md` for full content and summaries.")
    lines.push("")
  }

  lines.push("## Working Notes")
  lines.push("")
  lines.push("_This section will be updated as the project progresses._")
  lines.push("")

  return lines.join("\n")
}

/**
 * Generate individual source file as markdown
 * For storing in memory/sources/ folder
 */
export function generateSourceMarkdown(file: ExtractedFile): string {
  const lines = [
    `# ${file.filename}`,
    "",
    `> Type: ${file.type}`,
  ]

  if (file.metadata.words) {
    lines.push(`> Words: ${file.metadata.words.toLocaleString()}`)
  }
  if (file.metadata.pages) {
    lines.push(`> Pages: ${file.metadata.pages}`)
  }

  lines.push(`> Extracted: ${new Date(file.metadata.extractedAt).toISOString()}`)
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push(file.content)
  lines.push("")

  return lines.join("\n")
}

/**
 * Convert filename to safe markdown filename
 */
export function toSafeFilename(filename: string): string {
  // Remove extension, convert to lowercase, replace spaces with dashes
  const base = filename.replace(/\.[^.]+$/, "")
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) + ".md"
}

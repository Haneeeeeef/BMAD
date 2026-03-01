/**
 * Shared chat content parsing utilities.
 * Used by both ChatMessage and WorkspaceChatMessage.
 */

/** Parse out OpenClaw context injection blocks from assistant messages */
export function parseOpenClawContent(content: string): string {
  if (!content) return ""
  if (content.includes("[Chat messages since your last reply")) {
    const currentMatch = content.match(/\[Current message - respond to this\]\s*([\s\S]*)/i)
    if (currentMatch) return fixSentenceSpacing(currentMatch[1].trim())
    const afterCtx = content
      .replace(/\[Chat messages since your last reply[^\]]*\][\s\S]*?\[Current message[^\]]*\]/gi, "")
      .trim()
    if (afterCtx) return fixSentenceSpacing(afterCtx)
  }
  return fixSentenceSpacing(
    content
      .replace(/\[Chat messages since your last reply[^\]]*\]/gi, "")
      .replace(/\[Current message - respond to this\]/gi, "")
      .replace(/^User:\s*/gm, "")
      .trim(),
  )
}

/** Fix missing spaces after sentence-ending punctuation followed by capital letters */
export function fixSentenceSpacing(text: string): string {
  if (!text) return ""
  return text.replace(/([.!?:])([A-Z])/g, "$1 $2")
}

/** Fix broken markdown tables from streaming concatenation.
 *  Only split when a row-ending `|` is immediately followed (same line)
 *  by a new row-starting `|`, i.e. two `|` separated by nothing but
 *  optional whitespace with NO cell content in between.
 *  This avoids mangling valid table cells like `| A | B |`.
 */
export function fixBrokenTables(text: string): string {
  if (!text || !text.includes("|")) return text

  // Split rows that got concatenated onto one line during streaming.
  // Matches: end-of-row "|" + optional spaces + start-of-next-row "|"
  // The key insight: a real cell always has content between pipes,
  // so "| |" (pipe-space-pipe with nothing else) means a row boundary.
  return text.replace(/\|\s*\|(\s*[-:])/g, "|\n|$1")
}

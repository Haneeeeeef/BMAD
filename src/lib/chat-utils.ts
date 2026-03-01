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
  return text.replace(/([.!?])([A-Z])/g, "$1 $2")
}

/** Fix broken markdown tables from streaming concatenation */
export function fixBrokenTables(text: string): string {
  if (!text || !text.includes("|")) return text
  return text
    .replace(/\|\s+\|([-:])/g, "|\n|$1")
    .replace(/[-|]\|\s+\|\s+/g, "|\n| ")
    .replace(/\|\s+\|\s+\*\*/g, "|\n| **")
    .replace(/\|\s+\|\s+([A-Za-z0-9])/g, "|\n| $1")
}

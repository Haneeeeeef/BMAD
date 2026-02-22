/**
 * Streaming-aware markdown cleaner
 *
 * Handles incomplete markdown syntax that occurs during streaming:
 * - Incomplete bold/italic markers (**text, *text, __text, _text)
 * - Incomplete code blocks (```, ``)
 * - Incomplete links ([text, [text](url)
 * - Incomplete headers at end of content
 */

/**
 * Count occurrences of a pattern in text
 */
function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) || []).length
}

/**
 * Removes incomplete markdown syntax from the end of streaming content
 * This prevents "flickering" of raw markdown characters during streaming
 */
export function stabilizeStreamingMarkdown(content: string): string {
  if (!content) return content

  let result = content

  // Process line by line to handle incomplete bold/italic on each line
  const lines = result.split('\n')

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Count ** markers - if odd, we have unclosed bold
    const boldCount = countMatches(line, /\*\*/g)
    if (boldCount % 2 !== 0) {
      // Find the last ** and remove it (it's the unclosed one)
      const lastBoldIndex = line.lastIndexOf('**')
      if (lastBoldIndex !== -1) {
        line = line.substring(0, lastBoldIndex) + line.substring(lastBoldIndex + 2)
      }
    }

    // Count single * (not part of **) - if odd, we have unclosed italic
    // First temporarily replace ** to avoid counting them
    const tempLine = line.replace(/\*\*/g, '\x00\x00')
    const italicCount = countMatches(tempLine, /\*/g)
    if (italicCount % 2 !== 0) {
      // Find the last single * and remove it
      let lastSingleAsterisk = -1
      for (let j = line.length - 1; j >= 0; j--) {
        if (line[j] === '*') {
          // Check it's not part of **
          const prevChar = j > 0 ? line[j - 1] : ''
          const nextChar = j < line.length - 1 ? line[j + 1] : ''
          if (prevChar !== '*' && nextChar !== '*') {
            lastSingleAsterisk = j
            break
          }
        }
      }
      if (lastSingleAsterisk !== -1) {
        line = line.substring(0, lastSingleAsterisk) + line.substring(lastSingleAsterisk + 1)
      }
    }

    // Same for __ (bold) and _ (italic)
    const underlineBoldCount = countMatches(line, /__/g)
    if (underlineBoldCount % 2 !== 0) {
      const lastUnderlineBold = line.lastIndexOf('__')
      if (lastUnderlineBold !== -1) {
        line = line.substring(0, lastUnderlineBold) + line.substring(lastUnderlineBold + 2)
      }
    }

    lines[i] = line
  }

  result = lines.join('\n')

  // Handle incomplete inline code (single backtick without closing)
  // Count backticks that aren't part of ``` code blocks
  const codeBlockCount = countMatches(result, /```/g)
  const isInCodeBlock = codeBlockCount % 2 !== 0

  if (!isInCodeBlock) {
    // Only process inline code if we're not in a code block
    const tempResult = result.replace(/```/g, '\x00\x00\x00')
    const inlineCodeCount = countMatches(tempResult, /`/g)
    if (inlineCodeCount % 2 !== 0) {
      // Find and remove the last unclosed backtick
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i] === '`') {
          // Make sure it's not part of ```
          if ((i < 2 || result.substring(i - 2, i + 1) !== '```') &&
              (i > result.length - 3 || result.substring(i, i + 3) !== '```')) {
            result = result.substring(0, i) + result.substring(i + 1)
            break
          }
        }
      }
    }
  }

  // Handle incomplete code block at end
  if (isInCodeBlock) {
    // Find the last ``` and check if it's an opening (unclosed) block
    const lastCodeBlockIndex = result.lastIndexOf('```')
    if (lastCodeBlockIndex !== -1) {
      // Count ``` before this position
      const beforeLastBlock = result.substring(0, lastCodeBlockIndex)
      const beforeCount = countMatches(beforeLastBlock, /```/g)
      if (beforeCount % 2 === 0) {
        // The last ``` is an opening, so it's incomplete - hide it
        result = result.substring(0, lastCodeBlockIndex)
      }
    }
  }

  // Remove incomplete link syntax at end
  // [text without ]
  result = result.replace(/\[[^\]\n]*$/, '')
  // [text]( without )
  result = result.replace(/\[[^\]]*\]\([^)\n]*$/, '')

  // Remove trailing # headers without content
  result = result.replace(/\n#{1,6}\s*$/, '\n')
  result = result.replace(/^#{1,6}\s*$/, '')

  // Remove trailing whitespace from removals
  result = result.trimEnd()

  return result
}

/**
 * Alternative approach: detect if content ends with incomplete markdown
 * Returns true if we should wait for more content before rendering
 */
export function hasIncompleteMarkdown(content: string): boolean {
  if (!content) return false

  const lastChars = content.slice(-10)

  // Check for incomplete markers
  if (/\*{1,2}$/.test(lastChars)) return true
  if (/_{1,2}$/.test(lastChars)) return true
  if (/`{1,3}$/.test(lastChars)) return true
  if (/\[$/.test(lastChars)) return true
  if (/\]\($/.test(lastChars)) return true
  if (/#{1,6}\s*$/.test(content.slice(-20))) return true

  return false
}

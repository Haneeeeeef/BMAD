/**
 * Parse an SSE (Server-Sent Events) stream from an OpenAI-compatible API.
 * Buffers incomplete lines across TCP reads to prevent data loss.
 */
export async function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: {
    onContent?: (chunk: string, full: string) => void
    onReasoning?: (chunk: string, full: string) => void
    onDone?: (fullContent: string, fullReasoning: string) => void
  } = {}
): Promise<{ content: string; reasoning: string }> {
  const decoder = new TextDecoder()
  let fullContent = ""
  let fullReasoning = ""
  let buffer = ""

  function processLine(line: string) {
    if (!line.startsWith("data: ")) return
    const data = line.slice(6)
    if (data === "[DONE]") return

    try {
      const json = JSON.parse(data)

      const reasoning =
        json.reasoning_content ||
        json.reasoning ||
        json.choices?.[0]?.delta?.reasoning_content ||
        json.choices?.[0]?.message?.reasoning_content

      const content =
        json.content ||
        json.choices?.[0]?.delta?.content ||
        json.choices?.[0]?.message?.content

      if (reasoning) {
        fullReasoning += reasoning
        callbacks.onReasoning?.(reasoning, fullReasoning)
      }
      if (content) {
        fullContent += content
        callbacks.onContent?.(content, fullContent)
      }
    } catch {
      // Skip malformed JSON
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    // Keep the last element — it may be an incomplete line
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      processLine(line)
    }
  }

  // Process any remaining buffered data
  if (buffer.trim()) {
    processLine(buffer)
  }

  callbacks.onDone?.(fullContent, fullReasoning)
  return { content: fullContent, reasoning: fullReasoning }
}

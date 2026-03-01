/**
 * Parse an SSE (Server-Sent Events) stream from an OpenAI-compatible API.
 * Handles `data: {json}` lines with content and reasoning fields.
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

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split("\n")

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6)
      if (data === "[DONE]") continue

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
  }

  callbacks.onDone?.(fullContent, fullReasoning)
  return { content: fullContent, reasoning: fullReasoning }
}

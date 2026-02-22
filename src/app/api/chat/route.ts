export const runtime = "edge"

type AttachmentType = "image" | "file" | "audio" | "chatgpt-export"

interface Attachment {
  id: string
  type: AttachmentType
  name: string
  mimeType: string
  size: number
  data: string
  transcription?: string
}

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  attachments?: Attachment[]
}

// OpenAI-compatible vision message format (for Kimi K2.5)
type VisionContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >

interface VisionMessage {
  role: "user" | "assistant" | "system"
  content: VisionContent
}

interface ChatRequest {
  messages: Message[]
  sessionId?: string
  canvasStatus?: string
}

// Parse ChatGPT export JSON to readable text
function parseChatGPTExport(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent)
    if (Array.isArray(data)) {
      const messages: string[] = []
      for (const convo of data) {
        if (convo.title) messages.push(`## ${convo.title}\n`)
        if (convo.mapping) {
          const sorted = Object.values(convo.mapping)
            .filter((m: unknown) => {
              const msg = m as { message?: { content?: { parts?: string[] } } }
              return msg.message?.content?.parts?.length
            })
            .sort((a: unknown, b: unknown) => {
              const A = a as { message?: { create_time?: number } }
              const B = b as { message?: { create_time?: number } }
              return (A.message?.create_time || 0) - (B.message?.create_time || 0)
            })
          for (const m of sorted) {
            const msg = m as { message?: { content?: { parts?: string[] }; author?: { role?: string } } }
            const role = msg.message?.author?.role === "assistant" ? "Assistant" : "User"
            const content = msg.message?.content?.parts?.join("\n") || ""
            if (content.trim()) messages.push(`**${role}:** ${content}\n`)
          }
        }
      }
      return messages.join("\n")
    }
    return "Could not parse ChatGPT export"
  } catch {
    return "Invalid JSON format"
  }
}

// Transform messages with attachments to OpenAI vision format
async function transformMessages(
  messages: Message[],
  openclawUrl: string,
  openclawToken: string
): Promise<VisionMessage[]> {
  const result: VisionMessage[] = []

  for (const msg of messages) {
    if (!msg.attachments?.length) {
      // No attachments, pass through as-is
      result.push({ role: msg.role, content: msg.content })
      continue
    }

    // Build content array for multimodal message (OpenAI format)
    const contentParts: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = []

    // Process attachments
    for (const att of msg.attachments) {
      if (att.type === "image") {
        // Add image as data URL (OpenAI format)
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${att.mimeType};base64,${att.data}`,
          },
        })
      } else if (att.type === "audio") {
        // Transcribe audio via OpenClaw Whisper endpoint
        try {
          const transcription = await transcribeAudio(att, openclawUrl, openclawToken)
          contentParts.push({
            type: "text",
            text: `[Transcription of ${att.name}]:\n${transcription}`,
          })
        } catch {
          contentParts.push({
            type: "text",
            text: `[Failed to transcribe ${att.name}]`,
          })
        }
      } else if (att.type === "chatgpt-export") {
        // Parse ChatGPT export
        const parsed = parseChatGPTExport(att.data)
        contentParts.push({
          type: "text",
          text: `[ChatGPT Export - ${att.name}]:\n${parsed}`,
        })
      } else {
        // Text file - include content directly
        contentParts.push({
          type: "text",
          text: `[File: ${att.name}]:\n${att.data}`,
        })
      }
    }

    // Add the user's text message
    if (msg.content.trim()) {
      contentParts.push({ type: "text", text: msg.content })
    }

    result.push({ role: msg.role, content: contentParts })
  }

  return result
}

// Transcribe audio using OpenClaw Whisper
async function transcribeAudio(
  attachment: Attachment,
  openclawUrl: string,
  openclawToken: string
): Promise<string> {
  const response = await fetch(`${openclawUrl}/v1/audio/transcriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openclawToken}`,
    },
    body: JSON.stringify({
      model: "whisper-1",
      file: attachment.data,
      filename: attachment.name,
    }),
  })

  if (!response.ok) {
    throw new Error("Transcription failed")
  }

  const data = await response.json()
  return data.text || ""
}

export async function POST(request: Request) {
  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN

  if (!openclawUrl || !openclawToken) {
    return new Response(JSON.stringify({ error: "OpenClaw not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { messages, canvasStatus }: ChatRequest = await request.json()

    // Transform messages with attachments to Claude multimodal format
    const transformedMessages = await transformMessages(messages, openclawUrl, openclawToken)

    // Inject canvas status as system context if provided
    const messagesWithContext = canvasStatus
      ? [{ role: "system" as const, content: canvasStatus }, ...transformedMessages]
      : transformedMessages

    const response = await fetch(
      `${openclawUrl}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openclawToken}`,
        },
        body: JSON.stringify({
          model: "openclaw:jarvis",
          messages: messagesWithContext,
          stream: true,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Stream the response
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                  continue
                }

                try {
                  const json = JSON.parse(data)
                  const content = json.choices?.[0]?.delta?.content
                  if (content) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                    )
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

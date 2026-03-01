import { Attachment } from "@/lib/types"
import { parseChatGPTExport } from "@/lib/attachments"
import { requireAuth } from "@/lib/auth"

// Using Node.js runtime instead of Edge because Edge doesn't allow direct IP access
// and our VPS (OpenClaw) doesn't have a domain configured yet
export const runtime = "nodejs"

// Extended message type for API use - includes "system" role beyond the client-side Message type
interface ApiMessage {
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
  messages: ApiMessage[]
  sessionId?: string  // Mission Control chat session ID (used as unique token)
  agentId?: string    // Target agent ID (e.g. "analyst", "architect") — defaults to "jarvis"
  canvasStatus?: string
  userToken?: string  // User token for per-user session isolation
  systemMessage?: string  // Workflow context injected by orchestration (hidden from user)
}

// Transform messages with attachments — images sent as native image_url content parts to OpenClaw
async function transformMessages(
  messages: ApiMessage[],
  openclawUrl: string,
  openclawToken: string
): Promise<VisionMessage[]> {
  const result: VisionMessage[] = []

  for (const msg of messages) {
    if (!msg.attachments?.length) {
      result.push({ role: msg.role, content: msg.content })
      continue
    }

    // Separate images from other attachments
    const contentParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = []
    const textParts: string[] = []

    for (const att of msg.attachments) {
      if (att.type === "image") {
        // Send image directly as vision content — OpenClaw gateway now passes these through
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${att.mimeType};base64,${att.data}` },
        })
      } else if (att.type === "audio") {
        try {
          const transcription = await transcribeAudio(att, openclawUrl, openclawToken)
          textParts.push(`[Transcription of ${att.name}]:\n${transcription}`)
        } catch {
          textParts.push(`[Failed to transcribe ${att.name}]`)
        }
      } else if (att.type === "chatgpt-export") {
        const parsed = parseChatGPTExport(att.data)
        textParts.push(`[ChatGPT Export - ${att.name}]:\n${parsed}`)
      } else {
        textParts.push(`[File: ${att.name}]:\n${att.data}`)
      }
    }

    // Build text content from non-image attachments + user message
    if (textParts.length > 0 && msg.content.trim()) {
      textParts.push(msg.content)
    }
    const textContent = textParts.length > 0 ? textParts.join("\n\n") : msg.content

    if (contentParts.length > 0) {
      // Has images — use content array format
      contentParts.push({ type: "text", text: textContent })
      result.push({ role: msg.role, content: contentParts })
    } else {
      // Text only
      result.push({ role: msg.role, content: textContent })
    }
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

// Extract username from user token (format: mc_username_hash)
function extractUsername(userToken: string | undefined): string | null {
  if (!userToken) return null
  const match = userToken.match(/^mc_([a-z0-9]+)_/)
  return match ? match[1] : null
}

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN

  if (!openclawUrl || !openclawToken) {
    return new Response(JSON.stringify({ error: "OpenClaw not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const { messages, sessionId, agentId, canvasStatus, userToken, systemMessage }: ChatRequest = await request.json()
    const targetAgent = agentId || "jarvis"

    // Extract username for session isolation
    const username = extractUsername(userToken)

    // Transform messages — images sent as native image_url content parts to OpenClaw
    const transformedMessages = await transformMessages(messages, openclawUrl, openclawToken)

    // Build system context
    // NOTE: SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md are injected by OpenClaw from workspace
    const systemParts: string[] = []

    if (username) {
      systemParts.push(`You are chatting with ${username}.`)
    }
    if (systemMessage) {
      systemParts.push(systemMessage)
    }
    if (canvasStatus) {
      systemParts.push(canvasStatus)
    }

    // Inject system context if any
    const messagesWithContext = systemParts.length > 0
      ? [{ role: "system" as const, content: systemParts.join("\n\n") }, ...transformedMessages]
      : transformedMessages

    // Build headers with session key for user isolation
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openclawToken}`,
    }

    // Use agent:<agentId>:mc:username:sessionId format for proper agent routing
    // OpenClaw routes sessions based on the "agent:<agentId>:" prefix
    // Each deliverable targets its own agent (analyst, architect, pm, etc.)
    if (sessionId) {
      const sessionKey = username
        ? `agent:${targetAgent}:mc:${username}:${sessionId}`
        : `agent:${targetAgent}:mc:${sessionId}`
      headers["x-openclaw-session-key"] = sessionKey
    } else if (username) {
      headers["x-openclaw-session-key"] = `agent:${targetAgent}:mc:${username}`
    }

    let response: Response
    try {
      response = await fetch(
        `${openclawUrl}/v1/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: `openclaw:${targetAgent}`,
            messages: messagesWithContext,
            stream: true,
          }),
        }
      )
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : "Fetch failed"
      console.error("OpenClaw fetch error:", msg)
      return new Response(JSON.stringify({
        error: "Cannot reach OpenClaw",
        details: msg,
        url: openclawUrl
      }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!response.ok) {
      const error = await response.text()
      return new Response(JSON.stringify({ error, status: response.status }), {
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
                  const delta = json.choices?.[0]?.delta

                  // Handle reasoning/thinking content (Kimi K2.5)
                  const reasoning = delta?.reasoning_content || delta?.thinking
                  if (reasoning) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ reasoning })}\n\n`)
                    )
                  }

                  // Handle regular content
                  const content = delta?.content
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Chat API error:", errorMessage)
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: errorMessage,
        openclawUrl: process.env.OPENCLAW_URL ? "set" : "missing",
        openclawToken: process.env.OPENCLAW_TOKEN ? "set" : "missing"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

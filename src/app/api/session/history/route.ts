import { requireAuth } from "@/lib/auth"

export const runtime = "nodejs"

/**
 * GET /api/session/history?sessionKey=agent:jarvis:mc:user:sid&after=1234567890
 *
 * Calls OpenClaw /tools/invoke → sessions_history(includeTools: true)
 * Returns real tool call entries from the session transcript.
 */
export async function GET(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN

  if (!openclawUrl || !openclawToken) {
    return Response.json({ error: "OpenClaw not configured" }, { status: 500 })
  }

  const url = new URL(request.url)
  const sessionKey = url.searchParams.get("sessionKey")
  const after = url.searchParams.get("after") // timestamp — only return entries after this

  if (!sessionKey) {
    return Response.json({ error: "sessionKey required" }, { status: 400 })
  }

  try {
    const res = await fetch(`${openclawUrl}/tools/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openclawToken}`,
      },
      body: JSON.stringify({
        tool: "sessions_history",
        args: {
          sessionKey,
          includeTools: true,
          limit: 50,
        },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: "OpenClaw error", details: text }, { status: res.status })
    }

    const data = await res.json()

    // sessions_history response is nested: data.result.content[0].text is a JSON string
    // containing { messages: [...] }
    let messages: Record<string, unknown>[] = []
    try {
      const content = data?.result?.content
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c.type === "text" && typeof c.text === "string") {
            const inner = JSON.parse(c.text)
            if (Array.isArray(inner?.messages)) {
              messages = inner.messages
              break
            }
          }
        }
      }
      // Fallback: try direct path
      if (messages.length === 0) {
        messages = data?.result?.messages || data?.messages || []
      }
    } catch {
      messages = []
    }

    // Extract tool calls into a flat list
    type ToolAction = {
      id: string
      timestamp: number
      tool: string
      args?: Record<string, unknown>
      status?: string
      durationMs?: number
    }

    const actions: ToolAction[] = []
    let idx = 0

    for (const msg of messages) {
      const role = msg.role as string
      const content = msg.content as Record<string, unknown>[] | undefined
      const ts = typeof msg.timestamp === "number" ? msg.timestamp : 0

      // Tool call entries from assistant messages
      if (role === "assistant" && Array.isArray(content)) {
        for (const part of content) {
          if (part.type === "toolCall") {
            let args: Record<string, unknown> | undefined
            try {
              args = typeof part.arguments === "string"
                ? JSON.parse(part.arguments as string)
                : (part.arguments as Record<string, unknown> | undefined)
            } catch {
              args = undefined
            }
            actions.push({
              id: (part.id as string) || `tc-${idx++}`,
              timestamp: ts,
              tool: (part.name as string) || "unknown",
              args,
            })
          }
        }
      }

      // Tool result entries — mark matching call as completed
      if (role === "toolResult" && msg.toolCallId) {
        const tcId = msg.toolCallId as string
        const match = actions.find(a => a.id === tcId)
        if (match) {
          match.status = "completed"
        }
      }
    }

    // Filter by timestamp if `after` param provided
    const afterTs = after ? parseInt(after, 10) : 0
    const filtered = afterTs > 0
      ? actions.filter(a => a.timestamp > afterTs)
      : actions

    return Response.json({ actions: filtered })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: "Failed to fetch session history", details: msg }, { status: 500 })
  }
}

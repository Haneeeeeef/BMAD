import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth"

const OPENCLAW_URL = process.env.OPENCLAW_URL || ""
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ""

// SSE endpoint that proxies OpenClaw events via direct HTTP
export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  if (!OPENCLAW_URL) {
    return new Response(
      `data: {"type":"error","message":"OPENCLAW_URL not configured"}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    )
  }

  try {
    const upstream = await fetch(
      `${OPENCLAW_URL}/openclaw/events/stream?agentId=jarvis`,
      {
        headers: {
          Authorization: `Bearer ${OPENCLAW_TOKEN}`,
          Accept: "text/event-stream",
        },
        signal: request.signal,
      }
    )

    if (!upstream.ok || !upstream.body) {
      return new Response(
        `data: {"type":"error","message":"Upstream ${upstream.status}"}\n\n`,
        { status: 200, headers: { "Content-Type": "text/event-stream" } }
      )
    }

    // Proxy the upstream SSE stream directly
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed"
    return new Response(
      `data: {"type":"error","message":"${message}"}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    )
  }
}

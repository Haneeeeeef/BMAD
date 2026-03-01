/**
 * POST /api/session/relay
 *
 * MC acts as relay for agent-to-agent communication.
 * Takes a message from one agent's context, sends it to another agent,
 * and returns the response. The target agent gets a fresh ephemeral session
 * (no session key) so it doesn't pollute any ongoing deliverable session.
 */

import { requireAuth } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN

  if (!openclawUrl || !openclawToken) {
    return Response.json({ error: "OpenClaw not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const fromAgent: string = body.fromAgent || "unknown"
    const toAgent: string = body.toAgent
    const message: string = body.message
    const projectContext: string | undefined = body.projectContext

    if (!toAgent || !message) {
      return Response.json({ error: "toAgent and message required" }, { status: 400 })
    }

    // Build the relay message — tell the target agent who's asking and what
    const relayPrompt = [
      `[Relay from ${fromAgent}]`,
      projectContext ? `Project context: ${projectContext}` : null,
      ``,
      message,
      ``,
      `Please respond concisely. Your reply will be relayed back to ${fromAgent}.`,
    ].filter(Boolean).join("\n")

    const res = await fetch(`${openclawUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openclawToken}`,
        // Ephemeral session — don't set x-openclaw-session-key
        // so this doesn't pollute any ongoing deliverable session
      },
      body: JSON.stringify({
        model: `openclaw:${toAgent}`,
        messages: [{ role: "user", content: relayPrompt }],
        stream: false,
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json(
        { error: "Target agent error", details: text },
        { status: res.status },
      )
    }

    const data = await res.json()
    const reply =
      data.choices?.[0]?.message?.content ||
      data.message?.content ||
      "No response from agent"

    return Response.json({
      success: true,
      fromAgent,
      toAgent,
      reply,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: "Relay failed", details: msg }, { status: 500 })
  }
}

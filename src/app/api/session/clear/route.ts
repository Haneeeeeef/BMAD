// Session clear endpoint - triggers memory flush then optionally clears session
export const runtime = "edge"

import { requireAuth } from "@/lib/auth"

// Extract username from user token (format: mc_username_hash)
function extractUsername(userToken: string | undefined): string | null {
  if (!userToken) return null
  const match = userToken.match(/^mc_([a-z0-9]+)_/)
  return match ? match[1] : null
}

function getFlushMessage(projectName?: string): string {
  const today = new Date().toISOString().split('T')[0]
  const project = projectName || '<current-project>'

  return `SESSION ENDING - FLUSH REQUIRED.

Update these files NOW:

1. core/ACTIVE.md
   - Update current project, mode, phase
   - Brief context for next session

2. projects/${project}/handoff.md
   - What was accomplished this session
   - Open threads and blockers
   - Next steps

3. projects/${project}/state.yaml
   - Update progress section (brief, requirements, architecture status)
   - Update any blockers or metrics

4. projects/${project}/tasks.md (if tasks changed)
   - Move completed tasks to Completed section
   - Add any new tasks discovered

5. memory/daily/${today}.md (optional - only if cross-project insights)
   - Key learnings that apply beyond this project

Keep each update concise. Reply "FLUSHED" when done.`
}

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN
  const sessionClearUrl = process.env.SESSION_CLEAR_URL

  if (!openclawUrl || !openclawToken) {
    return new Response(JSON.stringify({ error: "OpenClaw not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action || "flush" // "flush" or "flush_and_clear"
    const sessionId = body.sessionId // Mission Control session ID
    const userToken = body.userToken // User token for per-user isolation
    const projectName = body.projectName // Current project name for flush paths

    if (action === "status") {
      return new Response(
        JSON.stringify({ success: true, message: "Session active" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    // Extract username for session isolation
    const username = extractUsername(userToken)

    // Build headers with session key for user isolation
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openclawToken}`,
    }

    // Use agent:jarvis:mc: prefix for proper agent session routing
    if (sessionId) {
      const sessionKey = username
        ? `agent:jarvis:mc:${username}:${sessionId}`
        : `agent:jarvis:mc:${sessionId}`
      headers["x-openclaw-session-key"] = sessionKey
    } else if (username) {
      headers["x-openclaw-session-key"] = `agent:jarvis:mc:${username}`
    }

    // Send flush message to Jarvis (non-streaming for simplicity)
    const flushResponse = await fetch(`${openclawUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "openclaw:jarvis",
        messages: [{ role: "user", content: getFlushMessage(projectName) }],
        stream: false,
        max_tokens: 1000, // More tokens for multiple file updates
      }),
    })

    if (!flushResponse.ok) {
      const error = await flushResponse.text()
      return new Response(
        JSON.stringify({ success: false, error: "Flush failed", details: error }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    const result = await flushResponse.json()
    const response = result.choices?.[0]?.message?.content || "No response"

    // If action is flush_and_clear, also clear the session file
    let sessionCleared = false
    if (action === "flush_and_clear" && sessionClearUrl && sessionId) {
      try {
        // Use /delete endpoint which accepts sessionId (searches within session keys)
        const deleteUrl = sessionClearUrl.replace('/clear', '/delete')
        const clearResponse = await fetch(deleteUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })
        sessionCleared = clearResponse.ok
      } catch {
        // Session clear failed but flush succeeded
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: action === "flush_and_clear" ? "Memory flushed and session cleared" : "Memory flushed",
        jarvisResponse: response,
        sessionCleared,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

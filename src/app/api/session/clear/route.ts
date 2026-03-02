/**
 * POST /api/session/clear
 *
 * Two actions:
 *   "flush"  — Ask the active agent to save state to project files (PROJECT-CONTEXT.md,
 *              PROJECT-DECISIONS.md, memory, transcript check). Session stays alive.
 *              Auto-compaction at 40K tokens is handled by OpenClaw separately.
 *   "clear"  — Signal session key rotation. Client rotates the key for fresh context.
 *              Does NOT clear chat messages or reset workflow.
 */

import { requireAuth } from "@/lib/auth"

export const runtime = "nodejs"

/* ── helpers ────────────────────────────────────────────── */

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function getFlushPrompt(projectSlug: string, agentId: string, contextInfo?: string): string {
  return `MEMORY FLUSH TRIGGERED. You are agent "${agentId}". Do these in order:

1. FIRST: Update PROJECT-CONTEXT.md in /home/haneef/workspaces/jarvis/projects/${projectSlug}:

   a) Update "Current Status" table (phase, deliverable, progress, date)

   b) Update "Last Action & Next Step":
      - Last Action Taken: What you just did
      - User Last Said: Quote their last response
      - Next Expected Action: What to do on resume
      - Blocked By: Any blockers

   c) Update "Key Decisions Made (With Reasoning)":
      - Add any NEW decisions with WHY they were made

   d) Update "Gathered Information (For Document Building)":
      - Add any NEW info user provided (vision, problem, users, etc.)
      - This is CRITICAL for document continuity after compaction

   e) Update "Active Tasks" checklist

   f) Update "Last flush" timestamp

2. Update PROJECT-DECISIONS.md — Add any new decisions made this session with rationale and status.

3. CHECK WORKFLOW TRANSCRIPT: If a WORKFLOW-TRANSCRIPT-*.md file exists:
   - Verify all recent user responses are captured in it
   - If any are missing, append them now
   - The transcript is the source of truth for document creation

4. Write session summary to /home/haneef/workspaces/jarvis/projects/${projectSlug}/memory/${agentId}-YYYY-MM-DD.md
   - ALWAYS create this file (mkdir -p the memory folder if needed).
   - Use YOUR agent ID "${agentId}" as prefix in the filename.
   - Brief log of what happened this session.
   - Never skip this step.

5. Update /home/haneef/workspaces/jarvis/projects/${projectSlug}/MEMORY-${agentId}.md with accumulated insights:
   - Key decisions and reasoning
   - Lessons learned
   - Patterns discovered
   - This is cross-session knowledge for THIS PROJECT from YOUR perspective, not a session log.
   - Do NOT write to a plain MEMORY.md — always use the agent-prefixed filename.

${contextInfo ? `\nContext usage at time of flush: ${contextInfo}\nInclude this in your memory/session summary.\n` : ""}
IMPORTANT: After compaction, you MUST read these to continue where you left off:
1. PROJECT-CONTEXT.md — project state and active work
2. PROJECT-DECISIONS.md — decisions made so far
3. Your WORKFLOW-TRANSCRIPT-{workflow}.md — your curated step summaries
4. The LAST 10 entries of the full MC transcript (WORKFLOW-TRANSCRIPT-FULL-*.md if it exists) for recent conversation context

Reply "DONE" when finished.`
}

/* ── route handler ──────────────────────────────────────── */

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const openclawUrl = process.env.OPENCLAW_URL
  const openclawToken = process.env.OPENCLAW_TOKEN

  if (!openclawUrl || !openclawToken) {
    return Response.json({ error: "OpenClaw not configured" }, { status: 500 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action: string = body.action || "flush" // "flush" or "clear"
    const sessionId: string | undefined = body.sessionId
    const agentId: string | undefined = body.agentId // Active agent (analyst, architect, etc.)
    const projectName: string | undefined = body.projectName

    if (!sessionId) {
      return Response.json({ error: "sessionId required" }, { status: 400 })
    }

    const targetAgent = agentId || "jarvis"
    const projectSlug = projectName ? slugify(projectName) : ""
    const sessionKey = `agent:${targetAgent}:mc:${sessionId}`

    // Real context stats from session-status API (passed by client)
    const contextTokens: number | undefined = body.contextTokens
    const contextMaxTokens: number | undefined = body.contextMaxTokens
    const contextPercentage: number | undefined = body.contextPercentage
    const contextInfo = contextTokens != null && contextMaxTokens != null
      ? `${contextTokens.toLocaleString()} / ${contextMaxTokens.toLocaleString()} tokens (${contextPercentage ?? Math.round((contextTokens / contextMaxTokens) * 100)}%)`
      : undefined

    // ── FLUSH ──────────────────────────────────────────
    if (action === "flush") {
      const results: Record<string, unknown> = {}

      // Ask agent to save state to project files (session stays alive)
      if (projectSlug) {
        try {
          const flushRes = await fetch(`${openclawUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openclawToken}`,
              "x-openclaw-session-key": sessionKey,
            },
            body: JSON.stringify({
              model: `openclaw:${targetAgent}`,
              messages: [{ role: "user", content: getFlushPrompt(projectSlug, targetAgent, contextInfo) }],
              stream: false,
              max_tokens: 8000,
            }),
          })

          if (flushRes.ok) {
            const flushData = await flushRes.json()
            results.agentResponse = flushData.choices?.[0]?.message?.content || "No response"
          } else {
            results.agentError = `Agent flush failed: HTTP ${flushRes.status}`
          }
        } catch (err) {
          results.agentError = err instanceof Error ? err.message : "Agent flush failed"
        }
      }

      return Response.json({ success: true, action: "flush", ...results })
    }

    // ── CLEAR (rotate only, no flush) ─────────────────
    if (action === "clear") {
      // Transcript is already up-to-date (appended per-turn by /api/session/transcript).
      // Session key rotation happens client-side (new sessionId in project state).
      // The old session lingers unused on OpenClaw — no delete API needed.
      return Response.json({ success: true, action: "clear", rotateSession: true })
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 })

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: "Failed to process request", details: msg }, { status: 500 })
  }
}

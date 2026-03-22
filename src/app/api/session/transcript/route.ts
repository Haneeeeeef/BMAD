/**
 * POST /api/session/transcript
 *
 * Append a single user/assistant exchange to the full workflow transcript.
 * Called after every chat turn completes (fire-and-forget from client).
 * Transcript lives on VPS at: <projectSlug>/WORKFLOW-TRANSCRIPT-FULL-<workflowId>.md
 */

import { requireAuth } from "@/lib/auth"
import * as vps from "@/lib/vps"

export const runtime = "nodejs"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// Extract username from auth token (format: mc_username_hash)
function extractUsername(request: Request): string {
  const token = request.headers.get("x-auth-token") || ""
  const match = token.match(/^mc_([a-z0-9]+)_/)
  return match ? match[1] : "user"
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof Response) return auth

  try {
    const body = await request.json()
    const projectName: string | undefined = body.projectName
    const workflowId: string | undefined = body.workflowId
    const userMessage: string | undefined = body.userMessage
    const assistantMessage: string | undefined = body.assistantMessage
    const agentName: string | undefined = body.agentName
    const agentId: string | undefined = body.agentId

    if (!projectName || !workflowId) {
      return Response.json({ error: "projectName and workflowId required" }, { status: 400 })
    }

    if (!userMessage && !assistantMessage) {
      return Response.json({ error: "No content to append" }, { status: 400 })
    }

    const projectSlug = slugify(projectName)
    const transcriptFile = `WORKFLOW-TRANSCRIPT-FULL-${workflowId}.md`
    const username = extractUsername(request)

    // Skip system-injected messages
    if (userMessage?.startsWith("[Mission Control]") || userMessage?.startsWith("You are")) {
      return Response.json({ success: true, skipped: true })
    }

    // Build the turn entry with names
    const userLabel = username.charAt(0).toUpperCase() + username.slice(1)
    const agentLabel = agentName || agentId || "Agent"

    // Escape code fences in content to prevent markdown rendering issues
    const escapeCodeFences = (s: string) => s.replace(/```/g, "` ` `")

    const parts: string[] = []
    if (userMessage) {
      const text = userMessage.length > 2000
        ? userMessage.slice(0, 200) + "... [truncated]"
        : escapeCodeFences(userMessage.trim())
      parts.push(`**${userLabel}:** ${text}`)
    }
    if (assistantMessage) {
      const text = assistantMessage.length > 3000
        ? assistantMessage.slice(0, 500) + "... [truncated]"
        : escapeCodeFences(assistantMessage.trim())
      parts.push(`**${agentLabel}:** ${text}`)
    }

    const turnEntry = parts.join("\n\n")
    if (!turnEntry) {
      return Response.json({ success: true, skipped: true })
    }

    // Read existing transcript (or start fresh)
    let existing = ""
    try {
      existing = await vps.readFile(projectSlug, transcriptFile)
    } catch {
      // File doesn't exist yet — create with header
      const now = new Date().toISOString().split("T")[0]
      existing = `# Workflow Transcript: ${workflowId}\n\nStarted: ${now}\nAgent: ${agentLabel}\n`
    }

    // Count existing turns to number this one
    const turnCount = (existing.match(/### Turn \d+/g) || []).length
    const turnNumber = turnCount + 1

    const content = `${existing}\n\n---\n\n### Turn ${turnNumber}\n\n${turnEntry}`

    await vps.writeFile(projectSlug, transcriptFile, content)

    return Response.json({ success: true, turn: turnNumber })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return Response.json({ error: "Failed to append transcript", details: msg }, { status: 500 })
  }
}

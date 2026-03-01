/**
 * POST /api/session/transcript
 *
 * Append a single user/assistant exchange to the workflow transcript file.
 * Called after every chat turn completes (fire-and-forget from client).
 * Transcript lives on VPS at: <projectSlug>/WORKFLOW-TRANSCRIPT-<workflowId>.md
 */

import { requireAuth } from "@/lib/auth"
import * as vps from "@/lib/vps"

export const runtime = "nodejs"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  try {
    const body = await request.json()
    const projectName: string | undefined = body.projectName
    const workflowId: string | undefined = body.workflowId
    const userMessage: string | undefined = body.userMessage
    const assistantMessage: string | undefined = body.assistantMessage

    if (!projectName || !workflowId) {
      return Response.json({ error: "projectName and workflowId required" }, { status: 400 })
    }

    if (!userMessage && !assistantMessage) {
      return Response.json({ error: "No content to append" }, { status: 400 })
    }

    const projectSlug = slugify(projectName)
    const transcriptFile = `WORKFLOW-TRANSCRIPT-${workflowId}.md`

    // Skip system-injected messages
    if (userMessage?.startsWith("[Mission Control]") || userMessage?.startsWith("You are")) {
      return Response.json({ success: true, skipped: true })
    }

    // Build the turn entry
    const parts: string[] = []
    if (userMessage) {
      // Truncate very long user messages (file uploads, etc.)
      const text = userMessage.length > 2000
        ? userMessage.slice(0, 200) + "... [truncated]"
        : userMessage.trim()
      parts.push(`**User:** ${text}`)
    }
    if (assistantMessage) {
      // Truncate very long responses
      const text = assistantMessage.length > 3000
        ? assistantMessage.slice(0, 500) + "... [truncated]"
        : assistantMessage.trim()
      parts.push(`**Agent:** ${text}`)
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
      existing = `# Workflow Transcript: ${workflowId}\n\nStarted: ${now}\n`
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

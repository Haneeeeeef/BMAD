/**
 * GET /api/project-context?project=slug
 *
 * Discovers what project files exist on VPS and returns a context briefing
 * for agents. Only includes files that actually exist — no placeholders.
 * Called before starting a workflow so the system message tells the agent
 * exactly what to read.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as vps from "@/lib/vps"

export const runtime = "nodejs"

// Files to check, in priority order
const CONTEXT_FILES = [
  { path: "PROJECT-CONTEXT.md", label: "Project context (read FIRST)" },
  { path: "PROJECT-DECISIONS.md", label: "Project decisions" },
]

const ARTIFACT_FILES = [
  { path: "artifacts/planning/product-brief.md", label: "Product brief" },
  { path: "artifacts/planning/prd.md", label: "PRD" },
  { path: "artifacts/planning/ux-design.md", label: "UX design spec" },
  { path: "artifacts/planning/architecture.md", label: "Architecture spec" },
  { path: "artifacts/planning/epics.md", label: "Epics & stories" },
  { path: "artifacts/planning/domain-research.md", label: "Domain research" },
  { path: "artifacts/planning/market-research.md", label: "Market research" },
  { path: "artifacts/planning/technical-research.md", label: "Technical research" },
  { path: "artifacts/implementation/sprint-plan.md", label: "Sprint plan" },
]

async function fileExists(slug: string, path: string): Promise<boolean> {
  try {
    const content = await vps.readFile(slug, path)
    return content.trim().length > 0
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const slug = request.nextUrl.searchParams.get("project")
  if (!slug || !vps.validateSlug(slug)) {
    return NextResponse.json({ error: "Valid project slug required" }, { status: 400 })
  }

  try {
    // Check context files
    const available: { path: string; label: string }[] = []
    for (const f of CONTEXT_FILES) {
      if (await fileExists(slug, f.path)) {
        available.push(f)
      }
    }

    // Check artifact files
    for (const f of ARTIFACT_FILES) {
      if (await fileExists(slug, f.path)) {
        available.push(f)
      }
    }

    // Check for workflow transcripts (agent's curated summaries)
    const transcripts: string[] = []
    try {
      const rootFiles = await vps.listFiles(slug, "", { filesOnly: true, pattern: /^WORKFLOW-TRANSCRIPT-.*\.md$/ })
      transcripts.push(...rootFiles)
    } catch { /* silent */ }

    return NextResponse.json({ available, transcripts })
  } catch {
    return NextResponse.json({ available: [], transcripts: [] })
  }
}

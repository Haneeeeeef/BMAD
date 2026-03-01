import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as vps from "@/lib/vps"

// Deliverable type -> artifact file path mapping
const ARTIFACT_PATHS: Record<string, string> = {
  "product-brief": "artifacts/planning/product-brief.md",
  "domain-research": "artifacts/planning/domain-research.md",
  "market-research": "artifacts/planning/market-research.md",
  "technical-research": "artifacts/planning/technical-research.md",
  prd: "artifacts/planning/prd.md",
  "edit-prd": "artifacts/planning/prd.md",
  "validate-prd": "artifacts/planning/prd-validation.md",
  prototype: "artifacts/planning/prototype.md",
  "ux-design": "artifacts/planning/ux-design.md",
  architecture: "artifacts/planning/architecture.md",
  "epics-stories": "artifacts/planning/epics.md",
  "implementation-readiness": "artifacts/planning/implementation-readiness.md",
  "sprint-planning": "artifacts/implementation/sprint-plan.md",
  "create-story": "artifacts/implementation/story.md",
  "dev-story": "artifacts/code/dev-story.md",
  "code-review": "artifacts/code/code-review.md",
  "correct-course": "artifacts/planning/course-correction.md",
  retrospective: "artifacts/implementation/retrospective.md",
  "sprint-status": "artifacts/implementation/sprint-status.md",
  "quick-spec": "artifacts/architecture/quick-spec.md",
  "quick-dev": "artifacts/code/quick-dev.md",
  "generate-context": "PROJECT-CONTEXT.md",
  "project-decisions": "PROJECT-DECISIONS.md",
  "document-project": "artifacts/docs/project-docs.md",
  "qa-tests": "artifacts/implementation/tests/test-plan.md",
  brainstorming: "artifacts/planning/brainstorm.md",
  "advanced-elicitation": "artifacts/planning/elicitation.md",
}

/**
 * GET /api/artifacts?project=slug&type=product-brief
 * Fetches the artifact file from VPS via DUFS
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  const { searchParams } = request.nextUrl
  const projectSlug = searchParams.get("project")
  const deliverableType = searchParams.get("type")
  const directPath = searchParams.get("path")

  if (!projectSlug) {
    return NextResponse.json({ error: "project param required" }, { status: 400 })
  }

  if (!vps.validateSlug(projectSlug)) {
    return NextResponse.json({ error: "Invalid project slug" }, { status: 400 })
  }

  let relPath: string
  if (directPath) {
    if (!vps.validateRelativePath(directPath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }
    relPath = directPath
  } else if (deliverableType) {
    const mapped = ARTIFACT_PATHS[deliverableType]
    if (!mapped) {
      return NextResponse.json({ error: `Unknown deliverable type: ${deliverableType}` }, { status: 400 })
    }
    relPath = mapped
  } else {
    return NextResponse.json({ error: "type or path param required" }, { status: 400 })
  }

  try {
    let content: string
    try {
      content = await vps.readFile(projectSlug, relPath)
    } catch {
      // Try legacy path
      const legacyPath = relPath.replace("artifacts/planning/", "planning-artifacts/")
      content = await vps.readFile(projectSlug, legacyPath)
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "File empty or not found", path: relPath }, { status: 404 })
    }

    return NextResponse.json({ content, path: relPath })
  } catch {
    return NextResponse.json({ error: "File not found on VPS", path: relPath }, { status: 404 })
  }
}

/**
 * POST /api/artifacts — list artifacts for a project
 * Body: { project: string, rootOnly?: boolean }
 */
export async function POST(request: NextRequest) {
  const authPost = requireAuth(request)
  if (authPost instanceof Response) return authPost

  try {
    const { project, rootOnly } = await request.json()
    if (!project) {
      return NextResponse.json({ error: "project required" }, { status: 400 })
    }

    if (!vps.validateSlug(project)) {
      return NextResponse.json({ error: "Invalid project slug" }, { status: 400 })
    }

    let files: string[]
    if (rootOnly) {
      // Root-level .md files only
      files = await vps.listFiles(project, "", { filesOnly: true, pattern: /\.md$/ })
    } else {
      // Artifact + legacy dirs
      const artifactFiles = await vps.findFiles(project, "artifacts", { pattern: /\.md$/ }).catch(() => [] as string[])
      const legacyFiles = await vps.findFiles(project, "planning-artifacts", { pattern: /\.md$/ }).catch(() => [] as string[])
      files = [...artifactFiles, ...legacyFiles]
    }

    return NextResponse.json({ files })
  } catch {
    return NextResponse.json({ error: "Failed to list artifacts" }, { status: 500 })
  }
}

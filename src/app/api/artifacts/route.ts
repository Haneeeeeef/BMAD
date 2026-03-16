import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as vps from "@/lib/vps"

// Deliverable type -> file path mapping (flat under deliverables/)
const ARTIFACT_PATHS: Record<string, string> = {
  "product-brief": "deliverables/product-brief.md",
  "domain-research": "research/domain-research.md",
  "market-research": "research/market-research.md",
  "technical-research": "research/technical-research.md",
  prd: "deliverables/prd.md",
  "edit-prd": "deliverables/prd.md",
  "validate-prd": "deliverables/prd-validation.md",
  prototype: "deliverables/prototype.md",
  "ux-design": "deliverables/ux-design.md",
  architecture: "deliverables/architecture.md",
  "epics-stories": "deliverables/epics.md",
  "implementation-readiness": "deliverables/implementation-readiness.md",
  "sprint-planning": "deliverables/sprint-plan.md",
  "create-story": "deliverables/story.md",
  "dev-story": "deliverables/dev-story.md",
  "code-review": "deliverables/code-review.md",
  "correct-course": "deliverables/course-correction.md",
  retrospective: "deliverables/retrospective.md",
  "sprint-status": "deliverables/sprint-status.md",
  "quick-spec": "deliverables/quick-spec.md",
  "quick-dev": "deliverables/quick-dev.md",
  "generate-context": "PROJECT-CONTEXT.md",
  "project-decisions": "PROJECT-DECISIONS.md",
  "document-project": "deliverables/project-docs.md",
  "qa-tests": "deliverables/qa/test-plan.md",
  brainstorming: "deliverables/brainstorm.md",
  "advanced-elicitation": "deliverables/elicitation.md",
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
    } catch (err) {
      console.error(`[artifacts] GET primary failed: ${projectSlug}/${relPath}`, err instanceof Error ? err.message : err)
      // Try legacy paths for backward compatibility
      const legacyPath = relPath
        .replace("deliverables/", "artifacts/planning/")
        .replace("research/", "artifacts/planning/")
      content = await vps.readFile(projectSlug, legacyPath)
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "File empty or not found", path: relPath }, { status: 404 })
    }

    return NextResponse.json({ content, path: relPath })
  } catch (err) {
    console.error(`[artifacts] GET failed: ${projectSlug}/${relPath}`, err instanceof Error ? err.message : err)
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
      // deliverables/ + research/ + legacy dirs
      const deliverableFiles = await vps.findFiles(project, "deliverables", { pattern: /\.(md|drawio)$/ }).catch(() => [] as string[])
      const researchFiles = await vps.findFiles(project, "research", { pattern: /\.md$/ }).catch(() => [] as string[])
      const legacyFiles = await vps.findFiles(project, "artifacts", { pattern: /\.md$/ }).catch(() => [] as string[])
      files = [...deliverableFiles, ...researchFiles, ...legacyFiles]
    }

    console.log(`[artifacts] POST listed ${files.length} files for ${project}`)
    return NextResponse.json({ files })
  } catch (err) {
    console.error(`[artifacts] POST failed for listing:`, err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Failed to list artifacts" }, { status: 500 })
  }
}

// PUT /api/artifacts — save file content back to VPS
export async function PUT(request: NextRequest) {
  const authPut = requireAuth(request)
  if (authPut instanceof Response) return authPut

  try {
    const { project, path: filePath, content } = await request.json()
    if (!project || !filePath || content === undefined) {
      return NextResponse.json({ error: "project, path, and content required" }, { status: 400 })
    }

    if (!vps.validateSlug(project)) {
      return NextResponse.json({ error: "Invalid project slug" }, { status: 400 })
    }

    await vps.writeFile(project, filePath, content)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[artifacts] PUT error:", error)
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 })
  }
}

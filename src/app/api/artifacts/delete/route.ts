import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as vps from "@/lib/vps"

// Deliverable type → file path (flat under deliverables/)
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
  "document-project": "deliverables/project-docs.md",
  "qa-tests": "deliverables/qa/test-plan.md",
  brainstorming: "deliverables/brainstorm.md",
  "advanced-elicitation": "deliverables/elicitation.md",
}

/**
 * POST /api/artifacts/delete
 * Body: { project: string, deliverableType: string, workflowId?: string }
 * Deletes the artifact file + workflow transcript from VPS
 */
export async function POST(request: NextRequest) {
  const auth = requireAuth(request)
  if (auth instanceof Response) return auth

  try {
    const { project, deliverableType, workflowId } = await request.json()

    if (!project || !deliverableType) {
      return NextResponse.json({ error: "project and deliverableType required" }, { status: 400 })
    }

    if (!vps.validateSlug(project)) {
      return NextResponse.json({ error: "Invalid project slug" }, { status: 400 })
    }

    const deleted: string[] = []
    const failed: string[] = []

    // 1. Delete the artifact file
    const artifactRel = ARTIFACT_PATHS[deliverableType]
    if (artifactRel) {
      try {
        await vps.deleteFile(project, artifactRel)
        deleted.push(artifactRel)
      } catch {
        failed.push(artifactRel)
      }
    }

    // 2. Delete workflow transcript(s) — agents may name them differently
    //    e.g. WORKFLOW-TRANSCRIPT-create-arch.md for workflow "create-architecture"
    try {
      const rootFiles = await vps.listFiles(project, "", {
        filesOnly: true,
        pattern: /^WORKFLOW-TRANSCRIPT-.*\.md$/,
      })

      // Match on workflowId (e.g. "create-architecture") or deliverableType (e.g. "architecture")
      const matchTerms = [deliverableType]
      if (workflowId) matchTerms.push(workflowId)

      for (const file of rootFiles) {
        const lower = file.toLowerCase()
        const matches = matchTerms.some(term => lower.includes(term.toLowerCase()))
        if (matches) {
          try {
            await vps.deleteFile(project, file)
            deleted.push(file)
          } catch {
            failed.push(file)
          }
        }
      }
    } catch {
      // No transcript files found — not an error
    }

    return NextResponse.json({ deleted, failed })
  } catch {
    return NextResponse.json({ error: "Failed to delete artifacts" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import * as vps from "@/lib/vps"

// Deliverable type → artifact file path (subset of main ARTIFACT_PATHS)
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
  "document-project": "artifacts/docs/project-docs.md",
  "qa-tests": "artifacts/qa/test-plan.md",
  brainstorming: "artifacts/planning/brainstorm.md",
  "advanced-elicitation": "artifacts/planning/elicitation.md",
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

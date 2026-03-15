"use client"

import { useCallback } from "react"
import { getWorkflowById, type Project } from "@/lib/bmad-types"

export function useWorkflowProgress(
  project: Project,
  onProjectUpdate: (project: Project) => void,
  onDeliverableApproved?: (deliverableType: string, agentId: string) => void,
) {
  const advanceWorkflowStep = useCallback(() => {
    if (!project.currentDeliverable) return

    const deliverable = project.deliverables.find(d => d.id === project.currentDeliverable)
    if (!deliverable) return

    const tasks = deliverable.tasks
    const activeIdx = tasks.findIndex(t => t.status === "active")
    const firstPendingIdx = tasks.findIndex(t => t.status === "pending")

    if (activeIdx === -1 && firstPendingIdx === -1) return

    const updatedTasks = tasks.map((t, i) => {
      if (i === activeIdx) return { ...t, status: "complete" as const }
      if (activeIdx >= 0 && i === activeIdx + 1 && t.status === "pending") return { ...t, status: "active" as const }
      if (activeIdx === -1 && i === firstPendingIdx) return { ...t, status: "active" as const }
      return t
    })

    const completedCount = updatedTasks.filter(t => t.status === "complete").length
    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0

    onProjectUpdate({
      ...project,
      deliverables: project.deliverables.map(d =>
        d.id === project.currentDeliverable
          ? { ...d, tasks: updatedTasks, progress }
          : d,
      ),
    })
  }, [project, onProjectUpdate])

  const markDeliverableComplete = useCallback((targetId?: string) => {
    const id = targetId || project.currentDeliverable
    if (!id) return
    const deliverable = project.deliverables.find(d => d.id === id)
    if (!deliverable || deliverable.status === "complete" || deliverable.status === "validated") return

    // If in review flow (awaiting-approval/revising), override to validated
    const isReviewOverride = deliverable.status === "awaiting-approval" || deliverable.status === "revising"
    const newStatus = isReviewOverride ? "validated" as const : "complete" as const

    onProjectUpdate({
      ...project,
      deliverables: project.deliverables.map(d =>
        d.id === id
          ? {
              ...d,
              status: newStatus,
              progress: 100,
              completedAt: Date.now(),
              tasks: d.tasks.map(t => ({ ...t, status: "complete" as const })),
            }
          : d,
      ),
    })

    // Trigger process flow generation after user approves a reviewed deliverable
    if (isReviewOverride) {
      const wf = getWorkflowById(deliverable.workflowId)
      if (wf) {
        onDeliverableApproved?.(deliverable.type, wf.agent)
      }
    }
  }, [project, onProjectUpdate, onDeliverableApproved])

  const detectWorkflowProgress = useCallback((content: string) => {
    const deliverable = project.deliverables.find(d => d.id === project.currentDeliverable)
    if (!deliverable) return
    const wf = getWorkflowById(deliverable.workflowId)
    if (!wf) return
    const tasks = deliverable.tasks
    const activeIdx = tasks.findIndex(t => t.status === "active")

    // Step completion signals
    let stepAdvanced = false

    const completionPatterns = [
      /✅\s*.*(complete|done|captured|finished|documented)/i,
      /step\s+\d+\s*(?:is\s+)?(?:complete|done|finished)/i,
      /(?:section|step)\s+(?:complete|done|finished)[.!]?\s*$/im,
      /saved.*(?:section|step).*(?:to|in)\s+/i,
      /(?:i'?ve\s+)?(?:documented|captured|covered|completed)\s+(?:the\s+)?(?:section|step|area)\b/i,
      /that\s+(?:covers|completes|wraps\s+up)\s+/i,
    ]
    for (const pattern of completionPatterns) {
      if (pattern.test(content)) {
        advanceWorkflowStep()
        stepAdvanced = true
        break
      }
    }

    // Agent mentions a future step by name → advance to match
    if (!stepAdvanced && wf.areas && activeIdx >= 0) {
      for (let i = activeIdx + 1; i < wf.areas.length; i++) {
        const areaName = wf.areas[i]
        const escaped = areaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const patterns = [
          new RegExp(`(?:move|moving|proceed|next|now|let'?s|on\\s+to)\\b[^.]{0,40}\\b${escaped}\\b`, "i"),
          new RegExp(`^#{1,4}\\s+(?:\\d+\\.?\\s*)?${escaped}\\s*$`, "im"),
          new RegExp(`^\\*\\*(?:\\d+\\.?\\s*)?${escaped}\\*\\*`, "im"),
          new RegExp(`(?:step|section|area)\\s+\\d+[.:]+\\s*${escaped}`, "i"),
        ]
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            const stepsToAdvance = i - activeIdx
            for (let s = 0; s < stepsToAdvance; s++) {
              advanceWorkflowStep()
            }
            stepAdvanced = true
            break
          }
        }
        if (stepAdvanced) break
      }
    }

    // Deliverable completion signals
    const workflowDonePatterns = [
      /saved.*(?:to|in|at)\s+[`"']?artifacts?\//i,
      /(?:written|saved|created)\s+(?:to|at)\s+[`"']?artifacts?\//i,
      /(?:workflow|deliverable)\s+(?:is\s+)?(?:completed?|finished?|done)[.!]?\s*$/im,
      /all\s+(?:sections?|steps?)\s+(?:are\s+)?(?:completed?|done|finished)[.!]?\s*$/im,
      /(?:architecture|document|artifact)\s+(?:is\s+)?(?:finalized?|completed?|ready)/i,
    ]
    for (const pattern of workflowDonePatterns) {
      if (pattern.test(content)) {
        markDeliverableComplete()
        break
      }
    }
  }, [project, advanceWorkflowStep, markDeliverableComplete])

  return { advanceWorkflowStep, markDeliverableComplete, detectWorkflowProgress }
}

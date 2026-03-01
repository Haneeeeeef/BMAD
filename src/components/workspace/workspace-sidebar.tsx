"use client"

import { useMemo } from "react"
import type { Deliverable } from "@/lib/bmad-types"
import type { Agent } from "@/components/agent-panel"
import { DeliverablesList } from "./deliverables-list"
import { AgentsList } from "./agents-list"

/* ── deliverable type → relevant agent ids ──────────────── */
// Jarvis is always included as orchestrator

const DELIVERABLE_AGENTS: Record<string, string[]> = {
  // Analysis — Mary (analyst)
  "product-brief":       ["analyst"],
  "domain-research":     ["analyst"],
  "market-research":     ["analyst"],
  "technical-research":  ["analyst"],
  // Planning — John (pm), Sally (ux)
  "prd":                 ["pm", "analyst"],
  "edit-prd":            ["pm"],
  "validate-prd":        ["pm", "architect"],
  "prototype":           ["ux"],
  "ux-design":           ["ux", "pm"],
  // Solutioning — Winston (architect), Bob (sm)
  "architecture":            ["architect", "pm"],
  "epics-stories":           ["pm", "architect"],
  "implementation-readiness": ["pm", "architect", "ux"],
  // Implementation — Amelia (dev), Quinn (qa), Bob (sm)
  "sprint-planning":     ["sm", "pm"],
  "create-story":        ["sm", "pm", "architect"],
  "dev-story":           ["dev", "qa"],
  "code-review":         ["dev", "qa"],
  "correct-course":      ["pm", "sm"],
  "retrospective":       ["sm"],
  "sprint-status":       ["sm"],
  // Quick Flow — Barry (quick-flow)
  "quick-spec":          ["quick-flow"],
  "quick-dev":           ["quick-flow"],
  // Utility
  "generate-context":    [],
  "document-project":    ["tech-writer"],
  "qa-tests":            ["qa", "dev"],
  // Core
  "brainstorming":       ["analyst"],
  "party-mode":          ["analyst", "pm", "architect"],
  "advanced-elicitation": ["analyst", "pm"],
}

/* ── component ───────────────────────────────────────────── */

interface WorkspaceSidebarProps {
  deliverables: Deliverable[]
  agents: Agent[]
  currentDeliverableId: string | null
  activeAgentId: string | null
  onDeliverableClick: (id: string) => void
  onAgentClick: (id: string) => void
  onAddDeliverable?: () => void
  onDeleteDeliverable?: (id: string) => void
}

export function WorkspaceSidebar({
  deliverables,
  agents,
  currentDeliverableId,
  activeAgentId,
  onDeliverableClick,
  onAgentClick,
  onAddDeliverable,
  onDeleteDeliverable,
}: WorkspaceSidebarProps) {
  const filteredAgents = useMemo(() => {
    // Find the selected deliverable's type
    const current = deliverables.find(d => d.id === currentDeliverableId)
    if (!current) return agents.filter(a => a.id === "jarvis")

    const relevantIds = DELIVERABLE_AGENTS[current.type] ?? []
    // Always include jarvis + the relevant agents
    const showIds = new Set(["jarvis", ...relevantIds])
    return agents.filter(a => showIds.has(a.id))
  }, [agents, deliverables, currentDeliverableId])

  return (
    <aside aria-label="Workspace sidebar" className="w-[260px] shrink-0 border-r border-border bg-background flex flex-col overflow-hidden">
      <DeliverablesList
        deliverables={deliverables}
        currentDeliverableId={currentDeliverableId}
        onDeliverableClick={onDeliverableClick}
        onAddDeliverable={onAddDeliverable}
        onDeleteDeliverable={onDeleteDeliverable}
      />
      <AgentsList
        agents={filteredAgents}
        activeAgentId={activeAgentId}
        onAgentClick={onAgentClick}
      />
    </aside>
  )
}

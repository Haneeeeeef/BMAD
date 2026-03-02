"use client"

import { useMemo } from "react"
import type { Deliverable } from "@/lib/bmad-types"
import { getWorkflowById } from "@/lib/bmad-types"
import type { Agent } from "@/components/agent-panel"
import { DeliverablesList } from "./deliverables-list"
import { AgentsList, type AgentContext } from "./agents-list"

/* ── component ───────────────────────────────────────────── */

interface WorkspaceSidebarProps {
  deliverables: Deliverable[]
  agents: Agent[]
  currentDeliverableId: string | null
  activeAgentId: string | null
  agentContextMap?: Record<string, AgentContext>
  onDeliverableClick: (id: string) => void
  onAgentClick: (id: string) => void
  onAddDeliverable?: () => void
  onDeleteDeliverable?: (id: string) => void
  onForceComplete?: (id: string) => void
}

export function WorkspaceSidebar({
  deliverables,
  agents,
  currentDeliverableId,
  activeAgentId,
  agentContextMap,
  onDeliverableClick,
  onAgentClick,
  onAddDeliverable,
  onDeleteDeliverable,
  onForceComplete,
}: WorkspaceSidebarProps) {
  // Derive agents from actual workflow definitions — no hardcoded map.
  // Each deliverable's workflow declares which agent runs it.
  const projectAgents = useMemo(() => {
    const showIds = new Set(["jarvis"])
    for (const d of deliverables) {
      const wf = getWorkflowById(d.workflowId)
      if (wf?.agent) showIds.add(wf.agent)
    }
    return agents.filter(a => showIds.has(a.id))
  }, [agents, deliverables])

  return (
    <aside aria-label="Workspace sidebar" className="w-[260px] shrink-0 border-r border-border bg-background flex flex-col overflow-hidden">
      <DeliverablesList
        deliverables={deliverables}
        currentDeliverableId={currentDeliverableId}
        onDeliverableClick={onDeliverableClick}
        onAddDeliverable={onAddDeliverable}
        onDeleteDeliverable={onDeleteDeliverable}
        onForceComplete={onForceComplete}
      />
      <AgentsList
        agents={projectAgents}
        activeAgentId={activeAgentId}
        contextMap={agentContextMap}
        onAgentClick={onAgentClick}
      />
    </aside>
  )
}

"use client"

import { useMemo } from "react"
import type { Deliverable } from "@/lib/bmad-types"
import { getWorkflowById } from "@/lib/bmad-types"
import type { Agent } from "@/components/agent-panel"
import { ProjectAbout } from "./project-about"
import { DeliverablesList } from "./deliverables-list"
import { AgentsList, type AgentContext } from "./agents-list"

/* ── component ───────────────────────────────────────────── */

interface WorkspaceSidebarProps {
  projectName?: string
  projectDescription?: string
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
  onReviewDeliverable?: (id: string) => void
}

export function WorkspaceSidebar({
  projectDescription,
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
  onReviewDeliverable,
}: WorkspaceSidebarProps) {
  const projectAgents = useMemo(() => {
    const showIds = new Set(["jarvis"])
    for (const d of deliverables) {
      const wf = getWorkflowById(d.workflowId)
      if (wf?.agent) showIds.add(wf.agent)
    }
    return agents.filter(a => showIds.has(a.id))
  }, [agents, deliverables])

  return (
    <aside aria-label="Workspace sidebar" className="w-[270px] shrink-0 flex flex-col overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.08)] backdrop-blur-2xl border-r border-border/20" style={{ background: "linear-gradient(180deg, rgba(250,250,250,0.96) 0%, rgba(245,245,245,0.94) 50%, rgba(240,240,240,0.92) 100%)" }}>
      <ProjectAbout
        description={projectDescription ?? ""}
        deliverables={deliverables}
      />
      <DeliverablesList
        deliverables={deliverables}
        currentDeliverableId={currentDeliverableId}
        onDeliverableClick={onDeliverableClick}
        onAddDeliverable={onAddDeliverable}
        onDeleteDeliverable={onDeleteDeliverable}
        onForceComplete={onForceComplete}
        onReviewDeliverable={onReviewDeliverable}
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

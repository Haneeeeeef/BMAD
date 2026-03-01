"use client"

import React, { memo, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { Agent } from "@/components/agent-panel"
import { StatusDot } from "./status-dot"

const AVATAR_COLORS = [
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-rose-100 text-rose-700",
  "bg-purple-100 text-purple-700",
  "bg-cyan-100 text-cyan-700",
]

const AGENT_ROLES: Record<string, string> = {
  jarvis: "Orchestrator",
  analyst: "Analyst",
  architect: "Architect",
  dev: "Developer",
  pm: "Product Manager",
  qa: "QA Engineer",
  "quick-flow": "Quick Flow",
  sm: "Scrum Master",
  "tech-writer": "Tech Writer",
  ux: "UX Designer",
}

const AGENT_NAMES: Record<string, string> = {
  jarvis: "Jarvis",
  analyst: "Mary",
  architect: "Winston",
  dev: "Amelia",
  pm: "John",
  qa: "Quinn",
  "quick-flow": "Barry",
  sm: "Bob",
  "tech-writer": "Paige",
  ux: "Sally",
}

interface AgentsListProps {
  agents: Agent[]
  activeAgentId: string | null
  onAgentClick: (id: string) => void
}

const AgentRow = memo(function AgentRow({
  agent,
  index,
  isActive,
  onClick,
}: {
  agent: Agent
  index: number
  isActive: boolean
  onClick: (id: string) => void
}) {
  const handleClick = useCallback(() => onClick(agent.id), [onClick, agent.id])
  const displayName = AGENT_NAMES[agent.id] ?? agent.name
  const role = AGENT_ROLES[agent.id] ?? "Agent"
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        "hover:bg-muted",
        isActive && "bg-amber-500/5",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center shrink-0 rounded-full h-[22px] w-[22px] text-xs font-medium",
          avatarColor,
        )}
      >
        {initial}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {displayName}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {role}
        </span>
      </div>
      <StatusDot status={agent.status} />
    </button>
  )
})

export function AgentsList({ agents, activeAgentId, onAgentClick }: AgentsListProps) {
  return (
    <div className="flex flex-col shrink-0 border-t border-border">
      {/* Header */}
      <div className="flex items-center px-4 py-3.5 border-b border-border">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Agents
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col p-1.5 gap-0.5">
        {agents.map((agent, index) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            index={index}
            isActive={agent.id === activeAgentId}
            onClick={onAgentClick}
          />
        ))}
      </div>
    </div>
  )
}

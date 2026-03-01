"use client"

import React, { memo, useCallback } from "react"
import { Brain } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent } from "@/components/agent-panel"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export type AgentContext = { tokens: number; maxTokens: number; percentage: number }

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

// Format tokens: 26024 → "26K", 1500 → "1.5K", 200000 → "200K"
const fmtK = (n: number) => {
  if (n >= 1000) {
    const k = n / 1000
    return k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, "")}K`
  }
  return String(n)
}

interface AgentsListProps {
  agents: Agent[]
  activeAgentId: string | null
  contextMap?: Record<string, AgentContext>
  onAgentClick: (id: string) => void
}

const AgentRow = memo(function AgentRow({
  agent,
  index,
  isActive,
  context,
  onClick,
}: {
  agent: Agent
  index: number
  isActive: boolean
  context?: AgentContext
  onClick: (id: string) => void
}) {
  const handleClick = useCallback(() => onClick(agent.id), [onClick, agent.id])
  const displayName = AGENT_NAMES[agent.id] ?? agent.name
  const role = AGENT_ROLES[agent.id] ?? "Agent"
  const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const initial = displayName.charAt(0).toUpperCase()
  const hasContext = context && context.tokens > 0

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        "hover:bg-muted",
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
        <span className={cn(
          "text-sm truncate",
          isActive ? "font-semibold text-foreground" : "font-medium text-foreground",
        )}>
          {displayName}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          {role}
        </span>
      </div>
      {hasContext ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
              context.percentage < 50 ? "text-emerald-600 bg-emerald-50" :
              context.percentage < 80 ? "text-amber-600 bg-amber-50" :
              "text-red-600 bg-red-50"
            )}>
              <Brain className="h-3 w-3" />
              <span>{fmtK(context.tokens)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {context.tokens.toLocaleString()} / {context.maxTokens.toLocaleString()} tokens ({context.percentage}%)
          </TooltipContent>
        </Tooltip>
      ) : (
        <Brain className="h-3 w-3 text-muted-foreground/30 shrink-0" />
      )}
    </button>
  )
})

export function AgentsList({ agents, activeAgentId, contextMap, onAgentClick }: AgentsListProps) {
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
            context={contextMap?.[agent.id]}
            onClick={onAgentClick}
          />
        ))}
      </div>
    </div>
  )
}

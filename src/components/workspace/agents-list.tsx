"use client"

import React, { memo, useCallback } from "react"
import { cn } from "@/lib/utils"
import type { Agent } from "@/components/agent-panel"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

export type AgentContext = { tokens: number; maxTokens: number; percentage: number }

const AVATAR_COLORS: Record<string, string> = {
  jarvis: "bg-violet-500",
  analyst: "bg-pink-500",
  architect: "bg-blue-600",
  dev: "bg-red-500",
  pm: "bg-sky-500",
  qa: "bg-amber-500",
  "quick-flow": "bg-lime-500",
  sm: "bg-purple-500",
  "tech-writer": "bg-cyan-500",
  ux: "bg-teal-500",
}

const AGENT_AVATARS: Record<string, string> = {
  jarvis: "/agents/jarvis.png",
  analyst: "/agents/analyst.png",
  pm: "/agents/pm.png",
  architect: "/agents/architect.png",
  ux: "/agents/ux.png",
  dev: "/agents/dev.png",
  qa: "/agents/qa.png",
  sm: "/agents/sm.png",
  "tech-writer": "/agents/tech-writer.png",
  "quick-flow": "/agents/quick-flow.png",
}

const AGENT_ROLES: Record<string, string> = {
  jarvis: "Reviewer",
  analyst: "Business Analyst",
  architect: "System Architect",
  dev: "Senior Software Engineer",
  pm: "Product Manager",
  qa: "QA Engineer",
  "quick-flow": "Quick Flow Solo Dev",
  sm: "Scrum Master",
  "tech-writer": "Technical Writer",
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

function getRingColor(percentage: number): string {
  if (percentage < 50) return "#10B981"
  if (percentage < 80) return "#F59E0B"
  return "#EF4444"
}

function getRingTextClass(percentage: number): string {
  if (percentage < 50) return "fill-emerald-600"
  if (percentage < 80) return "fill-amber-600"
  return "fill-red-600"
}

const RING_SIZE = 36
const RING_RADIUS = 15
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

function ContextRing({ percentage, tokens, maxTokens }: AgentContext) {
  const color = getRingColor(percentage)
  const offset = RING_CIRCUMFERENCE * (1 - percentage / 100)
  const display = String(Math.round(percentage))

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="-rotate-90">
            <circle cx="18" cy="18" r={RING_RADIUS} fill={color} fillOpacity="0.06" stroke="currentColor" className="text-muted/40" strokeWidth="2.5" />
            <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={offset} />
          </svg>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0">
            <text x="18" y="18.5" textAnchor="middle" dominantBaseline="central" className={cn("text-[10px] font-bold font-mono", getRingTextClass(percentage))}>
              {display}
            </text>
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {tokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens ({percentage}%)
      </TooltipContent>
    </Tooltip>
  )
}

interface AgentsListProps {
  agents: Agent[]
  activeAgentId: string | null
  contextMap?: Record<string, AgentContext>
  onAgentClick: (id: string) => void
}

const AgentRow = memo(function AgentRow({
  agent,
  isActive,
  context,
  onClick,
}: {
  agent: Agent
  isActive: boolean
  context?: AgentContext
  onClick: (id: string) => void
}) {
  const handleClick = useCallback(() => onClick(agent.id), [onClick, agent.id])
  const displayName = AGENT_NAMES[agent.id] ?? agent.name
  const role = AGENT_ROLES[agent.id] ?? "Agent"
  const avatarBg = AVATAR_COLORS[agent.id] ?? "bg-gray-500"
  const avatarImg = AGENT_AVATARS[agent.id]
  const initial = displayName.charAt(0).toUpperCase()
  const hasContext = context && context.tokens > 0

  const ROLE_COLORS: Record<string, string> = {
    jarvis: "bg-violet-100 text-violet-700",
    analyst: "bg-pink-100 text-pink-700",
    architect: "bg-blue-100 text-blue-700",
    dev: "bg-red-100 text-red-700",
    pm: "bg-sky-100 text-sky-700",
    qa: "bg-amber-100 text-amber-700",
    "quick-flow": "bg-lime-100 text-lime-700",
    sm: "bg-purple-100 text-purple-700",
    "tech-writer": "bg-cyan-100 text-cyan-700",
    ux: "bg-teal-100 text-teal-700",
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer",
        isActive
          ? "bg-white/60 shadow-sm ring-1 ring-border/30"
          : "hover:bg-white/50",
      )}
    >
      {avatarImg ? (
        <img src={avatarImg} alt={displayName} className="shrink-0 rounded-full h-[36px] w-[36px] object-cover shadow-sm" />
      ) : (
        <div className={cn(
          "flex items-center justify-center shrink-0 rounded-full h-[36px] w-[36px] text-[12px] font-semibold text-white shadow-sm",
          avatarBg,
        )}>
          {initial}
        </div>
      )}
      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <span className={cn(
          "text-[8px] font-semibold uppercase tracking-wider w-fit max-w-full truncate px-1.5 py-0.5 rounded-md",
          ROLE_COLORS[agent.id] ?? "bg-gray-100 text-gray-600",
        )}>
          {role}
        </span>
        <span className={cn(
          "text-[13px] truncate",
          isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80",
        )}>
          {displayName}
        </span>
      </div>
      {hasContext ? (
        <ContextRing tokens={context.tokens} maxTokens={context.maxTokens} percentage={context.percentage} />
      ) : (
        <div className="shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
            <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </button>
  )
})

export function AgentsList({ agents, activeAgentId, contextMap, onAgentClick }: AgentsListProps) {
  const activeCount = agents.filter(a => {
    const ctx = contextMap?.[a.id]
    return ctx && ctx.tokens > 0
  }).length

  return (
    <div className="flex flex-col">
      <div className="flex flex-col px-2 pt-4 pb-4 gap-1.5 border-t border-border">
        <div className="flex items-center px-2.5 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Agents</span>
        </div>
        {agents.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            isActive={agent.id === activeAgentId}
            context={contextMap?.[agent.id]}
            onClick={onAgentClick}
          />
        ))}
      </div>
    </div>
  )
}

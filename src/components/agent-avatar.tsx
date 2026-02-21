"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type AgentType =
  | "research"
  | "marketing"
  | "requirements"
  | "ui"
  | "architect"
  | "story"
  | "scaffold"
  | "devops"
  | "qa"
  | "docs"
  | "pm"
  | "human"

const agentConfig: Record<AgentType, { label: string; color: string; icon: string }> = {
  research: { label: "Research", color: "bg-cyan-500", icon: "R" },
  marketing: { label: "Marketing", color: "bg-pink-500", icon: "M" },
  requirements: { label: "Requirements", color: "bg-blue-500", icon: "REQ" },
  ui: { label: "UI Design", color: "bg-purple-500", icon: "UI" },
  architect: { label: "Architect", color: "bg-orange-500", icon: "A" },
  story: { label: "Story", color: "bg-green-500", icon: "S" },
  scaffold: { label: "Scaffold", color: "bg-yellow-500", icon: "SC" },
  devops: { label: "DevOps", color: "bg-red-500", icon: "DO" },
  qa: { label: "QA", color: "bg-teal-500", icon: "QA" },
  docs: { label: "Docs", color: "bg-indigo-500", icon: "D" },
  pm: { label: "PM", color: "bg-violet-500", icon: "PM" },
  human: { label: "Human", color: "bg-slate-700", icon: "H" },
}

interface AgentAvatarProps {
  type: AgentType
  name?: string
  size?: "sm" | "md" | "lg"
  showTooltip?: boolean
  isActive?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
}

export function AgentAvatar({
  type,
  name,
  size = "md",
  showTooltip = true,
  isActive = false,
  className,
}: AgentAvatarProps) {
  const config = agentConfig[type] || agentConfig.pm
  const displayName = name || config.label

  const avatar = (
    <div className="relative">
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarFallback className={cn(config.color, "text-white font-medium")}>
          {config.icon}
        </AvatarFallback>
      </Avatar>
      {isActive && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
      )}
    </div>
  )

  if (!showTooltip) {
    return avatar
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>
        <p>{displayName}</p>
      </TooltipContent>
    </Tooltip>
  )
}

// Agent avatar group for showing multiple agents
interface AgentAvatarGroupProps {
  agents: { type: AgentType; name?: string; isActive?: boolean }[]
  max?: number
  size?: "sm" | "md" | "lg"
}

export function AgentAvatarGroup({ agents, max = 4, size = "sm" }: AgentAvatarGroupProps) {
  const visible = agents.slice(0, max)
  const remaining = agents.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((agent, i) => (
        <AgentAvatar
          key={i}
          type={agent.type}
          name={agent.name}
          size={size}
          isActive={agent.isActive}
          className="ring-2 ring-background"
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground ring-2 ring-background",
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

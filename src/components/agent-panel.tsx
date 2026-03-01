"use client"

import { Bot, Zap, Brain, CheckCircle, Clock, FileText, Save, Search, AlertTriangle, ArrowRight, User, Play, Terminal, Globe } from "lucide-react"
import { AGENT_STATUS } from "@/lib/deliverable-colors"
import { cn } from "@/lib/utils"

export type Agent = {
  id: string
  name: string
  type: "main" | "sub"
  status: "active" | "idle" | "thinking" | "error"
  task?: string
  progress?: number
  contextUsage?: number
  contextTokens?: number
  contextMaxTokens?: number
  spawnedBy?: string
  startedAt?: number
}

// Activity types focused on ACTIONS, not speech
export type ActivityType =
  // User actions
  | "user:switch"      // Switched deliverable
  | "user:approve"     // Approved section
  | "user:input"       // Provided input (not the content, just the fact)
  // Agent lifecycle
  | "agent:spawn"      // Legacy sub-agent created
  | "agent:delegate"   // Delegated to peer agent via sessions_send
  | "agent:complete"   // Agent finished workflow
  | "agent:error"      // Agent failed
  // Tool calls (the important stuff!)
  | "tool:file_write"  // Wrote/saved file
  | "tool:file_read"   // Read file
  | "tool:memory"      // Memory operation
  | "tool:search"      // Search/investigation
  | "tool:bash"        // Shell command
  | "tool:api"         // API/web call
  // Task progress
  | "task:start"       // Started workflow step
  | "task:complete"    // Completed workflow step
  // ACP
  | "acp:handoff"      // Legacy agent handoff
  | "agent:handoff"    // Agent → Agent handoff via sessions_send

export type ActivityEntry = {
  id: string
  timestamp: number
  type: ActivityType
  agent?: string       // Which agent performed the action
  target?: string      // File path, task name, etc.
  content: string      // Brief description
  metadata?: {
    duration?: number  // How long it took (ms)
    tokens?: number    // Tokens used
    success?: boolean  // Did it succeed
  }
}

type AgentPanelProps = {
  agents: Agent[]
  activeAgentId?: string
  onSelectAgent?: (agentId: string) => void
}

export function AgentPanel({ agents, activeAgentId, onSelectAgent }: AgentPanelProps) {
  const mainAgent = agents.find(a => a.type === "main")
  const subAgents = agents.filter(a => a.type === "sub")

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-200 bg-white">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          Active Agents
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {mainAgent && (
          <AgentCard
            agent={mainAgent}
            isActive={activeAgentId === mainAgent.id}
            onClick={() => onSelectAgent?.(mainAgent.id)}
            isMain
          />
        )}

        {subAgents.length > 0 && (
          <div className="pt-1">
            <div className="px-2 py-1 text-[9px] font-medium text-zinc-400 uppercase tracking-wider">
              Agents ({subAgents.length})
            </div>
            {subAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isActive={activeAgentId === agent.id}
                onClick={() => onSelectAgent?.(agent.id)}
              />
            ))}
          </div>
        )}

        {agents.length === 0 && (
          <div className="py-8 text-center">
            <Bot className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
            <p className="text-xs text-zinc-400">No active agents</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AgentCard({
  agent,
  isActive,
  onClick,
  isMain = false
}: {
  agent: Agent
  isActive: boolean
  onClick: () => void
  isMain?: boolean
}) {
  const statusStyle = AGENT_STATUS[agent.status]

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-2 rounded-lg text-left transition-all",
        "hover:bg-zinc-50",
        isActive && "bg-zinc-100 ring-1 ring-zinc-200"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full shrink-0",
          statusStyle.dot,
          agent.status === "active" && "animate-pulse"
        )} />

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isMain ? (
            <Brain className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <Zap className="w-3 h-3 text-zinc-400" />
          )}
          <span className={cn(
            "text-xs font-medium truncate",
            isMain ? "text-zinc-700" : "text-zinc-600"
          )}>
            {agent.name}
          </span>
        </div>

        {agent.progress !== undefined && agent.status === "active" && (
          <span className="text-[10px] text-zinc-400">
            {agent.progress}%
          </span>
        )}
      </div>

      {agent.task && (
        <div className="mt-1 pl-4 text-[10px] text-zinc-400 truncate">
          {agent.task}
        </div>
      )}

      {isMain && agent.contextUsage !== undefined && (
        <div className="mt-1.5 pl-4">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  agent.contextUsage < 50 ? "bg-emerald-500" :
                  agent.contextUsage < 80 ? "bg-amber-500" :
                  "bg-red-500"
                )}
                style={{ width: `${agent.contextUsage}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-400">{agent.contextUsage}%</span>
          </div>
        </div>
      )}
    </button>
  )
}

// Activity Log Component - focused on tool calls and actions
type ActivityLogProps = {
  entries: ActivityEntry[]
  maxEntries?: number
}

export function ActivityLog({ entries, maxEntries = 50 }: ActivityLogProps) {
  const displayEntries = entries.slice(0, maxEntries)

  // Group by category for stats
  const toolCalls = entries.filter(e => e.type.startsWith("tool:")).length
  const userActions = entries.filter(e => e.type.startsWith("user:")).length

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Activity
          </h3>
          <div className="flex items-center gap-2 text-[9px] text-zinc-400">
            <span>{toolCalls} tools</span>
            <span>•</span>
            <span>{userActions} actions</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayEntries.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-zinc-200" />
            <p className="text-xs text-zinc-400">No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {displayEntries.map(entry => (
              <ActivityEntryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Activity entry visual config
const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: typeof FileText
  color: string
  label: string
}> = {
  "user:switch": { icon: ArrowRight, color: "text-blue-500", label: "Switched" },
  "user:approve": { icon: CheckCircle, color: "text-emerald-500", label: "Approved" },
  "user:input": { icon: User, color: "text-zinc-400", label: "Input" },
  "agent:spawn": { icon: Zap, color: "text-purple-500", label: "Spawned" },
  "agent:delegate": { icon: Zap, color: "text-purple-500", label: "Delegated" },
  "agent:complete": { icon: CheckCircle, color: "text-emerald-500", label: "Completed" },
  "agent:error": { icon: AlertTriangle, color: "text-red-500", label: "Error" },
  "tool:file_write": { icon: Save, color: "text-emerald-600", label: "Saved" },
  "tool:file_read": { icon: FileText, color: "text-blue-500", label: "Read" },
  "tool:memory": { icon: Brain, color: "text-purple-500", label: "Memory" },
  "tool:search": { icon: Search, color: "text-amber-500", label: "Search" },
  "tool:bash": { icon: Terminal, color: "text-zinc-600", label: "Shell" },
  "tool:api": { icon: Globe, color: "text-cyan-500", label: "API" },
  "task:start": { icon: Play, color: "text-blue-500", label: "Started" },
  "task:complete": { icon: CheckCircle, color: "text-emerald-500", label: "Done" },
  "acp:handoff": { icon: ArrowRight, color: "text-amber-500", label: "Handoff" },
  "agent:handoff": { icon: ArrowRight, color: "text-amber-500", label: "Handoff" },
}

function ActivityEntryRow({ entry }: { entry: ActivityEntry }) {
  const formatTime = (ts: number) => {
    const date = new Date(ts)
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const config = ACTIVITY_CONFIG[entry.type] || {
    icon: Clock,
    color: "text-zinc-400",
    label: "Event"
  }
  const Icon = config.icon

  // Format target (file path) - show only filename
  const formatTarget = (target?: string) => {
    if (!target) return null
    const parts = target.split("/")
    return parts[parts.length - 1]
  }

  return (
    <div className="px-3 py-2 hover:bg-zinc-50 transition-colors">
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className={cn("mt-0.5 shrink-0", config.color)}>
          <Icon className="w-3 h-3" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Agent badge + label */}
          <div className="flex items-center gap-1.5 mb-0.5">
            {entry.agent && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">
                {entry.agent}
              </span>
            )}
            <span className={cn("text-[10px] font-medium", config.color)}>
              {config.label}
            </span>
          </div>

          {/* Description */}
          <div className="text-xs text-zinc-600 leading-tight">
            {entry.content}
          </div>

          {/* Target file if present */}
          {entry.target && (
            <div className="mt-0.5 text-[10px] text-zinc-400 font-mono truncate">
              {formatTarget(entry.target)}
            </div>
          )}

          {/* Metadata row */}
          {entry.metadata && (
            <div className="mt-1 flex items-center gap-2 text-[9px] text-zinc-400">
              {entry.metadata.duration && (
                <span>{entry.metadata.duration}ms</span>
              )}
              {entry.metadata.tokens && (
                <span>{entry.metadata.tokens} tok</span>
              )}
              {entry.metadata.success === false && (
                <span className="text-red-500">failed</span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[9px] text-zinc-400 shrink-0">
          {formatTime(entry.timestamp)}
        </span>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronRight,
  Terminal,
  FileText,
  Search,
  Database,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ToolEvent } from "@/hooks/use-openclaw-events"

type ToolExecutionPanelProps = {
  activeTools: ToolEvent[]
  completedTools: ToolEvent[]
  connectionState: "disconnected" | "connecting" | "connected" | "error"
  isRunning: boolean
}

// Tool icon mapping
const toolIcons: Record<string, React.ElementType> = {
  bash: Terminal,
  read: FileText,
  write: FileText,
  edit: FileText,
  glob: Search,
  grep: Search,
  memory_search: Database,
  memory_get: Database,
  web_fetch: Globe,
  web_search: Globe,
}

function getToolIcon(toolName: string) {
  const lowerName = toolName.toLowerCase()
  for (const [key, Icon] of Object.entries(toolIcons)) {
    if (lowerName.includes(key)) return Icon
  }
  return Terminal
}

function getToolDisplayName(toolName: string) {
  // Clean up tool names for display
  const cleaned = toolName
    .replace(/^mcp__[^_]+__/, "") // Remove MCP prefix
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase to spaces
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function formatToolParams(params?: Record<string, unknown>): string {
  if (!params) return ""

  // Extract meaningful info from params
  if (params.command) return String(params.command).slice(0, 60)
  if (params.file_path) return String(params.file_path).split("/").slice(-2).join("/")
  if (params.pattern) return `"${String(params.pattern).slice(0, 30)}"`
  if (params.query) return `"${String(params.query).slice(0, 30)}"`
  if (params.url) return String(params.url).slice(0, 40)

  return ""
}

function ToolCard({ tool, isActive }: { tool: ToolEvent; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = getToolIcon(tool.tool)
  const displayName = getToolDisplayName(tool.tool)
  const params = formatToolParams(tool.params)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "rounded-md border text-xs",
        isActive
          ? "bg-amber-50 border-amber-200"
          : tool.phase === "error"
          ? "bg-red-50 border-red-200"
          : "bg-emerald-50 border-emerald-200"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
      >
        {/* Status indicator */}
        {isActive ? (
          <Loader2 className="h-3 w-3 text-amber-500 animate-spin shrink-0" />
        ) : tool.phase === "error" ? (
          <XCircle className="h-3 w-3 text-red-500 shrink-0" />
        ) : (
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
        )}

        {/* Tool icon */}
        <Icon className={cn(
          "h-3 w-3 shrink-0",
          isActive ? "text-amber-600" : tool.phase === "error" ? "text-red-600" : "text-emerald-600"
        )} />

        {/* Tool name + params */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "font-medium",
            isActive ? "text-amber-700" : tool.phase === "error" ? "text-red-700" : "text-emerald-700"
          )}>
            {displayName}
          </span>
          {params && (
            <span className="text-zinc-500 ml-1 truncate">{params}</span>
          )}
        </div>

        {/* Expand toggle */}
        {(tool.params || tool.result || tool.error) && (
          expanded ? (
            <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
          )
        )}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (tool.params || tool.result || tool.error) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1">
              {tool.params && (
                <div className="bg-white/50 rounded p-1.5 font-mono text-[10px] text-zinc-600 max-h-20 overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(tool.params, null, 2).slice(0, 500)}
                  </pre>
                </div>
              )}
              {tool.result !== undefined && (
                <div className="bg-white/50 rounded p-1.5 font-mono text-[10px] text-zinc-600 max-h-20 overflow-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {typeof tool.result === "string"
                      ? (tool.result as string).slice(0, 300)
                      : JSON.stringify(tool.result, null, 2).slice(0, 300)}
                  </pre>
                </div>
              )}
              {tool.error && (
                <div className="bg-red-100 rounded p-1.5 text-[10px] text-red-700">
                  {tool.error}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ToolExecutionPanel({
  activeTools,
  completedTools,
  connectionState,
  isRunning,
}: ToolExecutionPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const totalSteps = activeTools.length + completedTools.length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 hover:bg-zinc-50"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-700">Execution</span>
          {totalSteps > 0 && (
            <span className="text-[10px] text-zinc-400">
              ({completedTools.length}/{totalSteps})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection indicator */}
          {connectionState === "connected" ? (
            <Wifi className="h-3 w-3 text-emerald-500" />
          ) : connectionState === "connecting" ? (
            <Loader2 className="h-3 w-3 text-amber-500 animate-spin" />
          ) : (
            <WifiOff className="h-3 w-3 text-zinc-400" />
          )}

          {/* Running indicator */}
          {isRunning && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              Running
            </span>
          )}

          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="flex-1 overflow-hidden"
          >
            <div className="p-2 space-y-1.5 overflow-y-auto max-h-[200px]">
              {/* Active tools */}
              {activeTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} isActive />
              ))}

              {/* Completed tools (most recent first) */}
              {[...completedTools].reverse().map((tool) => (
                <ToolCard key={tool.id} tool={tool} isActive={false} />
              ))}

              {/* Empty state */}
              {totalSteps === 0 && (
                <div className="py-4 text-center text-[10px] text-zinc-400">
                  {connectionState === "connected"
                    ? "Waiting for tool calls..."
                    : connectionState === "connecting"
                    ? "Connecting to agent..."
                    : "Not connected"}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

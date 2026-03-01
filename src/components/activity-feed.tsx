"use client"


// ---------------------------------------------------------------------------
// ToolAction — real tool call data from OpenClaw session history
// ---------------------------------------------------------------------------
export interface ToolAction {
  id: string
  timestamp: number
  tool: string
  args?: Record<string, unknown>
  status?: string
  durationMs?: number
}

// ---------------------------------------------------------------------------
// Human-readable descriptions for tool calls
// ---------------------------------------------------------------------------
function describeToolAction(action: ToolAction): string {
  const { tool, args } = action

  if (tool === "exec" || tool === "bash") {
    const cmd = args?.command as string | undefined
    if (cmd) {
      // Show first meaningful part of command, truncated
      const short = cmd.split("\n")[0].slice(0, 60)
      return `Ran \`${short}${cmd.length > 60 ? "..." : ""}\``
    }
    return "Ran a command"
  }

  if (tool === "read" || tool === "file_read") {
    const path = (args?.path || args?.file_path || args?.file || args?.filename) as string | undefined
    if (path) {
      const name = path.split("/").pop()
      return `Read **${name}**`
    }
    return "Read a file"
  }

  if (tool === "write" || tool === "file_write" || tool === "save") {
    const path = (args?.path || args?.file_path || args?.file || args?.filename) as string | undefined
    if (path) {
      const name = path.split("/").pop()
      return `Wrote **${name}**`
    }
    return "Wrote a file"
  }

  if (tool === "search" || tool === "grep" || tool === "find") {
    const query = (args?.query || args?.pattern || args?.term) as string | undefined
    if (query) {
      const short = query.slice(0, 40)
      return `Searched for "${short}${query.length > 40 ? "..." : ""}"`
    }
    return "Searched the codebase"
  }

  if (tool === "sessions_send" || tool === "delegate") {
    const target = (args?.agent || args?.target || args?.sessionKey) as string | undefined
    const succeeded = action.status === "completed"
    if (target) {
      // Extract agent name from session key if needed
      const agentMatch = target.match(/^agent:(\w+)/)
      const name = agentMatch ? agentMatch[1] : target
      return succeeded
        ? `Delegated to **${name}**`
        : `Tried to delegate to **${name}**`
    }
    return succeeded ? "Delegated to another agent" : "Tried to delegate"
  }

  if (tool === "memory" || tool === "memory_store" || tool === "memory_flush") {
    return "Saved to memory"
  }

  if (tool === "web" || tool === "fetch" || tool === "http") {
    const url = (args?.url) as string | undefined
    if (url) {
      try {
        const host = new URL(url).hostname
        return `Fetched ${host}`
      } catch {
        return "Made a web request"
      }
    }
    return "Made a web request"
  }

  // Fallback — just show the tool name in a readable way
  const readable = tool.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
  return `Used ${readable}`
}

function isDelegation(action: ToolAction): boolean {
  return action.tool === "sessions_send" || action.tool === "delegate"
}

// ---------------------------------------------------------------------------
// Format timestamp
// ---------------------------------------------------------------------------
function formatTime(timestamp: number): string {
  if (!timestamp) return ""
  const d = new Date(timestamp)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, "0")
  const ampm = h >= 12 ? "pm" : "am"
  const h12 = h % 12 || 12
  return `${h12}:${m}${ampm}`
}

// ---------------------------------------------------------------------------
// Render bold **segments** in text
// ---------------------------------------------------------------------------
function ActionText({ text, failed }: { text: string; failed?: boolean }) {
  const baseClass = failed
    ? "text-[11px] leading-[15px] text-amber-500/70"
    : "text-[11px] leading-[15px] text-muted-foreground"

  const boldPattern = /\*\*(.+?)\*\*/g
  if (boldPattern.test(text)) {
    const parts = text.split(/\*\*(.+?)\*\*/)
    return (
      <span className={baseClass}>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className={failed ? "font-medium text-amber-600/80" : "font-medium text-foreground/80"}>{part}</span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    )
  }

  // Render backtick `code` segments
  const codeParts = text.split(/`([^`]+)`/)
  if (codeParts.length > 1) {
    return (
      <span className={baseClass}>
        {codeParts.map((part, i) =>
          i % 2 === 1 ? (
            <code key={i} className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded text-foreground/70">{part}</code>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    )
  }

  return (
    <span className={baseClass}>{text}</span>
  )
}

// ---------------------------------------------------------------------------
// ActivityFeed — flat list of real tool actions
// ---------------------------------------------------------------------------
export interface ActivityFeedProps {
  actions: ToolAction[]
  isPolling?: boolean
}

export function ActivityFeed({ actions, isPolling }: ActivityFeedProps) {
  return (
    <div className="flex flex-col shrink-0 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          {isPolling && (
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Activity
          </span>
          {actions.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50">
              {actions.length}
            </span>
          )}
        </div>
        {isPolling && (
          <span className="text-[10px] text-muted-foreground/50">Live</span>
        )}
      </div>

      {/* Actions list */}
      <div className="flex flex-col py-1 px-3 gap-0.5 overflow-y-auto max-h-[240px]">
        {actions.length === 0 && (
          <span className="text-[11px] text-muted-foreground/50 px-2 py-3">
            Waiting for agent activity...
          </span>
        )}
        {[...actions].reverse().map((action) => (
          <div key={action.id} className="flex items-start py-1 gap-2">
            {/* Timestamp */}
            <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0 mt-px leading-3">
              {formatTime(action.timestamp)}
            </span>
            {/* Content */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <ActionText
                text={describeToolAction(action)}
                failed={isDelegation(action) && action.status !== "completed"}
              />
              {action.durationMs != null && action.durationMs > 0 && (
                <span className="text-[9px] text-muted-foreground/40">
                  {action.durationMs < 1000
                    ? `${action.durationMs}ms`
                    : `${(action.durationMs / 1000).toFixed(1)}s`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

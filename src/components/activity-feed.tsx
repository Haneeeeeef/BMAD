"use client"

import { memo, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ActivityEntry } from "@/components/agent-panel"

// ---------------------------------------------------------------------------
// Simple-variant types (kept for backward-compat with callers using the
// lightweight activity shape)
// ---------------------------------------------------------------------------
type SimpleActivityType = "started" | "progress" | "completed" | "error" | "question" | "human"

export interface Activity {
  id: string
  timestamp: string
  agent: string
  type: SimpleActivityType
  message: string
}

// ---------------------------------------------------------------------------
// Unified props
// ---------------------------------------------------------------------------
export interface ActivityFeedProps {
  /**
   * "simple"  -- lightweight list inside a ScrollArea (original root component)
   * "detailed" -- workspace panel with header, live indicator, elapsed timestamps
   *
   * @default "simple"
   */
  variant?: "simple" | "detailed"

  /** Simple-variant data (Activity[]) */
  activities?: Activity[]
  /** Max height for the simple-variant ScrollArea */
  maxHeight?: string

  /** Detailed-variant data (ActivityEntry[]) */
  entries?: ActivityEntry[]
  /** Max entries to display in the detailed variant */
  maxEntries?: number
}

// ---------------------------------------------------------------------------
// Simple-variant internals (previously in activity-item.tsx)
// ---------------------------------------------------------------------------
const simpleTypeConfig: Record<SimpleActivityType, { color: string }> = {
  started:   { color: "text-blue-500" },
  progress:  { color: "text-muted-foreground" },
  completed: { color: "text-green-500" },
  error:     { color: "text-destructive" },
  question:  { color: "text-amber-500" },
  human:     { color: "text-violet-500" },
}

const SimpleActivityItem = memo(function SimpleActivityItem({
  timestamp,
  agent,
  type,
  message,
}: {
  timestamp: string
  agent: string
  type: SimpleActivityType
  message: string
}) {
  const config = simpleTypeConfig[type]

  return (
    <div className="flex gap-3 py-2">
      <span className="text-xs text-muted-foreground w-12 shrink-0">
        {timestamp}
      </span>
      <span className={cn("text-xs font-medium w-24 shrink-0 truncate", config.color)}>
        {agent}
      </span>
      <span className="text-xs text-foreground">
        {message}
      </span>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Detailed-variant internals (previously in workspace/activity-feed.tsx)
// ---------------------------------------------------------------------------

/** Format elapsed seconds as mm:ss */
function formatElapsed(timestamp: number): string {
  const elapsed = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const ss = String(elapsed % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

/**
 * Highlight bold segments in activity text.
 * Wraps text between **...** in a <strong> with emerald color.
 * Falls back to rendering the target field as bold when no markers found.
 */
function ActivityText({ content, target }: { content: string; target?: string }) {
  const boldPattern = /\*\*(.+?)\*\*/g
  if (boldPattern.test(content)) {
    const parts = content.split(/\*\*(.+?)\*\*/)
    return (
      <span className="text-[11px] leading-[15px] text-muted-foreground">
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className="font-medium text-foreground/80">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    )
  }

  if (target) {
    return (
      <span className="text-[11px] leading-[15px] text-muted-foreground">
        {content}{" "}
        <span className="font-medium text-emerald-500">{target}</span>
      </span>
    )
  }

  return (
    <span className="text-[11px] leading-[15px] text-muted-foreground">{content}</span>
  )
}

// ---------------------------------------------------------------------------
// Unified ActivityFeed component
// ---------------------------------------------------------------------------
export function ActivityFeed({
  variant = "simple",
  activities,
  maxHeight = "300px",
  entries,
  maxEntries = 20,
}: ActivityFeedProps) {
  // ---- Simple variant ----
  if (variant === "simple") {
    const items = activities ?? []

    if (items.length === 0) {
      return (
        <div className="text-sm text-muted-foreground text-center py-8">
          No activity yet
        </div>
      )
    }

    return (
      <ScrollArea className={maxHeight ? `h-[${maxHeight}]` : "h-[400px]"}>
        <div className="divide-y">
          {items.map((activity) => (
            <SimpleActivityItem
              key={activity.id}
              timestamp={activity.timestamp}
              agent={activity.agent}
              type={activity.type}
              message={activity.message}
            />
          ))}
        </div>
      </ScrollArea>
    )
  }

  // ---- Detailed variant ----
  const [tab, setTab] = useState<"activity" | "actions">("activity")
  const all = entries ?? []
  const isLive = all.length > 0 && Date.now() - all[0].timestamp < 120_000

  // Split: "actions" = precise agent ops (tool calls, task steps, init)
  // "activity" = everything else (user events, lifecycle, handoffs)
  const ACTION_TYPES = new Set(["tool:file_write", "tool:file_read", "tool:memory", "tool:search", "tool:bash", "tool:api", "task:start", "task:complete"])
  const activityEntries = all.filter(e => !ACTION_TYPES.has(e.type))
  const actionEntries = all.filter(e => ACTION_TYPES.has(e.type))

  const visible = (tab === "activity" ? activityEntries : actionEntries).slice(0, maxEntries)

  return (
    <div className="flex flex-col shrink-0 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-emerald-500 shrink-0" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Activity
          </span>
        </div>
        {isLive && (
          <span className="text-[10px] text-muted-foreground/50">Live</span>
        )}
      </div>

      {/* Pill tabs */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 shrink-0">
        <button
          onClick={() => setTab("activity")}
          className={cn(
            "px-3 py-1 text-[11px] font-medium rounded-full transition-colors",
            tab === "activity"
              ? "bg-[var(--brand)] text-[var(--confirm-foreground)]"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          Activity
          {activityEntries.length > 0 && (
            <span className="ml-1 opacity-70">{activityEntries.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("actions")}
          className={cn(
            "px-3 py-1 text-[11px] font-medium rounded-full transition-colors",
            tab === "actions"
              ? "bg-[var(--brand)] text-[var(--confirm-foreground)]"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          Actions
          {actionEntries.length > 0 && (
            <span className="ml-1 opacity-70">{actionEntries.length}</span>
          )}
        </button>
      </div>

      {/* Entries */}
      <div className="flex flex-col py-1 px-3 gap-0.5 overflow-y-auto max-h-[240px]">
        {visible.length === 0 && (
          <span className="text-[11px] text-muted-foreground/50 px-2 py-3">
            {tab === "activity" ? "No activity yet" : "No actions yet"}
          </span>
        )}
        {visible.map((entry) => (
          <div key={entry.id} className="flex items-start py-1 gap-2">
            {/* Timestamp */}
            <span className="text-[9px] font-mono text-muted-foreground/50 shrink-0 mt-px leading-3">
              {formatElapsed(entry.timestamp)}
            </span>
            {/* Dot */}
            <span
              className={cn(
                "inline-block h-1 w-1 rounded-full shrink-0 mt-[5px]",
                entry.type.startsWith("tool:file_write") ? "bg-blue-500" :
                entry.type.startsWith("tool:") ? "bg-zinc-400" :
                entry.type.startsWith("task:complete") ? "bg-emerald-500" :
                entry.type.startsWith("task:start") ? "bg-amber-500" :
                entry.type.startsWith("agent:error") ? "bg-red-500" :
                entry.type.startsWith("agent:") ? "bg-amber-500" :
                "bg-muted-foreground/50",
              )}
            />
            {/* Content */}
            <ActivityText content={entry.content} target={entry.target} />
          </div>
        ))}
      </div>
    </div>
  )
}

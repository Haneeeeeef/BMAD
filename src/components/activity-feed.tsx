"use client"

import { cn } from "@/lib/utils"

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
  agentId?: string
}

// ---------------------------------------------------------------------------
// Agent display names
// ---------------------------------------------------------------------------
const AGENT_DISPLAY: Record<string, { name: string; color: string }> = {
  jarvis: { name: "Jarvis", color: "text-[var(--brand-dark)]" },
  analyst: { name: "Mary", color: "text-emerald-600" },
  architect: { name: "Winston", color: "text-blue-600" },
  dev: { name: "Amelia", color: "text-violet-600" },
  pm: { name: "John", color: "text-amber-600" },
  qa: { name: "Quinn", color: "text-rose-600" },
  "quick-flow": { name: "Barry", color: "text-cyan-600" },
  sm: { name: "Bob", color: "text-orange-600" },
  "tech-writer": { name: "Paige", color: "text-teal-600" },
  ux: { name: "Sally", color: "text-pink-600" },
}

// ---------------------------------------------------------------------------
// Narrative description
// ---------------------------------------------------------------------------
function narrativeAction(action: ToolAction): { agent: string; agentColor: string; verb: string; detail: string } {
  const agentId = action.agentId || "jarvis"
  const display = AGENT_DISPLAY[agentId] || { name: agentId, color: "text-muted-foreground" }
  const args = action.args || {}
  const fileName = ((args.path || args.file_path || args.file || args.filename) as string)?.split("/").pop() || ""

  const tool = action.tool

  // Skip internal session files (UUIDs, .jsonl)
  if (fileName.match(/^[0-9a-f]{8}-.*\.jsonl/) || fileName.endsWith(".jsonl")) {
    return { agent: display.name, agentColor: display.color, verb: "checked", detail: "session history" }
  }

  if (tool === "read" || tool === "file_read") {
    if (fileName.includes("review-")) return { agent: display.name, agentColor: display.color, verb: "reviewed", detail: fileName }
    if (fileName.includes("CONTEXT") || fileName.includes("DECISIONS")) return { agent: display.name, agentColor: display.color, verb: "checked", detail: fileName }
    if (fileName.includes("SKILL")) return { agent: display.name, agentColor: display.color, verb: "loaded skill", detail: fileName }
    if (fileName.includes("TRANSCRIPT")) return { agent: display.name, agentColor: display.color, verb: "read transcript", detail: fileName }
    return { agent: display.name, agentColor: display.color, verb: "read", detail: fileName || "a file" }
  }

  if (tool === "write" || tool === "file_write" || tool === "save") {
    if (fileName.includes("review-")) return { agent: display.name, agentColor: display.color, verb: "wrote review", detail: fileName }
    if (fileName.includes("CONTEXT")) return { agent: display.name, agentColor: display.color, verb: "updated", detail: fileName }
    if (fileName.includes("DECISIONS")) return { agent: display.name, agentColor: display.color, verb: "logged decision in", detail: fileName }
    if (fileName.includes("TRANSCRIPT")) return { agent: display.name, agentColor: display.color, verb: "updated transcript", detail: fileName }
    if (fileName.includes("MEMORY")) return { agent: display.name, agentColor: display.color, verb: "saved memory to", detail: fileName }
    return { agent: display.name, agentColor: display.color, verb: "edited", detail: fileName || "a file" }
  }

  if (tool === "edit") {
    return { agent: display.name, agentColor: display.color, verb: "made changes to", detail: fileName || "a file" }
  }

  if (tool === "search" || tool === "grep" || tool === "find") {
    const query = (args.query || args.pattern || args.term) as string
    return { agent: display.name, agentColor: display.color, verb: "searched for", detail: query ? `"${query.slice(0, 30)}"` : "content" }
  }

  if (tool === "exec" || tool === "bash") {
    const fullCmd = (args.command as string) || ""
    // Find the first meaningful line (skip comments, blank, cd, set, echo without content)
    const lines = fullCmd.split("\n").map(l => l.trim()).filter(Boolean)
    const meaningfulLine = lines.find(l =>
      !l.startsWith("#") && !l.startsWith("set ") && l !== "done" && l !== "fi" && l !== "esac"
    ) || lines[0] || ""
    const cmd = meaningfulLine

    // Detect for/while loops — describe what they iterate over
    if (fullCmd.match(/\bfor\b.*\bin\b/)) {
      // Try to find what the loop does (look for the main action inside)
      const bodyAction = lines.find(l =>
        !l.startsWith("#") && !l.startsWith("for ") && !l.startsWith("do") &&
        l !== "done" && !l.startsWith("set ") && !l.startsWith("echo ===")
      )
      if (bodyAction) {
        if (bodyAction.includes("sed ")) {
          const fileMatch = bodyAction.match(/([^\s>|&;]+\.(?:md|yaml|json))\b/)
          return { agent: display.name, agentColor: display.color, verb: "batch edited", detail: fileMatch?.[1]?.split("/").pop() || "multiple files" }
        }
        if (bodyAction.includes("cat ") && (bodyAction.includes(">") || bodyAction.includes("<<"))) {
          return { agent: display.name, agentColor: display.color, verb: "batch wrote", detail: "multiple files" }
        }
        if (bodyAction.includes("grep ")) {
          return { agent: display.name, agentColor: display.color, verb: "searched across", detail: "multiple files" }
        }
      }
      const iterTarget = fullCmd.match(/for\s+\w+\s+in\s+([^;]+)/)?.[1]?.trim().slice(0, 30) || "items"
      return { agent: display.name, agentColor: display.color, verb: "batch processed", detail: iterTarget }
    }

    // Detect git commits
    if (fullCmd.includes("git commit")) {
      const msgMatch = fullCmd.match(/-m\s+["']([^"']+)["']/)
      return { agent: display.name, agentColor: display.color, verb: "committed", detail: msgMatch?.[1]?.slice(0, 60) || "changes" }
    }
    if (cmd.match(/^\s*git\s+add\b/)) {
      const files = cmd.replace(/git\s+add\s+(-A\s+)?/, "").trim()
      const short = files.split(" ").map(f => f.split("/").pop()).join(", ").slice(0, 40)
      return { agent: display.name, agentColor: display.color, verb: "staged", detail: short || "files" }
    }
    // Detect grep/search — show pattern and target
    if (cmd.includes("grep ")) {
      const patternMatch = cmd.match(/grep\s+(?:-[a-zA-Z]+\s+)*["']([^"']+)["']/) || cmd.match(/grep\s+(?:-[a-zA-Z]+\s+)*(\S+)/)
      const target = cmd.split("|")[0]?.match(/([^\s"']+\.(?:md|yaml|json|ts|js|txt))\b/)
      const pattern = patternMatch?.[1]?.slice(0, 25) || ""
      const file = target?.[1]?.split("/").pop() || ""
      const detail = [pattern && `"${pattern}"`, file && `in ${file}`].filter(Boolean).join(" ") || "files"
      return { agent: display.name, agentColor: display.color, verb: "searched", detail }
    }
    // Detect heredoc writes (cat << 'EOF' > file) — scan full command for the target file
    if (fullCmd.includes("<<")) {
      const fileMatch = fullCmd.match(/>\s*(?:["'])?([^\s"'\n]+\.(?:md|yaml|json|ts|js|drawio|html))/) ||
                        fullCmd.match(/>\s*(?:["'])?([^\s"'\n]+)/)
      const file = fileMatch ? fileMatch[1].split("/").pop() : null
      if (file) return { agent: display.name, agentColor: display.color, verb: "wrote", detail: file }
    }
    // Detect file reads (cat without redirect)
    if (cmd.includes("cat ") && !cmd.includes(">") && !cmd.includes("<<")) {
      const fileMatch = cmd.match(/cat\s+(?:["'])?([^\s"'|>]+)/)
      const file = fileMatch ? fileMatch[1].split("/").pop() : "file"
      return { agent: display.name, agentColor: display.color, verb: "read", detail: file || "file" }
    }
    // Detect directory changes — show last 2 path segments
    if (cmd.match(/^\s*cd\s/)) {
      const dirMatch = cmd.match(/cd\s+(?:["'])?([^\s"'&;]+)/)
      const fullPath = dirMatch?.[1] || ""
      const parts = fullPath.split("/").filter(Boolean)
      const dir = parts.length > 1 ? parts.slice(-2).join("/") : parts.pop() || "directory"
      return { agent: display.name, agentColor: display.color, verb: "navigated to", detail: dir }
    }
    // Detect file writes (echo > file, tee file)
    if (cmd.includes(" > ") || cmd.includes(" >> ") || cmd.includes("tee ")) {
      const outMatch = cmd.match(/(?:>|>>|tee)\s*(?:["'])?([^\s"']+)/)
      const file = outMatch ? outMatch[1].split("/").pop() : "file"
      return { agent: display.name, agentColor: display.color, verb: "wrote", detail: file || "file" }
    }
    // Detect mkdir
    if (cmd.includes("mkdir")) {
      const dirMatch = cmd.match(/mkdir\s+(?:-p\s+)?(?:["'])?([^\s"'&;]+)/)
      const dir = dirMatch ? dirMatch[1].split("/").pop() : "directory"
      return { agent: display.name, agentColor: display.color, verb: "created folder", detail: dir || "directory" }
    }
    // Detect ls/find/tree
    if (cmd.match(/^\s*(ls|find|tree)\b/)) {
      const dirMatch = cmd.match(/(?:ls|find|tree)\s+(?:-[a-zA-Z]+\s+)*(?:["'])?([^\s"'|>-][^\s"'|>]*)/)
      const dir = dirMatch ? dirMatch[1].split("/").pop() : "files"
      return { agent: display.name, agentColor: display.color, verb: "listed", detail: dir || "files" }
    }
    // Detect sed/editing
    if (cmd.includes("sed ")) {
      const fileMatch = cmd.match(/\s([^\s>|&;]+\.(?:md|yaml|json|ts|js))\b/)
      const file = fileMatch ? fileMatch[1].split("/").pop() : "file"
      return { agent: display.name, agentColor: display.color, verb: "edited", detail: file || "file" }
    }
    // Detect echo without redirect — show what was echoed
    if (cmd.match(/^\s*echo\s/) && !cmd.includes(">")) {
      const msgMatch = cmd.match(/echo\s+["']([^"']+)["']/) || cmd.match(/echo\s+(.+)/)
      const msg = msgMatch?.[1]?.slice(0, 35) || "status"
      return { agent: display.name, agentColor: display.color, verb: "logged", detail: `"${msg}"` }
    }
    // Detect git operations (status, diff, log, etc.)
    if (cmd.includes("git ")) {
      const gitCmd = cmd.match(/git\s+(\w+)/)?.[1] || "operation"
      return { agent: display.name, agentColor: display.color, verb: "ran git", detail: gitCmd }
    }
    // Comment-only or empty — try to extract meaning from the full command
    const trimmed = cmd.trim()
    if (trimmed.startsWith("#") || !trimmed) {
      // Look deeper in the full command for something meaningful
      const deepAction = lines.find(l =>
        !l.startsWith("#") && l.length > 2 && !l.startsWith("echo ===")
      )
      if (deepAction) {
        if (deepAction.includes("sed ")) return { agent: display.name, agentColor: display.color, verb: "edited", detail: deepAction.match(/([^\s]+\.md)\b/)?.[1]?.split("/").pop() || "files" }
        if (deepAction.includes("cat ")) return { agent: display.name, agentColor: display.color, verb: "read", detail: deepAction.match(/cat\s+([^\s|>]+)/)?.[1]?.split("/").pop() || "file" }
        if (deepAction.includes("git ")) return { agent: display.name, agentColor: display.color, verb: "ran git", detail: deepAction.match(/git\s+(\w+)/)?.[1] || "operation" }
        const word = deepAction.split(" ")[0]
        return { agent: display.name, agentColor: display.color, verb: "ran", detail: word }
      }
      return { agent: display.name, agentColor: display.color, verb: "ran", detail: "script" }
    }
    // Fallback — show the command name
    const lastCmd = cmd.split("&&").pop()?.trim() || cmd
    const firstWord = lastCmd.split(" ")[0] || "command"
    return { agent: display.name, agentColor: display.color, verb: "ran", detail: firstWord }
  }

  if (tool === "sessions_send" || tool === "delegate") {
    const target = (args.agent || args.target) as string
    const targetName = target ? (AGENT_DISPLAY[target]?.name || target) : "another agent"
    return { agent: display.name, agentColor: display.color, verb: "consulted", detail: targetName }
  }

  if (tool === "memory" || tool === "memory_store" || tool === "memory_flush") {
    return { agent: display.name, agentColor: display.color, verb: "saved to", detail: "memory" }
  }

  if (tool === "web" || tool === "fetch" || tool === "http") {
    const url = args.url as string
    let host = "the web"
    if (url) { try { host = new URL(url).hostname } catch {} }
    return { agent: display.name, agentColor: display.color, verb: "fetched", detail: host }
  }

  if (tool === "session_status" || tool === "session status") {
    return { agent: display.name, agentColor: display.color, verb: "checked", detail: "session status" }
  }

  if (tool === "sessions_spawn") {
    return { agent: display.name, agentColor: display.color, verb: "spawned", detail: "a sub-agent" }
  }

  if (tool === "sessions_history") {
    return { agent: display.name, agentColor: display.color, verb: "read", detail: "session history" }
  }

  if (tool === "sessions_list") {
    return { agent: display.name, agentColor: display.color, verb: "listed", detail: "active sessions" }
  }

  return { agent: display.name, agentColor: display.color, verb: "used", detail: tool.replace(/_/g, " ") }
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------
function relativeTime(timestamp: number): string {
  if (!timestamp) return ""
  const diff = Date.now() - timestamp
  if (diff < 5000) return "now"
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function formatFullTime(timestamp: number): string {
  if (!timestamp) return ""
  return new Date(timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
}

// ---------------------------------------------------------------------------
// ActivityFeed
// ---------------------------------------------------------------------------
export interface ActivityFeedProps {
  actions: ToolAction[]
  isPolling?: boolean
}

export function ActivityFeed({ actions, isPolling }: ActivityFeedProps) {
  const reversed = [...actions].reverse()

  return (
    <div className="flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          {isPolling && (
            <span className="inline-block h-[5px] w-[5px] rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          )}
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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

      {/* Actions list — narrative style */}
      <div className="flex flex-col py-1.5 px-3 gap-0.5 overflow-y-auto max-h-[240px]">
        {actions.length === 0 && (
          <span className="text-[11px] text-muted-foreground/50 px-1 py-3">
            Waiting for agent activity…
          </span>
        )}
        {(() => {
          const deduped: { agent: string; agentColor: string; verb: string; detail: string; timestamp: number; count: number }[] = []
          for (const action of reversed) {
            const n = narrativeAction(action)
            const last = deduped[deduped.length - 1]
            if (last && last.agent === n.agent && last.verb === n.verb && last.detail === n.detail) {
              last.count++
              continue
            }
            deduped.push({ ...n, timestamp: action.timestamp, count: 1 })
          }

          return deduped.map((item, i) => (
            <p
              key={i}
              className="text-[11px] leading-[17px] text-muted-foreground/60 py-0.5"
              title={formatFullTime(item.timestamp)}
            >
              <span className={cn("font-medium", item.agentColor)}>{item.agent}</span>
              {" "}{item.verb}{" "}
              <span className="font-medium text-foreground/70">{item.detail}</span>
              {item.count > 1 && <span className="text-muted-foreground/30"> ({item.count}x)</span>}
              {" "}<span className="text-muted-foreground/25">{relativeTime(item.timestamp)}</span>
            </p>
          ))
        })()}
      </div>
    </div>
  )
}

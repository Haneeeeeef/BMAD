import { CanvasStatus } from "./canvas-types"

export interface CanvasData {
  sessionId: string
  content: string
  status: CanvasStatus
  sections?: Record<string, string>
  createdAt: number
  updatedAt: number
  approvedAt?: number
}

// Agent completion notifications
export interface AgentCompletion {
  agentId: string
  reportPath: string
  completedAt: number
  acknowledged: boolean
}

const COMPLETIONS_KEY_PREFIX = "agent_completions_"

const STORAGE_KEY_PREFIX = "canvas_"

export function getCanvasKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`
}

export function loadCanvas(sessionId: string): CanvasData | null {
  if (typeof window === "undefined") return null

  try {
    const key = getCanvasKey(sessionId)
    const stored = localStorage.getItem(key)
    if (!stored) return null
    return JSON.parse(stored) as CanvasData
  } catch {
    return null
  }
}

export function saveCanvas(data: CanvasData): void {
  if (typeof window === "undefined") return

  try {
    const key = getCanvasKey(data.sessionId)
    localStorage.setItem(key, JSON.stringify({
      ...data,
      updatedAt: Date.now(),
    }))
  } catch {
    console.error("Failed to save canvas to localStorage")
  }
}

export function approveCanvas(sessionId: string): CanvasData | null {
  const canvas = loadCanvas(sessionId)
  if (!canvas) return null

  const updated: CanvasData = {
    ...canvas,
    status: "approved",
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  }

  saveCanvas(updated)
  return updated
}

export function deleteCanvas(sessionId: string): void {
  if (typeof window === "undefined") return

  try {
    const key = getCanvasKey(sessionId)
    localStorage.removeItem(key)
  } catch {
    console.error("Failed to delete canvas from localStorage")
  }
}

// Get canvas status summary for injecting into AI context
export function getCanvasStatusSummary(sessionId: string): string | null {
  const canvas = loadCanvas(sessionId)
  if (!canvas) return null

  if (canvas.status === "approved" && canvas.approvedAt) {
    const date = new Date(canvas.approvedAt).toISOString()
    return `[Canvas Status: Approved at ${date}]`
  }

  return `[Canvas Status: ${canvas.status}]`
}

// Agent completion functions
function getCompletionsKey(sessionId: string): string {
  return `${COMPLETIONS_KEY_PREFIX}${sessionId}`
}

export function loadAgentCompletions(sessionId: string): AgentCompletion[] {
  if (typeof window === "undefined") return []

  try {
    const key = getCompletionsKey(sessionId)
    const stored = localStorage.getItem(key)
    if (!stored) return []
    return JSON.parse(stored) as AgentCompletion[]
  } catch {
    return []
  }
}

export function addAgentCompletion(
  sessionId: string,
  agentId: string,
  reportPath: string
): void {
  if (typeof window === "undefined") return

  try {
    const completions = loadAgentCompletions(sessionId)
    completions.push({
      agentId,
      reportPath,
      completedAt: Date.now(),
      acknowledged: false,
    })
    const key = getCompletionsKey(sessionId)
    localStorage.setItem(key, JSON.stringify(completions))
  } catch {
    console.error("Failed to save agent completion")
  }
}

export function acknowledgeCompletion(sessionId: string, agentId: string): void {
  if (typeof window === "undefined") return

  try {
    const completions = loadAgentCompletions(sessionId)
    const updated = completions.map((c) =>
      c.agentId === agentId ? { ...c, acknowledged: true } : c
    )
    const key = getCompletionsKey(sessionId)
    localStorage.setItem(key, JSON.stringify(updated))
  } catch {
    console.error("Failed to acknowledge completion")
  }
}

// Get unacknowledged agent completions for system prompt injection
export function getAgentCompletionsSummary(sessionId: string): string | null {
  const completions = loadAgentCompletions(sessionId)
  const pending = completions.filter((c) => !c.acknowledged)

  if (pending.length === 0) return null

  return pending
    .map((c) => `[Agent Complete: ${c.agentId} | Report: ${c.reportPath}]`)
    .join("\n")
}

// Combined context for system prompt (canvas + completions)
export function getSessionContext(sessionId: string): string | null {
  const parts: string[] = []

  const canvasStatus = getCanvasStatusSummary(sessionId)
  if (canvasStatus) parts.push(canvasStatus)

  const completions = getAgentCompletionsSummary(sessionId)
  if (completions) parts.push(completions)

  return parts.length > 0 ? parts.join("\n") : null
}

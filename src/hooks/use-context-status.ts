"use client"

import { useQuery } from "@tanstack/react-query"
import { authHeaders } from "@/lib/safe-storage"
import { getWorkflowById, type Deliverable } from "@/lib/bmad-types"
import type { Agent } from "@/components/agent-panel"

export type AgentContext = {
  tokens: number
  maxTokens: number
  percentage: number
  status: Agent["status"] // "active" | "idle" | "thinking" | "error"
  activeSessions: number
}

type ContextResult = {
  contextMap: Record<string, AgentContext>
  sessionDetails: SessionDetail[]
}

export type SessionDetail = {
  agentId: string
  agentName: string
  deliverableId: string
  deliverableName: string
  sessionId: string
  tokens: number
  maxTokens: number
  percentage: number
}

// Model → context window mapping
// Source of truth: openclaw.json model assignments + provider specs
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "claude-opus-4-6": 1_000_000,
  "claude-sonnet-4-6": 200_000,
  "claude-haiku-4-5": 200_000,
  "kimi-k2.5": 256_000,
  "MiniMax-M2.5": 200_000,
  "MiniMax-M2.5-Lightning": 200_000,
}

// Current agent → model mapping (from openclaw.json)
// Updated when agents are switched between models
const AGENT_MODELS: Record<string, string> = {
  jarvis: "claude-opus-4-6",
  analyst: "claude-opus-4-6",
  architect: "claude-opus-4-6",
  dev: "claude-opus-4-6",
  pm: "claude-opus-4-6",
  qa: "claude-opus-4-6",
  sm: "claude-opus-4-6",
  "tech-writer": "claude-opus-4-6",
  ux: "claude-opus-4-6",
  "quick-flow": "claude-opus-4-6",
}

function getMaxTokensForAgent(agentId: string): number {
  const model = AGENT_MODELS[agentId]
  return model ? (MODEL_CONTEXT_WINDOWS[model] || 200_000) : 200_000
}

async function fetchContextStatus(deliverables: Deliverable[]): Promise<ContextResult> {
  const hdrs = authHeaders()
  const agentAgg: Record<string, { totalTokens: number; maxTokens: number; activeSessions: number; hasError: boolean }> = {}
  const sessionDetails: SessionDetail[] = []

  // Build list of session keys to poll: each deliverable's agent + Jarvis (reviewer)
  const pollTargets: { agentId: string; agentName: string; sessionId: string; deliverableId: string; deliverableName: string }[] = []

  for (const d of deliverables) {
    const sid = d.sessionId
    if (!sid) continue

    const wf = getWorkflowById(d.workflowId)
    const agentId = wf?.agent || "jarvis"
    const agentName = wf?.agentName || "Jarvis"

    // Poll the deliverable's own agent
    pollTargets.push({ agentId, agentName, sessionId: sid, deliverableId: d.id, deliverableName: d.name })

    // Also poll Jarvis for this session (reviews use the same sessionId with agent:jarvis)
    if (agentId !== "jarvis") {
      pollTargets.push({ agentId: "jarvis", agentName: "Jarvis", sessionId: sid, deliverableId: d.id, deliverableName: d.name })
    }
  }

  await Promise.all(
    pollTargets.map(async ({ agentId, agentName, sessionId, deliverableId, deliverableName }) => {
      const sessionKey = `agent:${agentId}:mc:${sessionId}`

      try {
        const res = await fetch(
          `/api/session/status?sessionKey=${encodeURIComponent(sessionKey)}`,
          { headers: hdrs },
        )
        if (!res.ok) return
        const data = await res.json()

        if (!agentAgg[agentId]) {
          agentAgg[agentId] = { totalTokens: 0, maxTokens: getMaxTokensForAgent(agentId), activeSessions: 0, hasError: false }
        }

        if (data.tokens > 0) {
          const maxTokens = getMaxTokensForAgent(agentId)
          agentAgg[agentId].totalTokens += data.tokens
          agentAgg[agentId].activeSessions++
          if (maxTokens > agentAgg[agentId].maxTokens) {
            agentAgg[agentId].maxTokens = maxTokens
          }

          sessionDetails.push({
            agentId,
            agentName,
            deliverableId,
            deliverableName,
            sessionId,
            tokens: data.tokens,
            maxTokens,
            percentage: Math.round((data.tokens / maxTokens) * 100),
          })
        }
      } catch {
        if (agentAgg[agentId]) agentAgg[agentId].hasError = true
      }
    }),
  )

  const contextMap: Record<string, AgentContext> = {}
  for (const [agentId, agg] of Object.entries(agentAgg)) {
    const percentage = Math.min(Math.round((agg.totalTokens / agg.maxTokens) * 100), 100)
    contextMap[agentId] = {
      tokens: agg.totalTokens,
      maxTokens: agg.maxTokens,
      percentage,
      status: agg.hasError ? "error" : agg.activeSessions > 0 ? "active" : "idle",
      activeSessions: agg.activeSessions,
    }
  }
  return { contextMap, sessionDetails }
}

export function useContextStatus(deliverables: Deliverable[]) {
  return useQuery({
    queryKey: ["context-status", deliverables.map(d => d.sessionId).join(",")],
    queryFn: () => fetchContextStatus(deliverables),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

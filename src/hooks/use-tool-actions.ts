"use client"

import { useQuery } from "@tanstack/react-query"
import { authHeaders } from "@/lib/safe-storage"
import { getWorkflowById, type Deliverable } from "@/lib/bmad-types"
import type { ToolAction } from "@/components/activity-feed"

async function fetchToolActions(deliverable: Deliverable): Promise<ToolAction[]> {
  const wf = getWorkflowById(deliverable.workflowId)
  const agentId = wf?.agent || "jarvis"
  const hdrs = authHeaders()

  // Poll both the deliverable's agent and Jarvis (reviewer)
  const agentIds = agentId === "jarvis" ? ["jarvis"] : [agentId, "jarvis"]

  const results = await Promise.all(
    agentIds.map(async (aid) => {
      const sessionKey = `agent:${aid}:mc:${deliverable.sessionId}`
      try {
        const res = await fetch(
          `/api/session/history?sessionKey=${encodeURIComponent(sessionKey)}`,
          { headers: hdrs },
        )
        if (!res.ok) return []
        const data = await res.json()
        return (data.actions || []).map((a: ToolAction) => ({ ...a, agentId: aid }))
      } catch {
        return []
      }
    }),
  )

  // Merge and sort by timestamp
  return results.flat().sort((a, b) => a.timestamp - b.timestamp)
}

export function useToolActions(deliverable: Deliverable | undefined) {
  return useQuery({
    queryKey: ["tool-actions", deliverable?.sessionId, deliverable?.workflowId],
    queryFn: () => fetchToolActions(deliverable!),
    enabled: !!deliverable?.sessionId,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  })
}

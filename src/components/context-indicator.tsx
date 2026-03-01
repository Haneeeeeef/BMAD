"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Brain } from "lucide-react"
import { authHeaders } from "@/lib/safe-storage"

interface SessionStatus {
  tokens: number
  percentage: number
  maxTokens: number
  sessionCount: number
}

export function ContextIndicator() {
  const params = useParams()
  const sessionId = params?.id as string | undefined
  const [status, setStatus] = useState<SessionStatus | null>(null)
  const [error, setError] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const url = sessionId
        ? `/api/session/status?sessionId=${sessionId}`
        : "/api/session/status"
      const response = await fetch(url, { headers: authHeaders() })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setError(false)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    }
  }, [sessionId])

  useEffect(() => {
    fetchStatus()
    // Refresh every 30 seconds as backup
    const interval = setInterval(fetchStatus, 30000)

    // Listen for chat messages to refresh
    const handleRefresh = () => setTimeout(fetchStatus, 1000)
    window.addEventListener("chat-message-sent", handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener("chat-message-sent", handleRefresh)
    }
  }, [fetchStatus])

  if (error || !status) {
    return null
  }

  // Color based on percentage
  const getColor = (pct: number) => {
    if (pct < 50) return "text-emerald-500"
    if (pct < 80) return "text-yellow-500"
    return "text-red-500"
  }

  const getBgColor = (pct: number) => {
    if (pct < 50) return "bg-emerald-500/10"
    if (pct < 80) return "bg-yellow-500/10"
    return "bg-red-500/10"
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${getColor(status.percentage)} ${getBgColor(status.percentage)} cursor-default`}
          aria-label={`Context usage: ${status.percentage}% - ${status.percentage < 50 ? "low" : status.percentage < 80 ? "moderate" : "high"}`}
        >
          <Brain className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{status.percentage}%</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-xs">
          <div className="font-medium">Jarvis Context</div>
          <div className="text-muted-foreground">
            {formatTokens(status.tokens)} / {formatTokens(status.maxTokens)} tokens
          </div>
          {status.percentage >= 80 && (
            <div className="text-red-400 mt-1">Consider clearing session</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

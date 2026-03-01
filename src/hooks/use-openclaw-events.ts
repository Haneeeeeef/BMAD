"use client"

import { useEffect, useRef, useState, useCallback } from "react"

// OpenClaw event types
export type ToolEvent = {
  id: string
  stream: "tool"
  phase: "start" | "end" | "error"
  tool: string
  params?: Record<string, unknown>
  result?: unknown
  error?: string
  timestamp: number
}

export type AssistantEvent = {
  stream: "assistant"
  delta: string
  timestamp: number
}

export type LifecycleEvent = {
  stream: "lifecycle"
  phase: "start" | "end" | "error"
  runId: string
  timestamp: number
}

export type OpenClawEvent = ToolEvent | AssistantEvent | LifecycleEvent

type UseOpenClawEventsOptions = {
  enabled?: boolean
  onToolEvent?: (event: ToolEvent) => void
  onAssistantEvent?: (event: AssistantEvent) => void
  onLifecycleEvent?: (event: LifecycleEvent) => void
}

type ConnectionState = "disconnected" | "connecting" | "connected" | "error"

export function useOpenClawEvents({
  enabled = true,
  onToolEvent,
  onAssistantEvent,
  onLifecycleEvent,
}: UseOpenClawEventsOptions = {}) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected")
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([])
  const [completedTools, setCompletedTools] = useState<ToolEvent[]>([])
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear tools for new run
  const clearTools = useCallback(() => {
    setActiveTools([])
    setCompletedTools([])
  }, [])

  // Handle incoming SSE message
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data)
      const timestamp = Date.now()

      // Handle close/error
      if (msg.type === "close" || msg.type === "error") {
        setConnectionState("error")
        return
      }

      // Handle server-push events
      if (msg.type === "event" && msg.payload) {
        const payload = msg.payload

        if (payload.stream === "tool") {
          const toolEvent: ToolEvent = {
            id: `tool-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
            stream: "tool",
            phase: payload.phase,
            tool: payload.tool || payload.name || "unknown",
            params: payload.params || payload.input,
            result: payload.result || payload.output,
            error: payload.error,
            timestamp,
          }

          if (payload.phase === "start") {
            setActiveTools(prev => [...prev, toolEvent])
          } else if (payload.phase === "end" || payload.phase === "error") {
            setActiveTools(prev => prev.filter(t => t.tool !== toolEvent.tool))
            setCompletedTools(prev => [...prev, toolEvent].slice(-20))
          }

          onToolEvent?.(toolEvent)
        } else if (payload.stream === "assistant") {
          onAssistantEvent?.({
            stream: "assistant",
            delta: payload.delta || payload.content || "",
            timestamp,
          })
        } else if (payload.stream === "lifecycle") {
          const lifecycleEvent: LifecycleEvent = {
            stream: "lifecycle",
            phase: payload.phase,
            runId: payload.runId,
            timestamp,
          }

          if (payload.phase === "start") {
            setCurrentRunId(payload.runId)
            clearTools()
          } else if (payload.phase === "end" || payload.phase === "error") {
            setCurrentRunId(null)
          }

          onLifecycleEvent?.(lifecycleEvent)
        }
      }

      // Handle subscription confirmation
      if (msg.type === "res" && msg.ok) {
        setConnectionState("connected")
      }
    } catch {
      // Ignore parse errors
    }
  }, [onToolEvent, onAssistantEvent, onLifecycleEvent, clearTools])

  // Connect via SSE proxy with exponential backoff
  const retryCount = useRef(0)

  const connect = useCallback(() => {
    if (eventSourceRef.current) return

    setConnectionState("connecting")

    try {
      const es = new EventSource("/api/agent/events")
      eventSourceRef.current = es

      es.onopen = () => {
        setConnectionState("connected")
        retryCount.current = 0 // Reset backoff on success
      }

      es.onmessage = handleMessage

      es.onerror = () => {
        setConnectionState("error")
        es.close()
        eventSourceRef.current = null

        // Exponential backoff: 5s, 10s, 20s, 30s max
        if (enabled) {
          const delay = Math.min(5000 * Math.pow(2, retryCount.current), 30000)
          retryCount.current++
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        }
      }
    } catch {
      setConnectionState("error")
    }
  }, [enabled, handleMessage])

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setConnectionState("disconnected")
  }, [])

  // Connect/disconnect based on enabled state
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  // Manual tool event injection (for parsing from chat responses)
  const injectToolEvent = useCallback((tool: string, phase: "start" | "end" | "error", params?: Record<string, unknown>) => {
    const timestamp = Date.now()
    const toolEvent: ToolEvent = {
      id: `tool-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      stream: "tool",
      phase,
      tool,
      params,
      timestamp,
    }

    if (phase === "start") {
      setActiveTools(prev => [...prev, toolEvent])
    } else {
      setActiveTools(prev => prev.filter(t => t.tool !== tool))
      setCompletedTools(prev => [...prev, toolEvent].slice(-20))
    }

    onToolEvent?.(toolEvent)
  }, [onToolEvent])

  return {
    connectionState,
    activeTools,
    completedTools,
    currentRunId,
    isRunning: currentRunId !== null,
    clearTools,
    reconnect: connect,
    injectToolEvent,
  }
}

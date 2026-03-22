"use client"

import { useState, useCallback, useRef } from "react"
import { Message, generateId } from "@/lib/types"
import { authHeaders } from "@/lib/safe-storage"
import { parseSSEStream } from "@/lib/sse"

interface UseChatOptions {
  initialMessages?: Message[]
  onFinish?: (message: Message) => void
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(options.initialMessages || [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    const assistantMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to send message")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const { content: fullContent } = await parseSSEStream(reader, {
        onContent: (_chunk, full) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: full }
                : m
            )
          )
        },
      })

      const finalMessage = { ...assistantMessage, content: fullContent }
      options.onFinish?.(finalMessage)

      // Dispatch event for context indicator to refresh
      window.dispatchEvent(new CustomEvent("chat-message-sent"))
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Ignore abort errors
        return
      }
      setError(err instanceof Error ? err.message : "An error occurred")
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, options])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    messages,
    setMessages,
    isLoading,
    error,
    sendMessage,
    stop,
    reset,
  }
}

"use client"

import { useState, useCallback } from "react"
import { ChatSession, Message, generateId, generateTitle } from "@/lib/types"

// Legacy Jarvis chat sessions — no longer persisted to localStorage.
// Kept as in-memory state to avoid breaking ChatProvider/sidebar.
// All project work now goes through deliverables → MongoDB.

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const isLoaded = true

  const createSession = useCallback((firstMessage: string): ChatSession => {
    const now = Date.now()
    const session: ChatSession = {
      id: generateId(),
      title: generateTitle(firstMessage),
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
    setSessions((prev) => [session, ...prev])
    return session
  }, [])

  const updateSession = useCallback(
    (id: string, updates: Partial<Pick<ChatSession, "title" | "messages">>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
        )
      )
    },
    []
  )

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const getSession = useCallback(
    (id: string): ChatSession | undefined => {
      return sessions.find((s) => s.id === id)
    },
    [sessions]
  )

  const addMessage = useCallback(
    (sessionId: string, message: Message) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, messages: [...s.messages, message], updatedAt: Date.now() }
            : s
        )
      )
    },
    []
  )

  const updateMessage = useCallback(
    (sessionId: string, messageId: string, content: string) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === messageId ? { ...m, content } : m
                ),
                updatedAt: Date.now(),
              }
            : s
        )
      )
    },
    []
  )

  return {
    sessions,
    isLoaded,
    createSession,
    updateSession,
    deleteSession,
    getSession,
    addMessage,
    updateMessage,
  }
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { ChatSession, Message, generateId, generateTitle } from "@/lib/types"

const STORAGE_KEY = "mission-control-sessions"

function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions())
    setIsLoaded(true)
  }, [])

  // Save sessions to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      saveSessions(sessions)
    }
  }, [sessions, isLoaded])

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
            ? {
                ...s,
                messages: [...s.messages, message],
                updatedAt: Date.now(),
              }
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

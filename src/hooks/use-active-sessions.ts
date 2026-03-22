"use client"

import { useMemo } from "react"
import { useChatContext } from "@/contexts/chat-context"
import type { ChatSession } from "@/lib/types"

/**
 * Returns sessions that haven't been converted to projects yet.
 * Legacy — Jarvis chat sessions are no longer persisted.
 */
export function useActiveSessions(): ChatSession[] {
  const { sessions } = useChatContext()
  return useMemo(() => sessions, [sessions])
}

/**
 * Check if a specific session has been converted to a project.
 * Legacy — always returns false since sessions are in-memory only.
 */
export function useIsSessionConverted(_sessionId: string): boolean {
  return false
}

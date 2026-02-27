"use client"

import { useMemo } from "react"
import { useChatContext } from "@/contexts/chat-context"
import { loadProjects } from "@/lib/projects-storage"
import type { ChatSession } from "@/lib/types"

/**
 * Returns sessions that haven't been converted to projects yet.
 * Once a project is created from a chat, that chat is hidden from the sidebar
 * since it now lives as a project.
 */
export function useActiveSessions(): ChatSession[] {
  const { sessions } = useChatContext()

  return useMemo(() => {
    const projects = loadProjects()
    const projectSessionIds = new Set(
      projects
        .filter(p => p.chatSessionId)
        .map(p => p.chatSessionId!)
    )

    return sessions.filter(s => !projectSessionIds.has(s.id))
  }, [sessions])
}

/**
 * Check if a specific session has been converted to a project
 */
export function useIsSessionConverted(sessionId: string): boolean {
  return useMemo(() => {
    const projects = loadProjects()
    return projects.some(p => p.chatSessionId === sessionId)
  }, [sessionId])
}

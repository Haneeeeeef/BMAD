"use client"

import { createContext, useContext, ReactNode } from "react"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { ChatSession, Message } from "@/lib/types"

interface ChatContextValue {
  sessions: ChatSession[]
  isLoaded: boolean
  createSession: (firstMessage: string) => ChatSession
  updateSession: (id: string, updates: Partial<Pick<ChatSession, "title" | "messages">>) => void
  deleteSession: (id: string) => void
  getSession: (id: string) => ChatSession | undefined
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, messageId: string, content: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatSessions = useChatSessions()

  return (
    <ChatContext.Provider value={chatSessions}>{children}</ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider")
  }
  return context
}

"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChatInput } from "@/components"
import { useChatContext } from "@/contexts/chat-context"
import { generateId } from "@/lib/types"

export default function NewProjectPage() {
  const router = useRouter()
  const { createSession, updateSession } = useChatContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSend = useCallback(async (content: string) => {
    setIsSubmitting(true)

    // Create a new chat session
    const session = createSession(content)

    // Add user message to session
    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content,
      createdAt: Date.now(),
    }
    updateSession(session.id, { messages: [userMessage] })

    // Navigate to chat page
    router.push(`/chat/${session.id}`)
  }, [createSession, updateSession, router])

  const handleAction = (action: string) => {
    // Handle upload, image actions
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 -mt-20">
      {/* Greeting */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-center mb-8">
        Where should we begin?
      </h1>

      {/* Chat Input */}
      <div className="w-full max-w-3xl">
        <ChatInput
          onSend={handleSend}
          onAction={handleAction}
          placeholder="Describe your project idea..."
          disabled={isSubmitting}
        />
        <p className="text-center text-xs text-muted-foreground/60 mt-3">
          Jarvis can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}

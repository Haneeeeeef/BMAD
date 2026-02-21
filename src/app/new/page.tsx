"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChatInput } from "@/components"

export default function NewProjectPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSend = (message: string) => {
    setIsSubmitting(true)
    // TODO: Create project from message
    console.log("Creating project:", message)
    // For now, redirect to projects
    setTimeout(() => {
      router.push("/projects")
    }, 500)
  }

  const handleAction = (action: string) => {
    console.log("Action:", action)
    // TODO: Handle different actions
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Greeting */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-center mb-8">
        Where should we begin?
      </h1>

      {/* Chat Input */}
      <ChatInput
        onSend={handleSend}
        onAction={handleAction}
        placeholder="Describe your project idea..."
        disabled={isSubmitting}
        className="w-full px-4"
      />
    </div>
  )
}

"use client"

import { useState, useCallback, Dispatch, SetStateAction } from "react"
import { authHeaders } from "@/lib/safe-storage"
import { deleteCanvas } from "@/lib/canvas-storage"
import { toast } from "sonner"

export interface UseChatActionsOptions {
  sessionId: string
  sessionTitle?: string
  userToken?: string
  deleteSession: (id: string) => void
  onDeleted: () => void // callback after successful delete (e.g., router.push('/new'))
}

export interface UseChatActionsReturn {
  isFlushing: boolean
  isDeleting: boolean
  showDeleteDialog: boolean
  setShowDeleteDialog: Dispatch<SetStateAction<boolean>>
  showFlushDialog: boolean
  setShowFlushDialog: Dispatch<SetStateAction<boolean>>
  handleShareEmail: () => void
  handleCopyLink: () => Promise<void>
  handleExportPDF: () => void
  handleFlushMemory: () => Promise<void>
  handleDeleteChat: () => Promise<void>
}

export function useChatActions({
  sessionId,
  sessionTitle,
  userToken,
  deleteSession,
  onDeleted,
}: UseChatActionsOptions): UseChatActionsReturn {
  const [isFlushing, setIsFlushing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showFlushDialog, setShowFlushDialog] = useState(false)

  // Share via email
  const handleShareEmail = useCallback(() => {
    const subject = encodeURIComponent(`Chat: ${sessionTitle || 'Jarvis Conversation'}`)
    const body = encodeURIComponent(`Check out this conversation:\n\n${window.location.href}`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }, [sessionTitle])

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }, [])

  // PDF export via browser print dialog
  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  // Flush memory - triggers Jarvis to write context to memory file
  const handleFlushMemory = useCallback(async () => {
    setShowFlushDialog(false)
    setIsFlushing(true)
    try {
      const response = await fetch('/api/session/clear', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action: 'flush_and_clear', sessionId, userToken })
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Memory flushed to disk')
        // Refresh context indicator
        window.dispatchEvent(new CustomEvent("chat-message-sent"))
      } else {
        toast.error('Failed to flush memory')
      }
    } catch {
      toast.error('Failed to flush memory')
    } finally {
      setIsFlushing(false)
    }
  }, [sessionId, userToken])

  // Delete chat - deletes session from VPS, localStorage, and canvas
  const handleDeleteChat = useCallback(async () => {
    setShowDeleteDialog(false)
    setIsDeleting(true)
    try {
      // Delete from VPS session service
      await fetch('/api/session/delete', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sessionId })
      })

      // Delete from localStorage (chat context)
      deleteSession(sessionId)

      // Clear canvas data and agent completions for this session
      await deleteCanvas(sessionId)

      toast.success('Chat deleted')

      // Refresh context indicator
      window.dispatchEvent(new CustomEvent("chat-message-sent"))

      // Invoke the callback (e.g., navigate to /new)
      onDeleted()
    } catch {
      toast.error('Failed to delete chat')
    } finally {
      setIsDeleting(false)
    }
  }, [sessionId, deleteSession, onDeleted])

  return {
    isFlushing,
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
    showFlushDialog,
    setShowFlushDialog,
    handleShareEmail,
    handleCopyLink,
    handleExportPDF,
    handleFlushMemory,
    handleDeleteChat,
  }
}

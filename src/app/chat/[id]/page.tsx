"use client"

import { useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useChatContext } from "@/contexts/chat-context"
import { useAuth } from "@/contexts/auth-context"
import { ChatInput, ChatInputHandle, ConfirmDialog } from "@/components"
import { ChatMessage } from "@/components/chat-message"
import { ChatHeader } from "@/components/chat-header"
import { CanvasPanel } from "@/components/canvas-panel"
import { useSidebar } from "@/components/app-shell"
import { useChatStream, useCanvasPanel, useChatActions } from "@/hooks"
import { saveDocument } from "@/lib/canvas-storage"
import type { ExtractedArtifact } from "@/lib/artifact-parser"
import { Loader2 } from "lucide-react"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const { getSession, updateSession, deleteSession, isLoaded } = useChatContext()
  const session = getSession(sessionId)
  const { isOpen: sidebarOpen } = useSidebar()
  const { user } = useAuth()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const lastScrollTop = useRef(0)
  const userScrolledUp = useRef(false)

  // ---------------------------------------------------------------------------
  // Canvas panel hook
  // ---------------------------------------------------------------------------
  const canvas = useCanvasPanel({ sessionId, router })

  // ---------------------------------------------------------------------------
  // Artifact callback — bridges chat streaming → canvas panel
  // ---------------------------------------------------------------------------
  const handleArtifactsFound = useCallback(
    (artifacts: ExtractedArtifact[]) => {
      for (const artifact of artifacts) {
        const updated = saveDocument(sessionId, {
          identifier: artifact.identifier,
          title: artifact.title,
          type: artifact.type,
          content: artifact.content,
          status: artifact.status,
          agent: artifact.agent,
          version: artifact.version,
        })
        if (updated) {
          canvas.setCanvasData(updated)
        }
      }
      canvas.setActiveDocumentId(artifacts[0]?.identifier)
      canvas.setShowCanvas(true)
    },
    [sessionId, canvas]
  )

  // ---------------------------------------------------------------------------
  // Chat streaming hook
  // ---------------------------------------------------------------------------
  const chat = useChatStream({
    sessionId,
    session: session ?? null,
    updateSession,
    userToken: user?.token,
    onArtifactsFound: handleArtifactsFound,
  })

  // ---------------------------------------------------------------------------
  // Chat actions hook (share, export, delete, flush)
  // ---------------------------------------------------------------------------
  const actions = useChatActions({
    sessionId,
    sessionTitle: session?.title,
    userToken: user?.token,
    deleteSession,
    onDeleted: () => router.push("/new"),
  })

  // ---------------------------------------------------------------------------
  // Scroll to bottom on initial load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (session) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
      }, 50)
    }
  }, [session])

  // ---------------------------------------------------------------------------
  // Auto-scroll during streaming (unless user scrolled up)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (chat.isLoading && chat.shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [chat.messages, chat.isLoading, chat.shouldAutoScroll])

  // ---------------------------------------------------------------------------
  // Detect user scroll to override auto-scroll
  // ---------------------------------------------------------------------------
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const currentScrollTop = container.scrollTop
    const isNearBottom = container.scrollHeight - currentScrollTop - container.clientHeight < 100

    if (currentScrollTop < lastScrollTop.current - 10) {
      userScrolledUp.current = true
      chat.setShouldAutoScroll(false)
    } else if (isNearBottom && userScrolledUp.current) {
      userScrolledUp.current = false
      chat.setShouldAutoScroll(true)
    }

    lastScrollTop.current = currentScrollTop
  }, [chat])

  // ---------------------------------------------------------------------------
  // Global keypress → focus chat input
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return
      }

      if (
        e.key === "Escape" || e.key === "Tab" || e.key === "Shift" ||
        e.key === "Control" || e.key === "Alt" || e.key === "Meta" ||
        e.key.startsWith("F") || e.ctrlKey || e.metaKey
      ) {
        return
      }

      chatInputRef.current?.focus()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // ---------------------------------------------------------------------------
  // Redirect if session doesn't exist
  // ---------------------------------------------------------------------------
  const shouldRedirect = isLoaded && !session && !!sessionId
  useEffect(() => {
    if (shouldRedirect) {
      router.push("/new")
    }
  }, [shouldRedirect, router])

  // ---------------------------------------------------------------------------
  // Dynamic positioning based on sidebar state
  // ---------------------------------------------------------------------------
  const sidebarWidth = sidebarOpen ? "256px" : "56px"

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div
        className="flex flex-col flex-1 transition-all duration-300"
        style={{ marginRight: canvas.showCanvas ? canvas.canvasWidth : 0 }}
      >
        <ChatHeader
          sidebarWidth={sidebarWidth}
          showCanvas={canvas.showCanvas}
          onCanvasOpen={canvas.handleCanvasOpen}
          isFlushing={actions.isFlushing}
          isDeleting={actions.isDeleting}
          onShareEmail={actions.handleShareEmail}
          onCopyLink={actions.handleCopyLink}
          onExportPDF={actions.handleExportPDF}
          onShowFlushDialog={() => actions.setShowFlushDialog(true)}
          onShowDeleteDialog={() => actions.setShowDeleteDialog(true)}
        />

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-3xl mx-auto pt-14 pb-40 px-4" aria-live="polite" role="log">
            {chat.messages.map((message) => (
              <div
                key={message.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(message.id, el)
                  else messageRefs.current.delete(message.id)
                }}
              >
                <ChatMessage message={message} isLoading={message.id === chat.streamingMessageId} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input - floating at bottom */}
        <div
          className="fixed bottom-0 z-10 px-4 pb-6 pt-6 bg-gradient-to-t from-background from-80% to-transparent transition-all duration-300"
          style={{ left: sidebarWidth, right: canvas.showCanvas ? canvas.canvasWidth : 0 }}
        >
          <div className="max-w-3xl mx-auto">
            <ChatInput
              ref={chatInputRef}
              onSend={chat.sendMessage}
              placeholder="Message Jarvis"
              disabled={chat.isLoading}
            />
            <p className="text-center text-xs text-muted-foreground/60 mt-2">
              Jarvis can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>

      {/* Discovery Canvas Panel */}
      <CanvasPanel
        showCanvas={canvas.showCanvas}
        canvasWidth={canvas.canvasWidth}
        documents={canvas.canvasData?.documents || []}
        activeDocumentId={canvas.activeDocumentId}
        onDocumentSelect={canvas.handleDocumentSelect}
        onApprove={canvas.handleCanvasApprove}
        onVersionChange={canvas.handleVersionChange}
        onDocumentClose={canvas.handleDocumentClose}
        onClose={canvas.handleCanvasClose}
        onResizeStart={canvas.handleResizeStart}
      />

      {/* Delete Chat Confirmation Dialog */}
      <ConfirmDialog
        open={actions.showDeleteDialog}
        onOpenChange={actions.setShowDeleteDialog}
        title="Delete Chat"
        description="This will permanently delete this chat and remove its context from the server. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={actions.handleDeleteChat}
        loading={actions.isDeleting}
      />

      {/* Flush Memory Confirmation Dialog */}
      <ConfirmDialog
        open={actions.showFlushDialog}
        onOpenChange={actions.setShowFlushDialog}
        title="Flush Memory"
        description="This will save the current context to memory files on disk and clear the session. Jarvis will start fresh but retain learnings."
        confirmLabel="Flush Memory"
        onConfirm={actions.handleFlushMemory}
        loading={actions.isFlushing}
      />
    </div>
  )
}

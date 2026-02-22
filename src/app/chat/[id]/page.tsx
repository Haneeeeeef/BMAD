"use client"

import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { useChatContext } from "@/contexts/chat-context"
import { ChatInput, ChatInputHandle } from "@/components"
import { ChatMessage } from "@/components/chat-message"
import { Message, Attachment, generateId } from "@/lib/types"
import { Loader2, ChevronDown, UserRoundPlus, MoreHorizontal, Archive, Trash2, Pencil, FileText } from "lucide-react"

// Lazy load heavy canvas component
const DiscoveryCanvas = lazy(() =>
  import("@/components/discovery-canvas").then((mod) => ({ default: mod.DiscoveryCanvas }))
)
import { CanvasStatus } from "@/lib/canvas-types"
import { loadCanvas, saveCanvas, approveCanvas, getSessionContext, type CanvasData } from "@/lib/canvas-storage"
import { useSidebar } from "@/components/app-shell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const { getSession, updateSession } = useChatContext()
  const session = getSession(sessionId)
  const { isOpen: sidebarOpen } = useSidebar()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [hasTriggeredInitial, setHasTriggeredInitial] = useState(false)
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Canvas state
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasContent, setCanvasContent] = useState<string | null>(null)
  const [canvasStatus, setCanvasStatus] = useState<CanvasStatus>("draft")
  const [canvasWidth, setCanvasWidth] = useState(520) // Default 520px
  const isResizing = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)

  // Load messages from session and scroll to bottom
  useEffect(() => {
    if (session) {
      setMessages(session.messages)
      // Scroll to bottom immediately on load
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" })
      }, 50)
    }
  }, [session])

  // Load canvas from localStorage on mount (but don't auto-open)
  useEffect(() => {
    if (sessionId) {
      const savedCanvas = loadCanvas(sessionId)
      if (savedCanvas) {
        setCanvasContent(savedCanvas.content)
        setCanvasStatus(savedCanvas.status)
      }
    }
  }, [sessionId])

  // Poll for canvas updates from API (Jarvis POSTs here)
  useEffect(() => {
    if (!sessionId) return

    const pollCanvas = async () => {
      try {
        const res = await fetch(`/api/canvas?sessionId=${sessionId}`)
        const data = await res.json()

        if (data.exists && data.content) {
          // Only update if content changed
          if (data.content !== canvasContent) {
            setCanvasContent(data.content)
            setCanvasStatus(data.status || "draft")
            setShowCanvas(true)

            // Also save to localStorage
            saveCanvas({
              sessionId,
              content: data.content,
              status: data.status || "draft",
              sections: data.sections,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            })
          }
        }
      } catch {
        // Polling failed, ignore
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(pollCanvas, 2000)

    // Initial poll
    pollCanvas()

    return () => clearInterval(interval)
  }, [sessionId, canvasContent])

  // Global keypress handler - focus input on any key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if already focused on an input/textarea
      const activeElement = document.activeElement
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return
      }

      // Ignore modifier keys alone, escape, function keys, etc.
      if (
        e.key === "Escape" ||
        e.key === "Tab" ||
        e.key === "Shift" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Meta" ||
        e.key.startsWith("F") ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return
      }

      // Focus the chat input
      chatInputRef.current?.focus()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Scroll to message when scrollToMessageId changes
  useEffect(() => {
    if (scrollToMessageId) {
      // Small delay to ensure DOM is updated
      const timeout = setTimeout(() => {
        const el = messageRefs.current.get(scrollToMessageId)
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        setScrollToMessageId(null)
      }, 50)
      return () => clearTimeout(timeout)
    }
  }, [scrollToMessageId])

  // Auto-scroll during streaming (unless user has scrolled up)
  useEffect(() => {
    if (isLoading && shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading, shouldAutoScroll])

  // Track last scroll position to detect user scroll direction
  const lastScrollTop = useRef(0)
  const userScrolledUp = useRef(false)

  // Detect user scroll to override auto-scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const currentScrollTop = container.scrollTop
    const isNearBottom = container.scrollHeight - currentScrollTop - container.clientHeight < 100

    // If user scrolled UP (towards top), disable auto-scroll immediately
    if (currentScrollTop < lastScrollTop.current - 10) {
      userScrolledUp.current = true
      setShouldAutoScroll(false)
    }
    // Only re-enable auto-scroll if user scrolls back to bottom
    else if (isNearBottom && userScrolledUp.current) {
      userScrolledUp.current = false
      setShouldAutoScroll(true)
    }

    lastScrollTop.current = currentScrollTop
  }, [])

  // Redirect if session doesn't exist
  useEffect(() => {
    if (!session && sessionId) {
      router.push("/new")
    }
  }, [session, sessionId, router])

  // Auto-trigger AI response if last message is from user (initial load)
  useEffect(() => {
    if (
      !hasTriggeredInitial &&
      messages.length > 0 &&
      messages[messages.length - 1].role === "user" &&
      !isLoading
    ) {
      setHasTriggeredInitial(true)
      getAIResponse(messages)
    }
  }, [messages, hasTriggeredInitial, isLoading])

  const getAIResponse = async (currentMessages: Message[]) => {
    const assistantMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(true)
    setStreamingMessageId(assistantMessage.id)

    // Allow React to render typing dots before starting fetch
    await new Promise(resolve => setTimeout(resolve, 0))

    try {
      abortControllerRef.current = new AbortController()

      // Get session context (canvas + agent completions) to inject into Jarvis
      const sessionContext = getSessionContext(sessionId)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          canvasStatus: sessionContext || undefined,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let fullContent = ""
      let lastUpdateTime = 0
      const UPDATE_INTERVAL = 16 // ~60fps

      // Throttled update for smooth rendering
      const updateContent = (force = false) => {
        const now = Date.now()
        if (force || now - lastUpdateTime >= UPDATE_INTERVAL) {
          lastUpdateTime = now
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: fullContent }
                : m
            )
          )
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const json = JSON.parse(data)
              if (json.content) {
                fullContent += json.content
                updateContent()
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      // Final update to ensure all content is rendered
      updateContent(true)

      // Save final messages to session
      const finalMessages = [...currentMessages, { ...assistantMessage, content: fullContent }]
      updateSession(sessionId, { messages: finalMessages })

      // Generate title after first exchange
      if (currentMessages.length === 1 && currentMessages[0].role === "user") {
        generateTitle(currentMessages[0].content, fullContent)
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
    } finally {
      setIsLoading(false)
      setStreamingMessageId(null)
      abortControllerRef.current = null
    }
  }

  const generateTitle = async (userMessage: string, assistantMessage: string) => {
    try {
      const response = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage, assistantMessage }),
      })
      if (response.ok) {
        const { title } = await response.json()
        if (title) {
          updateSession(sessionId, { title })
        }
      }
    } catch {
      // Silently fail - keep default title
    }
  }

  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        attachments,
        createdAt: Date.now(),
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      }

      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      setIsLoading(true)
      setStreamingMessageId(assistantMessage.id)
      setShouldAutoScroll(true) // Reset auto-scroll when sending
      userScrolledUp.current = false // Reset scroll tracking
      setScrollToMessageId(userMessage.id)

      // Allow React to render typing dots before starting fetch
      await new Promise(resolve => setTimeout(resolve, 0))

      try {
        abortControllerRef.current = new AbortController()

        // Get session context (canvas + agent completions) to inject into Jarvis
        const sessionContext = getSessionContext(sessionId)

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments,
            })),
            canvasStatus: sessionContext || undefined,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let fullContent = ""
        let lastUpdateTime = 0
        const UPDATE_INTERVAL = 16 // ~60fps

        // Throttled update for smooth rendering
        const updateContent = (force = false) => {
          const now = Date.now()
          if (force || now - lastUpdateTime >= UPDATE_INTERVAL) {
            lastUpdateTime = now
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullContent }
                  : m
              )
            )
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const json = JSON.parse(data)
                if (json.content) {
                  fullContent += json.content
                  updateContent()
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }

        // Final update to ensure all content is rendered
        updateContent(true)

        // Save final messages to session
        const finalMessages = [...messages, userMessage, { ...assistantMessage, content: fullContent }]
        updateSession(sessionId, { messages: finalMessages })

        // Generate title after first exchange
        if (messages.length === 0) {
          generateTitle(userMessage.content, fullContent)
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
      } finally {
        setIsLoading(false)
        setStreamingMessageId(null)
        abortControllerRef.current = null
      }
    },
    [messages, sessionId, updateSession]
  )

  const handleCanvasApprove = useCallback(() => {
    setCanvasStatus("approved")
    // Save approval to localStorage
    const approved = approveCanvas(sessionId)
    if (approved) {
      setCanvasStatus(approved.status)
    }
  }, [sessionId])

  const handleCanvasClose = useCallback(() => {
    setShowCanvas(false)
  }, [])

  const handleCanvasOpen = useCallback(() => {
    setShowCanvas(true)
  }, [])

  const handleCanvasEditRequest = useCallback((request: string) => {
    // Send edit request as a message to Jarvis
    sendMessage(`Please update the canvas: ${request}`)
  }, [sendMessage])

  // Canvas resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - e.clientX
      // Clamp between 320px and 60% of viewport
      const clampedWidth = Math.max(320, Math.min(newWidth, window.innerWidth * 0.6))
      setCanvasWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Dynamic positioning based on sidebar state (56px collapsed, 256px expanded)
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
        style={{ marginRight: showCanvas ? canvasWidth : 0 }}
      >
      {/* Floating corner controls */}
      <div className={`fixed top-3 z-10 transition-all duration-200`} style={{ left: `calc(${sidebarWidth} + 1rem)` }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-[18px] font-medium hover:bg-muted/80 rounded-lg px-2 py-1 transition-colors bg-background/80 backdrop-blur-sm">
              Jarvis
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Jarvis</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header controls - hide when canvas is open (X in canvas closes it) */}
      {!showCanvas && (
        <div className="fixed top-3 right-4 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg">
          <button
            onClick={handleCanvasOpen}
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg px-3 py-1.5 transition-colors"
            aria-label="Open Canvas"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Canvas</span>
          </button>
          <button
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg px-3 py-1.5 transition-colors"
            aria-label="Invite"
          >
            <UserRoundPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto pt-14 pb-40 px-4">
          {messages.map((message) => (
            <div
              key={message.id}
              ref={(el) => {
                if (el) messageRefs.current.set(message.id, el)
                else messageRefs.current.delete(message.id)
              }}
            >
              <ChatMessage message={message} isLoading={message.id === streamingMessageId} />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - floating at bottom */}
      <div
        className="fixed bottom-0 z-10 px-4 pb-6 pt-6 bg-gradient-to-t from-background from-80% to-transparent transition-all duration-300"
        style={{ left: sidebarWidth, right: showCanvas ? canvasWidth : 0 }}
      >
        <div className="max-w-3xl mx-auto">
          <ChatInput
            ref={chatInputRef}
            onSend={sendMessage}
            placeholder="Message Jarvis"
            disabled={isLoading}
          />
          <p className="text-center text-xs text-muted-foreground/60 mt-2">
            Jarvis can make mistakes. Verify important information.
          </p>
        </div>
      </div>
      </div>

      {/* Discovery Canvas Panel */}
      <div
        className={`fixed top-0 right-0 h-full border-l bg-background z-20 transform transition-transform duration-300 ease-in-out ${
          showCanvas ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: canvasWidth }}
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
        />
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
          <DiscoveryCanvas
            content={canvasContent || "# 🎯 Discovery Canvas\n\nNo canvas content yet. Ask Jarvis to analyze your project or create a synthesis document."}
            status={canvasStatus}
            onApprove={handleCanvasApprove}
            onClose={handleCanvasClose}
            onEditRequest={handleCanvasEditRequest}
          />
        </Suspense>
      </div>
    </div>
  )
}

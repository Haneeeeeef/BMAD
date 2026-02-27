"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useChatContext } from "@/contexts/chat-context"
import { useAuth } from "@/contexts/auth-context"
import { ContextIndicator } from "@/components/context-indicator"
import { ChatInput, ChatInputHandle } from "@/components"
import { ChatMessage } from "@/components/chat-message"
import { Message, Attachment, generateId } from "@/lib/types"
import { Loader2, ChevronDown, UserRoundPlus, MoreHorizontal, Archive, Trash2, Pencil, FileText, Share2, Mail, Link2, FileDown, RefreshCcw } from "lucide-react"
import { toast } from "sonner"

// Import canvas component (Excalidraw inside is already lazy loaded)
import { DiscoveryCanvas } from "@/components/discovery-canvas"
import { CanvasStatus } from "@/lib/canvas-types"
import { loadCanvas, saveDocument, setActiveDocument, removeDocument, setDocumentVersion, getSessionContext, type CanvasData, type CanvasDocument } from "@/lib/canvas-storage"
import { useApproval } from "@/hooks"

// Parse artifact tag attributes
function parseArtifactAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /(\w+)="([^"]*)"/g
  let match
  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

// Clean XML/tool tags from content (artifact, function_calls, invoke, parameter, antml:*)
// Used for final content after streaming completes
function cleanXmlTags(content: string): string {
  let cleaned = content
    // Remove complete blocks first (greedy for nested content)
    .replace(/<artifact[\s\S]*?<\/artifact>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/function_calls>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/antml:function_calls>/gi, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
    .replace(/<invoke[\s\S]*?<\/antml:invoke>/gi, '')
    .replace(/<parameter[\s\S]*?<\/parameter>/gi, '')
    .replace(/<parameter[\s\S]*?<\/antml:parameter>/gi, '')
    // Remove any remaining orphan opening/closing tags
    .replace(/<\/?artifact[^>]*>/gi, '')
    .replace(/<\/?function_calls[^>]*>/gi, '')
    .replace(/<\/?antml:function_calls[^>]*>/gi, '')
    .replace(/<\/?invoke[^>]*>/gi, '')
    .replace(/<\/?antml:invoke[^>]*>/gi, '')
    .replace(/<\/?parameter[^>]*>/gi, '')
    .replace(/<\/?antml:parameter[^>]*>/gi, '')
    .replace(/<[^>]+\/>/g, '') // self-closing tags

  // Clean up multiple newlines and trim
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

// Clean XML tags during streaming (handles incomplete tags)
function cleanStreamingXml(content: string): string {
  return content
    // Remove complete blocks
    .replace(/<artifact[\s\S]*?<\/artifact>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/function_calls>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/antml:function_calls>/gi, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
    .replace(/<invoke[\s\S]*?<\/antml:invoke>/gi, '')
    .replace(/<parameter[\s\S]*?<\/parameter>/gi, '')
    .replace(/<parameter[\s\S]*?<\/antml:parameter>/gi, '')
    // Remove incomplete blocks (streaming - no closing tag yet)
    .replace(/<artifact[^>]*>[\s\S]*$/gi, '')
    .replace(/<function_calls[^>]*>[\s\S]*$/gi, '')
    .replace(/<invoke[^>]*>[\s\S]*$/gi, '')
    .replace(/<parameter[^>]*>[\s\S]*$/gi, '')
    // Remove orphan tags
    .replace(/<\/?artifact[^>]*>/gi, '')
    .replace(/<\/?function_calls[^>]*>/gi, '')
    .replace(/<\/?antml:function_calls[^>]*>/gi, '')
    .replace(/<\/?invoke[^>]*>/gi, '')
    .replace(/<\/?antml:invoke[^>]*>/gi, '')
    .replace(/<\/?parameter[^>]*>/gi, '')
    .replace(/<\/?antml:parameter[^>]*>/gi, '')
    // Remove incomplete opening tags at end (e.g., "<funct" or "<param")
    .replace(/<[a-z_:]*$/gi, '')
    .replace(/<\/[a-z_:]*$/gi, '')
}

// Extract ALL artifacts from content and return array + cleaned content
interface ExtractedArtifact {
  identifier: string
  title: string
  type: string
  content: string
  status: CanvasStatus
  agent?: string
  version?: number // Optional - storage auto-increments if not provided
}

function extractArtifacts(content: string): { artifacts: ExtractedArtifact[]; cleanedContent: string } {
  const artifactRegex = /<artifact\s+([^>]*)>([\s\S]*?)<\/artifact>/gi
  const artifacts: ExtractedArtifact[] = []
  let match

  while ((match = artifactRegex.exec(content)) !== null) {
    const attrs = parseArtifactAttributes(match[1])
    artifacts.push({
      identifier: attrs.identifier || `doc-${Date.now()}`,
      title: attrs.title || "Untitled",
      type: attrs.type || "text/markdown",
      content: match[2].trim(),
      status: (attrs.status as CanvasStatus) || "awaiting_approval",
      agent: attrs.agent,
      // Only set version if explicitly provided - otherwise let storage auto-increment
      version: attrs.version ? parseInt(attrs.version, 10) : undefined,
    })
  }

  // Clean all XML tags
  const baseCleanedContent = cleanXmlTags(content)

  // Add placeholder if any artifacts were found
  const cleanedContent = artifacts.length > 0
    ? baseCleanedContent + `\n\n*[${artifacts.length} document${artifacts.length > 1 ? 's' : ''} created - see sidebar]*`
    : baseCleanedContent

  return { artifacts, cleanedContent }
}
import { useSidebar } from "@/components/app-shell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components"

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string
  const { getSession, updateSession, deleteSession, isLoaded } = useChatContext()
  const session = getSession(sessionId)
  const { isOpen: sidebarOpen } = useSidebar()
  const { user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [hasTriggeredInitial, setHasTriggeredInitial] = useState(false)
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  // Canvas state (multi-document)
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null)
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>()
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
      if (savedCanvas && savedCanvas.documents.length > 0) {
        setCanvasData(savedCanvas)
        setActiveDocumentId(savedCanvas.activeDocumentId || savedCanvas.documents[0]?.identifier)
      }
    }
  }, [sessionId])

  // Poll for canvas updates from API (Jarvis POSTs here) - simplified for multi-doc
  useEffect(() => {
    if (!sessionId) return

    const pollCanvas = async () => {
      try {
        const res = await fetch(`/api/canvas?sessionId=${sessionId}`)
        const data = await res.json()

        if (data.exists && data.content) {
          // Save as document and update state (version auto-increments if content changed)
          const updated = saveDocument(sessionId, {
            identifier: data.identifier || "api-document",
            title: data.title || "Document",
            type: data.type || "text/markdown",
            content: data.content,
            status: data.status || "draft",
          })
          setCanvasData(updated)
          setActiveDocumentId(data.identifier || "api-document")
          setShowCanvas(true)
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
  }, [sessionId])

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

  // Redirect if session doesn't exist (only after sessions are loaded)
  const shouldRedirect = isLoaded && !session && !!sessionId
  useEffect(() => {
    if (shouldRedirect) {
      router.push("/new")
    }
  }, [shouldRedirect, router])

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
      const canvasUrl = `${window.location.origin}/api/canvas`
      const sessionContext = getSessionContext(sessionId, canvasUrl)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          sessionId,
          canvasStatus: sessionContext,
          userToken: user?.token,
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

      // Throttled update for smooth rendering (hide XML tags during streaming)
      const updateContent = (force = false) => {
        const now = Date.now()
        if (force || now - lastUpdateTime >= UPDATE_INTERVAL) {
          lastUpdateTime = now
          // Hide XML tags during streaming (artifact, function_calls, antml:*, invoke, parameter)
          const displayContent = cleanStreamingXml(fullContent)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: displayContent }
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

      // Check for canvas content in response (XML artifact tags)
      const { artifacts, cleanedContent } = extractArtifacts(fullContent)
      if (artifacts.length > 0) {
        let latestCanvas: CanvasData | null = null
        const previousCanvas = loadCanvas(sessionId)

        for (const artifact of artifacts) {
          const prevDoc = previousCanvas?.documents.find(d => d.identifier === artifact.identifier)
          const prevVersionCount = prevDoc?.versions?.length || 0

          latestCanvas = saveDocument(sessionId, {
            identifier: artifact.identifier,
            title: artifact.title,
            type: artifact.type,
            content: artifact.content,
            status: artifact.status,
            agent: artifact.agent,
            version: artifact.version,
          })

        }
        if (latestCanvas) {
          setCanvasData(latestCanvas)
          setActiveDocumentId(artifacts[0].identifier)
          setShowCanvas(true)
        }
        // Update fullContent to show cleaned version
        fullContent = cleanedContent
      }

      // Save final messages to session (with artifact tags stripped)
      const finalMessages = [...currentMessages, { ...assistantMessage, content: fullContent }]
      updateSession(sessionId, { messages: finalMessages })

      // Generate title after first exchange
      if (currentMessages.length === 1 && currentMessages[0].role === "user") {
        generateTitle(currentMessages[0].content, fullContent)
      }

      // Refresh context indicator
      window.dispatchEvent(new CustomEvent("chat-message-sent"))
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
        const canvasUrl = `${window.location.origin}/api/canvas`
        const sessionContext = getSessionContext(sessionId, canvasUrl)

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments,
            })),
            sessionId,
            canvasStatus: sessionContext,
            userToken: user?.token,
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

        // Throttled update for smooth rendering (hide XML tags during streaming)
        const updateContent = (force = false) => {
          const now = Date.now()
          if (force || now - lastUpdateTime >= UPDATE_INTERVAL) {
            lastUpdateTime = now
            // Hide XML tags during streaming (artifact, function_calls, antml:*, invoke, parameter)
            const displayContent = cleanStreamingXml(fullContent)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: displayContent }
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

        // Check for canvas content in response (XML artifact tags)
        const { artifacts, cleanedContent } = extractArtifacts(fullContent)
        if (artifacts.length > 0) {
          let latestCanvas: CanvasData | null = null
          const previousCanvas = loadCanvas(sessionId)

          for (const artifact of artifacts) {
            const prevDoc = previousCanvas?.documents.find(d => d.identifier === artifact.identifier)
            const prevVersionCount = prevDoc?.versions?.length || 0

            latestCanvas = saveDocument(sessionId, {
              identifier: artifact.identifier,
              title: artifact.title,
              type: artifact.type,
              content: artifact.content,
              status: artifact.status,
              agent: artifact.agent,
              version: artifact.version,
            })
          }
          if (latestCanvas) {
            setCanvasData(latestCanvas)
            setActiveDocumentId(artifacts[0].identifier)
            setShowCanvas(true)
          }
          // Update fullContent to show cleaned version
          fullContent = cleanedContent
        }

        // Save final messages to session (with artifact tags stripped)
        const finalMessages = [...messages, userMessage, { ...assistantMessage, content: fullContent }]
        updateSession(sessionId, { messages: finalMessages })

        // Generate title after first exchange
        if (messages.length === 0) {
          generateTitle(userMessage.content, fullContent)
        }

        // Refresh context indicator
        window.dispatchEvent(new CustomEvent("chat-message-sent"))
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
    [messages, sessionId, updateSession, user]
  )

  // Use reusable approval hook
  const { approve } = useApproval({
    sessionId,
    onUpdate: setCanvasData,
  })

  // Handle approval with redirect to project
  const handleCanvasApprove = useCallback((identifier: string) => {
    const result = approve(identifier)
    if (result.project) {
      // Redirect to project page with autoChat to continue conversation
      const url = `/projects/${result.project.id}?autoChat=true&docTitle=${encodeURIComponent(result.documentTitle || '')}`
      router.push(url)
    }
  }, [approve, router])

  const handleDocumentSelect = useCallback((identifier: string) => {
    setActiveDocumentId(identifier)
    setActiveDocument(sessionId, identifier)
  }, [sessionId])

  const handleDocumentClose = useCallback((identifier: string) => {
    // Delete the document and all its versions
    const updated = removeDocument(sessionId, identifier)
    if (updated) {
      setCanvasData(updated)
      setActiveDocumentId(updated.activeDocumentId)
      if (updated.documents.length === 0) {
        setShowCanvas(false)
      }
    }
  }, [sessionId])

  const handleVersionChange = useCallback((identifier: string, version: number) => {
    const updated = setDocumentVersion(sessionId, identifier, version)
    if (updated) {
      setCanvasData(updated)
    }
  }, [sessionId])

  const handleCanvasClose = useCallback(() => {
    setShowCanvas(false)
  }, [])

  const handleCanvasOpen = useCallback(() => {
    setShowCanvas(true)
  }, [])


  // Share handlers
  const handleShareEmail = useCallback(() => {
    const subject = encodeURIComponent(`Chat: ${session?.title || 'Jarvis Conversation'}`)
    const body = encodeURIComponent(`Check out this conversation:\n\n${window.location.href}`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }, [session?.title])

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }, [])

  // PDF export handler
  const handleExportPDF = useCallback(() => {
    // Use browser print dialog for PDF
    window.print()
  }, [])

  // Flush memory handler - triggers Jarvis to write context to memory file
  const [isFlushing, setIsFlushing] = useState(false)
  const handleFlushMemory = useCallback(async () => {
    setShowFlushDialog(false)
    setIsFlushing(true)
    try {
      const response = await fetch('/api/session/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flush_and_clear', sessionId, userToken: user?.token })
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
  }, [sessionId, user?.token])

  // Delete chat handler - deletes session from VPS, localStorage, and canvas
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showFlushDialog, setShowFlushDialog] = useState(false)

  const handleDeleteChat = useCallback(async () => {
    setShowDeleteDialog(false)
    setIsDeleting(true)
    try {
      // Delete from VPS session service
      const response = await fetch('/api/session/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })

      const data = await response.json()

      // Delete from localStorage (chat context)
      deleteSession(sessionId)

      // Clear canvas data for this session
      localStorage.removeItem(`canvas-${sessionId}`)

      // Clear agent completions for this session
      localStorage.removeItem(`agent_completions_${sessionId}`)

      toast.success('Chat deleted')

      // Refresh context indicator
      window.dispatchEvent(new CustomEvent("chat-message-sent"))

      // Navigate to new chat
      router.push('/new')
    } catch {
      toast.error('Failed to delete chat')
    } finally {
      setIsDeleting(false)
    }
  }, [sessionId, deleteSession, router])

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
      <div className={`fixed top-3 z-10 transition-all duration-200 flex items-center gap-2`} style={{ left: `calc(${sidebarWidth} + 1rem)` }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-[18px] font-medium hover:bg-muted/80 rounded-lg px-2 py-1 transition-colors bg-background/80 backdrop-blur-sm" aria-label="Select agent">
              Jarvis
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Jarvis</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ContextIndicator />
      </div>

      {/* Header controls */}
      <div className="fixed top-3 right-4 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg">
        {!showCanvas && (
          <button
            onClick={handleCanvasOpen}
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg px-3 py-1.5 transition-colors"
            aria-label="Open Canvas"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Canvas</span>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <UserRoundPlus className="h-4 w-4 mr-2" />
              Invite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={handleShareEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Share via Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowFlushDialog(true)} disabled={isFlushing}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${isFlushing ? 'animate-spin' : ''}`} />
              {isFlushing ? 'Flushing...' : 'Flush Memory'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
              <Trash2 className={`h-4 w-4 mr-2 ${isDeleting ? 'animate-pulse' : ''}`} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
        <DiscoveryCanvas
          documents={canvasData?.documents || []}
          activeDocumentId={activeDocumentId}
          onDocumentSelect={handleDocumentSelect}
          onApprove={handleCanvasApprove}
          onVersionChange={handleVersionChange}
          onDocumentClose={handleDocumentClose}
          onClose={handleCanvasClose}
        />
      </div>

      {/* Delete Chat Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Chat"
        description="This will permanently delete this chat and remove its context from the server. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteChat}
        loading={isDeleting}
      />

      {/* Flush Memory Confirmation Dialog */}
      <ConfirmDialog
        open={showFlushDialog}
        onOpenChange={setShowFlushDialog}
        title="Flush Memory"
        description="This will save the current context to memory files on disk and clear the session. Jarvis will start fresh but retain learnings."
        confirmLabel="Flush Memory"
        onConfirm={handleFlushMemory}
        loading={isFlushing}
      />
    </div>
  )
}

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MessageSquare, X, Send, Loader2, Minimize2, Brain, Trash2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { authHeaders } from "@/lib/safe-storage"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface SessionStatus {
  tokens: number
  percentage: number
  maxTokens: number
}

interface JarvisChatProps {
  chatSessionId: string // Original chat session ID for continuity
  projectName: string
  autoOpen?: boolean // Auto-open on mount
  approvalMessage?: string // Message to send on auto-open (e.g., "[Approved: Project Brief]")
  className?: string
}

// Load messages from localStorage (same storage as chat page)
function loadMessagesFromStorage(sessionId: string): Message[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem("mission-control-sessions")
    if (!data) return []
    const sessions = JSON.parse(data)
    const session = sessions.find((s: { id: string }) => s.id === sessionId)
    if (!session?.messages) return []
    return session.messages.map((m: { id: string; role: string; content: string }) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
  } catch {
    return []
  }
}

export function JarvisChat({
  chatSessionId,
  projectName,
  autoOpen = false,
  approvalMessage,
  className,
}: JarvisChatProps) {
  const [isOpen, setIsOpen] = React.useState(autoOpen)
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [status, setStatus] = React.useState<SessionStatus | null>(null)
  const [hasSentApproval, setHasSentApproval] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Load past messages on mount
  React.useEffect(() => {
    const pastMessages = loadMessagesFromStorage(chatSessionId)
    if (pastMessages.length > 0) {
      setMessages(pastMessages)
    }
  }, [chatSessionId])

  // Fetch context status
  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/session/status?sessionId=${chatSessionId}`, {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {
      // Ignore errors
    }
  }, [chatSessionId])

  React.useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Send message helper
  const sendMessageToJarvis = React.useCallback(async (text: string) => {
    const userMessage: Message = { id: `user-${Date.now()}`, role: "user", content: text }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          sessionId: chatSessionId,
          canvasStatus: `[Project Context: ${projectName}]`,
        }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response")

      const decoder = new TextDecoder()
      let content = ""
      const assistantId = `assistant-${Date.now()}`
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split("\n")) {
          if (line.startsWith("0:")) {
            content += line.slice(2).replace(/^"|"$/g, "")
            setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content } : m))
          }
        }
      }
      fetchStatus() // Refresh context after message
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: "Sorry, something went wrong." }])
    } finally {
      setIsLoading(false)
    }
  }, [messages, chatSessionId, projectName, fetchStatus])

  // Auto-send approval message when opened with autoOpen
  React.useEffect(() => {
    if (autoOpen && approvalMessage && !hasSentApproval && messages.length > 0) {
      setHasSentApproval(true)
      // Small delay to let UI render
      setTimeout(() => {
        sendMessageToJarvis(approvalMessage)
      }, 500)
    }
  }, [autoOpen, approvalMessage, hasSentApproval, messages.length, sendMessageToJarvis])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput("")
    await sendMessageToJarvis(text)
  }

  const handleMemoryFlush = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/session/clear", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "flush", sessionId: chatSessionId }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success("Memory flushed")
        // Add Jarvis response to chat
        if (data.jarvisResponse) {
          setMessages(prev => [...prev, {
            id: `flush-${Date.now()}`,
            role: "assistant",
            content: data.jarvisResponse,
          }])
        }
        fetchStatus()
      } else {
        toast.error("Failed to flush memory")
      }
    } catch {
      toast.error("Failed to flush memory")
    } finally {
      setIsLoading(false)
    }
  }

  // Color based on percentage
  const getStatusColor = (pct: number) => {
    if (pct < 50) return "text-emerald-500 bg-emerald-500/10"
    if (pct < 80) return "text-yellow-500 bg-yellow-500/10"
    return "text-red-500 bg-red-500/10"
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "flex items-center justify-center",
          "h-14 w-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "hover:scale-105 transition-transform",
          "animate-in fade-in zoom-in duration-300",
          className
        )}
        aria-label="Open Jarvis chat"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "flex flex-col",
        "bg-background border rounded-xl shadow-2xl",
        "animate-in slide-in-from-bottom-5 duration-300",
        isMinimized ? "w-72 h-14" : "w-[420px] h-[600px]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-sm">Jarvis</span>
          {status && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium", getStatusColor(status.percentage))}>
                  <Brain className="h-3 w-3" />
                  {status.percentage}%
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <div className="text-xs">
                  <div className="font-medium">Context Usage</div>
                  <div className="text-muted-foreground">
                    {Math.round(status.tokens / 1000)}k / {Math.round(status.maxTokens / 1000)}k tokens
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleMemoryFlush}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
                aria-label="Flush memory"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Flush Memory</TooltipContent>
          </Tooltip>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label={isMinimized ? "Expand" : "Minimize"}
          >
            <Minimize2 className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            aria-label="Close chat"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Loading conversation...
              </div>
            )}
            {messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Jarvis..."
                aria-label="Message Jarvis"
                className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-lg",
                  "bg-muted border-0 focus:ring-2 focus:ring-primary/20 focus:outline-none",
                  "placeholder:text-muted-foreground"
                )}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  "p-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}

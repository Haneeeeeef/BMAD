"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface PromptBoxProps {
  messages: Message[]
  onSend: (message: string) => void
  isStreaming?: boolean
  streamingContent?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PromptBox({
  messages,
  onSend,
  isStreaming = false,
  streamingContent = "",
  placeholder = "Type a message...",
  disabled = false,
  className,
}: PromptBoxProps) {
  const [input, setInput] = React.useState("")
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled && !isStreaming) {
      onSend(input.trim())
      setInput("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{ id: "streaming", role: "assistant", content: streamingContent }}
            isStreaming
          />
        )}
        {isStreaming && !streamingContent && (
          <div className="flex gap-2 items-center text-muted-foreground">
            <TypingIndicator />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - ChatGPT style */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end rounded-2xl border bg-muted/50 shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isStreaming}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent px-4 py-3 text-[16px] md:text-sm",
                "placeholder:text-muted-foreground focus:outline-none",
                "max-h-[200px] min-h-[48px]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || disabled || isStreaming}
              className="m-2 h-8 w-8 shrink-0 rounded-lg"
            >
              {isStreaming ? (
                <StopIcon className="h-4 w-4" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: Message
  isStreaming?: boolean
}) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isUser ? "You" : "AI"}
      </div>
      <div
        className={cn(
          "rounded-2xl px-4 py-2 max-w-[80%]",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {isStreaming && <span className="inline-block w-1 h-4 bg-current animate-pulse ml-0.5" />}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 px-4 py-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

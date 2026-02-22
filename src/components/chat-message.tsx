"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { Message, Attachment } from "@/lib/types"
import { Copy, ThumbsUp, ThumbsDown, Volume2, RotateCcw, MoreHorizontal, FileText, Music } from "lucide-react"
import { toast } from "sonner"
import { stabilizeStreamingMarkdown } from "@/lib/streaming-markdown"
import { ExcalidrawDiagram } from "./excalidraw-diagram"

// Parse out OpenClaw context injection blocks
// These are internal markers that shouldn't be shown to users
function parseOpenClawContent(content: string): string {
  if (!content) return ""

  // Check for context injection pattern
  if (content.includes("[Chat messages since your last reply")) {
    // Try to extract just the current message section
    const currentMatch = content.match(/\[Current message - respond to this\]\s*([\s\S]*)/i)
    if (currentMatch) {
      return currentMatch[1].trim()
    }
    // If no current message marker, try to get content after the context block
    const afterContext = content.replace(/\[Chat messages since your last reply[^\]]*\][\s\S]*?\[Current message[^\]]*\]/gi, "").trim()
    if (afterContext) {
      return afterContext
    }
  }

  // Remove any remaining internal markers
  return content
    .replace(/\[Chat messages since your last reply[^\]]*\]/gi, "")
    .replace(/\[Current message - respond to this\]/gi, "")
    .replace(/^User:\s*/gm, "") // Remove "User:" prefixes from context replay
    .trim()
}

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
  className?: string
}

export const ChatMessage = React.memo(function ChatMessage({
  message,
  isLoading = false,
  className,
}: ChatMessageProps) {
  const isUser = message.role === "user"

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success("Copied to clipboard")
  }

  // Use streaming-aware markdown cleaner when loading, regular content when done
  // Also parse out OpenClaw context injection for assistant messages
  const processMarkdown = React.useMemo(() => {
    if (!message.content) return ""

    // Parse out OpenClaw context injection markers (assistant messages only)
    const cleanedContent = message.role === "assistant"
      ? parseOpenClawContent(message.content)
      : message.content

    // Only stabilize during streaming to remove incomplete syntax
    return isLoading ? stabilizeStreamingMarkdown(cleanedContent) : cleanedContent
  }, [message.content, message.role, isLoading])

  // User message - bubble on right
  if (isUser) {
    return (
      <div className={cn("flex justify-end mb-6 px-4", className)}>
        <div className="max-w-[85%]">
          {/* Attachment previews */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end mb-2">
              {message.attachments.map((att) => (
                <AttachmentDisplay key={att.id} attachment={att} />
              ))}
            </div>
          )}
          {/* Text content */}
          {message.content && (
            <div className="bg-muted rounded-3xl px-5 py-3">
              <p className="text-[16px] whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Assistant message - left aligned with actions
  return (
    <div className={cn("mb-6", className)}>
      <div className="max-w-none">
        {isLoading && !message.content ? (
          <div className="flex items-center gap-1.5 py-3">
            <span className="w-2 h-2 bg-foreground/70 rounded-full typing-dot" />
            <span className="w-2 h-2 bg-foreground/70 rounded-full typing-dot" />
            <span className="w-2 h-2 bg-foreground/70 rounded-full typing-dot" />
          </div>
        ) : (
          <>
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="text-[16px] leading-7 mb-4">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                  li: ({ children }) => <li className="text-[16px] leading-7">{children}</li>,
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || "")
                    const lang = match ? match[1] : ""
                    const codeString = String(children).replace(/\n$/, "")

                    // Render mermaid diagrams with Excalidraw
                    if (lang === "mermaid") {
                      return <ExcalidrawDiagram chart={codeString} className="my-4" />
                    }

                    // Inline code (no className means inline)
                    if (!className) {
                      return <code className="bg-muted px-1.5 py-0.5 rounded text-[14px] font-mono" {...props}>{children}</code>
                    }

                    // Code block
                    return <code className={cn("block text-[14px]", className)} {...props}>{children}</code>
                  },
                  pre: ({ children }) => (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-[14px]">{children}</pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic mb-4">{children}</blockquote>
                  ),
                  hr: () => <hr className="my-6 border-border" />,
                  table: ({ children }) => (
                    <div className="mb-4 rounded-lg border border-border overflow-hidden">
                      <table className="w-full border-collapse text-[14px]">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
                  tbody: ({ children }) => <tbody>{children}</tbody>,
                  tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
                  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-[13px] break-words">{children}</th>,
                  td: ({ children }) => <td className="px-3 py-2 break-words whitespace-normal">{children}</td>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {children}
                    </a>
                  ),
                }}
              >
                {processMarkdown}
              </ReactMarkdown>
            </div>

            {/* Action buttons */}
            {message.content && (
              <div className="flex items-center gap-1 mt-4">
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  aria-label="Copy message"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  aria-label="Good response"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  aria-label="Bad response"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  aria-label="Read aloud"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  aria-label="Regenerate"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  aria-label="More options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
})

// Attachment display for user messages
function AttachmentDisplay({ attachment }: { attachment: Attachment }) {
  if (attachment.type === "image") {
    return (
      <img
        src={`data:${attachment.mimeType};base64,${attachment.data}`}
        alt={attachment.name}
        className="max-h-48 rounded-lg border object-cover"
      />
    )
  }

  const Icon = attachment.type === "audio" ? Music : FileText

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate max-w-[150px]">{attachment.name}</span>
    </div>
  )
}

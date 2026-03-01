"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MemoizedMarkdown } from "./memoized-markdown"
import { Message, Attachment } from "@/lib/types"
import { Copy, ThumbsUp, ThumbsDown, Volume2, RotateCcw, MoreHorizontal, FileText, Music, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { stabilizeStreamingMarkdown } from "@/lib/streaming-markdown"
import { parseOpenClawContent, fixSentenceSpacing, fixBrokenTables } from "@/lib/chat-utils"
import { ExcalidrawDiagram } from "./excalidraw-diagram"

// Patterns that indicate "thinking" or status output (collapsed by default)
// These are agent setup/initialization messages, not the actual conversation
const THINKING_PATTERNS = [
  // Action verbs at start of line
  /^(Checking|Looking|Searching|Reading|Loading|Creating|Initializing|Discovering|Scanning|Setting up|Configuring|Preparing|Starting|Opening|Finding|Locating|Verifying|Validating|Processing|Analyzing|Examining|Reviewing)/i,
  // Planning phrases
  /^Let me\s/i,
  /^I('ll| will| am going to| need to)\s/i,
  /^(First|Now|Next),?\s*(let me|I('ll| will))/i,
  // Status updates
  /^(Done|Complete|Finished|Ready|Found|Located|Created|Initialized|Set up)/i,
  // Bullet points with actions
  /^\s*[-•]\s*(Checking|Looking|Searching|Created|Input|Found|Reading|No |None)/i,
  // File paths with status
  /\/home\/\w+\/.*\s*[-—]/,
  /^\s*[-•]\s*\/\w+/,
  // Status indicators with em-dash
  /—\s*(empty|none|not found|found|exists|created|unavailable|ready|complete|done|ok|success)/i,
  // Setup messages
  /^(Document Setup|workspace is ready|Project setup|Folder structure)/i,
  /sub-agent unavailable/i,
  /same result, just sequential/i,
  // Welcome/intro that's part of setup (not the actual greeting question)
  /^Welcome.*workspace is ready/i,
  // Technical paths and operations
  /^\s*(mkdir|cd|cat|ls|reading|writing|creating)\s/i,
  /^(PROJECT-CONTEXT|WORKFLOW-TRANSCRIPT)/i,
  // OpenClaw reasoning mode markers
  /^I('ll)?\s*engage\s*reasoning\s*mode/i,
  /^\*\*Reasoning( Process)?:?\*\*/i,
  /^\d+\.\s*\*\*(Definition|Step|Analysis|Calculation|Conclusion)/i,
  // Fresh project / setup messaging
  /^Fresh project/i,
  /^(New|Empty) project/i,
  /workspace and transcript/i,
  /spawning.*document writer/i,
  /proceeding to.*discovery/i,
  // Persona introductions (agent identifying itself)
  /^\w+ here\./i,  // "Mary here.", "BA here.", etc.
  // Input documents
  /^Input Documents (Discovered|Found)/i,
  /^No additional documents/i,
  // Frontmatter setup
  /frontmatter with workflow/i,
]

// Check if content contains a reasoning block (OpenClaw format)
function extractReasoningBlock(content: string): { reasoning: string; main: string } {
  // Look for **Reasoning Process:** or **Reasoning:** blocks
  const reasoningMatch = content.match(/(\*\*Reasoning( Process)?:?\*\*[\s\S]*?)(?=\n\n\*\*(?!Reasoning)|$)/i)

  if (reasoningMatch) {
    const reasoning = reasoningMatch[1].trim()
    const main = content.replace(reasoningMatch[0], '').trim()
    return { reasoning, main }
  }

  return { reasoning: '', main: content }
}

// Parse content into thinking blocks and main content
// Handles both line-based and sentence-based detection for streaming content
function parseThinkingBlocks(content: string): { thinking: string[]; main: string } {
  if (!content) return { thinking: [], main: "" }

  // First, try to split long lines by sentences (streaming often concatenates)
  // This normalizes "Fresh project. Setting up..." into separate processable units
  const normalizedContent = content.replace(/([.!?])\s*(?=[A-Z])/g, '$1\n')

  const lines = normalizedContent.split('\n')
  const thinking: string[] = []
  const main: string[] = []
  let inThinkingBlock = false
  let consecutiveThinkingLines = 0

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) {
      if (inThinkingBlock) thinking.push(line)
      else main.push(line)
      continue
    }

    const isThinkingLine = THINKING_PATTERNS.some(pattern => pattern.test(trimmedLine))

    if (isThinkingLine) {
      thinking.push(line)
      consecutiveThinkingLines++
      inThinkingBlock = true
    } else if (inThinkingBlock && consecutiveThinkingLines > 0 && trimmedLine === '') {
      // Empty line after thinking - keep in thinking block
      thinking.push(line)
    } else {
      inThinkingBlock = false
      consecutiveThinkingLines = 0
      main.push(line)
    }
  }

  return {
    thinking: thinking.filter(l => l.trim()),
    main: main.join('\n').trim()
  }
}

/* ── tool card types (kept for compatibility) ────────────── */

export type ToolCardAction = {
  id: string
  label: string
  file?: string
  section?: string
  type: "analyze" | "read" | "write" | "tool"
  status: "complete" | "running" | "pending"
  duration?: string
}

/* ── module-level markdown components (stable ref, avoids re-render) ── */

const DISCOVERY_MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="text-[16px] leading-7 mb-4">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-[16px] leading-7">{children}</li>,
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const match = /language-(\w+)/.exec(className || "")
    const lang = match ? match[1] : ""
    const codeString = String(children).replace(/\n$/, "")
    if (lang === "mermaid") return <ExcalidrawDiagram chart={codeString} className="my-4" />
    if (!className) return <code className="bg-muted px-1.5 py-0.5 rounded text-[14px] font-mono" {...props}>{children}</code>
    return <code className={cn("block text-[14px]", className)} {...props}>{children}</code>
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-[14px]">{children}</pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic mb-4">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-4 rounded-lg border border-border overflow-hidden">
      <table className="w-full border-collapse text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-muted/50">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="px-3 py-2 text-left font-semibold text-[13px] break-words">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="px-3 py-2 break-words whitespace-normal">{children}</td>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
  ),
} as const

const WORKSPACE_MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="text-[15px] leading-7 text-foreground/90 mb-4 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-xl font-bold text-foreground mb-3 mt-6 first:mt-0">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-lg font-bold text-foreground mb-3 mt-5 first:mt-0">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-6 mb-4 space-y-1.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-[15px] leading-7 text-foreground/90">{children}</li>,
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const lang = /language-(\w+)/.exec(className || "")?.[1]
    if (lang === "mermaid") return <ExcalidrawDiagram chart={String(children).replace(/\n$/, "")} className="my-4" />
    if (!className) return <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground/80" {...props}>{children}</code>
    return <code className={cn("block text-[13px]", className)} {...props}>{children}</code>
  },
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-[13px]">{children}</pre>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-border pl-4 italic mb-4 text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-4 rounded-lg border border-border overflow-hidden">
      <table className="w-full border-collapse text-[14px]">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-muted">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="px-3 py-2 text-left font-semibold text-[13px] text-foreground/80">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="px-3 py-2 text-foreground/80 break-words">{children}</td>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] hover:underline">{children}</a>
  ),
} as const

interface ChatMessageProps {
  message: Message
  isLoading?: boolean
  className?: string
  variant?: "discovery" | "workspace"
}

export const ChatMessage = React.memo(function ChatMessage({
  message,
  isLoading = false,
  className,
  variant = "discovery",
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const isWorkspace = variant === "workspace"
  const [showThinking, setShowThinking] = React.useState(false)
  const markdownComponents = isWorkspace ? WORKSPACE_MARKDOWN_COMPONENTS : DISCOVERY_MARKDOWN_COMPONENTS

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    toast.success("Copied to clipboard")
  }

  // Use streaming-aware markdown cleaner when loading, regular content when done
  // Also parse out OpenClaw context injection for assistant messages
  const { reasoningContent, mainContent } = React.useMemo(() => {
    if (!message.content) return { reasoningContent: "", mainContent: "" }

    // Parse out OpenClaw context injection markers (assistant messages only)
    const cleanedContent = message.role === "assistant"
      ? parseOpenClawContent(message.content)
      : message.content

    // Workspace variant: skip thinking/reasoning extraction
    if (isWorkspace) {
      if (message.role === "assistant") {
        const processed = isLoading
          ? fixBrokenTables(fixSentenceSpacing(stabilizeStreamingMarkdown(cleanedContent)))
          : fixBrokenTables(fixSentenceSpacing(cleanedContent))
        return { reasoningContent: "", mainContent: processed }
      }
      return {
        reasoningContent: "",
        mainContent: isLoading ? stabilizeStreamingMarkdown(cleanedContent) : cleanedContent,
      }
    }

    // Discovery variant: full thinking/reasoning pipeline
    if (message.role === "assistant") {
      // First check for explicit reasoning field from API
      if (message.reasoning) {
        const processedMain = isLoading
          ? fixBrokenTables(fixSentenceSpacing(stabilizeStreamingMarkdown(cleanedContent)))
          : fixBrokenTables(fixSentenceSpacing(cleanedContent))
        return { reasoningContent: message.reasoning, mainContent: processedMain }
      }

      // Check for OpenClaw reasoning block format (**Reasoning Process:**)
      const { reasoning: reasoningBlock, main: mainAfterBlock } = extractReasoningBlock(cleanedContent)

      // Then parse remaining thinking patterns from content
      const { thinking, main } = parseThinkingBlocks(mainAfterBlock)

      // Combine reasoning sources
      const allReasoning = [reasoningBlock, ...thinking].filter(Boolean).join('\n')

      const processedMain = isLoading
        ? fixBrokenTables(fixSentenceSpacing(stabilizeStreamingMarkdown(main)))
        : fixBrokenTables(fixSentenceSpacing(main))
      return {
        reasoningContent: allReasoning,
        mainContent: processedMain
      }
    }

    // Only stabilize during streaming to remove incomplete syntax
    return {
      reasoningContent: "",
      mainContent: isLoading ? stabilizeStreamingMarkdown(cleanedContent) : cleanedContent
    }
  }, [message.content, message.reasoning, message.role, isLoading, isWorkspace])

  // User message - bubble on right
  if (isUser) {
    return (
      <div className={cn("flex justify-end mb-6", !isWorkspace && "px-4", className)}>
        <div className="max-w-[85%]">
          {/* Attachment previews */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end mb-2">
              {message.attachments.map((att) => (
                <AttachmentDisplay key={att.id} attachment={att} compact={isWorkspace} />
              ))}
            </div>
          )}
          {/* Text content */}
          {message.content && (
            <div className="bg-muted rounded-3xl px-5 py-3">
              <p className={cn("whitespace-pre-wrap", isWorkspace ? "text-[15px] leading-7 text-foreground" : "text-[16px]")}>{message.content}</p>
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
          <div className="flex items-center gap-1.5 py-3" role="status" aria-label="Loading response">
            {isWorkspace ? (
              <>
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-foreground/70 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-foreground/70 rounded-full typing-dot" />
                <span className="w-2 h-2 bg-foreground/70 rounded-full typing-dot" />
              </>
            )}
          </div>
        ) : (
          <>
            {/* Collapsible Thinking/Reasoning Block (discovery only) */}
            {!isWorkspace && reasoningContent && (
              <div className="mb-3">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {showThinking ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  <span className="font-medium">
                    {showThinking ? "Hide" : "Show"} thinking
                  </span>
                  {!showThinking && (
                    <span className="text-muted-foreground/60">
                      ({reasoningContent.split('\n').filter(l => l.trim()).length} steps)
                    </span>
                  )}
                </button>
                {showThinking && (
                  <div className="mt-2 pl-4 border-l-2 border-muted text-sm text-muted-foreground space-y-1">
                    {reasoningContent.split('\n').filter(l => l.trim()).map((line, i) => (
                      <p key={i} className="text-[13px] leading-relaxed">{line}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Content */}
            <div className={isWorkspace ? "chat-markdown" : "markdown-content"}>
              <MemoizedMarkdown content={mainContent} components={markdownComponents} />
            </div>

            {/* Action buttons */}
            {(isWorkspace ? !isLoading && mainContent : message.content) && (
              <div className={cn("flex items-center", isWorkspace ? "gap-0.5 mt-3" : "gap-1 mt-4")}>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "p-1.5 hover:bg-muted rounded-md transition-colors",
                    isWorkspace
                      ? "text-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:outline-none"
                      : "text-muted-foreground/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  )}
                  aria-label="Copy message"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  className={cn(
                    "p-1.5 hover:bg-muted rounded-md transition-colors",
                    isWorkspace
                      ? "text-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:outline-none"
                      : "text-muted-foreground/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  )}
                  aria-label="Good response"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  className={cn(
                    "p-1.5 hover:bg-muted rounded-md transition-colors",
                    isWorkspace
                      ? "text-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:outline-none"
                      : "text-muted-foreground/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  )}
                  aria-label="Bad response"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
                {!isWorkspace && (
                  <button
                    className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label="Read aloud"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  className={cn(
                    "p-1.5 hover:bg-muted rounded-md transition-colors",
                    isWorkspace
                      ? "text-border hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:outline-none"
                      : "text-muted-foreground/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  )}
                  aria-label="Regenerate"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                {!isWorkspace && (
                  <button
                    className="p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}, (prev, next) => {
  return prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.isLoading === next.isLoading &&
    prev.variant === next.variant
})

// Attachment display for user messages
function AttachmentDisplay({ attachment, compact }: { attachment: Attachment; compact?: boolean }) {
  if (attachment.type === "image") {
    return (
      <img
        src={`data:${attachment.mimeType};base64,${attachment.data}`}
        alt={attachment.name}
        className={cn(
          "rounded-lg border object-cover",
          compact ? "h-16 w-16" : "max-h-48",
        )}
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

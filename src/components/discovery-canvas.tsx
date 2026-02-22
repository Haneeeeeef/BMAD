"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { CanvasStatus } from "@/lib/canvas-types"
import { CanvasStatusBadge } from "./canvas-status-badge"
import { Check, Copy, FileDown, X } from "lucide-react"
import { toast } from "sonner"

interface DiscoveryCanvasProps {
  content: string
  status: CanvasStatus
  onApprove?: () => void
  onClose?: () => void
  onEditRequest?: (request: string) => void
  className?: string
}

export function DiscoveryCanvas({
  content,
  status,
  onApprove,
  onClose,
  onEditRequest,
  className,
}: DiscoveryCanvasProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    toast.success("Copied to clipboard")
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "discovery-synthesis.md"
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Downloaded")
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold">Discovery Synthesis</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CanvasStatusBadge status={status} />
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Close canvas"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content - clean single column */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-none p-6">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:flex prose-headings:items-center prose-headings:gap-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Export
          </button>
        </div>

        {status === "awaiting_approval" && onApprove && (
          <button
            onClick={onApprove}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
          >
            <Check className="h-4 w-4" />
            Approve
          </button>
        )}

        {status === "approved" && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="h-4 w-4" />
            Approved
          </div>
        )}
      </div>
    </div>
  )
}

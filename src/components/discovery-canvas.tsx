"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { CanvasStatus } from "@/lib/canvas-types"
import { CanvasStatusBadge } from "./canvas-status-badge"
import { ExcalidrawDiagram } from "./excalidraw-diagram"
import { MermaidDiagram } from "./mermaid-diagram"
import { Check, Copy, FileDown, X, FileText, GitBranch, Image, FileType, Pencil, LayoutGrid } from "lucide-react"
import { toast } from "sonner"
import type { CanvasDocument, DocumentVersion } from "@/lib/canvas-storage"
import { getCurrentVersion, getLatestVersion } from "@/lib/canvas-storage"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Check if document type is a diagram
function isDiagramType(type: string): boolean {
  return ["process_flow", "flowchart", "mermaid", "diagram"].includes(type.toLowerCase())
}

interface DiscoveryCanvasProps {
  documents: CanvasDocument[]
  activeDocumentId?: string
  onDocumentSelect: (identifier: string) => void
  onApprove: (identifier: string) => void
  onVersionChange?: (identifier: string, version: number) => void
  onDocumentClose?: (identifier: string) => void
  onClose?: () => void
  className?: string
}

// Icon mapping for document types
function getDocumentIcon(type: string) {
  switch (type) {
    case "process_flow":
    case "flowchart":
    case "mermaid":
      return GitBranch
    default:
      return FileText
  }
}

export function DiscoveryCanvas({
  documents,
  activeDocumentId,
  onDocumentSelect,
  onApprove,
  onVersionChange,
  onDocumentClose,
  onClose,
  className,
}: DiscoveryCanvasProps) {
  const activeDoc = documents.find(d => d.identifier === activeDocumentId) || documents[0]
  const currentVersion = activeDoc ? getCurrentVersion(activeDoc) : undefined
  const latestVersionNum = activeDoc ? getLatestVersion(activeDoc) : 1
  const totalVersions = activeDoc?.versions?.length || 1

  // Diagram render mode: "excalidraw" (hand-drawn) or "mermaid" (structured)
  const [diagramMode, setDiagramMode] = React.useState<"excalidraw" | "mermaid">("excalidraw")
  const isDiagram = activeDoc ? isDiagramType(activeDoc.type) : false

  const handlePrevVersion = () => {
    if (!activeDoc || !onVersionChange || !currentVersion) return
    const currentIdx = activeDoc.versions.findIndex(v => v.version === currentVersion.version)
    if (currentIdx > 0) {
      onVersionChange(activeDoc.identifier, activeDoc.versions[currentIdx - 1].version)
    }
  }

  const handleNextVersion = () => {
    if (!activeDoc || !onVersionChange || !currentVersion) return
    const currentIdx = activeDoc.versions.findIndex(v => v.version === currentVersion.version)
    if (currentIdx < activeDoc.versions.length - 1) {
      onVersionChange(activeDoc.identifier, activeDoc.versions[currentIdx + 1].version)
    }
  }

  const canGoPrev = currentVersion && activeDoc?.versions &&
    activeDoc.versions.findIndex(v => v.version === currentVersion.version) > 0
  const canGoNext = currentVersion && activeDoc?.versions &&
    activeDoc.versions.findIndex(v => v.version === currentVersion.version) < activeDoc.versions.length - 1

  const handleCopy = () => {
    if (!activeDoc || !currentVersion) return
    navigator.clipboard.writeText(currentVersion.content)
    toast.success("Copied to clipboard")
  }

  const contentRef = React.useRef<HTMLDivElement>(null)

  const handleExport = async () => {
    if (!activeDoc) return

    const isDiagram = isDiagramType(activeDoc.type)

    if (isDiagram) {
      // Export diagram as PNG using html2canvas
      try {
        toast.loading("Generating PNG...")
        const html2canvas = (await import("html2canvas")).default
        if (!contentRef.current) return

        const canvas = await html2canvas(contentRef.current, {
          backgroundColor: "#ffffff",
          scale: 2, // Higher resolution
        })

        // Download as PNG
        const link = document.createElement("a")
        link.download = `${activeDoc.title || activeDoc.identifier}.png`
        link.href = canvas.toDataURL("image/png")
        link.click()

        toast.dismiss()
        toast.success("PNG downloaded")
      } catch (err) {
        toast.dismiss()
        toast.error("Failed to export PNG")
        console.error("PNG export error:", err)
      }
    } else {
      // Export text document as PDF via print
      try {
        // Create a printable version
        const printWindow = window.open("", "_blank")
        if (!printWindow) {
          toast.error("Please allow popups to export PDF")
          return
        }

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${activeDoc.title || "Document"}</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
                line-height: 1.6;
              }
              h1 { font-size: 24px; margin-bottom: 8px; }
              h2 { font-size: 20px; margin-top: 24px; }
              h3 { font-size: 16px; margin-top: 20px; }
              p { margin: 12px 0; }
              ul, ol { margin: 12px 0; padding-left: 24px; }
              li { margin: 6px 0; }
              code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
              pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
              blockquote { border-left: 4px solid #ddd; margin: 16px 0; padding-left: 16px; color: #666; }
              table { border-collapse: collapse; width: 100%; margin: 16px 0; }
              th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
              th { background: #f4f4f4; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <h1>${activeDoc.title || "Document"}</h1>
            ${contentRef.current?.innerHTML || ""}
          </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()

        toast.success("Print dialog opened - save as PDF")
      } catch (err) {
        toast.error("Failed to export PDF")
        console.error("PDF export error:", err)
      }
    }
  }

  const handleApprove = () => {
    if (!activeDoc) return
    onApprove(activeDoc.identifier)
  }

  if (!activeDoc) {
    return (
      <div className={cn("flex flex-col h-full bg-background items-center justify-center", className)}>
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">No documents yet</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header with tabs */}
      <div className="border-b">
        {/* Tabs */}
        {documents.length > 0 && (
          <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto">
            {documents.map((doc) => {
              const Icon = getDocumentIcon(doc.type)
              const isActive = doc.identifier === activeDoc.identifier
              return (
                <div
                  key={doc.identifier}
                  className={cn(
                    "group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-md border border-b-0 transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-background text-foreground border-border"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  )}
                >
                  <button
                    onClick={() => onDocumentSelect(doc.identifier)}
                    aria-label={`View ${doc.title}`}
                    className="flex items-center gap-1.5"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="max-w-[100px] truncate">{doc.title}</span>
                    {getCurrentVersion(doc)?.status === "approved" && (
                      <Check className="h-3 w-3 text-emerald-500" />
                    )}
                    {getCurrentVersion(doc)?.status === "awaiting_approval" && (
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </button>
                  {onDocumentClose && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDocumentClose(doc.identifier)
                      }}
                      aria-label={`Close ${doc.title}`}
                      className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{activeDoc.title}</h2>
            {currentVersion && <CanvasStatusBadge status={currentVersion.status} />}
          </div>
          <div className="flex items-center gap-2">
            {/* Diagram mode toggle */}
            {isDiagram && (
              <div className="flex items-center border rounded-md overflow-hidden text-xs">
                <button
                  onClick={() => setDiagramMode("excalidraw")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 transition-colors",
                    diagramMode === "excalidraw"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                  aria-label="Hand-drawn style"
                >
                  <Pencil className="h-3 w-3" />
                  <span className="hidden sm:inline">Sketch</span>
                </button>
                <button
                  onClick={() => setDiagramMode("mermaid")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 transition-colors",
                    diagramMode === "mermaid"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                  aria-label="Structured style"
                >
                  <LayoutGrid className="h-3 w-3" />
                  <span className="hidden sm:inline">Mermaid</span>
                </button>
              </div>
            )}
            {/* Version selector */}
            {totalVersions > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  onClick={handlePrevVersion}
                  disabled={!canGoPrev}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous version"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[60px] text-center">
                  v{currentVersion?.version || 1} / {latestVersionNum}
                </span>
                <button
                  onClick={handleNextVersion}
                  disabled={!canGoNext}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next version"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-none p-6">
          <div ref={contentRef} className="prose prose-sm dark:prose-invert max-w-none prose-headings:flex prose-headings:items-center prose-headings:gap-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {children}
                  </a>
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || "")
                  const lang = match ? match[1] : ""
                  const codeString = String(children).replace(/\n$/, "")

                  // Render mermaid diagrams - toggle between Excalidraw and Mermaid
                  if (lang === "mermaid") {
                    return diagramMode === "excalidraw"
                      ? <ExcalidrawDiagram chart={codeString} className="my-4" />
                      : <MermaidDiagram chart={codeString} className="my-4 p-4 bg-muted/30 rounded-lg overflow-x-auto" />
                  }

                  // Inline code
                  if (!className) {
                    return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
                  }

                  // Code block
                  return (
                    <code className={cn("block", className)} {...props}>
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => (
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-sm">{children}</pre>
                ),
              }}
            >
              {currentVersion?.content || ""}
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
            aria-label="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            aria-label={isDiagramType(activeDoc.type) ? "Export as PNG" : "Export as PDF"}
          >
            {isDiagramType(activeDoc.type) ? (
              <>
                <Image className="h-4 w-4" />
                PNG
              </>
            ) : (
              <>
                <FileType className="h-4 w-4" />
                PDF
              </>
            )}
          </button>
        </div>

        {currentVersion?.status === "awaiting_approval" && (
          <button
            onClick={handleApprove}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
            aria-label={`Approve ${activeDoc.title}`}
          >
            <Check className="h-4 w-4" />
            Approve
          </button>
        )}

        {currentVersion?.status === "approved" && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600">
            <Check className="h-4 w-4" />
            Approved
          </div>
        )}
      </div>
    </div>
  )
}

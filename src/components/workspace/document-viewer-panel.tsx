"use client"

import React, { memo, useMemo, useState, useRef, useEffect, useCallback } from "react"
import { X, Download, FileText, ChevronDown } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { DocumentItem } from "./documents-list"

/* ── types ────────────────────────────────────────────────── */

interface DocumentViewerPanelProps {
  document: DocumentItem
  content: string
  onClose: () => void
  onDownloadMd?: (doc: DocumentItem, content: string) => void
  onDownloadDocx?: (doc: DocumentItem, content: string) => void
}

/* ── status config ────────────────────────────────────────── */

const STATUS_LABEL: Record<DocumentItem["status"], { text: string; color: string }> = {
  ready: { text: "Complete", color: "text-emerald-500" },
  generating: { text: "Generating...", color: "text-amber-500" },
  error: { text: "Error", color: "text-red-500" },
}

/* ── helpers ─────────────────────────────────────────────── */

/** Strip YAML frontmatter (---..---) from markdown content */
function stripFrontmatter(md: string): string {
  // Match opening --- on its own line, then content, then closing --- on its own line.
  // The closing --- must be at the start of a line (not inside a table row like |---|---|).
  return md.replace(/^---\n[\s\S]*?\n---\n*/, "").trim()
}

/** Strip agent-generated footer lines like "*Product Brief complete — ready for PRD creation*" */
function stripAgentFooter(md: string): string {
  return md.replace(/\n---\s*\n\*[^*]*(?:complete|ready|created|updated|generated)[^*]*\*\s*$/, "").trimEnd()
}

/** Convert bold-label paragraphs like "**Problem Statement** text..." into proper headings */
function promoteBoldLabels(md: string): string {
  // Match: start of line, **Label** followed by a space and paragraph text
  // Only promote when the bold label is 1-4 words (section heading, not inline emphasis)
  return md.replace(
    /^(\*\*([A-Z][^*]{1,50})\*\*)\s+(\S[\s\S]*?)(?=\n\n|\n\*\*[A-Z]|$)/gm,
    (_, _boldFull, label, body) => {
      // Skip if the label is too long to be a heading (likely inline bold)
      const wordCount = label.trim().split(/\s+/).length
      if (wordCount > 5) return _
      return `### ${label.trim()}\n\n${body.trim()}`
    }
  )
}

/* ── component ────────────────────────────────────────────── */

export const DocumentViewerPanel = memo(function DocumentViewerPanel({
  document: doc,
  content: rawContent,
  onClose,
  onDownloadMd,
  onDownloadDocx,
}: DocumentViewerPanelProps) {
  const status = STATUS_LABEL[doc.status]
  const panelRef = useRef<HTMLDivElement>(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)

  const content = useMemo(() => promoteBoldLabels(stripAgentFooter(stripFrontmatter(rawContent))), [rawContent])

  /* Extract title from first H1 in markdown, or use filename */
  const title = useMemo(() => {
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1] : doc.name.replace(/\.md$/, "").replace(/-/g, " ")
  }, [content, doc.name])

  /* Strip leading H1 from content so we don't render it twice */
  const body = useMemo(() => {
    return content.replace(/^#\s+.+\n?/, "").trim()
  }, [content])

  /* Close on Escape */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  /* Close download menu on outside click */
  useEffect(() => {
    if (!showDownloadMenu) return
    const handleClick = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false)
      }
    }
    window.addEventListener("mousedown", handleClick)
    return () => window.removeEventListener("mousedown", handleClick)
  }, [showDownloadMenu])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not the panel
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  return (
    <div
      className="absolute inset-0 z-30"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="absolute top-0 right-0 w-[520px] h-full flex flex-col bg-background shadow-[-4px_0_24px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 h-[43px] px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[13px] font-semibold text-foreground leading-4">{doc.name}</span>
            <span className={`text-[10px] font-medium leading-3 ${status.color}`}>{status.text}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Download dropdown */}
            {(onDownloadMd || onDownloadDocx) && (
              <div ref={downloadRef} className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  className="flex items-center gap-0.5 p-1 hover:bg-muted rounded transition-colors"
                  aria-label={`Download ${doc.name}`}
                >
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
                {showDownloadMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg py-1 min-w-[140px] z-50">
                    {onDownloadMd && (
                      <button
                        onClick={() => { onDownloadMd(doc, content); setShowDownloadMenu(false) }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-foreground/80 hover:bg-muted transition-colors"
                      >
                        Markdown (.md)
                      </button>
                    )}
                    {onDownloadDocx && (
                      <button
                        onClick={() => { onDownloadDocx(doc, content); setShowDownloadMenu(false) }}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-foreground/80 hover:bg-muted transition-colors"
                      >
                        Word (.docx)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors" aria-label="Close document viewer">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          {/* Title block */}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-bold text-foreground leading-6">{title}</h1>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-border shrink-0 -my-0.5" />

          {/* Rendered markdown */}
          <div className="doc-viewer-prose flex flex-col gap-2.5">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h2 className="text-[15px] font-bold text-foreground leading-[20px] mt-4 mb-1.5 first:mt-0 pb-1.5 border-b border-border/60">
                    {children}
                  </h2>
                ),
                h2: ({ children }) => (
                  <h2 className="text-[15px] font-bold text-foreground leading-[20px] mt-4 mb-1.5 first:mt-0 pb-1.5 border-b border-border/60">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-[13px] font-semibold text-foreground/90 leading-[18px] mt-3 mb-1">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-[12px] font-semibold text-foreground/70 leading-[16px] mt-2 mb-0.5">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-[13px] leading-5 text-foreground/70">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-muted-foreground">{children}</em>
                ),
                ul: ({ children }) => (
                  <ul className="flex flex-col gap-1 pl-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="flex flex-col gap-1 pl-1 list-none">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2 text-[13px] leading-5 text-foreground/70">
                    <span className="text-muted-foreground text-[9px] leading-5 shrink-0 mt-[1px]">●</span>
                    <span>{children}</span>
                  </li>
                ),
                /* ── tables ── */
                table: ({ children }) => (
                  <div className="overflow-x-auto rounded-md border border-border my-1 -mx-1">
                    <table className="min-w-[480px] w-full text-[11px] leading-[15px]">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/60 border-b border-border">{children}</thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                  <tr className="border-b border-border/40 last:border-0">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-2 py-1 text-left font-semibold text-foreground/70 text-[10px] uppercase tracking-wide whitespace-nowrap">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-2 py-1 text-foreground/70 align-top">{children}</td>
                ),
                /* ── other ── */
                pre: ({ children }) => (
                  <pre className="bg-muted rounded-md border border-border p-3 overflow-x-auto whitespace-pre text-[11px] leading-[16px] text-foreground/80 font-mono">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => {
                  // Inside a <pre>, just pass through (pre handles block styling)
                  if (className?.includes("language-")) {
                    return <code>{children}</code>
                  }
                  // Inline code
                  return (
                    <code className="bg-muted rounded px-1 py-0.5 text-[11px] font-mono text-foreground/80">{children}</code>
                  )
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-border pl-3 text-[13px] leading-5 text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                hr: () => <div className="w-full h-px bg-border my-1" />,
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
})

"use client"

import React, { memo, useMemo, useState, useRef, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { X, Download, FileText, ChevronDown, Eye, Loader2, Send, History, Share2, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/safe-storage"
import type { DocumentItem } from "./documents-list"

const DrawioDiagram = dynamic(() => import("../drawio-diagram").then(m => ({ default: m.DrawioDiagram })), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center bg-muted/50 rounded-lg"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>,
})

const PROOF_URL = process.env.NEXT_PUBLIC_PROOF_URL || "http://localhost:4000"

/* ── types ────────────────────────────────────────────────── */

interface DocumentViewerPanelProps {
  document: DocumentItem
  content: string
  onClose: () => void
  onDownloadMd?: (doc: DocumentItem, content: string) => void
  onDownloadDocx?: (doc: DocumentItem, content: string) => void
  onReview?: () => void
  onSendToAgent?: () => void
  isReviewing?: boolean
  deliverableStatus?: string
  agentName?: string
  projectSlug?: string
}

/* ── status config ────────────────────────────────────────── */

const STATUS_LABEL: Record<DocumentItem["status"], { text: string; color: string }> = {
  ready: { text: "Complete", color: "text-emerald-500" },
  generating: { text: "Generating...", color: "text-amber-500" },
  error: { text: "Error", color: "text-red-500" },
}

/* ── helpers ─────────────────────────────────────────────── */

function stripFrontmatter(md: string): string {
  return md.replace(/^---\n[\s\S]*?\n---\n*/, "").trim()
}

function stripAgentFooter(md: string): string {
  return md.replace(/\n---\s*\n\*[^*]*(?:complete|ready|created|updated|generated)[^*]*\*\s*$/, "").trimEnd()
}

function promoteBoldLabels(md: string): string {
  return md.replace(
    /^(\*\*([A-Z][^*]{1,50})\*\*)\s+(\S[\s\S]*?)(?=\n\n|\n\*\*[A-Z]|$)/gm,
    (_, _boldFull, label, body) => {
      const wordCount = label.trim().split(/\s+/).length
      if (wordCount > 5) return _
      return `### ${label.trim()}\n\n${body.trim()}`
    }
  )
}

function hasMermaidBlocks(md: string): boolean {
  return /```mermaid/i.test(md)
}

// Markdown components for inline rendering (bypass Proof for diagram docs)
const DIAGRAM_DOC_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="text-[15px] leading-7 text-foreground/90 mb-4">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-2xl font-bold text-foreground mb-4 mt-8 first:mt-0">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-xl font-bold text-foreground mb-3 mt-6">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-semibold text-foreground mb-2 mt-4">{children}</h3>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-6 mb-4 space-y-1.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-6 mb-4 space-y-1.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-[15px] leading-7 text-foreground/90">{children}</li>,
  code: ({ className, children, ...props }: { className?: string; children?: React.ReactNode }) => {
    const lang = /language-(\w+)/.exec(className || "")?.[1]
    if (lang === "mermaid") return <DrawioDiagram chart={String(children).replace(/\n$/, "")} className="my-6" />
    if (lang === "drawio") return <DrawioDiagram xml={String(children).replace(/\n$/, "")} className="my-6" />
    if (!className) return <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>{children}</code>
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
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-muted/50">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="px-3 py-2 text-left font-semibold text-[13px]">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="px-3 py-2 text-foreground/80">{children}</td>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] hover:underline">{children}</a>
  ),
} as const


/* ── component ────────────────────────────────────────────── */

export const DocumentViewerPanel = memo(function DocumentViewerPanel({
  document: doc,
  content: rawContent,
  onClose,
  onDownloadMd,
  onDownloadDocx,
  onReview,
  onSendToAgent,
  isReviewing,
  deliverableStatus,
  agentName,
  projectSlug,
}: DocumentViewerPanelProps) {
  const status = STATUS_LABEL[doc.status]
  const panelRef = useRef<HTMLDivElement>(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadRef = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState(560)
  const [proofSlug, setProofSlug] = useState<string | null>(null)
  const [proofToken, setProofToken] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<{ hash: string; date: string; message: string }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeVersion, setActiveVersion] = useState<string | null>(null)
  const [versionContent, setVersionContent] = useState<string | null>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  // Resize drag handling
  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartX.current - e.clientX
      const newWidth = Math.max(400, Math.min(window.innerWidth - 300, dragStartWidth.current + delta))
      setPanelWidth(newWidth)
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragStartX.current = e.clientX
    dragStartWidth.current = panelWidth
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    setIsResizing(true)
  }, [panelWidth])

  const content = useMemo(() => promoteBoldLabels(stripAgentFooter(stripFrontmatter(rawContent))), [rawContent])
  const isDrawio = doc.name.endsWith(".drawio") || doc.path?.endsWith(".drawio")
  const isDiagram = useMemo(() => hasMermaidBlocks(rawContent), [rawContent])

  const title = useMemo(() => {
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1] : doc.name.replace(/\.md$/, "").replace(/-/g, " ")
  }, [content, doc.name])


  // Publish to Proof once real content loads (skip for diagram docs and drawio)
  useEffect(() => {
    const cleanMarkdown = rawContent?.replace(/^---\n[\s\S]*?\n---\n*/, "").trim() || ""
    if (!cleanMarkdown || cleanMarkdown.length < 50 || !cleanMarkdown.includes("#") || doc.status !== "ready" || proofSlug || isDiagram || isDrawio) return

    let cancelled = false
    setIsPublishing(true)

    fetch("/api/proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "publish",
        markdown: cleanMarkdown,
        title: doc.name.replace(/\.md$/, ""),
        agentId: "mc",
      }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.slug) {
          setProofSlug(data.slug)
          setProofToken(data.accessToken)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsPublishing(false) })

    return () => { cancelled = true }
  }, [rawContent, doc.status, doc.name, proofSlug, isDiagram, isDrawio])

  // Save: read markdown from Proof → write to VPS → git commit
  const handleSaveFromProof = useCallback(async () => {
    if (!proofSlug || !proofToken || !projectSlug || !doc.path) return
    setIsSaving(true)
    setSaveStatus("idle")
    try {
      // Read markdown from Proof
      const proofRes = await fetch(`${PROOF_URL}/d/${proofSlug}?token=${proofToken}`, {
        headers: { Accept: "text/markdown" },
      })
      if (!proofRes.ok) throw new Error("Failed to read from Proof")
      const markdown = await proofRes.text()

      // Write to VPS
      const vpsRes = await fetch("/api/artifacts", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ project: projectSlug, path: doc.path, content: markdown }),
      })
      if (!vpsRes.ok) throw new Error("Failed to write to VPS")

      // Git commit
      await fetch("/api/artifacts/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          project: projectSlug,
          path: doc.path,
          message: `human: edited ${doc.path.split("/").pop()}`,
        }),
      }).catch(() => {})

      setSaveStatus("saved")
      setVersions([]) // Clear version cache
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch {
      setSaveStatus("error")
    } finally {
      setIsSaving(false)
    }
  }, [proofSlug, proofToken, projectSlug, doc.path])

  /* Keyboard shortcuts */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showHistory) { setShowHistory(false); return }
        onClose()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSaveFromProof()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose, showHistory, handleSaveFromProof])

  /* Close history dropdown on outside click */
  useEffect(() => {
    if (!showHistory) return
    const handleClick = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    window.addEventListener("mousedown", handleClick)
    return () => window.removeEventListener("mousedown", handleClick)
  }, [showHistory])

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
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const isReviewDoc = doc.name.startsWith("review-") || doc.name.startsWith("Review")
  const showReviewButton = onReview && doc.status === "ready" && !isReviewDoc &&
    (deliverableStatus === "complete" || deliverableStatus === "validated" || deliverableStatus === "awaiting-approval")

  const showSendToAgentButton = onSendToAgent && isReviewDoc && deliverableStatus === "awaiting-approval"

  const reviewButtonLabel = deliverableStatus === "validated" ? "Review Again" : "Review"

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        style={{ width: panelWidth }}
        className="absolute top-0 right-0 h-full flex flex-col bg-background shadow-[-4px_0_24px_rgba(0,0,0,0.08)]"
      >
        {/* Resize handle */}
        <div
          onMouseDown={handleDragStart}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--brand)]/30 active:bg-[var(--brand)]/50 z-10 transition-colors"
        />
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 h-[43px] px-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[13px] font-semibold text-foreground leading-4">{doc.name}</span>
            <span className={`text-[10px] font-medium leading-3 ${activeVersion ? "text-amber-500" : status.color}`}>
              {activeVersion
                ? `v${versions.length - versions.findIndex(v => v.hash === activeVersion)}`
                : `v${versions.length || "·"}`
              }
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Review button */}
            {showReviewButton && (
              <button
                onClick={onReview}
                disabled={isReviewing}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  isReviewing
                    ? "bg-muted text-muted-foreground cursor-wait"
                    : "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]",
                )}
              >
                {isReviewing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {isReviewing ? "Reviewing..." : reviewButtonLabel}
              </button>
            )}

            {/* Send to Agent button (during awaiting-approval) */}
            {showSendToAgentButton && (
              <button
                onClick={onSendToAgent}
                className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-violet-500 text-white hover:bg-violet-600 transition-colors"
              >
                <Send className="h-3 w-3" />
                Send to {agentName || "Agent"}
              </button>
            )}

            {/* Version history */}
            {projectSlug && doc.path && (
              <div ref={historyRef} className="relative">
                <button
                  onClick={async () => {
                    if (showHistory) { setShowHistory(false); return }
                    setShowHistory(true)
                    if (versions.length > 0) return
                    setLoadingHistory(true)
                    try {
                      const res = await fetch(`/api/artifacts/history?project=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(doc.path!)}`)
                      if (res.ok) {
                        const data = await res.json()
                        setVersions(data.versions || [])
                      }
                    } catch {} finally { setLoadingHistory(false) }
                  }}
                  className="flex items-center gap-0.5 p-1 hover:bg-muted rounded transition-colors"
                  aria-label="Version history"
                  title="Version history"
                >
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {showHistory && (
                  <div className="absolute right-0 top-full mt-1.5 bg-background border border-border rounded-lg shadow-md min-w-[300px] max-h-[320px] overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-border">
                      <span className="text-[11px] font-semibold text-foreground">Version History</span>
                      <span className="text-[10px] text-muted-foreground/50 ml-1.5">{versions.length} version{versions.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="overflow-y-auto max-h-[270px]">
                      {loadingHistory ? (
                        <div className="flex items-center gap-2 px-3 py-4 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />Loading history...
                        </div>
                      ) : versions.length === 0 ? (
                        <div className="px-3 py-4 text-[11px] text-muted-foreground text-center">No versions yet — commits will appear here</div>
                      ) : (
                        versions.map((v, i) => {
                          const KNOWN_AGENTS: Record<string, string> = { analyst: "Mary", architect: "Winston", dev: "Amelia", pm: "John", qa: "Quinn", jarvis: "Jarvis", ux: "Sally", sm: "Bob", "tech-writer": "Paige", "quick-flow": "Barry", auto: "System" }
                          const prefixMatch = v.message.match(/^([\w-]+):\s*(.+)/)
                          const agentKey = prefixMatch?.[1] || ""
                          const agentDisplayName = KNOWN_AGENTS[agentKey]
                          const displayMessage = agentDisplayName ? prefixMatch![2] : v.message
                          const dateStr = new Date(v.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                          return (
                            <button
                              key={v.hash}
                              onClick={async () => {
                                setActiveVersion(v.hash)
                                setShowHistory(false)
                                try {
                                  const res = await fetch("/api/artifacts/history", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "show", project: projectSlug, path: doc.path, hash: v.hash }),
                                  })
                                  if (res.ok) {
                                    const data = await res.json()
                                    if (data.content) setVersionContent(data.content)
                                  }
                                } catch {}
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 hover:bg-muted/70 transition-colors border-b border-border/50 last:border-0",
                                activeVersion === v.hash && "bg-muted",
                              )}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <div className="flex items-center gap-1.5 truncate flex-1">
                                  <span className="text-[10px] font-semibold text-muted-foreground shrink-0">v{versions.length - i}</span>
                                  <span className="text-[11px] font-medium text-foreground/80 truncate">
                                    {displayMessage.charAt(0).toUpperCase() + displayMessage.slice(1)}
                                  </span>
                                </div>
                                {i === 0 && (
                                  <span className="text-[9px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full ml-2 shrink-0">Current</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                                <span className={agentDisplayName ? "font-semibold text-[var(--brand)]" : "font-medium text-muted-foreground/60"}>
                                  {agentDisplayName || "System"}
                                </span>
                                <span>·</span>
                                <span>{dateStr}</span>
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Save (Proof → VPS) */}
            {proofSlug && projectSlug && doc.path && !activeVersion && (
              <button
                onClick={handleSaveFromProof}
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  saveStatus === "saved"
                    ? "text-emerald-600"
                    : saveStatus === "error"
                      ? "text-red-500 hover:bg-red-50"
                      : "text-muted-foreground hover:bg-muted",
                )}
                title="Save changes to project (Cmd+S)"
              >
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {isSaving ? "Saving" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Save"}
              </button>
            )}

            {/* Share link */}
            {proofSlug && proofToken && (
              <button
                onClick={() => {
                  const url = `${PROOF_URL}/d/${proofSlug}?token=${proofToken}`
                  navigator.clipboard.writeText(url)
                  alert("Share link copied!")
                }}
                className="flex items-center gap-0.5 p-1 hover:bg-muted rounded transition-colors"
                aria-label="Copy share link"
                title="Copy shareable link"
              >
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}

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

        {/* Drag overlay — prevents iframe from stealing mouse events during resize */}
        {isResizing && <div className="absolute inset-0 z-20 cursor-col-resize" />}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Version indicator bar */}
          {activeVersion && (
            <div className="flex items-center justify-between px-4 py-1.5 bg-amber-50 border-b border-amber-200 shrink-0">
              <span className="text-[11px] text-amber-700">
                Viewing v{versions.length > 0 ? versions.length - versions.findIndex(v => v.hash === activeVersion) : "?"} (read-only)
              </span>
              <button
                onClick={() => { setActiveVersion(null); setVersionContent(null) }}
                className="text-[11px] font-medium text-[var(--brand)] hover:underline"
              >
                Back to Current
              </button>
            </div>
          )}
          {isDrawio ? (
            <div className="h-full overflow-hidden p-4">
              <DrawioDiagram
                xml={activeVersion && versionContent ? versionContent : rawContent}
                className="h-full"
                onUpload={projectSlug && doc.path ? async (newXml) => {
                  try {
                    await fetch("/api/artifacts", {
                      method: "PUT",
                      headers: authHeaders({ "Content-Type": "application/json" }),
                      body: JSON.stringify({ project: projectSlug, path: doc.path, content: newXml }),
                    })
                    await fetch("/api/artifacts/history", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "commit",
                        project: projectSlug,
                        path: doc.path,
                        message: `human: updated ${doc.path?.split("/").pop()}`,
                      }),
                    }).catch(() => {})
                  } catch {}
                } : undefined}
              />
            </div>
          ) : isDiagram ? (
            <div className="h-full overflow-y-auto">
              <div className="max-w-none px-8 py-6 prose prose-sm dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={DIAGRAM_DOC_COMPONENTS}>
                  {activeVersion && versionContent ? versionContent : content}
                </ReactMarkdown>
              </div>
            </div>
          ) : proofSlug ? (
            <iframe
              src={`${PROOF_URL}/d/${proofSlug}?token=${proofToken}&embed=1&theme=light&displayName=Haneef&collab=0`}
              className="w-full h-full border-0"
              style={{ colorScheme: "light" }}
              title={`Proof: ${doc.name}`}
              allow="clipboard-write"
            />
          ) : (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading document...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

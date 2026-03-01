"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { cn } from "@/lib/utils"

export type DocumentItem = {
  id: string
  name: string
  status: "ready" | "generating" | "error"
  path?: string
  /** "deliverable" (default) | "project" for project-level docs */
  kind?: "deliverable" | "project"
}

interface DocumentsListProps {
  documents: DocumentItem[]
  onView?: (doc: DocumentItem) => void
  onDownload?: (doc: DocumentItem) => void
  onMarkComplete?: (doc: DocumentItem) => void
}

const DOT_COLOR: Record<DocumentItem["status"], string> = {
  ready: "bg-emerald-500",
  generating: "bg-amber-500",
  error: "bg-red-500",
}

function DocRow({ doc, onView, onDownload, onMarkComplete }: {
  doc: DocumentItem
  onView?: (doc: DocumentItem) => void
  onDownload?: (doc: DocumentItem) => void
  onMarkComplete?: (doc: DocumentItem) => void
}) {
  return (
    <button
      onClick={() => onView?.(doc)}
      className={cn(
        "flex items-center gap-1.5 rounded-md py-1.5 px-2 text-left transition-colors",
        "bg-muted border border-border hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "inline-block h-[5px] w-[5px] rounded-full shrink-0",
          DOT_COLOR[doc.status],
          doc.status === "generating" && "animate-pulse",
        )}
      />
      <span className="text-[11px] font-medium text-foreground flex-1 truncate">
        {doc.name}
      </span>
      <div className="flex items-center gap-1 shrink-0">
        {doc.status === "ready" && onDownload && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onDownload(doc) }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onDownload(doc) } }}
            className="rounded px-1.5 py-0.5 bg-muted text-muted-foreground hover:bg-accent transition-colors"
            aria-label={`Download ${doc.name}`}
          >
            <Download className="h-2.5 w-2.5" />
          </span>
        )}
        {doc.status === "generating" && onMarkComplete && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onMarkComplete(doc) }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onMarkComplete(doc) } }}
            className="text-[10px] text-amber-500 hover:text-emerald-500 cursor-pointer transition-colors"
            title="Click to mark as complete"
          >
            Generating...
          </span>
        )}
        {doc.status === "generating" && !onMarkComplete && (
          <span className="text-[10px] text-amber-500">Generating...</span>
        )}
        {doc.status === "error" && (
          <span className="text-[10px] text-red-500">Error</span>
        )}
      </div>
    </button>
  )
}

export function DocumentsList({ documents, onView, onDownload, onMarkComplete }: DocumentsListProps) {
  const [tab, setTab] = useState<"project" | "artifacts">("artifacts")
  const projectDocs = documents.filter((d) => d.kind === "project")
  const artifactDocs = documents.filter((d) => d.kind !== "project")
  const activeDocs = tab === "project" ? projectDocs : artifactDocs

  return (
    <div className="flex flex-col flex-1 min-h-0 border-t border-border">
      {/* Section heading */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Documents
        </span>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
          {documents.filter(d => d.status === "ready").length}/{documents.length}
        </span>
      </div>

      {/* Pill tabs */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 shrink-0">
        <button
          onClick={() => setTab("artifacts")}
          className={cn(
            "px-3 py-1 text-[11px] font-medium rounded-full transition-colors",
            tab === "artifacts"
              ? "bg-[var(--brand)] text-[var(--confirm-foreground)]"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          Artifacts
          {artifactDocs.length > 0 && (
            <span className="ml-1 opacity-70">{artifactDocs.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("project")}
          className={cn(
            "px-3 py-1 text-[11px] font-medium rounded-full transition-colors",
            tab === "project"
              ? "bg-[var(--brand)] text-[var(--confirm-foreground)]"
              : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          Project
          {projectDocs.length > 0 && (
            <span className="ml-1 opacity-70">{projectDocs.length}</span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col flex-1 overflow-y-auto py-1 px-2 gap-[3px]">
        {activeDocs.length === 0 && (
          <span className="text-[11px] text-muted-foreground/50 px-2 py-3">
            No documents yet
          </span>
        )}
        {activeDocs.map((doc) => (
          <DocRow key={doc.id} doc={doc} onView={onView} onDownload={onDownload} onMarkComplete={onMarkComplete} />
        ))}
      </div>
    </div>
  )
}

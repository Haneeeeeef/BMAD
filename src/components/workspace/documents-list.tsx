"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { cn } from "@/lib/utils"

export type DocumentItem = {
  id: string
  name: string
  status: "ready" | "generating" | "error"
  path?: string
  kind?: "deliverable" | "project"
}

interface DocumentsListProps {
  documents: DocumentItem[]
  onView?: (doc: DocumentItem) => void
  onDownload?: (doc: DocumentItem) => void
  onMarkComplete?: () => void
}

const NAME_TO_ICON: Record<string, string> = {
  "product brief": "product-brief",
  "architecture": "architecture",
  "prd": "prd",
  "ux design": "ux-design",
  "epics": "epics-stories",
  "stories": "epics-stories",
  "generate tests": "qa-tests",
  "test cases": "qa-tests",
  "test data": "qa-tests",
  "test plan": "qa-tests",
  "test scenarios": "qa-tests",
  "sprint": "sprint-planning",
  "code review": "code-review",
  "quick spec": "quick-spec",
  "documentation": "document-project",
  "process flow": "process-flow",
  "data flow": "data-flow",
}

function nameToIcon(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(NAME_TO_ICON)) {
    if (lower.includes(key)) return icon
  }
  return "default"
}

const STATUS_BADGE: Record<DocumentItem["status"], { text: string; bg: string }> = {
  ready: { text: "text-emerald-700", bg: "bg-emerald-50" },
  generating: { text: "text-amber-700", bg: "bg-amber-50" },
  error: { text: "text-red-700", bg: "bg-red-50" },
}

const STATUS_LABEL: Record<DocumentItem["status"], string> = {
  ready: "Ready",
  generating: "Generating",
  error: "Error",
}

function DocRow({ doc, onView, onDownload, onMarkComplete }: {
  doc: DocumentItem
  onView?: (doc: DocumentItem) => void
  onDownload?: (doc: DocumentItem) => void
  onMarkComplete?: (doc: DocumentItem) => void
}) {
  const badge = STATUS_BADGE[doc.status]

  return (
    <button
      onClick={() => onView?.(doc)}
      className={cn(
        "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer",
        "bg-white/40 hover:bg-white/60",
      )}
    >
      {/* Status bar */}
      <div className={cn(
        "shrink-0 w-[3px] h-4 rounded-full",
        doc.status === "ready" ? "bg-emerald-500/40" : doc.status === "generating" ? "bg-amber-500 animate-pulse" : "bg-red-500",
      )} />

      {/* Name */}
      <span className="text-[13px] font-medium text-foreground/80 flex-1 truncate">
        {doc.name}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {doc.status === "ready" && onDownload && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onDownload(doc) }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onDownload(doc) } }}
            className="p-1 rounded-md text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
            aria-label={`Download ${doc.name}`}
          >
            <Download className="h-3 w-3" />
          </span>
        )}
        {doc.status === "generating" && onMarkComplete && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onMarkComplete(doc) }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onMarkComplete(doc) } }}
            className={cn("w-[68px] text-center shrink-0 rounded py-0.5 text-[10px] font-semibold cursor-pointer transition-opacity hover:opacity-70", badge.text, badge.bg)}
            title="Click to mark as complete"
          >
            {STATUS_LABEL[doc.status]}
          </span>
        )}
        {doc.status === "generating" && !onMarkComplete && (
          <span className={cn("w-[68px] text-center shrink-0 rounded py-0.5 text-[10px] font-semibold", badge.text, badge.bg)}>
            {STATUS_LABEL[doc.status]}
          </span>
        )}
        {doc.status === "error" && (
          <span className={cn("w-[68px] text-center shrink-0 rounded py-0.5 text-[10px] font-semibold", badge.text, badge.bg)}>
            {STATUS_LABEL[doc.status]}
          </span>
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Section heading */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-t border-border shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Documents
        </span>
      </div>

      {/* Segmented control */}
      <div className="flex items-center mx-3 mb-2 p-0.5 rounded-lg bg-black/[0.04] shrink-0">
        <button
          onClick={() => setTab("artifacts")}
          className={cn(
            "flex-1 px-3 py-1.5 text-[11px] font-medium rounded-md text-center transition-all cursor-pointer",
            tab === "artifacts"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Artifacts {artifactDocs.length > 0 && <span className="text-[9px] opacity-50">{artifactDocs.length}</span>}
        </button>
        <button
          onClick={() => setTab("project")}
          className={cn(
            "flex-1 px-3 py-1.5 text-[11px] font-medium rounded-md text-center transition-all cursor-pointer",
            tab === "project"
              ? "bg-white shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Project {projectDocs.length > 0 && <span className="text-[9px] opacity-50">{projectDocs.length}</span>}
        </button>
      </div>

      {/* Document list */}
      <div className="flex flex-col flex-1 overflow-y-auto px-3 pb-4 gap-1">
        {activeDocs.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/40 text-center py-6 italic">No documents yet</p>
        ) : (
          activeDocs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              onView={onView}
              onDownload={onDownload}
              onMarkComplete={onMarkComplete ? () => onMarkComplete() : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}

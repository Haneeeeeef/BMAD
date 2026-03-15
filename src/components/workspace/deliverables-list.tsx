"use client"

import React, { memo, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Deliverable } from "@/lib/bmad-types"
import { AVAILABLE_DELIVERABLES } from "@/lib/bmad-types"

const DELIVERABLE_ICON: Record<string, string> = Object.fromEntries(
  AVAILABLE_DELIVERABLES.map((d) => [d.type, d.icon])
)

interface DeliverablesListProps {
  deliverables: Deliverable[]
  currentDeliverableId: string | null
  onDeliverableClick: (id: string) => void
  onAddDeliverable?: () => void
  onDeleteDeliverable?: (id: string) => void
  onForceComplete?: (id: string) => void
  onReviewDeliverable?: (id: string) => void
}

const STATUS_LABEL: Record<Deliverable["status"], string> = {
  "queued": "Queued",
  "in-progress": "In Progress",
  "complete": "Done",
  "reviewing": "Reviewing",
  "awaiting-approval": "Approve",
  "revising": "Revising",
  "validated": "Reviewed",
}

const STATUS_BADGE: Record<Deliverable["status"], { text: string; bg: string }> = {
  "queued": { text: "text-muted-foreground", bg: "bg-muted" },
  "in-progress": { text: "text-amber-700", bg: "bg-amber-50" },
  "complete": { text: "text-emerald-700", bg: "bg-emerald-50" },
  "reviewing": { text: "text-[var(--brand-dark)]", bg: "bg-[var(--brand)]/[0.08]" },
  "awaiting-approval": { text: "text-orange-700", bg: "bg-orange-50" },
  "revising": { text: "text-violet-700", bg: "bg-violet-50" },
  "validated": { text: "text-emerald-700", bg: "bg-emerald-50" },
}

const DeliverableRow = memo(function DeliverableRow({
  deliverable,
  isActive,
  onClick,
  onDelete,
  onForceComplete,
}: {
  deliverable: Deliverable
  isActive: boolean
  onClick: (id: string) => void
  onDelete?: (id: string) => void
  onForceComplete?: (id: string) => void
  onReview?: (id: string) => void
}) {
  const handleClick = useCallback(() => onClick(deliverable.id), [onClick, deliverable.id])
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(deliverable.id)
  }, [onDelete, deliverable.id])
  const handleForceComplete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onForceComplete?.(deliverable.id)
  }, [onForceComplete, deliverable.id])

  const badge = STATUS_BADGE[deliverable.status]
  const isClickableStatus = (deliverable.status === "in-progress" || deliverable.status === "awaiting-approval") && onForceComplete

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick() }}
      className={cn(
        "group relative flex items-center gap-2.5 px-2.5 py-3.5 rounded-xl text-left transition-all cursor-pointer",
        isActive
          ? "bg-white/60 shadow-sm ring-1 ring-border/30"
          : "hover:bg-white/50",
      )}
    >
      <img
        src={`/deliverables/${deliverable.type}.png`}
        alt=""
        className="shrink-0 w-[28px] h-[28px] rounded-lg object-cover"
        onError={(e) => { (e.target as HTMLImageElement).src = "/deliverables/default.png" }}
        aria-hidden="true"
      />
      <span
        className={cn(
          "flex-1 text-[13px] truncate",
          deliverable.status === "queued" ? "text-muted-foreground" : isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80",
        )}
      >
        {deliverable.name}
      </span>
      {isClickableStatus ? (
        <span
          role="button"
          tabIndex={0}
          onClick={handleForceComplete}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleForceComplete(e as unknown as React.MouseEvent) } }}
          className={cn("w-[68px] text-center shrink-0 rounded py-0.5 text-[10px] font-semibold cursor-pointer transition-opacity hover:opacity-70", badge.text, badge.bg)}
          title={deliverable.status === "in-progress" ? "Click to mark as done" : "Override: mark as reviewed"}
        >
          {STATUS_LABEL[deliverable.status]}
        </span>
      ) : (
        <span className={cn("w-[68px] text-center shrink-0 rounded py-0.5 text-[10px] font-semibold", badge.text, badge.bg)}>
          {STATUS_LABEL[deliverable.status]}
        </span>
      )}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute -top-1 -right-0.5 p-0.5 rounded-full bg-background shadow-sm border border-border opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all shrink-0"
          aria-label={`Delete ${deliverable.name}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  )
})

export function DeliverablesList({
  deliverables,
  currentDeliverableId,
  onDeliverableClick,
  onAddDeliverable,
  onDeleteDeliverable,
  onForceComplete,
  onReviewDeliverable,
}: DeliverablesListProps) {
  return (
    <div className="flex flex-col">
      {/* Header + List */}
      <div className="flex flex-col px-2 pt-4 pb-4 gap-1 border-t border-border">
        <div className="flex items-center justify-between px-2.5 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Deliverables</span>
          {onAddDeliverable && (
            <button
              onClick={onAddDeliverable}
              className="flex items-center justify-center h-4 w-4 rounded text-muted-foreground/40 hover:text-foreground transition-colors cursor-pointer"
              aria-label="Add deliverable"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
        {deliverables.map((d) => (
          <DeliverableRow
            key={d.id}
            deliverable={d}
            isActive={d.id === currentDeliverableId}
            onClick={onDeliverableClick}
            onDelete={onDeleteDeliverable}
            onForceComplete={onForceComplete}
            onReview={onReviewDeliverable}
          />
        ))}
      </div>
    </div>
  )
}

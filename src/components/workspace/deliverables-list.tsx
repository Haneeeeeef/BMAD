"use client"

import React, { memo, useCallback } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Deliverable } from "@/lib/bmad-types"
import { StatusDot } from "./status-dot"

interface DeliverablesListProps {
  deliverables: Deliverable[]
  currentDeliverableId: string | null
  onDeliverableClick: (id: string) => void
  onAddDeliverable?: () => void
  onDeleteDeliverable?: (id: string) => void
}

const STATUS_LABEL: Record<Deliverable["status"], string> = {
  "queued": "Queued",
  "in-progress": "Running",
  "complete": "Done",
  "validated": "Done",
}

const STATUS_LABEL_COLOR: Record<Deliverable["status"], string> = {
  "queued": "text-muted-foreground",
  "in-progress": "text-amber-500",
  "complete": "text-emerald-500",
  "validated": "text-emerald-500",
}

const ROW_BG: Record<Deliverable["status"], string> = {
  "queued": "",
  "in-progress": "bg-amber-500/5",
  "complete": "bg-emerald-500/5",
  "validated": "bg-emerald-500/5",
}

function statusToDot(status: Deliverable["status"]) {
  switch (status) {
    case "complete":
    case "validated":
      return "done" as const
    case "in-progress":
      return "running" as const
    default:
      return "queued" as const
  }
}

const DeliverableRow = memo(function DeliverableRow({
  deliverable,
  isActive,
  onClick,
  onDelete,
}: {
  deliverable: Deliverable
  isActive: boolean
  onClick: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const handleClick = useCallback(() => onClick(deliverable.id), [onClick, deliverable.id])
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(deliverable.id)
  }, [onDelete, deliverable.id])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleClick() }}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors cursor-pointer",
        "hover:bg-muted",
        ROW_BG[deliverable.status],
        isActive && "ring-1 ring-[var(--brand-light)]",
      )}
    >
      <StatusDot
        status={statusToDot(deliverable.status)}
        pulse={deliverable.status === "in-progress"}
      />
      <span
        className={cn(
          "flex-1 text-sm truncate",
          deliverable.status === "queued" ? "text-muted-foreground" : "font-medium text-foreground",
        )}
      >
        {deliverable.name}
      </span>
      <span className={cn("text-xs shrink-0 font-medium", STATUS_LABEL_COLOR[deliverable.status])}>
        {STATUS_LABEL[deliverable.status]}
      </span>
      {onDelete && (
        <button
          onClick={handleDelete}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all shrink-0"
          aria-label={`Delete ${deliverable.name}`}
        >
          <X className="h-3.5 w-3.5" />
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
}: DeliverablesListProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Deliverables
        </span>
        {onAddDeliverable && (
          <button
            onClick={onAddDeliverable}
            className="flex items-center justify-center h-5 w-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Add deliverable"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex flex-col flex-1 overflow-y-auto p-1.5 gap-0.5">
        {deliverables.map((d) => (
          <DeliverableRow
            key={d.id}
            deliverable={d}
            isActive={d.id === currentDeliverableId}
            onClick={onDeliverableClick}
            onDelete={onDeleteDeliverable}
          />
        ))}
      </div>
    </div>
  )
}

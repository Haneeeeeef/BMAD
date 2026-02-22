"use client"

import { cn } from "@/lib/utils"
import { CanvasStatus } from "@/lib/canvas-types"
import { Circle, CheckCircle, Clock, Archive } from "lucide-react"

interface CanvasStatusBadgeProps {
  status: CanvasStatus
  className?: string
}

const statusConfig: Record<
  CanvasStatus,
  { label: string; icon: typeof Circle; color: string }
> = {
  draft: {
    label: "Draft",
    icon: Circle,
    color: "text-muted-foreground bg-muted",
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    icon: Clock,
    color: "text-amber-600 bg-amber-500/10",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    color: "text-emerald-600 bg-emerald-500/10",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    color: "text-muted-foreground bg-muted",
  },
}

export function CanvasStatusBadge({ status, className }: CanvasStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        config.color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  )
}

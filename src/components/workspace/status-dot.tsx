"use client"

import { cn } from "@/lib/utils"

const STATUS_COLORS = {
  done: "bg-emerald-500",
  complete: "bg-emerald-500",
  running: "bg-amber-500",
  "in-progress": "bg-amber-500",
  queued: "bg-border",
  pending: "bg-border",
  active: "bg-amber-500",
  idle: "bg-emerald-500",
  thinking: "bg-amber-500",
  offline: "bg-border",
  error: "bg-red-500",
} as const

type StatusDotStatus = keyof typeof STATUS_COLORS

interface StatusDotProps {
  status: StatusDotStatus
  size?: "sm" | "md"
  pulse?: boolean
  className?: string
}

export function StatusDot({ status, size = "sm", pulse, className }: StatusDotProps) {
  const colorClass = STATUS_COLORS[status] ?? "bg-border"
  const sizeClass = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "inline-block shrink-0 rounded-full",
          sizeClass,
          colorClass,
          pulse && "animate-pulse",
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{status}</span>
    </span>
  )
}

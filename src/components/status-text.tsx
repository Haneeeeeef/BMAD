import { cn } from "@/lib/utils"

export type StatusType = "running" | "waiting" | "error" | "completed" | "pending"

const statusConfig: Record<StatusType, { label: string; colors: string }> = {
  running: { label: "In Progress", colors: "bg-blue-100 text-blue-700" },
  waiting: { label: "Awaiting", colors: "bg-amber-100 text-amber-700" },
  error: { label: "Blocked", colors: "bg-red-100 text-red-700" },
  completed: { label: "Completed", colors: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Not Started", colors: "bg-gray-100 text-gray-500" },
}

interface StatusTextProps {
  status: StatusType
  className?: string
}

export function StatusText({ status, className }: StatusTextProps) {
  const config = statusConfig[status] || statusConfig.pending
  return (
    <span className={cn("inline-block px-1.5 py-0.5 text-xs font-medium rounded-sm", config.colors, className)}>
      {config.label}
    </span>
  )
}

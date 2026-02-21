import { Badge } from "@/components/ui/badge"

export type Status = "pending" | "running" | "completed" | "error" | "waiting"

const statusConfig: Record<Status, { variant: "secondary" | "default" | "outline" | "destructive"; label: string }> = {
  pending: { variant: "secondary", label: "Pending" },
  running: { variant: "default", label: "Running" },
  completed: { variant: "outline", label: "Completed" },
  error: { variant: "destructive", label: "Error" },
  waiting: { variant: "secondary", label: "Awaiting Approval" },
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}

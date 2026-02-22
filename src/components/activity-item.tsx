import { memo } from "react"
import { cn } from "@/lib/utils"

type ActivityType = "started" | "progress" | "completed" | "error" | "question" | "human"

const typeConfig: Record<ActivityType, { icon: string; color: string }> = {
  started: { icon: "rocket", color: "text-blue-500" },
  progress: { icon: "arrow-right", color: "text-muted-foreground" },
  completed: { icon: "check", color: "text-green-500" },
  error: { icon: "x", color: "text-destructive" },
  question: { icon: "help-circle", color: "text-amber-500" },
  human: { icon: "user", color: "text-violet-500" },
}

interface ActivityItemProps {
  timestamp: string
  agent: string
  type: ActivityType
  message: string
}

export const ActivityItem = memo(function ActivityItem({ timestamp, agent, type, message }: ActivityItemProps) {
  const config = typeConfig[type]

  return (
    <div className="flex gap-3 py-2">
      <span className="text-xs text-muted-foreground w-12 shrink-0">
        {timestamp}
      </span>
      <span className={cn("text-xs font-medium w-24 shrink-0 truncate", config.color)}>
        {agent}
      </span>
      <span className="text-xs text-foreground">
        {message}
      </span>
    </div>
  )
})

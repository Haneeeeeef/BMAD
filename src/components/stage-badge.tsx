import { cn } from "@/lib/utils"

interface StageBadgeProps {
  stage: string
  className?: string
}

export function StageBadge({ stage, className }: StageBadgeProps) {
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {stage}
    </span>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { StatusText, StatusType } from "@/components/status-text"
import { cn } from "@/lib/utils"

interface StageCardProps {
  name: string
  status: StatusType
  progress?: number
  agentCount?: number
  output?: string
  isActive?: boolean
}

export function StageCard({
  name,
  status,
  progress = 0,
  agentCount = 0,
  output,
  isActive = false,
}: StageCardProps) {
  return (
    <Card
      className={cn(
        "transition-all",
        isActive && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{name}</CardTitle>
          <StatusText status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {status === "running" && (
          <Progress value={progress} className="h-1" />
        )}
        {agentCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {agentCount} agent{agentCount !== 1 ? "s" : ""} active
          </p>
        )}
        {output && (
          <p className="text-xs text-muted-foreground truncate">
            {output}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

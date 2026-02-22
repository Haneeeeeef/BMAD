import { memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge, Status } from "@/components/status-badge"

interface AgentCardProps {
  name: string
  role: string
  status: Status
  currentTask?: string
  tokensUsed?: number
}

export const AgentCard = memo(function AgentCard({
  name,
  role,
  status,
  currentTask,
  tokensUsed,
}: AgentCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{name}</CardTitle>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-muted-foreground">{role}</p>
      </CardHeader>
      {(currentTask || tokensUsed) && (
        <CardContent className="pt-0">
          {currentTask && (
            <p className="text-xs text-muted-foreground truncate">
              {currentTask}
            </p>
          )}
          {tokensUsed !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              {tokensUsed.toLocaleString()} tokens
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
})

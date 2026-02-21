import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { StatusBadge, Status } from "@/components/status-badge"

interface ProjectCardProps {
  id: string
  name: string
  description?: string
  status: Status
  currentStage: string
  progress: number
  agentCount: number
}

export function ProjectCard({
  id,
  name,
  description,
  status,
  currentStage,
  progress,
  agentCount,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{name}</CardTitle>
            <StatusBadge status={status} />
          </div>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2 mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentStage}</span>
            <span>{agentCount} agents</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

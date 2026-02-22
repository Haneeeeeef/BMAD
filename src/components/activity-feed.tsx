import { ScrollArea } from "@/components/ui/scroll-area"
import { ActivityItem } from "@/components/activity-item"

interface Activity {
  id: string
  timestamp: string
  agent: string
  type: "started" | "progress" | "completed" | "error" | "question" | "human"
  message: string
}

interface ActivityFeedProps {
  activities: Activity[]
  maxHeight?: string
}

export function ActivityFeed({ activities, maxHeight = "300px" }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        No activity yet
      </div>
    )
  }

  return (
    <ScrollArea className={maxHeight ? `h-[${maxHeight}]` : "h-[400px]"}>
      <div className="divide-y">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            timestamp={activity.timestamp}
            agent={activity.agent}
            type={activity.type}
            message={activity.message}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

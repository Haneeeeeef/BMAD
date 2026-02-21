"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusText, StageCard, ActivityFeed } from "@/components"
import { mockProjects, mockStages, mockActivities } from "@/lib/mock-data"
import { ArrowLeft, Play, Pause } from "lucide-react"
import Link from "next/link"

export default function ProjectDetailPage() {
  const params = useParams()
  const project = mockProjects.find((p) => p.id === params.id) || mockProjects[0]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <StatusText status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        </div>
        <Button size="sm" variant={project.status === "running" ? "outline" : "default"}>
          {project.status === "running" ? (
            <>
              <Pause className="h-4 w-4 mr-1" /> Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" /> Start
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-3">
          {mockStages.map((stage) => (
            <StageCard
              key={stage.id}
              name={stage.name}
              status={stage.status}
              progress={stage.progress}
              agentCount={stage.agentCount}
              output={stage.output}
            />
          ))}
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeed activities={mockActivities} />
        </TabsContent>

        <TabsContent value="artifacts">
          <div className="text-center py-12 text-muted-foreground">
            Artifacts will appear here as agents complete work
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

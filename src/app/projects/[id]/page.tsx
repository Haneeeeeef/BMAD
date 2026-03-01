"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { loadProjects, updateProject } from "@/lib/projects-storage"
import { OrchestrationWorkspace } from "@/components/orchestration-workspace"
import { Project } from "@/lib/bmad-types"

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load project from localStorage
  // Note: localStorage may store the legacy Project shape (projects-storage.ts)
  // or the full BMAD Project shape — we cast and ensure required fields exist
  useEffect(() => {
    const projects = loadProjects()
    const found = projects.find((p) => p.id === projectId) as (Project & Record<string, unknown>) | undefined
    if (found) {
      // Ensure deliverables array exists (backwards compatibility)
      if (!found.deliverables) {
        (found as Project).deliverables = []
      }
      if (!found.inputDocuments) {
        (found as Project).inputDocuments = []
      }
      setProject(found as Project)
    }
    setIsLoading(false)
  }, [projectId])

  // Save project updates
  const handleProjectUpdate = (updated: Project) => {
    setProject(updated)

    // Persist to localStorage via projects-storage
    updateProject(updated.id, { ...updated, updatedAt: Date.now() } as unknown as Parameters<typeof updateProject>[1])
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Project not found</p>
          <a href="/" className="text-[var(--brand)] hover:underline">
            Return home
          </a>
        </div>
      </div>
    )
  }

  return <OrchestrationWorkspace project={project} onProjectUpdate={handleProjectUpdate} />
}

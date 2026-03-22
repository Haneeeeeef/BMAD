"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { OrchestrationWorkspace } from "@/components/orchestration-workspace"
import { Project } from "@/lib/bmad-types"
import { authHeaders } from "@/lib/safe-storage"

export default function ProjectPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load project from MongoDB
  useEffect(() => {
    fetch(`/api/db/projects?id=${encodeURIComponent(projectId)}`, {
      headers: authHeaders(),
    })
      .then(res => {
        if (!res.ok) return null
        return res.json()
      })
      .then(data => {
        if (data) {
          if (!data.deliverables) data.deliverables = []
          if (!data.inputDocuments) data.inputDocuments = []
          setProject(data as Project)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [projectId])

  // Save project updates to MongoDB
  const handleProjectUpdate = useCallback((updated: Project) => {
    setProject(updated)

    fetch("/api/db/projects", {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ ...updated, updatedAt: Date.now() }),
    }).catch(err => {
      console.error("[project-page] Failed to save project:", err)
    })
  }, [])

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

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BrandButton } from "@/components"
import { StatusBadge } from "@/components/status-badge"
import { Plus, FolderKanban, ArrowRight } from "lucide-react"
import { loadProjects, type Project } from "@/lib/projects-storage"
import { cn } from "@/lib/utils"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    setProjects(loadProjects())
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <span className="text-lg font-medium">Projects</span>
        <Link href="/new">
          <BrandButton size="sm" className="h-8 gap-1.5 rounded-full px-4">
            <Plus className="h-3.5 w-3.5" />
            Create
          </BrandButton>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No projects yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Start a conversation to create your first project
              </p>
              <Link href="/new" className="mt-4">
                <BrandButton className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Project
                </BrandButton>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="text-center pt-8 pb-6 px-4">
              <h1 className="text-5xl font-semibold mb-3">Projects</h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Build and manage AI-powered development projects with automated workflows.
              </p>
            </div>

            {/* Projects List */}
            <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
              <div className="space-y-2">
                {projects.map(project => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      "hover:bg-muted/50 transition-colors group"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {project.code}
                        </span>
                        <h3 className="font-medium truncate">{project.name}</h3>
                        <StatusBadge status={project.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {project.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right text-sm hidden sm:block">
                        <div className="text-muted-foreground">{project.currentStage}</div>
                        <div className="text-xs text-muted-foreground/70">{project.progress}% complete</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

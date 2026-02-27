"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, ChevronDown, Check, FolderKanban } from "lucide-react"
import Link from "next/link"
import { loadProjects, getProject, type Project } from "@/lib/projects-storage"
import { JarvisChat } from "@/components/jarvis-chat"
import { StatusBadge } from "@/components/status-badge"

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentId = params.id as string

  // Check for autoChat param (set when redirected from approval)
  const autoChat = searchParams.get("autoChat") === "true"
  const docTitle = searchParams.get("docTitle") || ""

  const [project, setProject] = useState<Project | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])

  useEffect(() => {
    const p = getProject(currentId)
    setProject(p)
    setAllProjects(loadProjects())

    // Clean up URL params after reading
    if (autoChat) {
      router.replace(`/projects/${currentId}`, { scroll: false })
    }
  }, [currentId, autoChat, router])

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <FolderKanban className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Project not found</p>
        <Link href="/projects" className="mt-4 text-primary hover:underline">
          Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Minimal header - back + project switcher */}
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-lg font-medium h-auto py-1 px-2">
              {project.name}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {allProjects.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className="justify-between"
              >
                {p.name}
                {p.id === currentId && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <StatusBadge status={project.status} />
      </div>

      {/* Content area - project overview */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Project Info Card */}
          <div className="rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {project.code}
                </span>
                <h1 className="text-2xl font-semibold mt-2">{project.name}</h1>
                <p className="text-muted-foreground mt-1">{project.description}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Current Stage</div>
                <div className="font-medium">{project.currentStage}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Progress</div>
                <div className="font-medium">{project.progress}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Active Agents</div>
                <div className="font-medium">{project.agentCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="font-medium">
                  {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Placeholder for future content */}
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p>Project workspace coming soon</p>
            <p className="text-sm mt-1">Ask Jarvis (bottom right) for help</p>
          </div>
        </div>
      </div>

      {/* Jarvis floating chat - uses original chatSessionId for continuity */}
      {project.chatSessionId && (
        <JarvisChat
          chatSessionId={project.chatSessionId}
          projectName={project.name}
          autoOpen={autoChat}
          approvalMessage={autoChat && docTitle ? `@jarvis [Approved: ${docTitle}]` : undefined}
        />
      )}
    </div>
  )
}

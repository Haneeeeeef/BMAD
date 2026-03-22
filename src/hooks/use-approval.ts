"use client"

import { useCallback } from "react"
import { approveDocument, getCurrentVersion, type CanvasData } from "@/lib/canvas-storage"
import { toast } from "sonner"

// Project type for API responses
interface Project {
  id: string
  name: string
  code: string
  client: string
  description: string
  status: string
  currentStage: string
  progress: number
  agentCount: number
  chatSessionId?: string
  createdAt: number
}

interface UseApprovalOptions {
  sessionId: string
  onUpdate?: (updated: CanvasData) => void
}

interface ApprovalResult {
  canvas: CanvasData | null
  project: Project | null
  documentTitle: string | null
}

// Extract project name from "Project Brief — Name" title
function extractProjectName(title: string): string {
  const match = title.match(/Project Brief\s*[—–-]\s*(.+)/i)
  return match ? match[1].trim() : title.replace(/Project Brief\s*/i, "").trim() || "Untitled Project"
}

// Extract description from project brief content (first paragraph after Problem Statement)
function extractDescription(content: string): string {
  const lines = content.split("\n")
  let capture = false
  for (const line of lines) {
    if (line.includes("Problem Statement")) {
      capture = true
      continue
    }
    if (capture && line.trim() && !line.startsWith("#")) {
      return line.trim().slice(0, 200)
    }
  }
  return "AI-powered project"
}

export function useApproval({ sessionId, onUpdate }: UseApprovalOptions) {
  const approve = useCallback(async (identifier: string): Promise<ApprovalResult> => {
    const updated = await approveDocument(sessionId, identifier)
    let project: Project | null = null
    let documentTitle: string | null = null

    if (updated) {
      onUpdate?.(updated)

      const doc = updated.documents.find(d => d.identifier === identifier)
      documentTitle = doc?.title || null

      // Create project when project_brief is approved (if not already exists)
      if (doc?.type === "project_brief") {
        // Check if a project already exists for this chat session
        const projectsRes = await fetch("/api/db/projects")
        const allProjects: Project[] = projectsRes.ok ? await projectsRes.json() : []
        const existingProject = allProjects.find(p => p.chatSessionId === sessionId) || null

        if (!existingProject) {
          const version = getCurrentVersion(doc)
          const projectName = extractProjectName(doc.title)
          try {
            const createRes = await fetch("/api/db/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: `proj-${Date.now()}`,
                code: projectName.slice(0, 3).toUpperCase(),
                name: projectName,
                client: "Internal",
                description: version ? extractDescription(version.content) : "AI-powered project",
                status: "pending",
                currentStage: "Discovery",
                progress: 10,
                agentCount: 1,
                chatSessionId: sessionId,
              }),
            })
            if (createRes.ok) {
              project = await createRes.json()
            } else {
              // Duplicate key error — project already created by another call
              const retryRes = await fetch("/api/db/projects")
              const retry: Project[] = retryRes.ok ? await retryRes.json() : []
              project = retry.find(p => p.chatSessionId === sessionId) || null
            }
          } catch {
            // Silent — project may have been created by another call
          }
        } else {
          project = existingProject
        }
      }

      toast.success(`${doc?.title || "Document"} approved`)
    }

    return { canvas: updated, project, documentTitle }
  }, [sessionId, onUpdate])

  return { approve }
}

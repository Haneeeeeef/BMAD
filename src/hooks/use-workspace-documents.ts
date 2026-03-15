"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { authHeaders } from "@/lib/safe-storage"
import type { DocumentItem } from "@/components/workspace"
import type { Project, Deliverable } from "@/lib/bmad-types"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function friendlyName(filepath: string): string {
  if (filepath === "PROJECT-CONTEXT.md") return "Project Context"
  if (filepath === "PROJECT-DECISIONS.md") return "Project Decisions"
  const transcriptMatch = filepath.match(/^WORKFLOW-TRANSCRIPT-(.+)\.md$/)
  if (transcriptMatch) {
    const wf = transcriptMatch[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    return `Transcript: ${wf}`
  }
  const memoryMatch = filepath.match(/^MEMORY-(.+)\.md$/)
  if (memoryMatch) {
    const agent = memoryMatch[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    return `Memory: ${agent}`
  }
  const basename = filepath.split("/").pop() || filepath
  return basename.replace(/\.(md|drawio)$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

// Deliverable ordering — matches the BMAD methodology flow
const DELIVERABLE_ORDER: string[] = [
  "product-brief",
  "process-flow",         // brief-level process flow
  "prd",
  "user-journey-flow",    // PRD-level flow
  "ux-design",
  "architecture",
  "data-flow",            // architecture-level flow
  "epics",
  "sprint-plan",
  "test-plan",
  "test-cases",
  "test-scenarios",
  "test-data",
]

function deliverableOrder(filepath: string): number {
  const basename = (filepath.split("/").pop() || "").replace(/\.(md|drawio)$/, "").toLowerCase()
  // Reviews sort after their parent artifact
  if (basename.startsWith("review-")) {
    const parent = basename.replace("review-", "")
    const parentIdx = DELIVERABLE_ORDER.findIndex(d => parent.includes(d))
    return parentIdx >= 0 ? parentIdx + 0.5 : 900
  }
  const idx = DELIVERABLE_ORDER.findIndex(d => basename.includes(d))
  return idx >= 0 ? idx : 800 // unknown deliverables go near the end
}

async function fetchVpsFiles(projectSlug: string, rootOnly: boolean): Promise<string[]> {
  const res = await fetch("/api/artifacts", {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ project: projectSlug, ...(rootOnly ? { rootOnly: true } : {}) }),
  })
  const data = await res.json()
  return data.files || []
}

export function useWorkspaceDocuments(project: Project) {
  const projectSlug = slugify(project.name)

  const { data: projectFiles = [] } = useQuery({
    queryKey: ["vps-files", projectSlug, "root"],
    queryFn: () => fetchVpsFiles(projectSlug, true),
    enabled: !!projectSlug,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  const { data: artifactFiles = [] } = useQuery({
    queryKey: ["vps-files", projectSlug, "artifacts"],
    queryFn: () => fetchVpsFiles(projectSlug, false),
    enabled: !!projectSlug,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  // Derive document list from VPS files + deliverable state
  const documents: DocumentItem[] = (() => {
    const projectDocs: DocumentItem[] = projectFiles
      .filter(f => !f.includes("/") && f.endsWith(".md"))
      .map(f => ({
        id: `proj-${f}`,
        name: friendlyName(f),
        status: "ready" as const,
        path: f,
        kind: "project" as const,
      }))

    const artifactDocs: DocumentItem[] = artifactFiles
      .filter(f => f.endsWith(".md") || f.endsWith(".drawio"))
      .map(f => ({
        id: `art-${f}`,
        name: friendlyName(f),
        status: "ready" as const,
        path: f,
        kind: "deliverable" as const,
      }))
      .sort((a, b) => deliverableOrder(a.path || "") - deliverableOrder(b.path || ""))

    const generatingDocs: DocumentItem[] = project.deliverables
      .filter(d => d.status === "in-progress")
      .map(d => ({
        id: `doc-${d.id}`,
        name: `${d.name.toLowerCase().replace(/\s+/g, "-")}.md`,
        status: "generating" as const,
      }))

    return [...projectDocs, ...artifactDocs, ...generatingDocs]
  })()

  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null)
  const [documentContent, setDocumentContent] = useState("")
  const [documentLoading, setDocumentLoading] = useState(false)

  useEffect(() => {
    if (!viewingDocument) {
      setDocumentContent("")
      return
    }

    setDocumentLoading(true)
    setDocumentContent("")

    let url: string
    if (viewingDocument.path) {
      url = `/api/artifacts?project=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(viewingDocument.path)}`
    } else {
      const deliverableId = viewingDocument.id.replace("doc-", "")
      const deliverable = project.deliverables.find(d => d.id === deliverableId)
      if (!deliverable) {
        setDocumentContent("Deliverable not found.")
        setDocumentLoading(false)
        return
      }
      url = `/api/artifacts?project=${encodeURIComponent(projectSlug)}&type=${encodeURIComponent(deliverable.type)}`
    }

    fetch(url, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          setDocumentContent(data.content)
        } else {
          setDocumentContent(`# ${viewingDocument.name.replace(/\.md$/, "").replace(/-/g, " ")}\n\nDocument not found on VPS.`)
        }
      })
      .catch(() => {
        setDocumentContent(`# ${viewingDocument.name.replace(/\.md$/, "").replace(/-/g, " ")}\n\nFailed to fetch from VPS.`)
      })
      .finally(() => setDocumentLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingDocument?.id])

  const openDocument = useCallback((doc: DocumentItem) => setViewingDocument(doc), [])
  const closeDocument = useCallback(() => setViewingDocument(null), [])

  return {
    documents,
    viewingDocument,
    documentContent,
    documentLoading,
    openDocument,
    closeDocument,
    projectSlug,
  }
}

import { CanvasStatus } from "./canvas-types"
import { authHeaders } from "./safe-storage"

// Single version of a document
export interface DocumentVersion {
  version: number
  content: string
  status: CanvasStatus
  createdAt: number
  approvedAt?: number
  agent?: string
}

// Single document in the canvas (with version history)
export interface CanvasDocument {
  identifier: string
  title: string
  type: string
  versions: DocumentVersion[]
  activeVersion: number
  createdAt: number
  updatedAt: number
}

// Helper to get current version content
export function getCurrentVersion(doc: CanvasDocument): DocumentVersion | undefined {
  return doc.versions.find(v => v.version === doc.activeVersion) || doc.versions[doc.versions.length - 1]
}

// Helper to get latest version number
export function getLatestVersion(doc: CanvasDocument): number {
  return Math.max(...doc.versions.map(v => v.version), 0)
}

// Collection of documents for a session
export interface CanvasData {
  sessionId: string
  documents: CanvasDocument[]
  activeDocumentId?: string
  completions?: AgentCompletion[]
  updatedAt: number
}

// Input for saving a document
export interface SaveDocumentInput {
  identifier: string
  title: string
  type: string
  content: string
  status: CanvasStatus
  agent?: string
  version?: number
}

// Agent completion notifications
export interface AgentCompletion {
  agentId: string
  reportPath: string
  completedAt: number
  acknowledged: boolean
}

// --- All operations now hit MongoDB via API ---

export async function loadCanvas(sessionId: string): Promise<CanvasData | null> {
  try {
    const res = await fetch(`/api/db/canvas?sessionId=${encodeURIComponent(sessionId)}`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data || null
  } catch {
    return null
  }
}

export async function saveCanvasData(data: CanvasData): Promise<void> {
  try {
    await fetch("/api/db/canvas", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        sessionId: data.sessionId,
        documents: data.documents,
        activeDocumentId: data.activeDocumentId,
        completions: data.completions ?? [],
      }),
    })
  } catch {
    console.error("Failed to save canvas")
  }
}

export async function saveDocument(sessionId: string, input: SaveDocumentInput): Promise<CanvasData> {
  const canvas = await loadCanvas(sessionId) || {
    sessionId,
    documents: [],
    updatedAt: Date.now(),
  }

  const now = Date.now()
  const existingIndex = canvas.documents.findIndex(d => d.identifier === input.identifier)

  if (existingIndex >= 0) {
    const existingDoc = canvas.documents[existingIndex]

    if (!existingDoc.versions || existingDoc.versions.length === 0) {
      existingDoc.versions = [{
        version: 1,
        content: "",
        status: "draft",
        createdAt: existingDoc.createdAt || now,
      }]
      existingDoc.activeVersion = 1
    }

    const latestVersion = existingDoc.versions.find(v => v.version === getLatestVersion(existingDoc))
    if (latestVersion && latestVersion.content === input.content && latestVersion.status === input.status) {
      if (existingDoc.title !== input.title) {
        existingDoc.title = input.title
        existingDoc.updatedAt = now
        await saveCanvasData(canvas)
      }
      return canvas
    }

    const newVersionNum = getLatestVersion(existingDoc) + 1
    existingDoc.versions.push({
      version: newVersionNum,
      content: input.content,
      status: input.status,
      createdAt: now,
      agent: input.agent,
    })
    existingDoc.activeVersion = newVersionNum
    existingDoc.title = input.title
    existingDoc.updatedAt = now
  } else {
    canvas.documents.push({
      identifier: input.identifier,
      title: input.title,
      type: input.type,
      versions: [{
        version: input.version || 1,
        content: input.content,
        status: input.status,
        createdAt: now,
        agent: input.agent,
      }],
      activeVersion: input.version || 1,
      createdAt: now,
      updatedAt: now,
    })
  }

  if (!canvas.activeDocumentId) {
    canvas.activeDocumentId = input.identifier
  }

  await saveCanvasData(canvas)
  return canvas
}

export async function approveDocument(sessionId: string, identifier: string): Promise<CanvasData | null> {
  const canvas = await loadCanvas(sessionId)
  if (!canvas) return null

  const doc = canvas.documents.find(d => d.identifier === identifier)
  if (!doc || !doc.versions.length) return null

  const latestVersionNum = getLatestVersion(doc)
  const latestVersion = doc.versions.find(v => v.version === latestVersionNum)

  if (latestVersion) {
    latestVersion.status = "approved"
    latestVersion.approvedAt = Date.now()

    doc.versions.forEach(v => {
      if (v.version < latestVersionNum && v.status === "awaiting_approval") {
        v.status = "draft"
      }
    })

    doc.activeVersion = latestVersionNum
  }
  doc.updatedAt = Date.now()

  await saveCanvasData(canvas)
  return canvas
}

export async function unapproveDocument(sessionId: string, identifier: string): Promise<CanvasData | null> {
  const canvas = await loadCanvas(sessionId)
  if (!canvas) return null

  const doc = canvas.documents.find(d => d.identifier === identifier)
  if (!doc) return null

  const version = getCurrentVersion(doc)
  if (version && version.status === "approved") {
    version.status = "awaiting_approval"
    delete version.approvedAt
  }
  doc.updatedAt = Date.now()

  await saveCanvasData(canvas)
  return canvas
}

export async function setDocumentVersion(sessionId: string, identifier: string, versionNum: number): Promise<CanvasData | null> {
  const canvas = await loadCanvas(sessionId)
  if (!canvas) return null

  const doc = canvas.documents.find(d => d.identifier === identifier)
  if (!doc) return null

  const version = doc.versions.find(v => v.version === versionNum)
  if (!version) return null

  doc.activeVersion = versionNum
  await saveCanvasData(canvas)
  return canvas
}

export async function setActiveDocument(sessionId: string, identifier: string): Promise<void> {
  const canvas = await loadCanvas(sessionId)
  if (!canvas) return

  canvas.activeDocumentId = identifier
  await saveCanvasData(canvas)
}

export async function removeDocument(sessionId: string, identifier: string): Promise<CanvasData | null> {
  const canvas = await loadCanvas(sessionId)
  if (!canvas) return null

  const docIndex = canvas.documents.findIndex(d => d.identifier === identifier)
  if (docIndex < 0) return null

  canvas.documents.splice(docIndex, 1)

  if (canvas.activeDocumentId === identifier) {
    canvas.activeDocumentId = canvas.documents[0]?.identifier
  }

  await saveCanvasData(canvas)
  return canvas
}

export async function deleteCanvas(sessionId: string): Promise<void> {
  try {
    await fetch(`/api/db/canvas?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
  } catch {
    console.error("Failed to delete canvas")
  }
}

// Canvas status summary for AI context
export async function getCanvasStatusSummary(sessionId: string): Promise<string | null> {
  const canvas = await loadCanvas(sessionId)
  if (!canvas || canvas.documents.length === 0) return null

  const summaries = canvas.documents.map(doc => {
    const currentVersion = getCurrentVersion(doc)
    const latestVersion = getLatestVersion(doc)
    const versionInfo = `v${currentVersion?.version || 1}/${latestVersion}`

    if (currentVersion?.status === "approved" && currentVersion.approvedAt) {
      const date = new Date(currentVersion.approvedAt).toISOString()
      return `[Document "${doc.title}" (${versionInfo}): Approved at ${date}]`
    }
    return `[Document "${doc.title}" (${versionInfo}): ${currentVersion?.status || "draft"}]`
  })

  return summaries.join("\n")
}

// Agent completion functions
export async function loadAgentCompletions(sessionId: string): Promise<AgentCompletion[]> {
  const canvas = await loadCanvas(sessionId)
  return (canvas?.completions as AgentCompletion[]) ?? []
}

export async function addAgentCompletion(sessionId: string, agentId: string, reportPath: string): Promise<void> {
  try {
    await fetch("/api/db/canvas", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        action: "add-completion",
        sessionId,
        agentId,
        reportPath,
      }),
    })
  } catch {
    console.error("Failed to save agent completion")
  }
}

export async function acknowledgeCompletion(sessionId: string, agentId: string): Promise<void> {
  try {
    await fetch("/api/db/canvas", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        action: "acknowledge-completion",
        sessionId,
        agentId,
      }),
    })
  } catch {
    console.error("Failed to acknowledge completion")
  }
}

// Agent completion summary for system prompt
export async function getAgentCompletionsSummary(sessionId: string): Promise<string | null> {
  const completions = await loadAgentCompletions(sessionId)
  const pending = completions.filter(c => !c.acknowledged)

  if (pending.length === 0) return null

  return pending
    .map(c => `[Agent Complete: ${c.agentId} | Report: ${c.reportPath}]`)
    .join("\n")
}

// Combined context for system prompt
export async function getSessionContext(sessionId: string, canvasUrl?: string): Promise<string> {
  const parts: string[] = []

  parts.push(`[Session: ${sessionId}]`)
  if (canvasUrl) {
    parts.push(`[Canvas URL: ${canvasUrl}]`)
  }

  const canvasStatus = await getCanvasStatusSummary(sessionId)
  if (canvasStatus) parts.push(canvasStatus)

  const completions = await getAgentCompletionsSummary(sessionId)
  if (completions) parts.push(completions)

  return parts.join("\n")
}

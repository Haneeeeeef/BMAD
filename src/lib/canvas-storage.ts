import { CanvasStatus } from "./canvas-types"
import { safeGetItem, safeSetItem, safeRemoveItem } from "./safe-storage"

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
  type: string // e.g., "project_brief", "process_flow", "text/markdown"
  versions: DocumentVersion[]
  activeVersion: number // Which version is currently being viewed
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
  updatedAt: number
}

// Legacy single-document format (for backwards compatibility)
export interface LegacyCanvasData {
  sessionId: string
  content: string
  status: CanvasStatus
  sections?: Record<string, string>
  createdAt: number
  updatedAt: number
  approvedAt?: number
}

// Agent completion notifications
export interface AgentCompletion {
  agentId: string
  reportPath: string
  completedAt: number
  acknowledged: boolean
}

const COMPLETIONS_KEY_PREFIX = "agent_completions_"
const STORAGE_KEY_PREFIX = "canvas_"

export function getCanvasKey(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`
}

// Load canvas data (handles legacy format migration)
export function loadCanvas(sessionId: string): CanvasData | null {
  if (typeof window === "undefined") return null

  try {
    const key = getCanvasKey(sessionId)
    const stored = safeGetItem(key)
    if (!stored) return null

    const parsed = JSON.parse(stored)

    // Check if it's legacy format (has 'content' but no 'documents')
    if (parsed.content && !parsed.documents) {
      // Migrate to new format with versions
      const legacy = parsed as LegacyCanvasData
      const migrated: CanvasData = {
        sessionId: legacy.sessionId,
        documents: [{
          identifier: "project-brief",
          title: "Project Brief",
          type: "project_brief",
          versions: [{
            version: 1,
            content: legacy.content,
            status: legacy.status,
            createdAt: legacy.createdAt,
            approvedAt: legacy.approvedAt,
          }],
          activeVersion: 1,
          createdAt: legacy.createdAt,
          updatedAt: legacy.updatedAt,
        }],
        activeDocumentId: "project-brief",
        updatedAt: legacy.updatedAt,
      }
      // Save migrated format
      saveCanvasData(migrated)
      return migrated
    }

    // Migrate old documents without versions array
    const data = parsed as CanvasData
    let needsMigration = false
    data.documents = data.documents.map(doc => {
      if (!doc.versions) {
        needsMigration = true
        // Migrate old format to versioned format
        const oldDoc = doc as any
        return {
          identifier: doc.identifier,
          title: doc.title,
          type: doc.type,
          versions: [{
            version: oldDoc.version || 1,
            content: oldDoc.content || "",
            status: oldDoc.status || "draft",
            createdAt: doc.createdAt,
            approvedAt: oldDoc.approvedAt,
            agent: oldDoc.agent,
          }],
          activeVersion: oldDoc.version || 1,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }
      }
      return doc
    })

    if (needsMigration) {
      saveCanvasData(data)
    }

    return data
  } catch {
    return null
  }
}

// Save full canvas data
export function saveCanvasData(data: CanvasData): void {
  if (typeof window === "undefined") return

  try {
    const key = getCanvasKey(data.sessionId)
    safeSetItem(key, JSON.stringify({
      ...data,
      updatedAt: Date.now(),
    }))
  } catch {
    console.error("Failed to save canvas to localStorage")
  }
}

// Input for saving a document (simplified interface)
export interface SaveDocumentInput {
  identifier: string
  title: string
  type: string
  content: string
  status: CanvasStatus
  agent?: string
  version?: number // Optional - auto-increments if not specified
}

// Add or update a document (creates new version if content changed)
export function saveDocument(sessionId: string, input: SaveDocumentInput): CanvasData {
  const canvas = loadCanvas(sessionId) || {
    sessionId,
    documents: [],
    updatedAt: Date.now(),
  }

  const now = Date.now()
  const existingIndex = canvas.documents.findIndex(d => d.identifier === input.identifier)

  if (existingIndex >= 0) {
    // Document exists - check if content changed
    const existingDoc = canvas.documents[existingIndex]

    // Ensure versions array exists (migration safety)
    if (!existingDoc.versions || existingDoc.versions.length === 0) {
      existingDoc.versions = [{
        version: 1,
        content: "",
        status: "draft",
        createdAt: existingDoc.createdAt || now,
      }]
      existingDoc.activeVersion = 1
    }

    // Only create a new version if content actually changed
    const latestVersion = existingDoc.versions.find(v => v.version === getLatestVersion(existingDoc))
    if (latestVersion && latestVersion.content === input.content && latestVersion.status === input.status) {
      // Content unchanged — skip version creation, just update title if needed
      if (existingDoc.title !== input.title) {
        existingDoc.title = input.title
        existingDoc.updatedAt = now
        saveCanvasData(canvas)
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
    // New document - create with version 1
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

  // Set as active if it's the first document
  if (!canvas.activeDocumentId) {
    canvas.activeDocumentId = input.identifier
  }

  saveCanvasData(canvas)
  return canvas
}

// Approve a specific document (approves the LATEST version only)
export function approveDocument(sessionId: string, identifier: string): CanvasData | null {
  const canvas = loadCanvas(sessionId)
  if (!canvas) return null

  const doc = canvas.documents.find(d => d.identifier === identifier)
  if (!doc || !doc.versions.length) return null

  // Always approve the latest version
  const latestVersionNum = getLatestVersion(doc)
  const latestVersion = doc.versions.find(v => v.version === latestVersionNum)

  if (latestVersion) {
    latestVersion.status = "approved"
    latestVersion.approvedAt = Date.now()

    // Mark all older versions as superseded (can't be approved)
    doc.versions.forEach(v => {
      if (v.version < latestVersionNum && v.status === "awaiting_approval") {
        v.status = "draft" // Superseded - no longer awaiting approval
      }
    })

    // Switch to the approved version
    doc.activeVersion = latestVersionNum
  }
  doc.updatedAt = Date.now()

  saveCanvasData(canvas)
  return canvas
}

// Unapprove a specific document (reverts to awaiting_approval)
export function unapproveDocument(sessionId: string, identifier: string): CanvasData | null {
  const canvas = loadCanvas(sessionId)
  if (!canvas) return null

  const doc = canvas.documents.find(d => d.identifier === identifier)
  if (!doc) return null

  const version = getCurrentVersion(doc)
  if (version && version.status === "approved") {
    version.status = "awaiting_approval"
    delete version.approvedAt
  }
  doc.updatedAt = Date.now()

  saveCanvasData(canvas)
  return canvas
}

// Switch to a different version of a document
export function setDocumentVersion(sessionId: string, identifier: string, versionNum: number): CanvasData | null {
  const canvas = loadCanvas(sessionId)
  if (!canvas) return null

  const doc = canvas.documents.find(d => d.identifier === identifier)
  if (!doc) return null

  // Check if version exists
  const version = doc.versions.find(v => v.version === versionNum)
  if (!version) return null

  doc.activeVersion = versionNum
  saveCanvasData(canvas)
  return canvas
}

// Set active document
export function setActiveDocument(sessionId: string, identifier: string): void {
  const canvas = loadCanvas(sessionId)
  if (!canvas) return

  canvas.activeDocumentId = identifier
  saveCanvasData(canvas)
}

// Remove a document from canvas
export function removeDocument(sessionId: string, identifier: string): CanvasData | null {
  const canvas = loadCanvas(sessionId)
  if (!canvas) return null

  const docIndex = canvas.documents.findIndex(d => d.identifier === identifier)
  if (docIndex < 0) return null

  canvas.documents.splice(docIndex, 1)

  // Update active document if we removed the active one
  if (canvas.activeDocumentId === identifier) {
    canvas.activeDocumentId = canvas.documents[0]?.identifier
  }

  saveCanvasData(canvas)
  return canvas
}

// Legacy compatibility - save single document as "project-brief"
export function saveCanvas(data: LegacyCanvasData): void {
  saveDocument(data.sessionId, {
    identifier: "project-brief",
    title: "Project Brief",
    type: "project_brief",
    content: data.content,
    status: data.status,
    version: 1,
  })
}

// Legacy compatibility - approve the project brief
export function approveCanvas(sessionId: string): CanvasData | null {
  return approveDocument(sessionId, "project-brief")
}

export function deleteCanvas(sessionId: string): void {
  if (typeof window === "undefined") return

  try {
    const key = getCanvasKey(sessionId)
    safeRemoveItem(key)
  } catch {
    console.error("Failed to delete canvas from localStorage")
  }
}

// Get canvas status summary for injecting into AI context
export function getCanvasStatusSummary(sessionId: string): string | null {
  const canvas = loadCanvas(sessionId)
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
function getCompletionsKey(sessionId: string): string {
  return `${COMPLETIONS_KEY_PREFIX}${sessionId}`
}

export function loadAgentCompletions(sessionId: string): AgentCompletion[] {
  if (typeof window === "undefined") return []

  try {
    const key = getCompletionsKey(sessionId)
    const stored = safeGetItem(key)
    if (!stored) return []
    return JSON.parse(stored) as AgentCompletion[]
  } catch {
    return []
  }
}

export function addAgentCompletion(
  sessionId: string,
  agentId: string,
  reportPath: string
): void {
  if (typeof window === "undefined") return

  try {
    const completions = loadAgentCompletions(sessionId)
    completions.push({
      agentId,
      reportPath,
      completedAt: Date.now(),
      acknowledged: false,
    })
    const key = getCompletionsKey(sessionId)
    safeSetItem(key, JSON.stringify(completions))
  } catch {
    console.error("Failed to save agent completion")
  }
}

export function acknowledgeCompletion(sessionId: string, agentId: string): void {
  if (typeof window === "undefined") return

  try {
    const completions = loadAgentCompletions(sessionId)
    const updated = completions.map((c) =>
      c.agentId === agentId ? { ...c, acknowledged: true } : c
    )
    const key = getCompletionsKey(sessionId)
    safeSetItem(key, JSON.stringify(updated))
  } catch {
    console.error("Failed to acknowledge completion")
  }
}

// Get unacknowledged agent completions for system prompt injection
export function getAgentCompletionsSummary(sessionId: string): string | null {
  const completions = loadAgentCompletions(sessionId)
  const pending = completions.filter((c) => !c.acknowledged)

  if (pending.length === 0) return null

  return pending
    .map((c) => `[Agent Complete: ${c.agentId} | Report: ${c.reportPath}]`)
    .join("\n")
}

// Combined context for system prompt (canvas + completions)
export function getSessionContext(sessionId: string, canvasUrl?: string): string {
  const parts: string[] = []

  // Always include session info so Jarvis can push to canvas
  parts.push(`[Session: ${sessionId}]`)
  if (canvasUrl) {
    parts.push(`[Canvas URL: ${canvasUrl}]`)
  }

  const canvasStatus = getCanvasStatusSummary(sessionId)
  if (canvasStatus) parts.push(canvasStatus)

  const completions = getAgentCompletionsSummary(sessionId)
  if (completions) parts.push(completions)

  return parts.join("\n")
}

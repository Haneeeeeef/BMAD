import type { Collection } from "mongodb"
import { getDb } from "./client"

// Document types for each collection
export interface ProjectDoc {
  userId: string
  id: string
  name: string
  mode: string
  description: string
  createdAt: number
  updatedAt: number
  currentPhase: string
  currentWorkflow: string | null
  currentDeliverable: string | null
  context: Record<string, string | undefined>
  artifacts: Record<string, unknown>[]
  deliverables: Record<string, unknown>[]
  inputDocuments?: Record<string, unknown>[]
  sessionId?: string
  // Legacy fields from projects-storage.ts Project type
  code?: string
  client?: string
  status?: string
  currentStage?: string
  progress?: number
  agentCount?: number
  chatSessionId?: string
}

export interface ChatMessagesDoc {
  userId: string
  projectId: string
  deliverableId: string
  messages: Record<string, unknown>[]
  updatedAt: number
}

export interface CanvasDoc {
  userId: string
  sessionId: string
  documents: Record<string, unknown>[]
  activeDocumentId?: string
  completions: Record<string, unknown>[]
  updatedAt: number
}

export async function getProjectsCollection(): Promise<Collection<ProjectDoc>> {
  const db = await getDb()
  return db.collection<ProjectDoc>("bmad_projects")
}

export async function getChatMessagesCollection(): Promise<Collection<ChatMessagesDoc>> {
  const db = await getDb()
  return db.collection<ChatMessagesDoc>("bmad_chat_messages")
}

export async function getCanvasCollection(): Promise<Collection<CanvasDoc>> {
  const db = await getDb()
  return db.collection<CanvasDoc>("bmad_canvas")
}

// Ensure indexes exist — call once on startup
let indexesCreated = false

export async function ensureIndexes(): Promise<void> {
  if (indexesCreated) return
  indexesCreated = true

  const [projects, chatMessages, canvas] = await Promise.all([
    getProjectsCollection(),
    getChatMessagesCollection(),
    getCanvasCollection(),
  ])

  await Promise.all([
    projects.createIndex({ userId: 1, id: 1 }, { unique: true }),
    // Prevent duplicate projects from same chat session
    projects.createIndex(
      { userId: 1, chatSessionId: 1 },
      { unique: true, sparse: true }
    ),
    chatMessages.createIndex({ userId: 1, projectId: 1, deliverableId: 1 }, { unique: true }),
    canvas.createIndex({ userId: 1, sessionId: 1 }, { unique: true }),
  ])
}

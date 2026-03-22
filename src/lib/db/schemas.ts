import { z } from "zod"

// --- Message & Attachment schemas ---

export const attachmentSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "file", "audio", "chatgpt-export"]),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  data: z.string().optional(),
  transcription: z.string().optional(),
})

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  reasoning: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  createdAt: z.number(),
})

// --- Project schemas ---

export const deliverableSchema = z.object({
  id: z.string(),
  type: z.string(),
  workflowId: z.string(),
  name: z.string(),
  description: z.string(),
  status: z.string(),
  progress: z.number(),
  tasks: z.array(z.record(z.string(), z.unknown())).default([]),
  sessionId: z.string().optional(),
}).passthrough()

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.string().optional(),
  description: z.string(),
  createdAt: z.union([z.number(), z.string()]),
  updatedAt: z.union([z.number(), z.string()]).optional(),
  currentPhase: z.string().optional(),
  currentWorkflow: z.string().nullable().optional(),
  currentDeliverable: z.string().nullable().optional(),
  context: z.record(z.string(), z.string().optional()).optional(),
  artifacts: z.array(z.record(z.string(), z.unknown())).optional(),
  deliverables: z.array(deliverableSchema).optional(),
  inputDocuments: z.array(z.record(z.string(), z.unknown())).optional(),
  sessionId: z.string().optional(),
  // Legacy fields
  code: z.string().optional(),
  client: z.string().optional(),
  status: z.string().optional(),
  currentStage: z.string().optional(),
  progress: z.number().optional(),
  agentCount: z.number().optional(),
  chatSessionId: z.string().optional(),
}).passthrough()

export const createProjectSchema = projectSchema

export const updateProjectSchema = projectSchema.partial().omit({ id: true })

// --- Chat Messages schemas ---

export const chatMessagesSchema = z.object({
  projectId: z.string(),
  deliverableId: z.string(),
  messages: z.array(messageSchema),
})

// --- Canvas schemas ---

export const documentVersionSchema = z.object({
  version: z.number(),
  content: z.string(),
  status: z.enum(["draft", "awaiting_approval", "approved", "archived"]),
  createdAt: z.number(),
  approvedAt: z.number().optional(),
  agent: z.string().optional(),
})

export const canvasDocumentSchema = z.object({
  identifier: z.string(),
  title: z.string(),
  type: z.string(),
  versions: z.array(documentVersionSchema),
  activeVersion: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const agentCompletionSchema = z.object({
  agentId: z.string(),
  reportPath: z.string(),
  completedAt: z.number(),
  acknowledged: z.boolean(),
})

export const canvasSchema = z.object({
  sessionId: z.string(),
  documents: z.array(canvasDocumentSchema),
  activeDocumentId: z.string().optional(),
  completions: z.array(agentCompletionSchema).default([]),
  updatedAt: z.number(),
})

// Chat and session types

export type AttachmentType = "image" | "file" | "audio" | "chatgpt-export"

export interface Attachment {
  id: string
  type: AttachmentType
  name: string
  mimeType: string
  size: number
  // Base64 data for images/audio, text content for files
  data: string
  // For audio: transcription result after Whisper processing
  transcription?: string
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  reasoning?: string  // Kimi K2.5 reasoning/thinking content
  attachments?: Attachment[]
  agentId?: string    // Which agent generated this response
  agentName?: string  // Display name of the agent
  createdAt: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function generateTitle(firstMessage: string): string {
  // Take first 50 chars or up to first newline
  const title = firstMessage.split("\n")[0].substring(0, 50)
  return title.length < firstMessage.length ? title + "..." : title
}

import { Attachment, AttachmentType, generateId } from "./types"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"]
const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/m4a", "audio/webm", "audio/ogg"]
const TEXT_TYPES = ["text/plain", "text/markdown", "application/json", "text/sql"]

export function getAttachmentType(mimeType: string, fileName: string): AttachmentType {
  if (IMAGE_TYPES.includes(mimeType)) return "image"
  if (AUDIO_TYPES.includes(mimeType)) return "audio"
  if (fileName.endsWith(".json") && fileName.toLowerCase().includes("conversations")) {
    return "chatgpt-export"
  }
  return "file"
}

export function isValidAttachment(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large: ${file.name} (max 10MB)` }
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || ""
  const validExtensions = [
    "png", "jpg", "jpeg", "gif", "webp", // images
    "mp3", "wav", "m4a", "webm", "ogg", // audio
    "md", "txt", "json", "sql", // text files
  ]

  if (!validExtensions.includes(ext) && !IMAGE_TYPES.includes(file.type) && !AUDIO_TYPES.includes(file.type)) {
    return { valid: false, error: `Unsupported file type: ${file.name}` }
  }

  return { valid: true }
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  const type = getAttachmentType(file.type, file.name)

  let data: string
  if (type === "image" || type === "audio") {
    // Base64 encode binary files
    data = await fileToBase64(file)
  } else {
    // Read text content directly
    data = await file.text()
  }

  return {
    id: generateId(),
    type,
    name: file.name,
    mimeType: file.type || getMimeTypeFromExtension(file.name),
    size: file.size,
    data,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getMimeTypeFromExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/m4a",
    webm: "audio/webm",
    ogg: "audio/ogg",
    md: "text/markdown",
    txt: "text/plain",
    json: "application/json",
    sql: "text/sql",
  }
  return mimeTypes[ext] || "application/octet-stream"
}

export function parseChatGPTExport(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent)

    // ChatGPT export format: array of conversations
    if (Array.isArray(data)) {
      const messages: string[] = []
      for (const convo of data) {
        if (convo.title) {
          messages.push(`## ${convo.title}\n`)
        }
        if (convo.mapping) {
          // Parse the mapping object for messages
          const sortedMessages = Object.values(convo.mapping)
            .filter((m: unknown) => {
              const msg = m as { message?: { content?: { parts?: string[] }; author?: { role?: string } } }
              return msg.message?.content?.parts?.length
            })
            .sort((a: unknown, b: unknown) => {
              const msgA = a as { message?: { create_time?: number } }
              const msgB = b as { message?: { create_time?: number } }
              return (msgA.message?.create_time || 0) - (msgB.message?.create_time || 0)
            })

          for (const m of sortedMessages) {
            const msg = m as { message?: { content?: { parts?: string[] }; author?: { role?: string } } }
            const role = msg.message?.author?.role === "assistant" ? "Assistant" : "User"
            const content = msg.message?.content?.parts?.join("\n") || ""
            if (content.trim()) {
              messages.push(`**${role}:** ${content}\n`)
            }
          }
        }
      }
      return messages.join("\n")
    }

    return "Could not parse ChatGPT export format"
  } catch {
    return "Invalid JSON format"
  }
}

export function getAttachmentPreview(attachment: Attachment): string {
  if (attachment.type === "image") {
    return `data:${attachment.mimeType};base64,${attachment.data}`
  }
  return ""
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

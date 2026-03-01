import { CanvasStatus } from "@/lib/canvas-types"

// Parse artifact tag attributes
export function parseArtifactAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const attrRegex = /(\w+)="([^"]*)"/g
  let match
  while ((match = attrRegex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

// Clean XML/tool tags from content (artifact, function_calls, invoke, parameter, antml:*)
// Used for final content after streaming completes
export function cleanXmlTags(content: string): string {
  let cleaned = content
    // Remove complete blocks first (greedy for nested content)
    .replace(/<artifact[\s\S]*?<\/artifact>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/function_calls>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/antml:function_calls>/gi, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
    .replace(/<invoke[\s\S]*?<\/antml:invoke>/gi, '')
    .replace(/<parameter[\s\S]*?<\/parameter>/gi, '')
    .replace(/<parameter[\s\S]*?<\/antml:parameter>/gi, '')
    // Remove any remaining orphan opening/closing tags
    .replace(/<\/?artifact[^>]*>/gi, '')
    .replace(/<\/?function_calls[^>]*>/gi, '')
    .replace(/<\/?antml:function_calls[^>]*>/gi, '')
    .replace(/<\/?invoke[^>]*>/gi, '')
    .replace(/<\/?antml:invoke[^>]*>/gi, '')
    .replace(/<\/?parameter[^>]*>/gi, '')
    .replace(/<\/?antml:parameter[^>]*>/gi, '')
    .replace(/<[^>]+\/>/g, '') // self-closing tags

  // Clean up multiple newlines and trim
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}

// Clean XML tags during streaming (handles incomplete tags)
export function cleanStreamingXml(content: string): string {
  return content
    // Remove complete blocks
    .replace(/<artifact[\s\S]*?<\/artifact>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/function_calls>/gi, '')
    .replace(/<function_calls[\s\S]*?<\/antml:function_calls>/gi, '')
    .replace(/<invoke[\s\S]*?<\/invoke>/gi, '')
    .replace(/<invoke[\s\S]*?<\/antml:invoke>/gi, '')
    .replace(/<parameter[\s\S]*?<\/parameter>/gi, '')
    .replace(/<parameter[\s\S]*?<\/antml:parameter>/gi, '')
    // Remove incomplete blocks (streaming - no closing tag yet)
    .replace(/<artifact[^>]*>[\s\S]*$/gi, '')
    .replace(/<function_calls[^>]*>[\s\S]*$/gi, '')
    .replace(/<invoke[^>]*>[\s\S]*$/gi, '')
    .replace(/<parameter[^>]*>[\s\S]*$/gi, '')
    // Remove orphan tags
    .replace(/<\/?artifact[^>]*>/gi, '')
    .replace(/<\/?function_calls[^>]*>/gi, '')
    .replace(/<\/?antml:function_calls[^>]*>/gi, '')
    .replace(/<\/?invoke[^>]*>/gi, '')
    .replace(/<\/?antml:invoke[^>]*>/gi, '')
    .replace(/<\/?parameter[^>]*>/gi, '')
    .replace(/<\/?antml:parameter[^>]*>/gi, '')
    // Remove incomplete opening tags at end (e.g., "<funct" or "<param")
    .replace(/<[a-z_:]*$/gi, '')
    .replace(/<\/[a-z_:]*$/gi, '')
}

// Extract ALL artifacts from content and return array + cleaned content
export interface ExtractedArtifact {
  identifier: string
  title: string
  type: string
  content: string
  status: CanvasStatus
  agent?: string
  version?: number // Optional - storage auto-increments if not provided
}

export function extractArtifacts(content: string): { artifacts: ExtractedArtifact[]; cleanedContent: string } {
  const artifactRegex = /<artifact\s+([^>]*)>([\s\S]*?)<\/artifact>/gi
  const artifacts: ExtractedArtifact[] = []
  let match

  while ((match = artifactRegex.exec(content)) !== null) {
    const attrs = parseArtifactAttributes(match[1])
    artifacts.push({
      identifier: attrs.identifier || `doc-${Date.now()}`,
      title: attrs.title || "Untitled",
      type: attrs.type || "text/markdown",
      content: match[2].trim(),
      status: (attrs.status as CanvasStatus) || "awaiting_approval",
      agent: attrs.agent,
      // Only set version if explicitly provided - otherwise let storage auto-increment
      version: attrs.version ? parseInt(attrs.version, 10) : undefined,
    })
  }

  // Clean all XML tags
  const baseCleanedContent = cleanXmlTags(content)

  // Add placeholder if any artifacts were found
  const cleanedContent = artifacts.length > 0
    ? baseCleanedContent + `\n\n*[${artifacts.length} document${artifacts.length > 1 ? 's' : ''} created - see sidebar]*`
    : baseCleanedContent

  return { artifacts, cleanedContent }
}

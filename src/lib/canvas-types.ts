// Discovery Canvas Types

export type CanvasStatus = "draft" | "awaiting_approval" | "approved" | "archived"

export interface CanvasSection {
  id: string
  title: string
  icon: string
  content: string
}

export interface DiscoveryCanvas {
  id: string
  projectId: string
  sessionId: string
  status: CanvasStatus
  sections: CanvasSection[]
  createdAt: number
  updatedAt: number
  approvedAt?: number
  approvedBy?: string
}

// Default sections for discovery synthesis
export const DEFAULT_SECTIONS: Omit<CanvasSection, "content">[] = [
  { id: "problem", title: "Problem Statement", icon: "🎯" },
  { id: "users", title: "Target Users", icon: "👥" },
  { id: "solution", title: "Proposed Solution", icon: "💡" },
  { id: "success", title: "Success Criteria", icon: "📊" },
  { id: "risks", title: "Constraints & Risks", icon: "⚠️" },
  { id: "approach", title: "Recommended Approach", icon: "🛤️" },
  { id: "questions", title: "Open Questions", icon: "❓" },
]

export function parseMarkdownToSections(markdown: string): CanvasSection[] {
  const sections: CanvasSection[] = []
  const lines = markdown.split("\n")

  let currentSection: CanvasSection | null = null
  let contentLines: string[] = []

  for (const line of lines) {
    // Match headers like "# 🎯 Problem Statement" or "## Problem Statement"
    const headerMatch = line.match(/^#{1,2}\s*([^\w\s]?)\s*(.+)$/)

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join("\n").trim()
        sections.push(currentSection)
      }

      const icon = headerMatch[1] || "📄"
      const title = headerMatch[2].trim()
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-")

      currentSection = { id, title, icon, content: "" }
      contentLines = []
    } else if (currentSection) {
      contentLines.push(line)
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join("\n").trim()
    sections.push(currentSection)
  }

  return sections
}

export function sectionsToMarkdown(sections: CanvasSection[]): string {
  return sections
    .map((s) => `# ${s.icon} ${s.title}\n\n${s.content}`)
    .join("\n\n---\n\n")
}

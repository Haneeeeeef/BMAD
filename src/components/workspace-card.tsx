import Link from "next/link"
import type { Project } from "@/lib/bmad-types"

const AVATAR_COLORS = [
  { bg: "#FDF6E3", text: "#B8860B" },
  { bg: "#EBF2FA", text: "#2E6DA4" },
  { bg: "#F0E6F6", text: "#7B4F9D" },
  { bg: "#E6F4EA", text: "#2E7D32" },
  { bg: "#FFF3E0", text: "#E65100" },
  { bg: "#FCE4EC", text: "#C62828" },
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

type WorkspaceStatus = "running" | "complete"

function getStatus(project: Project): WorkspaceStatus {
  if (project.currentWorkflow) return "running"
  if (project.artifacts.length > 0 && !project.currentWorkflow) return "complete"
  return "running"
}

const STATUS_STYLES: Record<WorkspaceStatus, { dot: string; text: string; label: string }> = {
  running: { dot: "bg-amber-500", text: "text-amber-600", label: "Running" },
  complete: { dot: "bg-emerald-500", text: "text-emerald-600", label: "Complete" },
}

export function WorkspaceCard({ project }: { project: Project }) {
  const initial = project.name.charAt(0).toUpperCase()
  const color = getAvatarColor(project.name)
  const status = getStatus(project)
  const style = STATUS_STYLES[status]
  const memberCount = project.deliverables?.length || 1

  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <div className="bg-white rounded-[10px] border border-zinc-200 overflow-hidden hover:shadow-md hover:border-zinc-300 transition-all duration-200">
        {/* Top section */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: color.bg }}
            >
              <span className="text-sm font-semibold" style={{ color: color.text }}>
                {initial}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-zinc-900 truncate">
                {project.name}
              </h3>
              <p className="text-xs text-zinc-400">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Updated {getTimeAgo(project.updatedAt)}
          </p>
        </div>

        {/* Status bar */}
        <div className="px-6 py-3 border-t border-zinc-100">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { authHeaders } from "@/lib/safe-storage"
import { Button } from "@/components/ui/button"
import { Project } from "@/lib/bmad-types"
import { Plus, Monitor } from "lucide-react"
import { WorkspaceCard } from "@/components/workspace-card"

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return

    fetch("/api/db/projects", { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then((data: Project[]) => {
        if (data.length > 0) {
          data.sort((a, b) => b.updatedAt - a.updatedAt)
        }
        setProjects(data)
      })
      .catch(() => setProjects([]))
      .finally(() => setIsLoading(false))
  }, [user])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Navbar */}
      <nav className="w-full bg-white border-b border-zinc-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
              <span className="text-xs font-bold text-white">B</span>
            </div>
            <span className="text-base font-semibold text-zinc-900">BMAD</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-zinc-500">{user.username}</span>
            {user.image ? (
              <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center">
                <span className="text-[10px] font-medium text-zinc-600">{initials}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Workspaces</h1>
          <Button asChild size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-[10px]">
            <Link href="/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => (
              <WorkspaceCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-zinc-300 rounded-[10px] p-14 text-center">
      <Monitor className="h-9 w-9 text-zinc-300 mx-auto mb-4" strokeWidth={1.5} />
      <h2 className="text-base font-semibold text-zinc-900 mb-1.5">
        No workspaces yet
      </h2>
      <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
        Create your first workspace to start building with AI agents.
      </p>
      <Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white rounded-[10px]">
        <Link href="/new">
          <Plus className="h-4 w-4 mr-1.5" />
          Create workspace
        </Link>
      </Button>
    </div>
  )
}

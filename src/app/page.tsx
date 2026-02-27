"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Mission, getWorkflowById, getPhaseById } from "@/lib/bmad-types"
import { Plus, ArrowRight, Clock, Folder } from "lucide-react"

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Load missions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("missions")
    if (stored) {
      const parsed: Mission[] = JSON.parse(stored)
      // Sort by updatedAt descending
      parsed.sort((a, b) => b.updatedAt - a.updatedAt)
      setMissions(parsed)
    }
    setIsLoading(false)
  }, [])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Split into active and completed
  const activeMissions = missions.filter((m) => m.artifacts.length === 0 || m.currentWorkflow)
  const completedMissions = missions.filter((m) => m.artifacts.length > 0 && !m.currentWorkflow)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Mission Control
          </h1>
          <Button asChild size="sm" className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white">
            <Link href="/new">
              <Plus className="h-4 w-4 mr-1.5" />
              New Mission
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {missions.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Active Missions */}
            <section className="mb-12">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-5">
                Active Missions
              </h2>
              {activeMissions.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeMissions.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center">
                  <p className="text-sm text-zinc-400">No active missions</p>
                </div>
              )}
            </section>

            {/* Completed Missions */}
            {completedMissions.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-5">
                  Completed
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completedMissions.map((mission) => (
                    <MissionCard key={mission.id} mission={mission} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function MissionCard({ mission }: { mission: Mission }) {
  const workflow = mission.currentWorkflow ? getWorkflowById(mission.currentWorkflow) : null
  const phase = getPhaseById(mission.currentPhase)

  // Calculate time ago
  const timeAgo = getTimeAgo(mission.updatedAt)

  // Calculate progress (rough estimate based on artifacts)
  const artifactTypes = ["brief", "prd", "ux", "architecture", "stories", "code"]
  const completedArtifacts = mission.artifacts.filter((a) => a.status === "complete").length
  const progress = Math.round((completedArtifacts / artifactTypes.length) * 100)

  return (
    <Link href={`/missions/${mission.id}`} className="block group">
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl p-5
        border border-zinc-200 dark:border-zinc-800
        hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700
        transition-all duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            {phase?.name || "Starting"}
          </span>
          <span className="text-xs text-zinc-400 capitalize">
            {mission.mode.replace("-", " ")}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-[var(--brand)] transition-colors">
          {mission.name}
        </h3>

        {/* Status */}
        <div className="mb-4">
          {workflow ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-zinc-600 dark:text-zinc-400 truncate">
                {workflow.name} with {workflow.agentName}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Folder className="h-3.5 w-3.5" />
              <span>
                {mission.artifacts.length > 0
                  ? `${mission.artifacts.length} artifact${mission.artifacts.length > 1 ? "s" : ""}`
                  : "Ready to start"}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-full bg-[var(--brand)]/10 flex items-center justify-center mx-auto mb-4">
        <Folder className="h-8 w-8 text-[var(--brand)]" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        No missions yet
      </h2>
      <p className="text-zinc-500 mb-6 max-w-sm mx-auto">
        Start your first mission to begin building with the BMAD method.
      </p>
      <Button asChild className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white">
        <Link href="/new">
          <Plus className="h-4 w-4 mr-1.5" />
          Create Mission
        </Link>
      </Button>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

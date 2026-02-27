"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { MissionWorkspace } from "@/components/mission-workspace"
import { Mission } from "@/lib/bmad-types"

export default function MissionPage() {
  const params = useParams()
  const missionId = params.id as string
  const [mission, setMission] = useState<Mission | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load mission from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("missions")
    if (stored) {
      const missions: Mission[] = JSON.parse(stored)
      const found = missions.find((m) => m.id === missionId)
      if (found) {
        // Ensure deliverables array exists (backwards compatibility)
        if (!found.deliverables) {
          found.deliverables = []
        }
        if (!found.inputDocuments) {
          found.inputDocuments = []
        }
        setMission(found)
      }
    }
    setIsLoading(false)
  }, [missionId])

  // Save mission updates
  const handleMissionUpdate = (updated: Mission) => {
    setMission(updated)

    // Persist to localStorage
    const stored = localStorage.getItem("missions")
    if (stored) {
      const missions: Mission[] = JSON.parse(stored)
      const updatedMissions = missions.map((m) =>
        m.id === updated.id ? { ...updated, updatedAt: Date.now() } : m
      )
      localStorage.setItem("missions", JSON.stringify(updatedMissions))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading mission...</div>
      </div>
    )
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Mission not found</p>
          <a href="/" className="text-[var(--brand)] hover:underline">
            Return home
          </a>
        </div>
      </div>
    )
  }

  return <MissionWorkspace mission={mission} onMissionUpdate={handleMissionUpdate} />
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MissionIntake } from "@/components/mission-intake"
import { DocumentPicker } from "@/components/document-picker"
import {
  Mission,
  Deliverable,
  DeliverableType,
  AVAILABLE_DELIVERABLES,
  getWorkflowById,
} from "@/lib/bmad-types"

type IntakeData = {
  name: string
  description: string
  industry?: string
  techStack?: string
}

export default function NewMissionPage() {
  const router = useRouter()
  const [stage, setStage] = useState<"intake" | "picker">("intake")
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null)

  const handleIntakeSubmit = (data: IntakeData) => {
    setIntakeData(data)
    setStage("picker")
  }

  const handlePickerConfirm = (selectedTypes: DeliverableType[], inputDocs: File[]) => {
    if (!intakeData) return

    // Create deliverables from selected types
    const deliverables: Deliverable[] = selectedTypes.map((type, index) => {
      const template = AVAILABLE_DELIVERABLES.find((d) => d.type === type)!
      const workflow = getWorkflowById(template.workflowId)

      // Create tasks from workflow areas
      const tasks = workflow?.areas.map((area, i) => ({
        id: `task-${index}-${i}`,
        name: area,
        status: "pending" as const,
      })) || []

      return {
        id: `deliverable-${Date.now()}-${index}`,
        type,
        workflowId: template.workflowId,
        name: template.name,
        description: template.description,
        status: index === 0 ? "in-progress" : "queued",
        progress: 0,
        tasks,
      }
    })

    // Create mission
    const missionId = `mission-${Date.now()}`
    const mission: Mission = {
      id: missionId,
      name: intakeData.name,
      mode: "new-build",
      description: intakeData.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentPhase: "1-analysis",
      currentWorkflow: deliverables[0]?.workflowId || null,
      currentDeliverable: deliverables[0]?.id || null,
      context: {
        industry: intakeData.industry,
        techStack: intakeData.techStack,
      },
      artifacts: [],
      deliverables,
      inputDocuments: inputDocs.map((f) => f.name),
      sessionId: `session-${Date.now()}`,
    }

    // Store in localStorage
    const existing = JSON.parse(localStorage.getItem("missions") || "[]")
    localStorage.setItem("missions", JSON.stringify([...existing, mission]))

    // Navigate to workspace
    router.push(`/missions/${missionId}`)
  }

  const handlePickerCancel = () => {
    setStage("intake")
  }

  return (
    <>
      {stage === "intake" && <MissionIntake onSubmit={handleIntakeSubmit} />}
      {stage === "picker" && (
        <DocumentPicker onConfirm={handlePickerConfirm} onCancel={handlePickerCancel} />
      )}
    </>
  )
}

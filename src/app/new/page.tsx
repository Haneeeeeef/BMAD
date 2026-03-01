"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { safeGetItem, safeSetItem, safeRemoveItem, authHeaders } from "@/lib/safe-storage"
import { appendProject } from "@/lib/projects-storage"
import { ProjectTypeSelector, ProjectType } from "@/components/project-type-selector"
import { ProjectIntake } from "@/components/project-intake"
import { DocumentPicker } from "@/components/document-picker"
import { TemplateSelector } from "@/components/template-selector"
import { WizardLayout } from "@/components/ui/wizard-layout"
import type { ExtractedFile } from "@/lib/file-extraction"
import {
  Project,
  Deliverable,
  DeliverableType,
  AVAILABLE_DELIVERABLES,
  getWorkflowById,
} from "@/lib/bmad-types"

type IntakeData = {
  title: string
  description: string
  files: ExtractedFile[]
}

type Stage = "type-select" | "intake" | "picker" | "template"

type DraftState = {
  stage: Stage
  projectType: ProjectType | null
  intakeData: IntakeData | null
  /** Live title while user is typing (before submit) */
  liveTitle?: string
  /** Live description while user is typing (before submit) */
  liveDescription?: string
  /** Selected deliverable types on the picker step */
  selectedDeliverables?: DeliverableType[]
}

const DRAFT_KEY = "project-draft"

function loadDraft(): DraftState | null {
  if (typeof window === "undefined") return null
  try {
    const saved = safeGetItem(DRAFT_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

function saveDraft(state: DraftState) {
  if (typeof window === "undefined") return
  safeSetItem(DRAFT_KEY, JSON.stringify(state))
}

function clearDraft() {
  if (typeof window === "undefined") return
  safeRemoveItem(DRAFT_KEY)
}

export default function NewProjectPage() {
  const router = useRouter()
  const [isLoaded, setIsLoaded] = useState(false)
  const [stage, setStage] = useState<Stage>("type-select")
  const [projectType, setProjectType] = useState<ProjectType | null>(null)
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null)
  const [liveTitle, setLiveTitle] = useState("")
  const [liveDescription, setLiveDescription] = useState("")
  const [selectedDeliverables, setSelectedDeliverables] = useState<DeliverableType[]>([])

  // Load draft on mount (unless ?reset=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("reset") === "true") {
      clearDraft()
      window.history.replaceState({}, "", "/new")
    } else {
      const draft = loadDraft()
      if (draft) {
        setStage(draft.stage)
        setProjectType(draft.projectType)
        setIntakeData(draft.intakeData)
        setLiveTitle(draft.liveTitle || draft.intakeData?.title || "")
        setLiveDescription(draft.liveDescription || draft.intakeData?.description || "")
        setSelectedDeliverables(draft.selectedDeliverables || [])
      }
    }
    setIsLoaded(true)
  }, [])

  // Save draft on changes
  useEffect(() => {
    if (!isLoaded) return
    saveDraft({ stage, projectType, intakeData, liveTitle, liveDescription, selectedDeliverables })
  }, [stage, projectType, intakeData, liveTitle, liveDescription, selectedDeliverables, isLoaded])

  const handleTypeSelect = (type: ProjectType) => {
    setProjectType(type)

    if (type === "fresh") {
      setStage("intake")
    } else if (type === "template") {
      setStage("template")
    }
  }

  const handleIntakeComplete = (data: IntakeData) => {
    setIntakeData(data)
    setLiveTitle(data.title)
    setLiveDescription(data.description)
    setStage("picker")
  }

  const handleTitleChange = useCallback((t: string) => {
    setLiveTitle(t)
  }, [])

  const handleDescriptionChange = useCallback((desc: string) => {
    setLiveDescription(desc)
  }, [])

  const handleSelectionChange = useCallback((types: DeliverableType[]) => {
    setSelectedDeliverables(types)
  }, [])

  const handlePickerConfirm = async (selectedTypes: DeliverableType[], inputDocs: File[]) => {
    if (!intakeData) return

    const projectName = intakeData.title.trim()

    const deliverables: Deliverable[] = selectedTypes.map((type, index) => {
      const template = AVAILABLE_DELIVERABLES.find((d) => d.type === type)!
      const workflow = getWorkflowById(template.workflowId)

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
        sessionId: `session-${Date.now()}-${index}`,
      }
    })

    const projectId = `project-${Date.now()}`

    const project: Project = {
      id: projectId,
      name: projectName || "Untitled Workspace",
      mode: "new-build",
      description: intakeData.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentPhase: "1-analysis",
      currentWorkflow: deliverables[0]?.workflowId || null,
      currentDeliverable: deliverables[0]?.id || null,
      context: {},
      artifacts: [],
      deliverables,
      inputDocuments: [
        ...inputDocs.map((f) => f.name),
        ...intakeData.files.map((f) => f.filename),
      ],
      sessionId: `session-${Date.now()}`,
    }

    // Store project
    appendProject(project)

    // Store extracted file content locally for reference
    if (intakeData.files.length > 0) {
      safeSetItem(`sources-${projectId}`, JSON.stringify(intakeData.files))
    }

    // Generate context files on VPS (async, don't block navigation)
    if (intakeData.files.length > 0) {
      fetch("/api/context/generate", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          projectId,
          projectName: project.name,
          description: intakeData.description,
          files: intakeData.files,
        }),
      }).catch((err) => {
        console.error("Failed to generate context files:", err)
      })
    }

    // Clear draft after successful creation
    clearDraft()

    router.push(`/projects/${projectId}`)
  }

  const handlePickerCancel = () => {
    setStage("intake")
  }

  const handleIntakeBack = () => {
    setStage("type-select")
    setProjectType(null)
    setIntakeData(null)
  }

  // Map stages to wizard step indices
  const stepIndex = stage === "type-select" ? 0 : stage === "intake" ? 1 : stage === "picker" ? 2 : 0

  const handleCancel = () => {
    clearDraft()
    router.push("/")
  }

  const handleBack = () => {
    if (stage === "intake") handleIntakeBack()
    else if (stage === "picker") handlePickerCancel()
  }

  // Don't render until loaded to prevent flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    )
  }

  return (
    <WizardLayout
      currentStepIndex={stepIndex}
      onCancel={handleCancel}
      onBack={handleBack}
    >
      {stage === "type-select" && (
        <ProjectTypeSelector onSelect={handleTypeSelect} />
      )}
      {stage === "intake" && (
        <ProjectIntake
          onComplete={handleIntakeComplete}
          onBack={handleIntakeBack}
          initialData={intakeData ? intakeData : (liveTitle || liveDescription) ? { title: liveTitle, description: liveDescription, files: [] } : undefined}
          onTitleChange={handleTitleChange}
          onDescriptionChange={handleDescriptionChange}
        />
      )}
      {stage === "picker" && (
        <DocumentPicker
          onConfirm={handlePickerConfirm}
          onCancel={handlePickerCancel}
          initialSelected={selectedDeliverables}
          onSelectionChange={handleSelectionChange}
        />
      )}
      {stage === "template" && (
        <TemplateSelector onBack={handleIntakeBack} />
      )}
    </WizardLayout>
  )
}

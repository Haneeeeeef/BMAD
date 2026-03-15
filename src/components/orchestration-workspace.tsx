"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  ArrowLeft,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { safeGetItem, safeRemoveItem, authHeaders } from "@/lib/safe-storage"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import type { Agent } from "@/components/agent-panel"
import {
  WorkspaceSidebar,
  WorkspaceRightPanel,
  AgentDetailPanel,
  DocumentViewerPanel,
} from "@/components/workspace"
import { ChatInput, type ChatAttachment, type ChatInputHandle } from "@/components/chat-input"
import { ChatMessage } from "@/components/chat-message"
import type { DocumentItem } from "@/components/workspace"
import { DocumentPicker } from "@/components/document-picker"
import {
  Project,
  Deliverable,
  DeliverableType,
  getWorkflowById,
  AVAILABLE_DELIVERABLES,
} from "@/lib/bmad-types"
import { cn } from "@/lib/utils"

// Hooks
import { useWorkspaceChat } from "@/hooks/use-workspace-chat"
import { useWorkflowProgress } from "@/hooks/use-workflow-progress"
import { useWorkspaceDocuments } from "@/hooks/use-workspace-documents"
import { useContextStatus } from "@/hooks/use-context-status"
import { useToolActions } from "@/hooks/use-tool-actions"

/* ── helpers ────────────────────────────── */

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

const AGENT_AVATAR_COLORS: Record<string, string> = {
  jarvis: "bg-[var(--brand-dark)]",
  analyst: "bg-emerald-500",
  architect: "bg-blue-500",
  dev: "bg-violet-500",
  pm: "bg-amber-500",
  qa: "bg-rose-500",
  "quick-flow": "bg-cyan-500",
  sm: "bg-orange-500",
  "tech-writer": "bg-teal-500",
  ux: "bg-pink-500",
}

/* ── component ────────────────────────────────────────────── */

type OrchestrationWorkspaceProps = {
  project: Project
  onProjectUpdate: (project: Project) => void
}

export function OrchestrationWorkspace({ project, onProjectUpdate }: OrchestrationWorkspaceProps) {
  // Migrate legacy deliverables that don't have per-deliverable sessionIds
  useEffect(() => {
    const needsMigration = project.deliverables.some(d => !d.sessionId)
    if (needsMigration) {
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map((d, i) => {
          if (d.sessionId) return d
          if (d.id === project.currentDeliverable && project.sessionId) {
            return { ...d, sessionId: project.sessionId }
          }
          return { ...d, sessionId: `session-${Date.now()}-${i}` }
        }),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Current deliverable & workflow
  const currentDeliverable = project.deliverables.find(d => d.id === project.currentDeliverable)
  const currentWorkflow = currentDeliverable ? getWorkflowById(currentDeliverable.workflowId) : null

  // ── Hooks ──

  // Map deliverable types to process flow instructions
  const PROCESS_FLOW_CONFIG: Record<string, { altitude: string; output: string; commitPrefix: string }> = {
    "product-brief": {
      altitude: "brief-level altitude (30k foot view) — high-level process flow showing major phases, key actors, and handoffs",
      output: "deliverables/product-brief-process-flow.drawio",
      commitPrefix: "analyst",
    },
    prd: {
      altitude: "detailed product flow — every feature interaction, validation step, error path, edge case, and conditional branch",
      output: "deliverables/prd-process-flow.drawio",
      commitPrefix: "pm",
    },
    architecture: {
      altitude: "system & data flow — how data moves through components, API calls, event sequences, auth flows, failure/retry paths",
      output: "deliverables/architecture-data-flow.drawio",
      commitPrefix: "architect",
    },
  }

  // Store pending process flow request — triggered after approval, sent after chat is ready
  const pendingProcessFlow = React.useRef<{ type: string; agentId: string } | null>(null)

  const handleDeliverableApproved = useCallback((deliverableType: string, agentId: string) => {
    if (!PROCESS_FLOW_CONFIG[deliverableType]) return
    pendingProcessFlow.current = { type: deliverableType, agentId }
  }, [])

  const { advanceWorkflowStep, markDeliverableComplete, detectWorkflowProgress } = useWorkflowProgress(project, onProjectUpdate, handleDeliverableApproved)

  const chat = useWorkspaceChat({
    project,
    onResponseComplete: detectWorkflowProgress,
  })

  // Send process flow request after approval (deferred to avoid using chat before init)
  React.useEffect(() => {
    if (!pendingProcessFlow.current || chat.isLoading) return
    const { type, agentId } = pendingProcessFlow.current
    const config = PROCESS_FLOW_CONFIG[type]
    if (!config) return

    pendingProcessFlow.current = null

    const message = [
      `The ${type.replace(/-/g, " ")} has been approved. Now generate the process flow diagram.`,
      ``,
      `Read and follow: /home/haneef/workspaces/jarvis/skills/create-process-flow/SKILL.md`,
      ``,
      `Use ${config.altitude}.`,
      `Output to: ${config.output}`,
      `Git commit: "${config.commitPrefix}: generated process flow diagram"`,
    ].join("\n")

    chat.sendMessage(message, false, agentId)
  }, [chat.isLoading, chat])

  const { data: contextData } = useContextStatus(project.deliverables)
  const agentContextMap = contextData?.contextMap ?? {}
  const sessionDetails = contextData?.sessionDetails ?? []
  const { data: toolActions = [] } = useToolActions(currentDeliverable)
  const docs = useWorkspaceDocuments(project)

  // ── Local UI state ──

  const [deleteTarget, setDeleteTarget] = useState<Deliverable | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)
  const chatInputRef = useRef<ChatInputHandle>(null)

  // The agent currently handling chat — derived from the latest assistant message
  const lastAssistant = [...chat.messages].reverse().find(m => m.role === "assistant" && m.agentId)
  const activeAgentId = (chat.isLoading && lastAssistant?.agentId) || currentWorkflow?.agent || "jarvis"
  const activeAgentName = activeAgentId === "jarvis" ? "Jarvis" : (lastAssistant?.agentName || currentWorkflow?.agentName || "Jarvis")

  // Auto-open document when deliverable completes
  const prevStatusRef = useRef<Record<string, string>>({})
  useEffect(() => {
    for (const d of project.deliverables) {
      const prev = prevStatusRef.current[d.id]
      // Detect transition to "complete" from any non-complete status
      if (prev && prev !== "complete" && d.status === "complete") {
        const wf = getWorkflowById(d.workflowId)
        const artifactName = d.type === "product-brief" ? "product-brief" : d.type
        docs.openDocument({
          id: `doc-${d.id}`,
          name: `${artifactName}.md`,
          status: "ready",
          path: `deliverables/${artifactName}.md`,
        })
      }
      prevStatusRef.current[d.id] = d.status
    }
  }, [project.deliverables, docs])

  // Agents — derive real status from context polling + streaming state
  const agents = useMemo<Agent[]>(() => {
    const currentTask = project.deliverables.find(d => d.id === project.currentDeliverable)?.name
    const base: Agent[] = [
      { id: "jarvis", name: "Jarvis", type: "main", status: "idle", task: currentTask, spawnedBy: undefined },
      { id: "analyst", name: "Mary", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "pm", name: "John", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "architect", name: "Winston", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "dev", name: "Amelia", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "ux", name: "Sally", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "qa", name: "Quinn", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "sm", name: "Bob", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "tech-writer", name: "Paige", type: "sub", status: "idle", spawnedBy: "jarvis" },
    ]
    return base.map(a => {
      const ctx = agentContextMap[a.id]
      // Streaming override: if this agent is currently generating a response, show "thinking"
      const isStreaming = chat.isLoading && a.id === activeAgentId
      const baseStatus = ctx?.status ?? "idle"
      return {
        ...a,
        status: isStreaming ? "thinking" as const : baseStatus,
        contextUsage: ctx?.percentage,
        contextTokens: ctx?.tokens,
        contextMaxTokens: ctx?.maxTokens,
      }
    })
  }, [project.currentDeliverable, project.deliverables, agentContextMap, chat.isLoading, activeAgentId])

  // ── Actions ──

  const handleDeleteDeliverable = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const projectSlug = slugify(project.name)
      const workflow = getWorkflowById(deleteTarget.workflowId)

      // Delete artifact + transcript from VPS
      fetch("/api/artifacts/delete", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ project: projectSlug, deliverableType: deleteTarget.type, workflowId: deleteTarget.workflowId }),
      }).catch(() => {})

      // Ask responsible agent to update PROJECT-CONTEXT.md
      if (deleteTarget.sessionId) {
        fetch("/api/chat", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `The deliverable "${deleteTarget.name}" (type: ${deleteTarget.type}) has been removed from this project. Its artifact and transcript files have been deleted. Please update PROJECT-CONTEXT.md and PROJECT-DECISIONS.md to remove references to this deliverable and its outputs. Be brief.`,
            }],
            sessionId: deleteTarget.sessionId,
            agentId: workflow?.agent || "jarvis",
          }),
        }).catch(() => {})
      }

      // Clean up chat storage
      safeRemoveItem(`project-chat-${project.id}-${deleteTarget.id}`)

      // Remove from project state
      const updatedDeliverables = project.deliverables.filter(d => d.id !== deleteTarget.id)
      const newCurrent = project.currentDeliverable === deleteTarget.id
        ? (updatedDeliverables[0]?.id ?? null)
        : project.currentDeliverable

      onProjectUpdate({
        ...project,
        deliverables: updatedDeliverables,
        currentDeliverable: newCurrent,
      })

      // Switch chat view if needed
      if (newCurrent && newCurrent !== project.currentDeliverable) {
        chat.switchDeliverable(newCurrent)
      }

      setDeleteTarget(null)
    } catch {
      // silent
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, project, onProjectUpdate, chat])

  const handleFlush = useCallback(async () => {
    if (!currentDeliverable?.sessionId) return
    setIsFlushing(true)
    try {
      const activeWorkflow = getWorkflowById(currentDeliverable.workflowId)
      const agentId = activeWorkflow?.agent || "jarvis"
      const ctx = agentContextMap[agentId]
      await fetch("/api/session/clear", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "flush",
          sessionId: currentDeliverable.sessionId,
          agentId,
          projectName: project.name,
          contextTokens: ctx?.tokens,
          contextMaxTokens: ctx?.maxTokens,
          contextPercentage: ctx?.percentage,
        }),
      })
    } catch { /* silent */ }
    finally { setIsFlushing(false) }
  }, [currentDeliverable, project.name, agentContextMap])

  const handleClear = useCallback(async () => {
    if (!currentDeliverable) return
    if (!confirm("This will rotate the session for this deliverable (fresh context). Chat history stays. Continue?")) return
    setIsClearing(true)
    try {
      const activeWorkflow = getWorkflowById(currentDeliverable.workflowId)

      await fetch("/api/session/clear", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "clear",
          sessionId: currentDeliverable.sessionId,
          agentId: activeWorkflow?.agent || "jarvis",
          projectName: project.name,
        }),
      })

      // Rotate only THIS deliverable's session key
      const newSessionId = `session-${Date.now()}`
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map(d =>
          d.id === currentDeliverable.id ? { ...d, sessionId: newSessionId } : d
        ),
      })

      chat.resetForNewSession()
    } catch { /* silent */ }
    finally { setIsClearing(false) }
  }, [project, currentDeliverable, onProjectUpdate, chat])

  const startDeliverable = useCallback((deliverableId: string) => {
    chat.switchDeliverable(deliverableId)

    const deliverable = project.deliverables.find(d => d.id === deliverableId)
    const isNew = deliverable?.status === "queued"

    onProjectUpdate({
      ...project,
      currentDeliverable: deliverableId,
      deliverables: project.deliverables.map(d => {
        if (d.id !== deliverableId) return d
        if (!isNew) return d
        const tasks = d.tasks.map((t, i) =>
          i === 0 && t.status === "pending" ? { ...t, status: "active" as const } : t,
        )
        return { ...d, status: "in-progress", startedAt: Date.now(), tasks }
      }),
    })
  }, [project, onProjectUpdate, chat])

  const [isReviewing, setIsReviewing] = useState(false)

  // Step 1: User clicks Review → Jarvis reviews → review doc auto-opens → awaiting-approval
  const handleReviewDeliverable = useCallback(async (deliverableId: string) => {
    const deliverable = project.deliverables.find(d => d.id === deliverableId)
    if (!deliverable) return

    const workflow = getWorkflowById(deliverable.workflowId)
    if (!workflow) return

    if (deliverableId !== project.currentDeliverable) {
      startDeliverable(deliverableId)
    }

    onProjectUpdate({
      ...project,
      currentDeliverable: deliverableId,
      deliverables: project.deliverables.map(d =>
        d.id === deliverableId ? { ...d, status: "reviewing" as const } : d
      ),
    })
    setIsReviewing(true)

    try {
      const projectSlug = slugify(project.name)
      const artifactName = deliverable.type === "product-brief" ? "product-brief" : deliverable.type
      const artifactPath = `projects/${projectSlug}/deliverables/${artifactName}.md`

      const userMessage = `Review "${deliverable.name}"`
      const systemContext = [
        `[MC Review Request — FRESH REVIEW]`,
        `Ignore any previous review results in this session. Start fresh.`,
        `Artifact path: /home/haneef/workspaces/jarvis/${artifactPath}`,
        `Workflow: ${deliverable.workflowId}`,
        `Creating agent: ${workflow.agent} (${workflow.agentName})`,
        `Project: ${project.name} (slug: ${projectSlug})`,
        `Read the skill file NOW: skills/review-artifact/SKILL.md`,
        `Follow the skill instructions EXACTLY. Output MUST use the table format from Step 4. No prose summaries.`,
      ].join("\n")

      const jarvisResponse = await chat.sendMessage(userMessage, false, systemContext, undefined, "jarvis")

      // Check if Jarvis said Pass
      const isPass = jarvisResponse?.content?.match(/\bverdict:\s*pass\b/i)

      // Always go to awaiting-approval — human decides when to mark as Reviewed
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map(d =>
          d.id === deliverableId ? { ...d, status: "awaiting-approval" as const } : d
        ),
      })
      // Auto-open the review doc
      const reviewDocName = `review-${artifactName}.md`
      docs.openDocument({
        id: `review-${deliverableId}`,
        name: reviewDocName,
        kind: "project",
        status: "ready",
        path: `deliverables/${reviewDocName}`,
      })
    } catch {
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map(d =>
          d.id === deliverableId ? { ...d, status: "complete" as const } : d
        ),
      })
    } finally {
      setIsReviewing(false)
    }
  }, [project, onProjectUpdate, chat, startDeliverable, docs])

  // Step 2: User approves → sends review to creating agent → agent fixes → auto re-review
  const handleSendToAgent = useCallback(async (deliverableId: string) => {
    const deliverable = project.deliverables.find(d => d.id === deliverableId)
    if (!deliverable) return

    const workflow = getWorkflowById(deliverable.workflowId)
    if (!workflow) return

    const projectSlug = slugify(project.name)
    const artifactName = deliverable.type === "product-brief" ? "product-brief" : deliverable.type
    const reviewPath = `deliverables/reviews/review-${artifactName}.md`
    const artifactPath = `projects/${projectSlug}/deliverables/${artifactName}.md`

    // Set status to revising
    onProjectUpdate({
      ...project,
      deliverables: project.deliverables.map(d =>
        d.id === deliverableId ? { ...d, status: "revising" as const } : d
      ),
    })

    try {
      // Fetch review doc content from VPS
      const reviewRes = await fetch(
        `/api/artifacts?project=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(reviewPath)}`,
        { headers: authHeaders() },
      )

      let reviewContent = ""
      if (reviewRes.ok) {
        const data = await reviewRes.json()
        reviewContent = data.content || ""
      }

      // Check if agent needs context reload
      const agentCtx = agentContextMap[workflow.agent]
      const needsReload = !agentCtx || agentCtx.tokens === 0

      const surgicalEditRule = [
        `CRITICAL: Make SURGICAL edits only. Do NOT rewrite the entire document.`,
        `Read the artifact first, then use targeted edits to fix ONLY the specific sections mentioned in each review point.`,
        `Do not touch sections that are not mentioned in the review. Preserve all approved content exactly as-is.`,
      ].join("\n")

      const agentMessage = needsReload
        ? [
            `[Review feedback from Jarvis — please address all pending items]`,
            ``,
            surgicalEditRule,
            ``,
            `First, rebuild your context by reading:`,
            `- PROJECT-CONTEXT.md`,
            `- PROJECT-DECISIONS.md`,
            `- WORKFLOW-TRANSCRIPT-${deliverable.workflowId}.md`,
            `- ${artifactPath}`,
            ``,
            `Then read the review and address every Pending item:`,
            ``,
            reviewContent,
          ].join("\n")
        : [
            `[Review feedback from Jarvis — please address all pending items]`,
            ``,
            surgicalEditRule,
            ``,
            `Read the review file at: ${reviewPath}`,
            `Address every Pending item. Explain what you changed.`,
          ].join("\n")

      // Send to creating agent
      await chat.sendMessage(
        `Address review feedback for "${deliverable.name}"`,
        false,
        agentMessage,
        undefined,
        workflow.agent,
      )

      // After agent responds, auto-trigger Jarvis re-review
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map(d =>
          d.id === deliverableId ? { ...d, status: "reviewing" as const } : d
        ),
      })

      // Small delay to ensure file writes are flushed on VPS
      await new Promise(r => setTimeout(r, 2000))

      const reReviewContext = [
        `[MC Re-Review Request — FRESH READ REQUIRED]`,
        `The creating agent has just finished addressing your review feedback.`,
        `IMPORTANT: The artifact has been modified. You MUST re-read it fresh from disk. Do NOT rely on any cached version.`,
        `Artifact path: /home/haneef/workspaces/jarvis/${artifactPath}`,
        `Previous review: /home/haneef/workspaces/jarvis/projects/${projectSlug}/${reviewPath}`,
        `Project: ${project.name} (slug: ${projectSlug})`,
        `Read the skill file: skills/review-artifact/SKILL.md`,
        `Step 1: Read the artifact file AGAIN right now (it has been updated).`,
        `Step 2: Read the previous review file.`,
        `Step 3: Compare each Round 1 item against the CURRENT artifact content.`,
        `Step 4: Update resolved items to "Resolved" in the previous round table.`,
        `Step 5: APPEND a new round with only NEW issues (if any).`,
      ].join("\n")

      const reReviewResponse = await chat.sendMessage(
        `Re-review "${deliverable.name}"`,
        false,
        reReviewContext,
        undefined,
        "jarvis",
      )

      // Always go to awaiting-approval — human decides
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map(d =>
          d.id === deliverableId ? { ...d, status: "awaiting-approval" as const } : d
        ),
      })
      // Re-open review doc with updated content
      docs.openDocument({
        id: `review-${deliverableId}`,
        name: `review-${artifactName}.md`,
        kind: "project",
        status: "ready",
        path: `deliverables/reviews/review-${artifactName}.md`,
      })
    } catch {
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map(d =>
          d.id === deliverableId ? { ...d, status: "complete" as const } : d
        ),
      })
    }
  }, [project, onProjectUpdate, chat, agentContextMap, docs])

  const handleAddDeliverables = useCallback((selectedTypes: DeliverableType[]) => {
    const INTERNAL_STEP_PATTERNS = [
      /^initialize/i, /^setup/i, /^finalize/i,
      /initialize\s*&\s*(?:setup|context)/i,
      /finalize\s*(?:&|document)/i,
    ]
    const isInternalStep = (name: string) =>
      INTERNAL_STEP_PATTERNS.some(p => p.test(name.trim()))

    const newDeliverables: Deliverable[] = selectedTypes.map((type, index) => {
      const template = AVAILABLE_DELIVERABLES.find(d => d.type === type)!
      const workflow = getWorkflowById(template.workflowId)
      const isFirstAndAutoStart = project.deliverables.length === 0 && index === 0

      const tasks = (workflow?.areas ?? [])
        .filter(area => !isInternalStep(area))
        .map((area, i) => ({
          id: `task-${Date.now()}-${index}-${i}`,
          name: area,
          status: (i === 0 && isFirstAndAutoStart ? "active" : "pending") as "active" | "pending",
        }))

      return {
        id: `deliverable-${Date.now()}-${index}`,
        type,
        workflowId: template.workflowId,
        name: template.name,
        description: template.description,
        status: isFirstAndAutoStart ? "in-progress" : "queued",
        progress: 0,
        tasks,
        sessionId: `session-${Date.now()}-${index}`,
      }
    })

    const updatedDeliverables = [...project.deliverables, ...newDeliverables]
    const firstNew = newDeliverables[0]

    onProjectUpdate({
      ...project,
      deliverables: updatedDeliverables,
      currentDeliverable: project.currentDeliverable || firstNew?.id || null,
    })

    setShowDocPicker(false)
  }, [project, onProjectUpdate])

  // Auto-focus chat input on keypress
  useEffect(() => {
    function handleGlobalKeydown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return
      chatInputRef.current?.focus()
    }
    window.addEventListener("keydown", handleGlobalKeydown)
    return () => window.removeEventListener("keydown", handleGlobalKeydown)
  }, [])

  // ── Render ──

  return (
    <div className="h-screen flex flex-col bg-muted">
      {/* Header */}
      <TooltipProvider>
        <header className="shrink-0 bg-background border-b border-border z-10">
          <div className="px-4 h-12 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Link>
              <h1 className="font-semibold text-foreground text-sm">{project.name}</h1>
              {/* Active agent indicator with live status */}
              {currentWorkflow && (() => {
                // Derive live status from latest tool action
                const latestAction = toolActions.length > 0 ? toolActions[toolActions.length - 1] : null
                const isRecent = latestAction && (Date.now() - latestAction.timestamp) < 30000

                let statusText = ""
                if (chat.isLoading) {
                  if (isRecent && latestAction) {
                    const t = latestAction.tool
                    const args = latestAction.args || {}
                    const fileName = ((args.path || args.file_path || args.file || args.filename) as string)?.split("/").pop()

                    if (t === "read" || t === "file_read") {
                      statusText = fileName ? `Reading ${fileName}` : "Reading file"
                    } else if (t === "write" || t === "file_write" || t === "save") {
                      statusText = fileName ? `Writing ${fileName}` : "Writing file"
                    } else if (t === "search" || t === "grep" || t === "find") {
                      statusText = "Searching codebase"
                    } else if (t === "exec" || t === "bash") {
                      statusText = "Running command"
                    } else if (t === "sessions_send" || t === "delegate") {
                      const target = (args.agent || args.target) as string
                      statusText = target ? `Consulting ${target}` : "Delegating"
                    } else if (t === "memory" || t === "memory_store") {
                      statusText = "Saving to memory"
                    } else if (t === "web" || t === "fetch") {
                      statusText = "Fetching data"
                    } else {
                      statusText = "Working"
                    }
                  } else {
                    statusText = chat.isStreaming ? "Writing" : "Thinking"
                  }
                }

                return (
                  <>
                    <span className="text-muted-foreground/40 text-xs">/</span>
                    <div className="flex items-center gap-1.5">
                      <img
                        src={`/agents/${activeAgentId}.png`}
                        alt={activeAgentName}
                        className="shrink-0 w-5 h-5 rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {activeAgentName}
                      </span>
                      {chat.isLoading && statusText && (
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 animate-pulse">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {statusText}
                        </span>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>

            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleFlush} disabled={isFlushing} className="p-1.5 hover:bg-muted rounded-lg disabled:opacity-50">
                    {isFlushing ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /> : <RefreshCw className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Flush memory</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={handleClear} disabled={isClearing} className="p-1.5 hover:bg-muted rounded-lg disabled:opacity-50">
                    {isClearing ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /> : <Trash2 className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Rotate session (fresh context)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>
      </TooltipProvider>

      {/* Document Picker Modal */}
      {showDocPicker && (
        <DocumentPicker
          variant="modal"
          onConfirm={handleAddDeliverables}
          onCancel={() => setShowDocPicker(false)}
          existingTypes={project.deliverables.map(d => d.type)}
        />
      )}

      {/* Delete Deliverable Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Deliverable"
        description={`This will permanently remove "${deleteTarget?.name}" including its chat history and transcript. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteDeliverable}
        loading={isDeleting}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left: Workspace Sidebar */}
        <WorkspaceSidebar
          projectName={project.name}
          projectDescription={project.description}
          deliverables={project.deliverables}
          agents={agents}
          currentDeliverableId={project.currentDeliverable}
          activeAgentId={currentWorkflow?.agent || "jarvis"}
          agentContextMap={agentContextMap}
          onDeliverableClick={(id) => {
            if (id !== project.currentDeliverable) startDeliverable(id)
          }}
          onAgentClick={(id) => setSelectedAgentId(id === selectedAgentId ? null : id)}
          onAddDeliverable={() => setShowDocPicker(true)}
          onDeleteDeliverable={(id) => {
            const d = project.deliverables.find(del => del.id === id)
            if (d) setDeleteTarget(d)
          }}
          onForceComplete={markDeliverableComplete}
          onReviewDeliverable={handleReviewDeliverable}
        />

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0" role="log" aria-live="polite" aria-label="Chat messages">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {chat.messages.length === 0 && !currentDeliverable && (
                <div className="text-center py-16">
                  <p className="text-xs text-muted-foreground">Select a deliverable to start</p>
                </div>
              )}
              {chat.messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  variant="workspace"
                  isLoading={chat.isStreaming && i === chat.messages.length - 1 && msg.role === "assistant"}
                />
              ))}
              {chat.isLoading && !chat.isStreaming && (
                <div className="flex items-center gap-1.5 py-3 mb-6">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              )}
              <div ref={chat.messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          {currentDeliverable && (
            <ChatInput
              ref={chatInputRef}
              variant="workspace"
              value={chat.inputValue}
              onChange={chat.setInputValue}
              onSubmit={chat.handleSubmit}
              agentName={currentWorkflow?.agentName || "Jarvis"}
              disabled={chat.isLoading}
            />
          )}
        </div>

        {/* Right: Workflow Steps + Activity + Documents */}
        <WorkspaceRightPanel
          steps={currentDeliverable?.tasks ?? []}
          toolActions={toolActions}
          isPolling={chat.isLoading}
          documents={docs.documents}
          onViewDocument={(doc) => {
            docs.openDocument(doc)
            setSelectedAgentId(null)
          }}
          onDownloadDocument={() => {
            // Future: download document from VPS
          }}
          onMarkDocumentComplete={() => markDeliverableComplete()}
        />

        {/* Agent Detail Panel Overlay */}
        {selectedAgentId && (() => {
          const selectedAgent = agents.find(a => a.id === selectedAgentId)
          if (!selectedAgent) return null
          const agentSessions = sessionDetails.filter(s => s.agentId === selectedAgentId)
          return (
            <AgentDetailPanel
              agent={selectedAgent}
              sessions={agentSessions}
              onClose={() => setSelectedAgentId(null)}
              onTalkTo={() => {
                setSelectedAgentId(null)
                // Future: switch chat to this agent
              }}
              onReassign={() => {
                setSelectedAgentId(null)
                // Future: reassign task
              }}
              onFlushSession={async (sessionId, agentId) => {
                const ctx = agentContextMap[agentId]
                await fetch("/api/session/clear", {
                  method: "POST",
                  headers: authHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify({
                    action: "flush",
                    sessionId,
                    agentId,
                    projectName: project.name,
                    contextTokens: ctx?.tokens,
                    contextMaxTokens: ctx?.maxTokens,
                    contextPercentage: ctx?.percentage,
                  }),
                }).catch(() => {})
              }}
            />
          )
        })()}

        {/* Document Viewer Overlay */}
        {docs.viewingDocument && (
          <DocumentViewerPanel
            document={docs.viewingDocument}
            content={docs.documentContent}
            onClose={docs.closeDocument}
            onDownloadMd={(_doc, mdContent) => {
              const blob = new Blob([mdContent], { type: "text/markdown" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              const prefix = slugify(project.name)
              const base = _doc.name.endsWith(".md") ? _doc.name : `${_doc.name}.md`
              a.download = `${prefix}-${base}`
              a.click()
              URL.revokeObjectURL(url)
            }}
            onDownloadDocx={async (_doc, mdContent) => {
              try {
                const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx")
                const lines = mdContent.split("\n")
                const children: InstanceType<typeof Paragraph>[] = []
                for (const line of lines) {
                  if (line.startsWith("### ")) {
                    children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: line.slice(4), bold: true })] }))
                  } else if (line.startsWith("## ")) {
                    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.slice(3), bold: true })] }))
                  } else if (line.startsWith("# ")) {
                    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: line.slice(2), bold: true, size: 32 })] }))
                  } else if (line.startsWith("- ")) {
                    children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(line.slice(2))] }))
                  } else if (line.trim()) {
                    const runs: InstanceType<typeof TextRun>[] = []
                    const parts = line.split(/(\*\*.*?\*\*)/)
                    for (const part of parts) {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        runs.push(new TextRun({ text: part.slice(2, -2), bold: true }))
                      } else if (part) {
                        runs.push(new TextRun(part))
                      }
                    }
                    children.push(new Paragraph({ children: runs }))
                  } else {
                    children.push(new Paragraph({ children: [] }))
                  }
                }
                const doc = new Document({ sections: [{ children }] })
                const blob = await Packer.toBlob(doc)
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                const prefix = slugify(project.name)
                a.download = `${prefix}-${_doc.name.replace(/\.md$/, ".docx")}`
                a.click()
                URL.revokeObjectURL(url)
              } catch (err) {
                console.error("DOCX export failed:", err)
              }
            }}
            onReview={currentDeliverable ? () => handleReviewDeliverable(currentDeliverable.id) : undefined}
            onSendToAgent={currentDeliverable ? () => handleSendToAgent(currentDeliverable.id) : undefined}
            isReviewing={isReviewing}
            deliverableStatus={currentDeliverable?.status}
            agentName={currentWorkflow?.agentName}
            projectSlug={slugify(project.name)}
          />
        )}
      </main>
    </div>
  )
}

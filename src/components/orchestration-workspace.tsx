"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowLeft,

  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { safeGetItem, safeSetItem, safeRemoveItem, authHeaders } from "@/lib/safe-storage"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Agent } from "@/components/agent-panel"
import type { ToolAction } from "@/components/activity-feed"
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
  buildWorkflowSystemMessage,
  buildWorkflowUserMessage,
  AVAILABLE_DELIVERABLES,
} from "@/lib/bmad-types"
import { Message, Attachment, generateId } from "@/lib/types"
import { fileToAttachment } from "@/lib/attachments"
import { cn } from "@/lib/utils"
import { parseSSEStream } from "@/lib/sse"

/* ── helpers ────────────────────────────── */

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
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
          // Current deliverable inherits the project-level sessionId (preserves VPS session)
          if (d.id === project.currentDeliverable && project.sessionId) {
            return { ...d, sessionId: project.sessionId }
          }
          return { ...d, sessionId: `session-${Date.now()}-${i}` }
        }),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [deleteTarget, setDeleteTarget] = useState<Deliverable | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined" && project.currentDeliverable) {
      const stored = safeGetItem(`project-chat-${project.id}-${project.currentDeliverable}`)
      if (stored) {
        try { return JSON.parse(stored) } catch { return [] }
      }
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)
  const workflowStarted = useRef(messages.length > 0)

  // Layout state

  // Context status
  // Per-deliverable context map (deliverableId → context data)
  // Per-agent context map (agentId → aggregated context) — derived from deliverable context
  const [agentContextMap, setAgentContextMap] = useState<Record<string, { tokens: number; maxTokens: number; percentage: number }>>({})
  const [isClearing, setIsClearing] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)

  // Modals
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [viewingDocument, setViewingDocument] = useState<DocumentItem | null>(null)
  const [documentContent, setDocumentContent] = useState<string>("")
  const [documentLoading, setDocumentLoading] = useState(false)

  // Agents state (simulated for now - will connect to real sub-agent system)
  const [agents, setAgents] = useState<Agent[]>(() => {
    const currentTask = project.deliverables.find(d => d.id === project.currentDeliverable)?.name
    return [
      { id: "jarvis", name: "Jarvis", type: "main", status: project.currentDeliverable ? "active" : "idle", task: currentTask },
      { id: "analyst", name: "Mary", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "pm", name: "John", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "architect", name: "Winston", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "dev", name: "Amelia", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "ux", name: "Sally", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "qa", name: "Quinn", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "sm", name: "Bob", type: "sub", status: "idle", spawnedBy: "jarvis" },
      { id: "tech-writer", name: "Paige", type: "sub", status: "idle", spawnedBy: "jarvis" },
    ]
  })

  // Real tool actions from OpenClaw session history polling
  const [toolActions, setToolActions] = useState<ToolAction[]>([])

  // Flag: session was just rotated, next message should include transcript context
  const needsReorientation = useRef(false)

  // Documents state (derived from deliverable output artifacts)
  const [documents, setDocuments] = useState<DocumentItem[]>([])



  // Delete a deliverable (VPS cleanup + notify responsible agent + localStorage)
  const handleDeleteDeliverable = useCallback(async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const projectSlug = slugify(project.name)
      // Look up the responsible agent from the workflow definition
      const workflow = getWorkflowById(deleteTarget.workflowId)
      const agentName = workflow?.agentName || "Agent"

      // 1. Delete artifact + transcript from VPS
      fetch("/api/artifacts/delete", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ project: projectSlug, deliverableType: deleteTarget.type, workflowId: deleteTarget.workflowId }),
      }).catch(() => {})

      // 2. Ask the responsible agent to update PROJECT-CONTEXT.md / PROJECT-DECISIONS.md
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
        })
          .then(res => {
            // Agent context update completed (success/failure visible in session history)
          })
          .catch(() => {})
      }

      // 3. Clean up chat storage for this deliverable
      safeRemoveItem(`project-chat-${project.id}-${deleteTarget.id}`)

      // 4. Remove from project state
      const updatedDeliverables = project.deliverables.filter(d => d.id !== deleteTarget.id)
      const newCurrent = project.currentDeliverable === deleteTarget.id
        ? (updatedDeliverables[0]?.id ?? null)
        : project.currentDeliverable
      onProjectUpdate({
        ...project,
        deliverables: updatedDeliverables,
        currentDeliverable: newCurrent,
      })

      // 5. Switch chat view if needed
      if (newCurrent && newCurrent !== project.currentDeliverable) {
        const stored = safeGetItem(`project-chat-${project.id}-${newCurrent}`)
        setMessages(stored ? JSON.parse(stored) : [])
        workflowStarted.current = !!stored
      } else if (!newCurrent) {
        setMessages([])
        workflowStarted.current = false
      }

      setDeleteTarget(null)
    } catch {
      // silent
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, project, onProjectUpdate])

  // Advance workflow steps: mark current active → complete, next pending → active
  const advanceWorkflowStep = useCallback(() => {
    if (!project.currentDeliverable) return

    const deliverable = project.deliverables.find((d) => d.id === project.currentDeliverable)
    if (!deliverable) return

    const tasks = deliverable.tasks
    const activeIdx = tasks.findIndex((t) => t.status === "active")
    const firstPendingIdx = tasks.findIndex((t) => t.status === "pending")

    // Nothing to advance
    if (activeIdx === -1 && firstPendingIdx === -1) return

    const updatedTasks = tasks.map((t, i) => {
      if (i === activeIdx) return { ...t, status: "complete" as const }
      if (activeIdx >= 0 && i === activeIdx + 1 && t.status === "pending") return { ...t, status: "active" as const }
      // If no active step yet, activate the first pending
      if (activeIdx === -1 && i === firstPendingIdx) return { ...t, status: "active" as const }
      return t
    })

    const completedCount = updatedTasks.filter((t) => t.status === "complete").length
    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0

    onProjectUpdate({
      ...project,
      deliverables: project.deliverables.map((d) =>
        d.id === project.currentDeliverable
          ? { ...d, tasks: updatedTasks, progress }
          : d,
      ),
    })
  }, [project, onProjectUpdate])

  // Mark current deliverable as complete
  const markDeliverableComplete = useCallback(() => {
    if (!project.currentDeliverable) return
    const deliverable = project.deliverables.find(d => d.id === project.currentDeliverable)
    if (!deliverable || deliverable.status === "complete" || deliverable.status === "validated") return

    onProjectUpdate({
      ...project,
      deliverables: project.deliverables.map(d =>
        d.id === project.currentDeliverable
          ? {
              ...d,
              status: "complete",
              progress: 100,
              completedAt: Date.now(),
              tasks: d.tasks.map(t => ({ ...t, status: "complete" as const })),
            }
          : d,
      ),
    })
  }, [project, onProjectUpdate])

  // Detect workflow progress from AI response text (advances step timeline)
  const detectWorkflowProgress = useCallback((content: string) => {
    // Task/section completion patterns — advance the workflow step timeline
    const completionPatterns = [
      /✅.*complete/i,
      /section.*saved/i,
      /step.*complete/i,
      /finished.*section/i,
      /moving (?:on )?to/i,
      /let'?s (?:move|proceed|continue) (?:to|with)/i,
      /now let'?s (?:discuss|explore|cover|look at)/i,
      /great[!,.]?\s*(?:now|next|let'?s)/i,
      /that covers/i,
      /captured.*(?:section|area|topic)/i,
    ]
    for (const pattern of completionPatterns) {
      if (pattern.test(content)) {
        advanceWorkflowStep()
        break
      }
    }

    // Workflow / deliverable completion — mark current deliverable as done
    const workflowDonePatterns = [
      /(?:document|artifact|brief|prd|spec|architecture).*(?:saved|written|created|finalized|complete)/i,
      /(?:workflow|deliverable)\s+(?:is\s+)?(?:completed?|finished?|done)/i,
      /(?:agent|workflow|task)\s+(?:completed?|finished?|done)/i,
      /reports? (?:back|completion)/i,
      /saved.*(?:to|in|at)\s+[`"']?artifacts?\//i,
      /all\s+(?:sections?|steps?)\s+(?:are\s+)?(?:completed?|done|finished)/i,
    ]
    for (const pattern of workflowDonePatterns) {
      if (pattern.test(content)) {
        markDeliverableComplete()
        break
      }
    }
  }, [advanceWorkflowStep, markDeliverableComplete])

  // Current deliverable
  const currentDeliverable = project.deliverables.find(d => d.id === project.currentDeliverable)
  const currentWorkflow = currentDeliverable ? getWorkflowById(currentDeliverable.workflowId) : null

  // Fetch context status per deliverable using exact session keys.
  // Each deliverable has its own session: agent:<agentId>:mc:<sessionId>
  //
  // LEARNING: OpenClaw visibility:"all" means every agent's sessions.json contains ALL sessions
  // across all agents. Substring-matching sessionIds causes cross-contamination — the same session
  // appears in analyst/, architect/, jarvis/ etc. Always use exact session key lookup
  // (sessionKey=agent:<agentId>:mc:<sessionId>) to get the right agent's data.
  const fetchContextStatus = useCallback(async () => {
    const hdrs = authHeaders()
    const delCtx: Record<string, { tokens: number; maxTokens: number; percentage: number }> = {}
    // Track per-agent: agentId → { totalTokens, maxTokens }
    const agentAgg: Record<string, { totalTokens: number; maxTokens: number }> = {}

    await Promise.all(
      project.deliverables.map(async (d) => {
        const sid = d.sessionId
        if (!sid) return

        // Look up the agent for this deliverable's workflow
        const wf = getWorkflowById(d.workflowId)
        const agentId = wf?.agent || "jarvis"

        // Construct the exact session key (same format the chat API uses)
        const sessionKey = `agent:${agentId}:mc:${sid}`

        try {
          const res = await fetch(
            `/api/session/status?sessionKey=${encodeURIComponent(sessionKey)}`,
            { headers: hdrs },
          )
          if (!res.ok) return
          const data = await res.json()
          if (data.tokens > 0) {
            const maxTokens = data.maxTokens || 200000
            const ctx = {
              tokens: data.tokens,
              maxTokens,
              percentage: data.percentage ?? Math.round((data.tokens / maxTokens) * 100),
            }
            delCtx[d.id] = ctx

            // Aggregate for agent — sum tokens across all deliverables for this agent
            if (!agentAgg[agentId]) {
              agentAgg[agentId] = { totalTokens: 0, maxTokens }
            }
            agentAgg[agentId].totalTokens += data.tokens
            // Use the largest maxTokens seen (should be same per agent, but be safe)
            if (maxTokens > agentAgg[agentId].maxTokens) {
              agentAgg[agentId].maxTokens = maxTokens
            }
          }
        } catch { /* silent */ }
      }),
    )

    // Build agent context map from aggregation
    const aCtx: Record<string, { tokens: number; maxTokens: number; percentage: number }> = {}
    for (const [agentId, agg] of Object.entries(agentAgg)) {
      aCtx[agentId] = {
        tokens: agg.totalTokens,
        maxTokens: agg.maxTokens,
        percentage: Math.min(Math.round((agg.totalTokens / agg.maxTokens) * 100), 100),
      }
    }
    setAgentContextMap(aCtx)
  }, [project.deliverables, project.currentDeliverable])

  useEffect(() => {
    fetchContextStatus()
    const interval = setInterval(() => {
      if (!document.hidden) fetchContextStatus()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchContextStatus])

  // Poll real tool actions from OpenClaw session history
  useEffect(() => {
    const sid = currentDeliverable?.sessionId
    if (!sid) return

    // Build session key matching chat route format: agent:<agentId>:mc:<sessionId>
    const activeWorkflow = currentDeliverable ? getWorkflowById(currentDeliverable.workflowId) : null
    const agentId = activeWorkflow?.agent || "jarvis"
    const sessionKey = `agent:${agentId}:mc:${sid}`

    let cancelled = false

    const poll = async () => {
      if (cancelled || document.hidden) return
      try {
        const res = await fetch(
          `/api/session/history?sessionKey=${encodeURIComponent(sessionKey)}`,
          { headers: authHeaders() },
        )
        if (res.ok) {
          const data = await res.json()
          if (data.actions && !cancelled) {
            setToolActions(data.actions)
          }
        }
      } catch { /* silent */ }
    }

    // Initial fetch + poll every 5s
    poll()
    const interval = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeliverable?.sessionId, currentDeliverable?.workflowId])

  // Fetch project-level docs from VPS
  const [projectFiles, setProjectFiles] = useState<string[]>([])
  useEffect(() => {
    const projectSlug = slugify(project.name)
    if (!projectSlug) return
    // List root-level .md files + transcript files
    fetch(`/api/artifacts`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ project: projectSlug, rootOnly: true }),
    })
      .then(r => r.json())
      .then(data => { if (data.files) setProjectFiles(data.files) })
      .catch(() => {})
  }, [project.name])

  // Pretty names for project-level files
  const friendlyName = (filename: string): string => {
    if (filename === "PROJECT-CONTEXT.md") return "Project Context"
    if (filename === "PROJECT-DECISIONS.md") return "Project Decisions"
    const transcriptMatch = filename.match(/^WORKFLOW-TRANSCRIPT-(.+)\.md$/)
    if (transcriptMatch) {
      const wf = transcriptMatch[1].replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
      return `Transcript: ${wf}`
    }
    return filename.replace(/\.md$/, "").replace(/-/g, " ")
  }

  // Derive documents from deliverables + discovered project files
  useEffect(() => {
    // Project-level docs discovered from VPS
    const projectDocs: DocumentItem[] = projectFiles
      .filter(f => !f.includes("/")) // root-level files only
      .filter(f => f.endsWith(".md"))
      .map(f => ({
        id: `proj-${f}`,
        name: friendlyName(f),
        status: "ready" as const,
        path: f,
        kind: "project" as const,
      }))

    // Deliverable artifact documents — show all regardless of which chat is active
    const deliverableDocs: DocumentItem[] = project.deliverables
      .filter((d) => d.status === "complete" || d.status === "validated" || d.status === "in-progress")
      .map((d) => ({
        id: `doc-${d.id}`,
        name: d.outputPath ?? `${d.type}.md`,
        status: (d.status === "in-progress" ? "generating" : "ready") as "generating" | "ready",
        path: d.outputPath,
      }))

    setDocuments([...projectDocs, ...deliverableDocs])
  }, [project.deliverables, projectFiles])

  // Fetch document content from VPS when opening a document
  useEffect(() => {
    if (!viewingDocument) {
      setDocumentContent("")
      return
    }

    const projectSlug = slugify(project.name)
    setDocumentLoading(true)
    setDocumentContent("Loading document from VPS...")

    // Project-level docs use path=, deliverable docs use type=
    let url: string
    if (viewingDocument.kind === "project" && viewingDocument.path) {
      url = `/api/artifacts?project=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(viewingDocument.path)}`
    } else {
      const deliverableId = viewingDocument.id.replace("doc-", "")
      const deliverable = project.deliverables.find(d => d.id === deliverableId)
      if (!deliverable) {
        setDocumentContent("Deliverable not found.")
        setDocumentLoading(false)
        return
      }
      url = `/api/artifacts?project=${encodeURIComponent(projectSlug)}&type=${encodeURIComponent(deliverable.type)}`
    }

    fetch(url, { headers: authHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          setDocumentContent(data.content)
        } else {
          setDocumentContent(`# ${viewingDocument.name.replace(/\.md$/, "").replace(/-/g, " ")}\n\nDocument not found on VPS.`)
        }
      })
      .catch(() => {
        setDocumentContent(`# ${viewingDocument.name.replace(/\.md$/, "").replace(/-/g, " ")}\n\nFailed to fetch from VPS.`)
      })
      .finally(() => setDocumentLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingDocument?.id])

  // Auto-focus chat input on any keypress in workspace
  useEffect(() => {
    function handleGlobalKeydown(e: KeyboardEvent) {
      // Skip if already in an input, textarea, or contenteditable
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return
      // Skip modifier-only keys and shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return
      // Skip non-printable keys
      if (e.key.length !== 1) return

      chatInputRef.current?.focus()
    }
    window.addEventListener("keydown", handleGlobalKeydown)
    return () => window.removeEventListener("keydown", handleGlobalKeydown)
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Persist messages
  useEffect(() => {
    if (messages.length > 0 && project.currentDeliverable) {
      safeSetItem(`project-chat-${project.id}-${project.currentDeliverable}`, JSON.stringify(messages))
    }
  }, [messages, project.id, project.currentDeliverable])

  // Start workflow when deliverable becomes active
  // The ref guard prevents double-fire of the initial workflow message.
  useEffect(() => {
    if (currentDeliverable && currentWorkflow && !workflowStarted.current && messages.length === 0) {
      workflowStarted.current = true
      const systemMsg = buildWorkflowSystemMessage(currentWorkflow, project)
      const userMsg = buildWorkflowUserMessage(currentWorkflow)
      sendMessage(userMsg, true, systemMsg)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeliverable, currentWorkflow, messages.length])

  // Flush: Ask agent to save state to project files (no session rotation)
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
      fetchContextStatus()
    } catch { /* silent */ }
    finally { setIsFlushing(false) }
  }, [currentDeliverable, project.name, fetchContextStatus, agentContextMap])

  // Clear: Rotate only the current deliverable's session key. Don't touch other deliverables.
  const handleClear = useCallback(async () => {
    if (!currentDeliverable) return
    if (!confirm("This will rotate the session for this deliverable (fresh context). Chat history stays. Continue?")) return
    setIsClearing(true)
    try {
      const activeWorkflow = getWorkflowById(currentDeliverable.workflowId)

      // 1. Signal clear (transcript already up-to-date from per-turn appending)
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

      // 2. Rotate only THIS deliverable's session key
      const newSessionId = `session-${Date.now()}`
      onProjectUpdate({
        ...project,
        deliverables: project.deliverables.map(d =>
          d.id === currentDeliverable.id ? { ...d, sessionId: newSessionId } : d
        ),
      })

      // 3. Reset tool actions (old session's actions are stale)
      setToolActions([])

      // 4. Flag: next message should include re-orientation context
      needsReorientation.current = true

      fetchContextStatus()
    } catch { /* silent */ }
    finally { setIsClearing(false) }
  }, [project, currentDeliverable, fetchContextStatus, onProjectUpdate])

  // Send message
  const sendMessage = useCallback(async (content: string, isInitial = false, systemMessage?: string, attachments?: Attachment[]) => {
    const userMsg: Message = { id: generateId(), role: "user", content, attachments, createdAt: Date.now() }

    if (!isInitial) {
      setMessages(prev => [...prev, userMsg])
    }
    setIsLoading(true)

    try {
      // Route to the correct agent based on current deliverable's workflow
      const activeWorkflow = currentDeliverable ? getWorkflowById(currentDeliverable.workflowId) : null
      const projectSlug = slugify(project.name)
      const vpsBase = "/home/haneef/workspaces/jarvis/projects"

      // Always include compact project context so the agent knows which project it's working on
      const contextParts = systemMessage
        ? [systemMessage]
        : [
            `[Mission Control] Project: ${project.name}`,
            `Project workspace: ${vpsBase}/${projectSlug}`,
            currentDeliverable ? `Current deliverable: ${currentDeliverable.name}` : null,
          ].filter(Boolean) as string[]

      // After session rotation, inject last transcript exchanges so agent can re-orient
      if (needsReorientation.current && activeWorkflow) {
        needsReorientation.current = false
        try {
          const transcriptRes = await fetch(
            `/api/artifacts?project=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(`WORKFLOW-TRANSCRIPT-${activeWorkflow.id}.md`)}`,
            { headers: authHeaders() },
          )
          if (transcriptRes.ok) {
            const data = await transcriptRes.json()
            if (data.content) {
              // Extract last ~10 turns from the transcript
              const turns = data.content.split(/### Turn \d+/).filter(Boolean)
              const recentTurns = turns.slice(-10).map((t: string, i: number) =>
                `### Turn ${turns.length - 10 + i + 1}${t}`,
              ).join("")
              if (recentTurns.trim()) {
                contextParts.push(
                  `\n[Session Re-orientation] This is a fresh session. Here are the last exchanges from the previous session for continuity:\n\n${recentTurns.trim()}`,
                  `\nPlease read PROJECT-CONTEXT.md, PROJECT-DECISIONS.md, and MEMORY.md in the project folder to fully re-orient, then continue the workflow from where we left off.`,
                )
              }
            }
          }
        } catch { /* silent — re-orientation is best-effort */ }
      }

      const projectContext = contextParts.join("\n")

      const payload: Record<string, unknown> = {
        messages: [{ role: "user", content, attachments }],
        sessionId: currentDeliverable?.sessionId || project.sessionId,
        agentId: activeWorkflow?.agent || "jarvis",
        systemMessage: projectContext,
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      let assistantContent = ""
      let assistantReasoning = ""
      const assistantMsgId = generateId()

      await parseSSEStream(reader, {
        onReasoning: (_chunk, full) => {
          assistantReasoning = full
          setMessages(prev => {
            const exists = prev.find(m => m.id === assistantMsgId)
            if (exists) {
              return prev.map(m => m.id === assistantMsgId
                ? { ...m, reasoning: assistantReasoning || undefined }
                : m
              )
            }
            return [...prev, {
              id: assistantMsgId,
              role: "assistant" as const,
              content: assistantContent,
              reasoning: assistantReasoning || undefined,
              createdAt: Date.now(),
            }]
          })
        },
        onContent: (chunk, full) => {
          assistantContent = full
          setMessages(prev => {
            const exists = prev.find(m => m.id === assistantMsgId)
            if (exists) {
              return prev.map(m => m.id === assistantMsgId
                ? { ...m, content: assistantContent, reasoning: assistantReasoning || undefined }
                : m
              )
            }
            return [...prev, {
              id: assistantMsgId,
              role: "assistant" as const,
              content: assistantContent,
              reasoning: assistantReasoning || undefined,
              createdAt: Date.now(),
            }]
          })
        },
      })

      // Detect workflow step advancement from AI response text
      detectWorkflowProgress(assistantContent)

      // Append this turn to the workflow transcript (fire-and-forget)
      if (activeWorkflow && assistantContent && !isInitial) {
        fetch("/api/session/transcript", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            projectName: project.name,
            workflowId: activeWorkflow.id,
            userMessage: content,
            assistantMessage: assistantContent,
          }),
        }).catch(() => { /* silent — transcript append is best-effort */ })
      }

    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => [...prev, {
        id: generateId(),
        role: "assistant",
        content: "Connection error. Please try again.",
        createdAt: Date.now(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [project, detectWorkflowProgress])

  // Handle input submit (with optional file attachments)
  const handleChatSubmit = useCallback(async (chatAttachments?: ChatAttachment[]) => {
    const text = inputValue.trim()
    if (!text && !chatAttachments?.length) return
    if (isLoading) return

    // Separate images from documents
    const imageFiles = chatAttachments?.filter(a => a.file.type.startsWith("image/")) || []
    const docFiles = chatAttachments?.filter(a => !a.file.type.startsWith("image/")) || []

    // Build message content — prepend extracted doc context if present
    let content = text
    if (docFiles.length > 0) {
      const fileContextParts = docFiles
        .filter(a => a.status === "done" && a.extracted)
        .map(a => `--- Attached file: ${a.name} ---\n${a.extracted!.content}\n--- End: ${a.name} ---`)

      if (fileContextParts.length > 0) {
        const fileContext = fileContextParts.join("\n\n")
        content = content
          ? `${fileContext}\n\n${content}`
          : fileContext
      }
    }

    // Convert images to base64 Attachments — sent as native image_url content to OpenClaw
    let visionAttachments: Attachment[] | undefined
    if (imageFiles.length > 0) {
      const converted = await Promise.all(
        imageFiles.map(a => fileToAttachment(a.file))
      )
      visionAttachments = converted
    }

    // Push non-image files to VPS sources folder
    docFiles
      .filter(a => a.status === "done" && a.extracted)
      .forEach(a => {
        fetch("/api/context/generate", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            projectSlug: project.name.toLowerCase().replace(/\s+/g, "-"),
            files: [{
              filename: a.name,
              content: a.extracted!.content,
              type: a.extracted!.type,
            }],
          }),
        }).catch(() => { /* silent — file push is best-effort */ })
      })

    sendMessage(content, false, undefined, visionAttachments)
    setInputValue("")
  }, [inputValue, isLoading, sendMessage, project.name])

  // Start/switch deliverable
  const startDeliverable = useCallback((deliverableId: string) => {
    const stored = safeGetItem(`project-chat-${project.id}-${deliverableId}`)
    let existingMessages: Message[] = []
    if (stored) {
      try { existingMessages = JSON.parse(stored) } catch { existingMessages = [] }
    }

    workflowStarted.current = existingMessages.length > 0
    setMessages(existingMessages)

    const deliverable = project.deliverables.find(d => d.id === deliverableId)
    const isNew = deliverable?.status === "queued"

    onProjectUpdate({
      ...project,
      currentDeliverable: deliverableId,
      deliverables: project.deliverables.map(d => {
        if (d.id !== deliverableId) return d
        if (!isNew) return d
        // Activate first step when starting a new deliverable
        const tasks = d.tasks.map((t, i) =>
          i === 0 && t.status === "pending" ? { ...t, status: "active" as const } : t,
        )
        return { ...d, status: "in-progress", startedAt: Date.now(), tasks }
      }),
    })

    setAgents(prev => prev.map(a =>
      a.id === "jarvis" ? { ...a, status: "active", task: deliverable?.name } : a
    ))

  }, [project, onProjectUpdate])

  // Add deliverables
  const handleAddDeliverables = useCallback((selectedTypes: DeliverableType[]) => {
    const newDeliverables: Deliverable[] = selectedTypes.map((type, index) => {
      const template = AVAILABLE_DELIVERABLES.find(d => d.type === type)!
      const workflow = getWorkflowById(template.workflowId)

      // Filter out internal housekeeping steps the user doesn't need to see
      const INTERNAL_STEP_PATTERNS = [
        /^initialize/i,
        /^setup/i,
        /^finalize/i,
        /initialize\s*&\s*(?:setup|context)/i,
        /finalize\s*(?:&|document)/i,
      ]
      const isInternalStep = (name: string) =>
        INTERNAL_STEP_PATTERNS.some((p) => p.test(name.trim()))

      const isFirstAndAutoStart = project.deliverables.length === 0 && index === 0

      const tasks = (workflow?.areas ?? [])
        .filter((area) => !isInternalStep(area))
        .map((area, i) => ({
          id: `task-${Date.now()}-${index}-${i}`,
          name: area,
          // Activate first step if this deliverable auto-starts
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

  const lastMessage = messages[messages.length - 1]
  const isStreaming = isLoading && lastMessage?.role === "assistant"

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
          deliverables={project.deliverables}
          agents={agents}
          currentDeliverableId={project.currentDeliverable}
          activeAgentId={currentWorkflow?.agent || "jarvis"}
          agentContextMap={agentContextMap}
          onDeliverableClick={(id) => {
            if (id !== project.currentDeliverable) {
              startDeliverable(id)
            }
          }}
          onAgentClick={(id) => setSelectedAgentId(id === selectedAgentId ? null : id)}
          onAddDeliverable={() => setShowDocPicker(true)}
          onDeleteDeliverable={(id) => {
            const d = project.deliverables.find(del => del.id === id)
            if (d) setDeleteTarget(d)
          }}
        />

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto min-h-0" role="log" aria-live="polite" aria-label="Chat messages">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {messages.length === 0 && !currentDeliverable && (
                <div className="text-center py-16">
                  <p className="text-xs text-muted-foreground">Select a deliverable to start</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  variant="workspace"
                  isLoading={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
                />
              ))}
              {isLoading && !isStreaming && (
                <div className="flex items-center gap-1.5 py-3 mb-6">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          {currentDeliverable && (
            <ChatInput
              ref={chatInputRef}
              variant="workspace"
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleChatSubmit}
              agentName={currentWorkflow?.agentName || "Jarvis"}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Right: Workflow Steps + Activity + Documents */}
        <WorkspaceRightPanel
          steps={currentDeliverable?.tasks ?? []}
          toolActions={toolActions}
          isPolling={isLoading}
          documents={documents}
          onViewDocument={(doc) => {
            setViewingDocument(doc)
            setSelectedAgentId(null)
          }}
          onDownloadDocument={(doc) => {
            // Future: download document from VPS
          }}
          onMarkDocumentComplete={() => markDeliverableComplete()}
        />

        {/* Agent Detail Panel Overlay */}
        {selectedAgentId && (() => {
          const selectedAgent = agents.find((a) => a.id === selectedAgentId)
          if (!selectedAgent) return null
          return (
            <AgentDetailPanel
              agent={selectedAgent}
              onClose={() => setSelectedAgentId(null)}
              onTalkTo={() => {
                setSelectedAgentId(null)
                // Future: switch chat to this agent
              }}
              onReassign={() => {
                setSelectedAgentId(null)
                // Future: reassign task
              }}
            />
          )
        })()}

        {/* Document Viewer Overlay */}
        {viewingDocument && (
          <DocumentViewerPanel
            document={viewingDocument}
            content={documentContent}
            onClose={() => setViewingDocument(null)}
            onDownloadMd={(_doc, mdContent) => {
              const blob = new Blob([mdContent], { type: "text/markdown" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = _doc.name.endsWith(".md") ? _doc.name : `${_doc.name}.md`
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
                    // Handle bold markers
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
                a.download = _doc.name.replace(/\.md$/, ".docx")
                a.click()
                URL.revokeObjectURL(url)
              } catch (err) {
                console.error("DOCX export failed:", err)
              }
            }}
          />
        )}
      </main>
    </div>
  )
}

"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowLeft,

  Brain,
  Trash2,
  RefreshCw,
  Loader2,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import { safeGetItem, safeSetItem, safeRemoveItem, authHeaders } from "@/lib/safe-storage"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Agent, ActivityEntry } from "@/components/agent-panel"
import {
  IconRail,
  WorkspaceSidebar,
  WorkspaceRightPanel,
  AgentDetailPanel,
  DocumentViewerPanel,
} from "@/components/workspace"
import { ChatInput, type ChatAttachment, type ChatInputHandle } from "@/components/chat-input"
import { ChatMessage } from "@/components/chat-message"
import type { DocumentItem } from "@/components/workspace"
import { DocumentPicker } from "@/components/document-picker"
import { ContextViewer } from "@/components/context-viewer"
import type { ToolEvent } from "@/hooks/use-openclaw-events"
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
  const [contextStatus, setContextStatus] = useState<{ percentage: number; tokens: number; maxTokens: number } | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)

  // Modals
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [showContextViewer, setShowContextViewer] = useState(false)
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

  // Activity log - with migration from old format
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>(() => {
    if (typeof window !== "undefined") {
      const stored = safeGetItem(`project-activity-${project.id}`)
      if (stored) {
        try {
          const entries = JSON.parse(stored)
          // Migrate old type format to new format
          const typeMap: Record<string, ActivityEntry["type"]> = {
            "user-action": "user:input",
            "task-start": "task:start",
            "task-complete": "task:complete",
            "agent-spawn": "agent:spawn",
            "agent-complete": "agent:complete",
            "agent-error": "agent:error",
          }
          return entries.map((e: ActivityEntry & { from?: string }) => ({
            ...e,
            type: typeMap[e.type] || e.type,
            agent: e.agent || e.from, // old format used "from"
          }))
        } catch { return [] }
      }
    }
    return []
  })

  // Documents state (derived from deliverable output artifacts)
  const [documents, setDocuments] = useState<DocumentItem[]>([])

  // Tool execution state (populated from chat response parsing)
  const [activeTools, setActiveTools] = useState<ToolEvent[]>([])
  const [completedTools, setCompletedTools] = useState<ToolEvent[]>([])

  // Parse tool calls from streaming response
  const parseToolsFromChunk = useCallback((chunk: string) => {
    // Detect tool call patterns in the response
    const toolPatterns = [
      { pattern: /\[Calling tool: (\w+)\]/i, phase: "start" as const },
      { pattern: /\[Tool (\w+) completed\]/i, phase: "end" as const },
      { pattern: /\[Running: ([^\]]+)\]/i, phase: "start" as const },
      { pattern: /```bash\n([^`]+)```/i, phase: "end" as const, tool: "bash" },
      { pattern: /Reading file[:\s]+([^\n]+)/i, phase: "end" as const, tool: "read" },
      { pattern: /Writing to[:\s]+([^\n]+)/i, phase: "end" as const, tool: "write" },
      { pattern: /Searching[:\s]+([^\n]+)/i, phase: "start" as const, tool: "search" },
    ]

    for (const { pattern, phase, tool } of toolPatterns) {
      const match = chunk.match(pattern)
      if (match) {
        const toolName = tool || match[1] || "unknown"
        const timestamp = Date.now()
        const toolEvent: ToolEvent = {
          id: `tool-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
          stream: "tool",
          phase,
          tool: toolName,
          params: match[1] ? { command: match[1] } : undefined,
          timestamp,
        }

        if (phase === "start") {
          setActiveTools(prev => [...prev, toolEvent])
        } else {
          setActiveTools(prev => prev.filter(t => t.tool !== toolName))
          setCompletedTools(prev => [...prev, toolEvent].slice(-20))
        }
      }
    }
  }, [])

  // Add activity entry helper - uses new ActivityType format
  const addActivity = useCallback((
    type: ActivityEntry["type"],
    content: string,
    options?: { agent?: string; target?: string; metadata?: ActivityEntry["metadata"] }
  ) => {
    const newEntry: ActivityEntry = {
      id: generateId(),
      timestamp: Date.now(),
      type,
      content,
      agent: options?.agent,
      target: options?.target,
      metadata: options?.metadata,
    }
    setActivityLog(prev => {
      const updated = [newEntry, ...prev].slice(0, 100) // Keep last 100
      safeSetItem(`project-activity-${project.id}`, JSON.stringify(updated))
      return updated
    })
  }, [project.id])

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
      if (project.sessionId) {
        addActivity("agent:spawn", `Asked ${agentName} to update project context after removing "${deleteTarget.name}"`, { agent: agentName })

        fetch("/api/chat", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            messages: [{
              role: "user",
              content: `The deliverable "${deleteTarget.name}" (type: ${deleteTarget.type}) has been removed from this project. Its artifact and transcript files have been deleted. Please update PROJECT-CONTEXT.md and PROJECT-DECISIONS.md to remove references to this deliverable and its outputs. Be brief.`,
            }],
            sessionId: project.sessionId,
            agentId: workflow?.agent || "jarvis",
          }),
        })
          .then(res => {
            if (res.ok) {
              addActivity("agent:complete", `${agentName} updated project context — removed references to "${deleteTarget.name}"`, { agent: agentName, target: "@user" })
            } else {
              addActivity("agent:error", `${agentName} failed to update project context`, { agent: agentName, target: "@user" })
            }
          })
          .catch(() => {
            addActivity("agent:error", `Could not reach ${agentName} to update project context`, { agent: agentName, target: "@user" })
          })
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

      addActivity("user:input", `Removed deliverable: ${deleteTarget.name}`)
      setDeleteTarget(null)
    } catch {
      // silent
    } finally {
      setIsDeleting(false)
    }
  }, [deleteTarget, project, onProjectUpdate, addActivity])

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

  // Parse AI response for tool calls and actions
  const parseToolCallsFromResponse = useCallback((content: string) => {
    // Agent delegation via sessions_send patterns
    if (/sessions_send|delegat(?:e|ing|ed)|sending to|messaging/i.test(content)) {
      const match = content.match(/(?:delegat(?:e|ing|ed) to|sessions_send.*?|sending to|messaging)\s+["`']?(\w+)["`']?/i)
      if (match) {
        addActivity("agent:delegate", `Delegated to ${match[1]}`, { agent: "Jarvis" })
      }
    }

    // File write patterns (saved, wrote, created file)
    const fileWriteMatch = content.match(/(?:saved?|wrote?|created?|updated?)\s+(?:to\s+)?[`"']?([^\s`"']+\.\w+)[`"']?/i)
    if (fileWriteMatch) {
      addActivity("tool:file_write", `Saved file`, { agent: "Jarvis", target: fileWriteMatch[1] })
    }

    // File read patterns
    const fileReadMatch = content.match(/(?:reading?|loaded?|opened?|analyzed?)\s+(?:file\s+)?[`"']?([^\s`"']+\.\w+)[`"']?/i)
    if (fileReadMatch) {
      addActivity("tool:file_read", `Read file`, { agent: "Jarvis", target: fileReadMatch[1] })
    }

    // Search/investigation patterns
    if (/(?:searching|investigating|looking|exploring|scanning)/i.test(content)) {
      addActivity("tool:search", "Investigating codebase", { agent: "Jarvis" })
    }

    // Memory operations
    if (/(?:memory|context|stored|remembered|recalled)/i.test(content)) {
      addActivity("tool:memory", "Memory operation", { agent: "Jarvis" })
    }

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
        addActivity("task:complete", "Section completed", { agent: "Jarvis" })
        break
      }
    }

    // Agent handoff / delegation patterns
    if (/(?:handing off|transferring|passing to|taking over)/i.test(content)) {
      const match = content.match(/(?:to|for|by)\s+(\w+)/i)
      addActivity("agent:handoff", `Handoff to ${match?.[1] || "agent"}`, { agent: "Jarvis" })
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
        addActivity("agent:complete", "Workflow completed", { agent: "Jarvis" })
        break
      }
    }

    // Agent error
    if (/(?:error|failed|couldn't|unable)/i.test(content) && /(?:agent|task|process|workflow)/i.test(content)) {
      addActivity("agent:error", "Agent error", { agent: "Jarvis", metadata: { success: false } })
    }
  }, [addActivity, advanceWorkflowStep, markDeliverableComplete])

  // Current deliverable
  const currentDeliverable = project.deliverables.find(d => d.id === project.currentDeliverable)
  const currentWorkflow = currentDeliverable ? getWorkflowById(currentDeliverable.workflowId) : null

  // Fetch context status
  const fetchContextStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/session/status?sessionId=${project.sessionId}`, {
        headers: authHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.percentage !== undefined) {
          setContextStatus(data)
          setAgents(prev => prev.map(a =>
            a.id === "jarvis" ? { ...a, contextUsage: data.percentage } : a
          ))
        }
      }
    } catch { /* silent */ }
  }, [project.sessionId])

  useEffect(() => {
    fetchContextStatus()
    const interval = setInterval(() => {
      if (!document.hidden) fetchContextStatus()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchContextStatus])

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
  // Note: sendMessage and addActivity are stable callbacks but intentionally excluded
  // to prevent re-triggering on every project change. The ref guard prevents double-fire.
  useEffect(() => {
    if (currentDeliverable && currentWorkflow && !workflowStarted.current && messages.length === 0) {
      workflowStarted.current = true
      const systemMsg = buildWorkflowSystemMessage(currentWorkflow, project)
      const userMsg = buildWorkflowUserMessage(currentWorkflow)
      sendMessage(userMsg, true, systemMsg)
      addActivity("task:start", `Started ${currentDeliverable.name}`, { agent: "Jarvis" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeliverable, currentWorkflow, messages.length])

  // Flush/Clear handlers
  const handleFlush = useCallback(async () => {
    setIsFlushing(true)
    try {
      await fetch("/api/session/clear", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "flush", sessionId: project.sessionId, projectName: project.name }),
      })
      fetchContextStatus()
      addActivity("tool:memory", "Flushed memory to disk", { agent: "System" })
    } catch { /* silent */ }
    finally { setIsFlushing(false) }
  }, [project.sessionId, project.name, fetchContextStatus, addActivity])

  const handleClear = useCallback(async () => {
    if (!confirm("This will flush memory and clear the session. Continue?")) return
    setIsClearing(true)
    try {
      await fetch("/api/session/clear", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "flush_and_clear", sessionId: project.sessionId, projectName: project.name }),
      })
      setMessages([])
      if (project.currentDeliverable) {
        safeRemoveItem(`project-chat-${project.id}-${project.currentDeliverable}`)
      }
      workflowStarted.current = false
      fetchContextStatus()
      addActivity("user:input", "Cleared session")
    } catch { /* silent */ }
    finally { setIsClearing(false) }
  }, [project.sessionId, project.name, project.currentDeliverable, project.id, fetchContextStatus, addActivity])

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
      const payload: Record<string, unknown> = {
        messages: [{ role: "user", content, attachments }],
        sessionId: project.sessionId,
        agentId: activeWorkflow?.agent || "jarvis",
      }
      if (systemMessage) {
        payload.systemMessage = systemMessage
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
          parseToolsFromChunk(chunk)
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

      // Parse for tool calls and actions from AI response
      parseToolCallsFromResponse(assistantContent)

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
  }, [project, addActivity, parseToolsFromChunk, parseToolCallsFromResponse])

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

    addActivity("user:switch", `Switched to ${deliverable?.name}`)
  }, [project, onProjectUpdate, addActivity])

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
    addActivity("user:input", `Added ${newDeliverables.length} deliverable(s)`)
  }, [project, onProjectUpdate, addActivity])

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
              {/* Context indicator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                    !contextStatus ? "text-muted-foreground bg-muted" :
                    contextStatus.percentage < 50 ? "text-emerald-600 bg-emerald-100" :
                    contextStatus.percentage < 80 ? "text-amber-600 bg-amber-100" :
                    "text-red-600 bg-red-100"
                  )}>
                    <Brain className="h-3 w-3" />
                    <span>{contextStatus?.percentage ?? "—"}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Context: {contextStatus?.tokens?.toLocaleString() ?? "—"} tokens</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={() => setShowContextViewer(true)} className="p-1.5 hover:bg-muted rounded-lg">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>View context</TooltipContent>
              </Tooltip>

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
                <TooltipContent>Clear session</TooltipContent>
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

      {/* Context Viewer Modal */}
      <ContextViewer
        projectName={project.name.toLowerCase().replace(/\s+/g, "-")}
        isOpen={showContextViewer}
        onClose={() => setShowContextViewer(false)}
      />

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
        {/* Far Left: Icon Rail */}
        <nav aria-label="Main navigation">
          <IconRail activeItem="workspace" />
        </nav>

        {/* Left: Workspace Sidebar */}
        <WorkspaceSidebar
          deliverables={project.deliverables}
          agents={agents}
          currentDeliverableId={project.currentDeliverable}
          activeAgentId={agents.find(a => a.status === "active")?.id ?? null}
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
          activityEntries={activityLog}
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

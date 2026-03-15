"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowLeft,
  Circle,
  CheckCircle2,
  FileText,
  Plus,
  Brain,
  Trash2,
  RefreshCw,
  Loader2,
  Download,
  MessageSquare,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import {
  Project,
  Deliverable,
  DeliverableTask,
  DeliverableType,
  ValidationResult,
  getWorkflowById,
  buildWorkflowSystemMessage,
  buildWorkflowUserMessage,
  AVAILABLE_DELIVERABLES,
} from "@/lib/bmad-types"
import { Message, generateId } from "@/lib/types"
import { authHeaders } from "@/lib/safe-storage"
import {
  buildQASpawnInstruction,
  parseValidationResults,
} from "@/lib/qa-validation"
import { ValidationPanel } from "@/components/validation-panel"
import { DocumentPicker } from "@/components/document-picker"
import { ContextViewer } from "@/components/context-viewer"
import { parseSSEStream } from "@/lib/sse"

type ProjectWorkspaceProps = {
  project: Project
  onProjectUpdate: (project: Project) => void
}

export function ProjectWorkspace({ project, onProjectUpdate }: ProjectWorkspaceProps) {
  // Chat state - load from localStorage (per-deliverable)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined" && project.currentDeliverable) {
      const stored = localStorage.getItem(`project-chat-${project.id}-${project.currentDeliverable}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return []
        }
      }
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // If messages loaded from storage, workflow already started
  const workflowStarted = useRef(messages.length > 0)

  // Context indicator state (from VPS session status)
  const [contextStatus, setContextStatus] = useState<{
    percentage: number
    tokens: number
    maxTokens: number
  } | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [isFlushing, setIsFlushing] = useState(false)

  // Fetch context status from VPS
  const fetchContextStatus = useCallback(async () => {
    try {
      const url = `/api/session/status?sessionId=${project.sessionId}`
      const response = await fetch(url, { headers: authHeaders() })
      if (response.ok) {
        const data = await response.json()
        if (data.percentage !== undefined) {
          setContextStatus(data)
        }
      }
    } catch {
      // Silent fail - VPS endpoint may not be configured
    }
  }, [project.sessionId])

  // Poll context status
  useEffect(() => {
    fetchContextStatus()
    const interval = setInterval(fetchContextStatus, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [fetchContextStatus])

  // Refresh context after messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(fetchContextStatus, 1000)
    }
  }, [messages.length, fetchContextStatus])

  // Flush session (save memory, keep session)
  const handleFlush = async () => {
    setIsFlushing(true)
    try {
      await fetch("/api/session/clear", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "flush",
          sessionId: project.sessionId,
          projectName: project.name,
        }),
      })
      fetchContextStatus()
    } catch {
      // Silent fail
    } finally {
      setIsFlushing(false)
    }
  }

  // Clear session (save memory + reset)
  const handleClear = async () => {
    if (!confirm("This will flush memory and clear the session. Continue?")) return
    setIsClearing(true)
    try {
      await fetch("/api/session/clear", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "flush_and_clear",
          sessionId: project.sessionId,
          projectName: project.name,
        }),
      })
      // Clear local messages for current deliverable
      setMessages([])
      if (project.currentDeliverable) {
        localStorage.removeItem(`project-chat-${project.id}-${project.currentDeliverable}`)
      }
      workflowStarted.current = false
      fetchContextStatus()
    } catch {
      // Silent fail
    } finally {
      setIsClearing(false)
    }
  }

  // Persist messages to localStorage (per-deliverable)
  useEffect(() => {
    if (messages.length > 0 && project.currentDeliverable) {
      localStorage.setItem(`project-chat-${project.id}-${project.currentDeliverable}`, JSON.stringify(messages))
    }
  }, [messages, project.id, project.currentDeliverable])


  // QA Validation state
  const [isValidating, setIsValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [validationScore, setValidationScore] = useState<number | undefined>()
  const [validationSummary, setValidationSummary] = useState<string>("")

  // Document picker state (for adding deliverables)
  const [showDocPicker, setShowDocPicker] = useState(false)

  // Context viewer state
  const [showContextViewer, setShowContextViewer] = useState(false)

  // Track artifact paths per deliverable (extracted from chat messages)
  const [artifactPaths, setArtifactPaths] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`project-artifacts-${project.id}`)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return {}
        }
      }
    }
    return {}
  })

  // Get current deliverable
  const currentDeliverable = project.deliverables.find(
    (d) => d.id === project.currentDeliverable
  )
  const currentWorkflow = currentDeliverable
    ? getWorkflowById(currentDeliverable.workflowId)
    : null

  // Calculate progress from actual task states (not stored progress value)
  const calculatedProgress = React.useMemo(() => {
    if (!currentDeliverable?.tasks?.length) return 0
    const completedCount = currentDeliverable.tasks.filter(t => t.status === "complete").length
    return Math.round((completedCount / currentDeliverable.tasks.length) * 100)
  }, [currentDeliverable?.tasks])

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Start workflow when deliverable becomes active
  // MC tells Jarvis to delegate — Jarvis handles routing to the peer agent
  useEffect(() => {
    if (currentDeliverable && currentWorkflow && !workflowStarted.current && messages.length === 0) {
      workflowStarted.current = true
      const systemMsg = buildWorkflowSystemMessage(currentWorkflow, project)
      const userMsg = buildWorkflowUserMessage(currentWorkflow)
      sendMessage(userMsg, true, systemMsg)
    }
  }, [currentDeliverable, currentWorkflow, project, messages.length])

  // Extract artifact paths from messages (e.g., "Saved to: /path/to/file.md")
  const extractArtifactPath = useCallback((content: string, deliverableId?: string) => {
    const targetDeliverableId = deliverableId || currentDeliverable?.id
    if (!targetDeliverableId) return

    // Look for "Saved to:" patterns
    const pathPatterns = [
      /Saved to:\s*`?([^\s`\n]+\.md)`?/i,
      /saved\s+(?:at|to):\s*`?([^\s`\n]+\.md)`?/i,
      /(?:file|document)\s+saved:\s*`?([^\s`\n]+\.md)`?/i,
    ]

    for (const pattern of pathPatterns) {
      const match = content.match(pattern)
      if (match) {
        const path = match[1]
        if (path.includes("deliverables/") || path.includes("research/")) {
          setArtifactPaths(prev => {
            const updated = { ...prev, [targetDeliverableId]: path }
            localStorage.setItem(`project-artifacts-${project.id}`, JSON.stringify(updated))
            return updated
          })
        }
        return
      }
    }
  }, [currentDeliverable?.id, project.id])

  // Scan existing messages for artifact paths when deliverable changes
  useEffect(() => {
    if (messages.length > 0 && currentDeliverable && !artifactPaths[currentDeliverable.id]) {
      for (const msg of messages) {
        if (msg.role === "assistant") {
          extractArtifactPath(msg.content, currentDeliverable.id)
        }
      }
    }
  }, [messages.length, currentDeliverable?.id, extractArtifactPath, artifactPaths])

  // Parse task progress from responses
  const parseTaskProgress = useCallback((content: string) => {
    if (!currentDeliverable || !currentWorkflow) return

    const contentLower = content.toLowerCase()

    // Method 1: Explicit step numbers
    const stepPatterns = [
      /Step\s+(\d+)/i,
      /##\s*Step\s+(\d+)/i,
      /\[Step\s+(\d+)\]/i,
    ]

    for (const pattern of stepPatterns) {
      const match = content.match(pattern)
      if (match) {
        const stepNum = parseInt(match[1], 10)
        updateTaskProgress(stepNum)
        return
      }
    }

    // Method 2: Detect area names being completed or started
    // Look for patterns like "X section saved", "moving to X", "now let's discuss X"
    const completionPatterns = [
      /(\w[\w\s&]+)\s+section\s+saved/i,
      /completed[:\s]+(\w[\w\s&]+)/i,
      /✅\s*(\w[\w\s&]+)/i,
    ]

    const startPatterns = [
      /move\s+to\s+(\w[\w\s&]+)/i,
      /moving\s+to\s+(\w[\w\s&]+)/i,
      /now[,:]?\s+(?:let'?s?\s+)?(?:discuss|talk about|cover)\s+(\w[\w\s&]+)/i,
      /next[:\s]+(\w[\w\s&]+)/i,
    ]

    // Check for completed sections
    for (const pattern of completionPatterns) {
      const match = content.match(pattern)
      if (match) {
        const sectionName = match[1].toLowerCase().trim()
        const areaIndex = currentWorkflow.areas.findIndex(area =>
          area.toLowerCase().includes(sectionName) || sectionName.includes(area.toLowerCase().split(' ')[0])
        )
        if (areaIndex >= 0) {
          // Mark this area as complete, next as active
          updateTaskProgress(areaIndex + 2)
          return
        }
      }
    }

    // Check for starting new sections
    for (const pattern of startPatterns) {
      const match = content.match(pattern)
      if (match) {
        const sectionName = match[1].toLowerCase().trim()
        const areaIndex = currentWorkflow.areas.findIndex(area =>
          area.toLowerCase().includes(sectionName) || sectionName.includes(area.toLowerCase().split(' ')[0])
        )
        if (areaIndex >= 0) {
          updateTaskProgress(areaIndex + 1)
          return
        }
      }
    }
  }, [currentDeliverable, currentWorkflow])

  // Update task progress
  const updateTaskProgress = (stepNum: number) => {
    if (!currentDeliverable) return

    const updatedDeliverables = project.deliverables.map((d) => {
      if (d.id !== currentDeliverable.id) return d

      const updatedTasks = d.tasks.map((task, i) => {
        if (i + 1 < stepNum) return { ...task, status: "complete" as const }
        if (i + 1 === stepNum) return { ...task, status: "active" as const }
        return task
      })

      const completedCount = updatedTasks.filter((t) => t.status === "complete").length
      const progress = Math.round((completedCount / updatedTasks.length) * 100)

      return { ...d, tasks: updatedTasks, progress }
    })

    onProjectUpdate({ ...project, deliverables: updatedDeliverables })
  }

  // QA Agent type
  const [qaAgent, setQaAgent] = useState<"jarvis" | "gemini">("gemini")

  // Run QA validation via sub-agent (Jarvis) or independent (Gemini)
  const runQAValidation = useCallback(async (agent: "jarvis" | "gemini" = "gemini") => {
    if (!currentDeliverable || !currentWorkflow) return

    setIsValidating(true)
    setValidationResults([])
    setValidationScore(undefined)
    setValidationSummary("")
    setQaAgent(agent)

    try {
      if (agent === "gemini") {
        // Get document content from Jarvis first
        const documentPath = `deliverables/${currentDeliverable.type}.md`

        // Build chat history summary for context
        const chatHistory = messages
          .filter(m => m.role === "user")
          .map(m => m.content)
          .join("\n\n---\n\n")

        // For now, we'll ask Jarvis to read the document
        const docResponse = await fetch("/api/chat", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            messages: [{ role: "user", content: `Read and output the raw content of ${documentPath} with no commentary or explanation.` }],
            sessionId: project.sessionId,
          }),
        })

        if (!docResponse.ok) throw new Error("Failed to fetch document")

        const reader = docResponse.body?.getReader()
        if (!reader) throw new Error("No reader")

        const { content: documentContent } = await parseSSEStream(reader)

        // Now call Gemini QA API
        const qaResponse = await fetch("/api/qa/gemini", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            deliverableType: currentDeliverable.type,
            documentContent,
            chatHistory,
            projectName: project.name,
          }),
        })

        if (!qaResponse.ok) throw new Error("Gemini QA failed")

        const qaData = await qaResponse.json()
        const { results, score, summary } = parseValidationResults(qaData.content)

        setValidationResults(results)
        setValidationScore(score)
        setValidationSummary(summary + ` (Reviewed by ${qaData.model})`)
      } else {
        // Jarvis delegates QA validation to qa agent via sessions_send
        const documentPath = `deliverables/${currentDeliverable.type}.md`
        const qaInstruction = buildQASpawnInstruction(
          currentDeliverable.type,
          documentPath,
          project.name
        )

        // Tell Jarvis to send QA task to the qa peer agent
        const delegationMsg = `Validate the ${currentDeliverable.type} document. Use sessions_send to delegate to the "qa" agent with this instruction:\n\n${qaInstruction}`

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            messages: [{ role: "user", content: delegationMsg }],
            sessionId: project.sessionId,
          }),
        })

        if (!response.ok) throw new Error("Failed to start validation")

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader")

        const { content: fullResponse } = await parseSSEStream(reader)

        const { results, score, summary } = parseValidationResults(fullResponse)
        setValidationResults(results)
        setValidationScore(score)
        setValidationSummary(summary)
      }

      // Update deliverable with validation
      if (validationResults.length > 0) {
        const updatedDeliverables = project.deliverables.map((d) =>
          d.id === currentDeliverable.id
            ? {
                ...d,
                validationScore: validationScore,
                validationResults: validationResults,
                status: (validationScore ?? 0) >= 70 ? "validated" as const : d.status,
              }
            : d
        )
        onProjectUpdate({ ...project, deliverables: updatedDeliverables })
      }
    } catch (error) {
      console.error("Validation error:", error)
      setValidationSummary("Validation failed. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }, [currentDeliverable, currentWorkflow, project, onProjectUpdate, messages, validationResults, validationScore])

  // Auto-run QA when deliverable completes
  useEffect(() => {
    if (
      currentDeliverable &&
      calculatedProgress === 100 &&
      currentDeliverable.status === "in-progress" &&
      !isValidating &&
      validationResults.length === 0
    ) {
      // Mark as complete first
      const updatedDeliverables = project.deliverables.map((d) =>
        d.id === currentDeliverable.id
          ? { ...d, status: "complete" as const, completedAt: Date.now() }
          : d
      )
      onProjectUpdate({ ...project, deliverables: updatedDeliverables })

      // Auto-run validation after brief delay
      setTimeout(() => {
        runQAValidation()
      }, 1000)
    }
  }, [currentDeliverable, isValidating, validationResults.length, project, onProjectUpdate, runQAValidation])

  // Accept validation and move to next deliverable
  const acceptAndContinue = () => {
    if (!currentDeliverable) return

    // Find next queued deliverable
    const nextDeliverable = project.deliverables.find(
      (d) => d.status === "queued"
    )

    if (nextDeliverable) {
      // Start next deliverable
      workflowStarted.current = false
      setMessages([])
      setValidationResults([])
      setValidationScore(undefined)
      onProjectUpdate({
        ...project,
        currentDeliverable: nextDeliverable.id,
        deliverables: project.deliverables.map((d) =>
          d.id === nextDeliverable.id
            ? { ...d, status: "in-progress", startedAt: Date.now() }
            : d
        ),
      })
    }
  }

  // Send message to Jarvis (all MC traffic routes through Jarvis as orchestrator)
  const sendMessage = useCallback(
    async (content: string, isInitial = false, systemMessage?: string) => {
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content,
        createdAt: Date.now(),
      }

      if (!isInitial) {
        setMessages((prev) => [...prev, userMsg])
      }
      setIsLoading(true)

      try {
        // Only send the latest message - OpenClaw maintains session context via x-openclaw-session-key
        // Sending full history would cause double injection since Kimi already has the conversation
        const messagesToSend = [{ role: "user" as const, content }]

        const payload: Record<string, unknown> = {
          messages: messagesToSend,
          sessionId: project.sessionId,
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
            setMessages((prev) => {
              const exists = prev.find((m) => m.id === assistantMsgId)
              if (exists) {
                return prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, reasoning: assistantReasoning || undefined }
                    : m
                )
              }
              return [
                ...prev,
                {
                  id: assistantMsgId,
                  role: "assistant" as const,
                  content: assistantContent,
                  reasoning: assistantReasoning || undefined,
                  createdAt: Date.now(),
                },
              ]
            })
          },
          onContent: (_chunk, full) => {
            assistantContent = full
            setMessages((prev) => {
              const exists = prev.find((m) => m.id === assistantMsgId)
              if (exists) {
                return prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: assistantContent, reasoning: assistantReasoning || undefined }
                    : m
                )
              }
              return [
                ...prev,
                {
                  id: assistantMsgId,
                  role: "assistant" as const,
                  content: assistantContent,
                  reasoning: assistantReasoning || undefined,
                  createdAt: Date.now(),
                },
              ]
            })
          },
        })

        // Parse task progress and extract artifact paths after message completes
        parseTaskProgress(assistantContent)
        extractArtifactPath(assistantContent)

        // Detect document completion patterns
        const completionPatterns = [
          /✅\s*.*Complete/i,
          /document\s+(?:is\s+)?(?:complete|done|saved)/i,
          /brief\s+(?:is\s+)?(?:complete|done|saved)/i,
          /workflow\s+(?:is\s+)?now\s+(?:defined|complete)/i,
          /ready\s+for\s+the\s+next\s+phase/i,
        ]

        const isDocComplete = completionPatterns.some(p => p.test(assistantContent))
        if (isDocComplete && currentDeliverable) {
          // Mark all tasks as complete
          const updatedDeliverables = project.deliverables.map((d) => {
            if (d.id !== currentDeliverable.id) return d
            return {
              ...d,
              status: "complete" as const,
              tasks: d.tasks.map(t => ({ ...t, status: "complete" as const })),
            }
          })
          onProjectUpdate({ ...project, deliverables: updatedDeliverables })
        }
      } catch (error) {
        console.error("Chat error:", error)
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: "Connection error. Please try again.",
            createdAt: Date.now(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [messages, project, parseTaskProgress, extractArtifactPath, currentDeliverable, onProjectUpdate]
  )

  // Delete a deliverable
  const deleteDeliverable = (deliverableId: string) => {
    const updated = project.deliverables.filter(d => d.id !== deliverableId)

    // If we deleted the current one, switch to first remaining or null
    let newCurrent = project.currentDeliverable
    if (project.currentDeliverable === deliverableId) {
      newCurrent = updated[0]?.id || null
    }

    // Clean up localStorage for this deliverable
    localStorage.removeItem(`project-chat-${project.id}-${deliverableId}`)

    onProjectUpdate({
      ...project,
      deliverables: updated,
      currentDeliverable: newCurrent,
    })
  }

  // Start or switch to a deliverable
  const startDeliverable = (deliverableId: string) => {
    // Load existing messages for this deliverable (if any)
    const stored = localStorage.getItem(`project-chat-${project.id}-${deliverableId}`)
    let existingMessages: Message[] = []
    if (stored) {
      try {
        existingMessages = JSON.parse(stored)
      } catch {
        existingMessages = []
      }
    }

    // If there are existing messages, just load them (resuming)
    // If no messages, workflow will auto-start
    workflowStarted.current = existingMessages.length > 0
    setMessages(existingMessages)

    // Update deliverable status
    const deliverable = project.deliverables.find(d => d.id === deliverableId)
    const isNew = deliverable?.status === "queued"

    onProjectUpdate({
      ...project,
      currentDeliverable: deliverableId,
      deliverables: project.deliverables.map((d) =>
        d.id === deliverableId && isNew
          ? { ...d, status: "in-progress", startedAt: Date.now() }
          : d
      ),
    })
  }

  // Add deliverables from document picker
  const handleAddDeliverables = (selectedTypes: DeliverableType[], inputDocs: File[]) => {
    const newDeliverables: Deliverable[] = selectedTypes.map((type, index) => {
      const template = AVAILABLE_DELIVERABLES.find((d) => d.type === type)!
      const workflow = getWorkflowById(template.workflowId)

      const tasks = workflow?.areas.map((area, i) => ({
        id: `task-${Date.now()}-${index}-${i}`,
        name: area,
        status: "pending" as const,
      })) || []

      return {
        id: `deliverable-${Date.now()}-${index}`,
        type,
        workflowId: template.workflowId,
        name: template.name,
        description: template.description,
        status: project.deliverables.length === 0 && index === 0 ? "in-progress" : "queued",
        progress: 0,
        tasks,
      }
    })

    const updatedDeliverables = [...project.deliverables, ...newDeliverables]
    const firstNew = newDeliverables[0]

    onProjectUpdate({
      ...project,
      deliverables: updatedDeliverables,
      inputDocuments: [...(project.inputDocuments || []), ...inputDocs.map(f => f.name)],
      currentDeliverable: project.currentDeliverable || firstNew?.id || null,
    })

    setShowDocPicker(false)
  }

  const lastMessage = messages[messages.length - 1]
  const isStreaming = isLoading && lastMessage?.role === "assistant"

  // Download chat transcript as markdown
  const downloadTranscript = useCallback(() => {
    if (messages.length === 0) return

    const deliverableName = currentDeliverable?.name || "chat"
    const timestamp = new Date().toISOString().split("T")[0]

    let content = `# ${project.name} - ${deliverableName} Transcript\n\n`
    content += `**Date:** ${new Date().toLocaleDateString()}\n`
    content += `**Session:** ${project.sessionId}\n\n`
    content += `---\n\n`

    for (const msg of messages) {
      const role = msg.role === "user" ? "**You**" : "**Assistant**"
      const time = new Date(msg.createdAt).toLocaleTimeString()
      content += `### ${role} (${time})\n\n`
      content += `${msg.content}\n\n`
      content += `---\n\n`
    }

    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${deliverableName.toLowerCase().replace(/\s+/g, "-")}-transcript-${timestamp}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [messages, currentDeliverable?.name, project.name, project.sessionId])

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <TooltipProvider>
        <header className="shrink-0 bg-white border-b border-zinc-200">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-zinc-500" />
              </Link>
              <h1 className="font-semibold text-zinc-900">
                {project.name}
              </h1>
            </div>

            {/* Right side: Context + Actions */}
            <div className="flex items-center gap-2">
              {/* Context Indicator - from VPS session status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-default ${
                      !contextStatus
                        ? "text-zinc-400 bg-zinc-100"
                        : contextStatus.percentage < 50
                        ? "text-emerald-600 bg-emerald-100"
                        : contextStatus.percentage < 80
                        ? "text-amber-600 bg-amber-100"
                        : "text-red-600 bg-red-100"
                    }`}
                  >
                    <Brain className="h-3.5 w-3.5" />
                    <span>{contextStatus?.percentage ?? "—"}%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs">
                    <div className="font-medium">Jarvis Context Window</div>
                    {contextStatus ? (
                      <>
                        <div className="text-muted-foreground">
                          {(contextStatus.tokens / 1000).toFixed(1)}k / {(contextStatus.maxTokens / 1000).toFixed(0)}k tokens
                        </div>
                        {contextStatus.percentage >= 80 && (
                          <div className="text-red-500 mt-1">Consider clearing session</div>
                        )}
                      </>
                    ) : (
                      <div className="text-muted-foreground">Not connected</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Context Viewer Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowContextViewer(true)}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <BookOpen className="h-4 w-4 text-zinc-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs">View memory & context</div>
                </TooltipContent>
              </Tooltip>

              {/* Flush Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleFlush}
                    disabled={isFlushing}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isFlushing ? (
                      <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs">Flush memory</div>
                </TooltipContent>
              </Tooltip>

              {/* Clear Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleClear}
                    disabled={isClearing}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isClearing ? (
                      <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-xs">Clear session</div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>
      </TooltipProvider>

      {/* Document Picker Modal */}
      {showDocPicker && (
        <DocumentPicker
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

      {/* Main Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Deliverables Queue */}
        <aside className="w-60 shrink-0 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Deliverables
              </h2>
              {project.deliverables.length > 0 && (
                <button
                  onClick={() => setShowDocPicker(true)}
                  className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg transition-colors shadow-sm"
                  title="Add deliverables"
                >
                  <Plus className="h-4 w-4 text-zinc-500" />
                </button>
              )}
            </div>
          </div>
          {project.deliverables.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-sm text-zinc-500 mb-4">No deliverables yet</p>
              <button
                onClick={() => setShowDocPicker(true)}
                className="h-10 px-5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-medium transition-colors"
              >
                Add Deliverable
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {project.deliverables.map((d, i) => (
                <DeliverableCard
                  key={d.id}
                  deliverable={d}
                  isActive={d.id === project.currentDeliverable}
                  onStart={() => startDeliverable(d.id)}
                  onDelete={() => deleteDeliverable(d.id)}
                  index={i + 1}
                  artifactPath={artifactPaths[d.id]}
                />
              ))}

              {/* Add more button at bottom */}
              <button
                onClick={() => setShowDocPicker(true)}
                className="w-full p-3 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-500 transition-colors text-sm"
              >
                + Add more
              </button>
            </div>
          )}
        </aside>

        {/* Main: Chat Area (2-column layout) */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
          {/* Progress Header with Checklist - Always Visible */}
          {currentDeliverable && (
            <div className="shrink-0 border-b border-zinc-200 bg-white">
              {/* Title + Progress Bar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-zinc-700">
                    {currentDeliverable.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--brand)] transition-all duration-300"
                        style={{ width: `${calculatedProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">{calculatedProgress}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {calculatedProgress >= 100 && validationResults.length === 0 && (
                    <button
                      onClick={() => runQAValidation("gemini")}
                      className="px-3 py-1 text-xs font-medium bg-[var(--brand)] text-white rounded-md hover:bg-[var(--brand-hover)] transition-colors"
                    >
                      Run QA
                    </button>
                  )}
                  {validationScore !== undefined && (
                    <span className={`px-2 py-1 text-xs font-bold rounded-md ${
                      validationScore >= 90 ? "bg-emerald-100 text-emerald-700" :
                      validationScore >= 70 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      QA: {validationScore}/100
                    </span>
                  )}
                </div>
              </div>

              {/* Checklist - Always Visible */}
              <div className="px-6 py-3 bg-zinc-50/50">
                <div className="flex flex-wrap gap-2">
                  {currentDeliverable.tasks.map((task, i) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        task.status === "active"
                          ? "bg-[var(--brand)] text-white shadow-sm"
                          : task.status === "complete"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-white text-zinc-400 border border-zinc-200"
                      }`}
                    >
                      {task.status === "complete" ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                      ) : task.status === "active" ? (
                        <div className="w-3 h-3 rounded-full border-2 border-white/60 flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <span className="w-3 h-3 flex items-center justify-center text-[10px] font-medium">{i + 1}</span>
                      )}
                      <span className="truncate max-w-[120px]">{task.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA Results - Show when available */}
              {validationResults.length > 0 && (
                <div className="px-6 py-3 border-t border-zinc-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                        {validationResults.filter(r => r.status === "pass").length} Pass
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                        {validationResults.filter(r => r.status === "warn").length} Warn
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                        {validationResults.filter(r => r.status === "fail").length} Fail
                      </span>
                    </div>
                    {validationSummary && (
                      <span className="text-xs text-zinc-500">{validationSummary}</span>
                    )}
                  </div>
                  <button
                    onClick={acceptAndContinue}
                    disabled={validationResults.some(r => r.status === "fail")}
                    className="px-4 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Accept & Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <div className="max-w-2xl mx-auto space-y-1">
              {messages.length === 0 && !currentDeliverable && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-500">Select a deliverable to start</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isLastAssistant = i === messages.length - 1 && msg.role === "assistant"
                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isLoading={isStreaming && isLastAssistant}
                  />
                )
              })}
              {isLoading && !isStreaming && (
                <div className="flex items-center gap-1.5 py-3 px-4">
                  <span className="w-2 h-2 bg-[var(--brand)] rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-[var(--brand)] rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-[var(--brand)] rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          {currentDeliverable && (
            <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <ChatInput
                      onSend={(msg) => sendMessage(msg)}
                      placeholder={`Reply to ${currentWorkflow?.agentName || "Agent"}...`}
                      disabled={isLoading}
                    />
                  </div>
                  {messages.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={downloadTranscript}
                            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 hover:text-zinc-700"
                            title="Download transcript"
                          >
                            <MessageSquare className="h-5 w-5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="text-xs">Download chat transcript</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// Deliverable Card Component - Matches SelectionCard pattern from screens 1,2,3
function DeliverableCard({
  deliverable,
  isActive,
  onStart,
  onDelete,
  artifactPath,
}: {
  deliverable: Deliverable
  isActive: boolean
  onStart: () => void
  onDelete: () => void
  index: number
  artifactPath?: string
}) {
  const [downloading, setDownloading] = React.useState(false)

  // Get emoji from AVAILABLE_DELIVERABLES
  const template = AVAILABLE_DELIVERABLES.find(d => d.type === deliverable.type)
  const emoji = template?.icon || "📄"

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!artifactPath) return

    setDownloading(true)
    try {
      const response = await fetch(`/api/artifacts?path=${encodeURIComponent(artifactPath)}`, {
        headers: authHeaders(),
      })
      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([data.content], { type: "text/markdown" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = artifactPath.split("/").pop() || "document.md"
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // Silent fail
    } finally {
      setDownloading(false)
    }
  }

  const isComplete = deliverable.status === "complete" || deliverable.status === "validated"
  const isQueued = deliverable.status === "queued"

  return (
    <button
      type="button"
      onClick={onStart}
      className={`
        relative w-full flex flex-col items-center p-4 rounded-lg shadow-sm overflow-hidden
        transition-all duration-200 text-left
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2
        ${isActive
          ? "bg-[var(--brand)]/[0.03]"
          : isComplete
          ? "bg-emerald-50/50"
          : "bg-white hover:shadow-md"
        }
      `}
    >
      {/* Emoji */}
      <span className={`text-2xl mb-2 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
        {isComplete ? "✅" : emoji}
      </span>

      {/* Title */}
      <span className={`text-sm font-medium text-center transition-colors duration-200 ${
        isActive
          ? "text-zinc-900"
          : isComplete
          ? "text-emerald-700"
          : "text-zinc-600"
      }`}>
        {deliverable.name}
      </span>

      {/* Progress bar for in-progress */}
      {deliverable.status === "in-progress" && deliverable.tasks.length > 0 && (
        <div className="w-full mt-2 px-2">
          <div className="h-1 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand)] transition-all duration-300"
              style={{ width: `${Math.round((deliverable.tasks.filter(t => t.status === "complete").length / deliverable.tasks.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Status indicator */}
      {isQueued && !isActive && (
        <span className="mt-1 text-[10px] text-zinc-400">Ready</span>
      )}
      {deliverable.status === "in-progress" && !isActive && (
        <span className="mt-1 text-[10px] text-[var(--brand)]">
          {deliverable.tasks.filter(t => t.status === "complete").length}/{deliverable.tasks.length} steps
        </span>
      )}
      {isComplete && (
        <span className="mt-1 text-[10px] text-emerald-600">Complete</span>
      )}

      {/* Action buttons - absolute positioned */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {artifactPath && (
          <div
            onClick={handleDownload}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </div>
        )}
        {!isActive && deliverable.status !== "validated" && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Remove "${deliverable.name}" from queue?`)) {
                onDelete()
              }
            }}
            className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-200 ${
          isActive
            ? "bg-[var(--brand)]"
            : isComplete
            ? "bg-emerald-500"
            : "bg-transparent"
        }`}
      />
    </button>
  )
}

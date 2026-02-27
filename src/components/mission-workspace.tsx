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
  Mission,
  Deliverable,
  DeliverableTask,
  DeliverableType,
  ValidationResult,
  getWorkflowById,
  buildWorkflowStartCommand,
  AVAILABLE_DELIVERABLES,
} from "@/lib/bmad-types"
import { Message, generateId } from "@/lib/types"
import {
  buildQASpawnInstruction,
  parseValidationResults,
} from "@/lib/qa-validation"
import { ValidationPanel } from "@/components/validation-panel"
import { DocumentPicker } from "@/components/document-picker"
import { ContextViewer } from "@/components/context-viewer"

type MissionWorkspaceProps = {
  mission: Mission
  onMissionUpdate: (mission: Mission) => void
}

export function MissionWorkspace({ mission, onMissionUpdate }: MissionWorkspaceProps) {
  // Chat state - load from localStorage (per-deliverable)
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined" && mission.currentDeliverable) {
      const stored = localStorage.getItem(`mission-chat-${mission.id}-${mission.currentDeliverable}`)
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
      const url = `/api/session/status?sessionId=${mission.sessionId}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.percentage !== undefined) {
          setContextStatus(data)
        }
      }
    } catch {
      // Silent fail - VPS endpoint may not be configured
    }
  }, [mission.sessionId])

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "flush",
          sessionId: mission.sessionId,
          projectName: mission.name,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "flush_and_clear",
          sessionId: mission.sessionId,
          projectName: mission.name,
        }),
      })
      // Clear local messages for current deliverable
      setMessages([])
      if (mission.currentDeliverable) {
        localStorage.removeItem(`mission-chat-${mission.id}-${mission.currentDeliverable}`)
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
    if (messages.length > 0 && mission.currentDeliverable) {
      localStorage.setItem(`mission-chat-${mission.id}-${mission.currentDeliverable}`, JSON.stringify(messages))
    }
  }, [messages, mission.id, mission.currentDeliverable])


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
      const stored = localStorage.getItem(`mission-artifacts-${mission.id}`)
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
  const currentDeliverable = mission.deliverables.find(
    (d) => d.id === mission.currentDeliverable
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
  useEffect(() => {
    if (currentDeliverable && currentWorkflow && !workflowStarted.current && messages.length === 0) {
      workflowStarted.current = true
      const command = buildWorkflowStartCommand(currentWorkflow, mission)
      sendMessage(command, true)
    }
  }, [currentDeliverable, currentWorkflow, mission, messages.length])

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
        console.log("[DEBUG] extractArtifactPath matched:", path)
        // Only update if it's a planning-artifacts or implementation-artifacts path
        if (path.includes("artifacts/")) {
          console.log("[DEBUG] Setting artifact path for", targetDeliverableId, ":", path)
          setArtifactPaths(prev => {
            const updated = { ...prev, [targetDeliverableId]: path }
            localStorage.setItem(`mission-artifacts-${mission.id}`, JSON.stringify(updated))
            return updated
          })
        }
        return
      }
    }
  }, [currentDeliverable?.id, mission.id])

  // Scan existing messages for artifact paths when deliverable changes
  useEffect(() => {
    if (messages.length > 0 && currentDeliverable && !artifactPaths[currentDeliverable.id]) {
      console.log("[DEBUG] Scanning messages for artifact paths, deliverable:", currentDeliverable.id)
      for (const msg of messages) {
        if (msg.role === "assistant") {
          // Check if message contains "Saved to:"
          if (msg.content.includes("Saved to:")) {
            console.log("[DEBUG] Found 'Saved to:' in message:", msg.content.substring(0, 200))
          }
          extractArtifactPath(msg.content, currentDeliverable.id)
        }
      }
      console.log("[DEBUG] Artifact paths after scan:", artifactPaths)
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

    const updatedDeliverables = mission.deliverables.map((d) => {
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

    onMissionUpdate({ ...mission, deliverables: updatedDeliverables })
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
        const documentPath = `planning-artifacts/${currentDeliverable.type}.md`

        // Build chat history summary for context
        const chatHistory = messages
          .filter(m => m.role === "user")
          .map(m => m.content)
          .join("\n\n---\n\n")

        // For now, we'll ask Jarvis to read the document
        const docResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `Read and output the raw content of ${documentPath} with no commentary or explanation.` }],
            sessionId: mission.sessionId,
          }),
        })

        if (!docResponse.ok) throw new Error("Failed to fetch document")

        const reader = docResponse.body?.getReader()
        if (!reader) throw new Error("No reader")

        let documentContent = ""
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const json = JSON.parse(data)
                if (json.content) {
                  documentContent += json.content
                }
              } catch {
                // Skip parse errors
              }
            }
          }
        }

        // Now call Gemini QA API
        const qaResponse = await fetch("/api/qa/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliverableType: currentDeliverable.type,
            documentContent,
            chatHistory,
            projectName: mission.name,
          }),
        })

        if (!qaResponse.ok) throw new Error("Gemini QA failed")

        const qaData = await qaResponse.json()
        const { results, score, summary } = parseValidationResults(qaData.content)

        setValidationResults(results)
        setValidationScore(score)
        setValidationSummary(summary + ` (Reviewed by ${qaData.model})`)
      } else {
        // Jarvis validation (original logic)
        const documentPath = `planning-artifacts/${currentDeliverable.type}.md`
        const qaInstruction = buildQASpawnInstruction(
          currentDeliverable.type,
          documentPath,
          mission.name
        )

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: `/subagents spawn qa-validator "${qaInstruction}"` }],
            sessionId: mission.sessionId,
          }),
        })

        if (!response.ok) throw new Error("Failed to start validation")

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader")

        let fullResponse = ""
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const json = JSON.parse(data)
                if (json.content) {
                  fullResponse += json.content
                }
              } catch {
                // Skip parse errors
              }
            }
          }
        }

        const { results, score, summary } = parseValidationResults(fullResponse)
        setValidationResults(results)
        setValidationScore(score)
        setValidationSummary(summary)
      }

      // Update deliverable with validation
      if (validationResults.length > 0) {
        const updatedDeliverables = mission.deliverables.map((d) =>
          d.id === currentDeliverable.id
            ? {
                ...d,
                validationScore: validationScore,
                validationResults: validationResults,
                status: (validationScore ?? 0) >= 70 ? "validated" as const : d.status,
              }
            : d
        )
        onMissionUpdate({ ...mission, deliverables: updatedDeliverables })
      }
    } catch (error) {
      console.error("Validation error:", error)
      setValidationSummary("Validation failed. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }, [currentDeliverable, currentWorkflow, mission, onMissionUpdate, messages, validationResults, validationScore])

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
      const updatedDeliverables = mission.deliverables.map((d) =>
        d.id === currentDeliverable.id
          ? { ...d, status: "complete" as const, completedAt: Date.now() }
          : d
      )
      onMissionUpdate({ ...mission, deliverables: updatedDeliverables })

      // Auto-run validation after brief delay
      setTimeout(() => {
        runQAValidation()
      }, 1000)
    }
  }, [currentDeliverable, isValidating, validationResults.length, mission, onMissionUpdate, runQAValidation])

  // Accept validation and move to next deliverable
  const acceptAndContinue = () => {
    if (!currentDeliverable) return

    // Find next queued deliverable
    const nextDeliverable = mission.deliverables.find(
      (d) => d.status === "queued"
    )

    if (nextDeliverable) {
      // Start next deliverable
      workflowStarted.current = false
      setMessages([])
      setValidationResults([])
      setValidationScore(undefined)
      onMissionUpdate({
        ...mission,
        currentDeliverable: nextDeliverable.id,
        deliverables: mission.deliverables.map((d) =>
          d.id === nextDeliverable.id
            ? { ...d, status: "in-progress", startedAt: Date.now() }
            : d
        ),
      })
    }
  }

  // Send message to Jarvis
  const sendMessage = useCallback(
    async (content: string, isInitial = false) => {
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

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesToSend,
            sessionId: mission.sessionId,
          }),
        })

        if (!response.ok) throw new Error("Failed")

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No reader")

        let assistantContent = ""
        let assistantReasoning = ""
        const assistantMsgId = generateId()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const json = JSON.parse(data)

                // Capture reasoning (Kimi K2.5 uses reasoning_content field)
                // Check multiple locations: direct field, choices[0].delta, choices[0].message
                const reasoning = json.reasoning_content
                  || json.reasoning
                  || json.choices?.[0]?.delta?.reasoning_content
                  || json.choices?.[0]?.message?.reasoning_content
                if (reasoning) {
                  assistantReasoning += reasoning
                }

                // Capture content (check multiple locations for streaming)
                const content = json.content
                  || json.choices?.[0]?.delta?.content
                  || json.choices?.[0]?.message?.content
                if (content) {
                  assistantContent += content
                }

                // Update message with both reasoning and content
                if (content || reasoning) {
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
                }
              } catch {
                // Skip parse errors
              }
            }
          }
        }

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
          const updatedDeliverables = mission.deliverables.map((d) => {
            if (d.id !== currentDeliverable.id) return d
            return {
              ...d,
              status: "complete" as const,
              tasks: d.tasks.map(t => ({ ...t, status: "complete" as const })),
            }
          })
          onMissionUpdate({ ...mission, deliverables: updatedDeliverables })
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
    [messages, mission, parseTaskProgress, extractArtifactPath, currentDeliverable, onMissionUpdate]
  )

  // Start or switch to a deliverable
  const startDeliverable = (deliverableId: string) => {
    // Load existing messages for this deliverable (if any)
    const stored = localStorage.getItem(`mission-chat-${mission.id}-${deliverableId}`)
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
    const deliverable = mission.deliverables.find(d => d.id === deliverableId)
    const isNew = deliverable?.status === "queued"

    onMissionUpdate({
      ...mission,
      currentDeliverable: deliverableId,
      deliverables: mission.deliverables.map((d) =>
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
        status: mission.deliverables.length === 0 && index === 0 ? "in-progress" : "queued",
        progress: 0,
        tasks,
      }
    })

    const updatedDeliverables = [...mission.deliverables, ...newDeliverables]
    const firstNew = newDeliverables[0]

    onMissionUpdate({
      ...mission,
      deliverables: updatedDeliverables,
      inputDocuments: [...(mission.inputDocuments || []), ...inputDocs.map(f => f.name)],
      currentDeliverable: mission.currentDeliverable || firstNew?.id || null,
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

    let content = `# ${mission.name} - ${deliverableName} Transcript\n\n`
    content += `**Date:** ${new Date().toLocaleDateString()}\n`
    content += `**Session:** ${mission.sessionId}\n\n`
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
  }, [messages, currentDeliverable?.name, mission.name, mission.sessionId])

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
                {mission.name}
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
        />
      )}

      {/* Context Viewer Modal */}
      <ContextViewer
        projectName={mission.name.toLowerCase().replace(/\s+/g, "-")}
        isOpen={showContextViewer}
        onClose={() => setShowContextViewer(false)}
      />

      {/* Main Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Deliverables Queue */}
        <aside className="w-56 shrink-0 bg-white border-r border-zinc-200 overflow-y-auto">
          <div className="p-4 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Queue
              </h2>
              {mission.deliverables.length > 0 && (
                <button
                  onClick={() => setShowDocPicker(true)}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="Add deliverables"
                >
                  <Plus className="h-4 w-4 text-zinc-400" />
                </button>
              )}
            </div>
          </div>
          {mission.deliverables.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500 mb-4">No deliverables</p>
              <Button
                onClick={() => setShowDocPicker(true)}
                className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {mission.deliverables.map((d, i) => (
                <DeliverableCard
                  key={d.id}
                  deliverable={d}
                  isActive={d.id === mission.currentDeliverable}
                  onStart={() => startDeliverable(d.id)}
                  index={i + 1}
                  artifactPath={artifactPaths[d.id]}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Middle: Mission Control Panel */}
        <aside className="w-72 shrink-0 bg-zinc-50 border-r border-zinc-200 overflow-y-auto">
          {currentDeliverable ? (
            <div className="flex flex-col h-full">
              {/* Progress Overview */}
              <div className="p-4 border-b border-zinc-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Progress</span>
                  <span className="text-2xl font-bold text-zinc-900">{calculatedProgress}%</span>
                </div>
                <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${calculatedProgress}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {currentDeliverable.tasks.filter(t => t.status === "complete").length} of {currentDeliverable.tasks.length} steps
                </div>
              </div>


              {/* Task Checklist */}
              <div className="flex-1 p-4">
                <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Checklist</div>
                <div className="space-y-1">
                  {currentDeliverable.tasks.map((task, i) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                        task.status === "active"
                          ? "bg-[var(--brand)]/10 border border-[var(--brand)]/20"
                          : task.status === "complete"
                          ? "bg-emerald-50"
                          : "bg-zinc-100"
                      }`}
                    >
                      {task.status === "complete" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : task.status === "active" ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[var(--brand)] flex items-center justify-center shrink-0">
                          <div className="w-2 h-2 bg-[var(--brand)] rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <Circle className="h-4 w-4 text-zinc-400 shrink-0" />
                      )}
                      <span className={`text-sm truncate ${
                        task.status === "active"
                          ? "text-zinc-900 font-medium"
                          : task.status === "complete"
                          ? "text-emerald-700"
                          : "text-zinc-500"
                      }`}>
                        {task.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* QA Section - Always Visible */}
              <div className="p-4 border-t border-zinc-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">QA Review</div>
                  {validationScore !== undefined && (
                    <div className={`text-lg font-bold ${
                      validationScore >= 90 ? "text-emerald-600" :
                      validationScore >= 70 ? "text-amber-600" :
                      "text-red-600"
                    }`}>
                      {validationScore}/100
                    </div>
                  )}
                </div>

                {isValidating ? (
                  <div className="flex items-center gap-3 p-3 bg-zinc-100 rounded-lg">
                    <Loader2 className="h-5 w-5 text-[var(--brand)] animate-spin" />
                    <div>
                      <div className="text-sm text-zinc-900">Validating...</div>
                      <div className="text-xs text-zinc-500">Using {qaAgent === "gemini" ? "Gemini" : "Jarvis"}</div>
                    </div>
                  </div>
                ) : validationResults.length > 0 ? (
                  <div className="space-y-2">
                    {/* Quick stats */}
                    <div className="flex gap-2">
                      <div className="flex-1 p-2 bg-emerald-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-emerald-600">
                          {validationResults.filter(r => r.status === "pass").length}
                        </div>
                        <div className="text-xs text-zinc-500">Pass</div>
                      </div>
                      <div className="flex-1 p-2 bg-amber-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-amber-600">
                          {validationResults.filter(r => r.status === "warn").length}
                        </div>
                        <div className="text-xs text-zinc-500">Warn</div>
                      </div>
                      <div className="flex-1 p-2 bg-red-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-red-600">
                          {validationResults.filter(r => r.status === "fail").length}
                        </div>
                        <div className="text-xs text-zinc-500">Fail</div>
                      </div>
                    </div>
                    {validationSummary && (
                      <p className="text-xs text-zinc-500 italic">{validationSummary}</p>
                    )}
                    <Button
                      onClick={acceptAndContinue}
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={validationResults.some(r => r.status === "fail")}
                    >
                      Accept & Continue
                    </Button>
                  </div>
                ) : calculatedProgress >= 100 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">Document ready for review</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => runQAValidation("gemini")}
                        size="sm"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        Gemini QA
                      </Button>
                      <Button
                        onClick={() => runQAValidation("jarvis")}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                      >
                        Jarvis QA
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-50 rounded-lg border border-dashed border-zinc-300">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <div className="w-6 h-6 rounded-full border-2 border-zinc-300 flex items-center justify-center">
                        <span className="text-xs">?</span>
                      </div>
                      <div>
                        <div className="text-sm text-zinc-600">Pending</div>
                        <div className="text-xs">Complete workflow first</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-zinc-500">Select a deliverable</p>
            </div>
          )}
        </aside>

        {/* Right: Chat Area */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-white">
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

// Deliverable Card Component
function DeliverableCard({
  deliverable,
  isActive,
  onStart,
  index,
  artifactPath,
}: {
  deliverable: Deliverable
  isActive: boolean
  onStart: () => void
  index: number
  artifactPath?: string
}) {
  const [downloading, setDownloading] = React.useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!artifactPath) return

    setDownloading(true)
    try {
      const response = await fetch(`/api/artifacts?path=${encodeURIComponent(artifactPath)}`)
      if (response.ok) {
        const data = await response.json()
        // Create download
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

  return (
    <div
      className={`relative p-3 rounded-lg transition-all cursor-pointer ${
        isActive
          ? "bg-[var(--brand)]/10 border-2 border-[var(--brand)]"
          : deliverable.status === "validated"
          ? "bg-emerald-50 border border-emerald-200"
          : deliverable.status === "complete"
          ? "bg-blue-50 border border-blue-200"
          : "bg-white border border-zinc-200 hover:border-zinc-300"
      }`}
      onClick={() => deliverable.status === "queued" && onStart()}
    >
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
          isActive
            ? "bg-[var(--brand)] text-white"
            : deliverable.status === "validated"
            ? "bg-emerald-500 text-white"
            : "bg-zinc-200 text-zinc-600"
        }`}>
          {deliverable.status === "validated" ? "✓" : index}
        </div>
        <div className={`flex-1 text-sm font-medium truncate ${
          isActive ? "text-zinc-900" : "text-zinc-700"
        }`}>
          {deliverable.name}
        </div>
        {artifactPath && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition-colors"
            title="Download"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {deliverable.status === "queued" && !isActive && (
        <div className="mt-2 pt-2 border-t border-zinc-100">
          <span className="text-xs text-zinc-400">Click to start →</span>
        </div>
      )}
    </div>
  )
}

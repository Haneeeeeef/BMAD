"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { safeGetItem, safeSetItem, safeRemoveItem, authHeaders } from "@/lib/safe-storage"
import { Message, Attachment, generateId } from "@/lib/types"
import { parseSSEStream } from "@/lib/sse"
import { fileToAttachment } from "@/lib/attachments"
import type { ChatAttachment } from "@/components/chat-input"
import {
  type Project,
  getWorkflowById,
  buildWorkflowSystemMessage,
  buildWorkflowUserMessage,
  type ProjectContextFiles,
  BMAD_AGENTS,
} from "@/lib/bmad-types"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

type UseWorkspaceChatOptions = {
  project: Project
  onResponseComplete?: (content: string) => void
}

export function useWorkspaceChat({ project, onResponseComplete }: UseWorkspaceChatOptions) {
  const currentDeliverable = project.deliverables.find(d => d.id === project.currentDeliverable)
  const currentWorkflow = currentDeliverable ? getWorkflowById(currentDeliverable.workflowId) : null

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
  const workflowStarted = useRef(messages.length > 0)
  const needsReorientation = useRef(false)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Persist messages (strip base64 attachment data to avoid blowing localStorage quota)
  useEffect(() => {
    if (project.currentDeliverable) {
      const key = `project-chat-${project.id}-${project.currentDeliverable}`
      if (messages.length === 0) {
        safeRemoveItem(key)
      } else {
        const lightweight = messages.map(m => ({
          ...m,
          attachments: m.attachments?.map(a => ({ ...a, data: undefined })),
        }))
        safeSetItem(key, JSON.stringify(lightweight))
      }
    }
  }, [messages, project.id, project.currentDeliverable])

  // Start workflow when deliverable becomes active
  useEffect(() => {
    if (currentDeliverable && currentWorkflow && !workflowStarted.current && messages.length === 0) {
      workflowStarted.current = true

      const projectSlug = slugify(project.name)
      fetch(`/api/project-context?project=${encodeURIComponent(projectSlug)}`, {
        headers: authHeaders(),
      })
        .then(res => res.ok ? res.json() as Promise<ProjectContextFiles> : null)
        .catch(() => null)
        .then((contextFiles) => {
          const systemMsg = buildWorkflowSystemMessage(currentWorkflow!, project, contextFiles ?? undefined)
          const userMsg = buildWorkflowUserMessage(currentWorkflow!)
          sendMessage(userMsg, true, systemMsg)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeliverable, currentWorkflow, messages.length])

  const sendMessage = useCallback(async (content: string, isInitial = false, systemMessage?: string, attachments?: Attachment[], agentIdOverride?: string) => {
    const userMsg: Message = { id: generateId(), role: "user", content, attachments, createdAt: Date.now() }

    if (!isInitial) {
      setMessages(prev => [...prev, userMsg])
    }
    setIsLoading(true)

    try {
      const activeWorkflow = currentDeliverable ? getWorkflowById(currentDeliverable.workflowId) : null
      const projectSlug = slugify(project.name)
      const vpsBase = "/home/haneef/workspaces/jarvis/projects"

      const contextParts = systemMessage
        ? [systemMessage]
        : [
            `[Mission Control] Project: ${project.name}`,
            `Project workspace: ${vpsBase}/${projectSlug}`,
            currentDeliverable ? `Current deliverable: ${currentDeliverable.name}` : null,
          ].filter(Boolean) as string[]

      // Re-orientation after session rotation
      if (needsReorientation.current && activeWorkflow) {
        needsReorientation.current = false
        try {
          const transcriptRes = await fetch(
            `/api/artifacts?project=${encodeURIComponent(projectSlug)}&path=${encodeURIComponent(`WORKFLOW-TRANSCRIPT-FULL-${activeWorkflow.id}.md`)}`,
            { headers: authHeaders() },
          )
          if (transcriptRes.ok) {
            const data = await transcriptRes.json()
            if (data.content) {
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
        } catch { /* silent */ }
      }

      const projectContext = contextParts.join("\n")

      const payload: Record<string, unknown> = {
        messages: [{ role: "user", content, attachments }],
        sessionId: currentDeliverable?.sessionId || project.sessionId,
        agentId: agentIdOverride || activeWorkflow?.agent || "jarvis",
        systemMessage: projectContext,
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errBody = await response.text().catch(() => "")
        console.error(`[workspace-chat] API ${response.status}: ${errBody}`)
        throw new Error(`Failed (${response.status})`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      let assistantContent = ""
      let assistantReasoning = ""
      const assistantMsgId = generateId()
      const respondingAgentId = agentIdOverride || activeWorkflow?.agent || "jarvis"
      const agentMeta = respondingAgentId !== "jarvis" ? BMAD_AGENTS[respondingAgentId as keyof typeof BMAD_AGENTS] : null
      const respondingAgentName = respondingAgentId === "jarvis" ? "Jarvis" : (agentMeta?.name || activeWorkflow?.agentName || respondingAgentId)

      // --- Smooth streaming: buffer in refs, flush via RAF ---
      let rafId: number | null = null
      let needsFlush = false
      let messageAdded = false

      const flushToState = () => {
        rafId = null
        if (!needsFlush) return
        needsFlush = false

        setMessages(prev => {
          if (messageAdded) {
            // Update only the last message (the streaming one)
            const last = prev[prev.length - 1]
            if (last?.id === assistantMsgId) {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...last,
                content: assistantContent,
                reasoning: assistantReasoning || undefined,
              }
              return updated
            }
            return prev.map(m => m.id === assistantMsgId
              ? { ...m, content: assistantContent, reasoning: assistantReasoning || undefined }
              : m
            )
          }
          // First flush — add the message
          messageAdded = true
          return [...prev, {
            id: assistantMsgId,
            role: "assistant" as const,
            content: assistantContent,
            reasoning: assistantReasoning || undefined,
            agentId: respondingAgentId,
            agentName: respondingAgentName,
            createdAt: Date.now(),
          }]
        })
      }

      const scheduleFlush = () => {
        needsFlush = true
        if (!rafId) {
          rafId = requestAnimationFrame(flushToState)
        }
      }

      await parseSSEStream(reader, {
        onReasoning: (_chunk, full) => {
          assistantReasoning = full
          scheduleFlush()
        },
        onContent: (_chunk, full) => {
          assistantContent = full
          scheduleFlush()
        },
      })

      // Final flush — ensure all content is committed to state
      if (rafId) cancelAnimationFrame(rafId)
      needsFlush = true
      flushToState()

      // Notify parent of completed response for workflow progress detection
      onResponseComplete?.(assistantContent)

      // Return the response content for callers that need it
      const responseResult = { content: assistantContent, agentId: respondingAgentId, agentName: respondingAgentName }

      // Append turn to transcript (fire-and-forget)
      if (activeWorkflow && assistantContent && !isInitial) {
        fetch("/api/session/transcript", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            projectName: project.name,
            workflowId: activeWorkflow.id,
            userMessage: content,
            assistantMessage: assistantContent,
            agentName: respondingAgentName,
            agentId: respondingAgentId,
          }),
        }).catch(() => {})
      }

      return responseResult

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
  }, [project, currentDeliverable, onResponseComplete])

  // Handle submit with file attachments
  const handleSubmit = useCallback(async (chatAttachments?: ChatAttachment[]) => {
    const text = inputValue.trim()
    if (!text && !chatAttachments?.length) return
    if (isLoading) return

    const imageFiles = chatAttachments?.filter(a => a.file.type.startsWith("image/")) || []
    const docFiles = chatAttachments?.filter(a => !a.file.type.startsWith("image/")) || []

    let content = text
    if (docFiles.length > 0) {
      const fileContextParts = docFiles
        .filter(a => a.status === "done" && a.extracted)
        .map(a => `--- Attached file: ${a.name} ---\n${a.extracted!.content}\n--- End: ${a.name} ---`)

      if (fileContextParts.length > 0) {
        content = content
          ? `${fileContextParts.join("\n\n")}\n\n${content}`
          : fileContextParts.join("\n\n")
      }
    }

    let visionAttachments: Attachment[] | undefined
    if (imageFiles.length > 0) {
      visionAttachments = await Promise.all(imageFiles.map(a => fileToAttachment(a.file)))
    }

    // Push docs to VPS sources (fire-and-forget)
    docFiles
      .filter(a => a.status === "done" && a.extracted)
      .forEach(a => {
        fetch("/api/context/generate", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            projectSlug: project.name.toLowerCase().replace(/\s+/g, "-"),
            files: [{ filename: a.name, content: a.extracted!.content, type: a.extracted!.type }],
          }),
        }).catch(() => {})
      })

    sendMessage(content, false, undefined, visionAttachments)
    setInputValue("")
  }, [inputValue, isLoading, sendMessage, project.name])

  // Switch deliverable: load stored messages
  const switchDeliverable = useCallback((deliverableId: string) => {
    const stored = safeGetItem(`project-chat-${project.id}-${deliverableId}`)
    let existingMessages: Message[] = []
    if (stored) {
      try { existingMessages = JSON.parse(stored) } catch { existingMessages = [] }
    }
    workflowStarted.current = existingMessages.length > 0
    setMessages(existingMessages)
  }, [project.id])

  // Clear messages after session rotation
  const resetForNewSession = useCallback(() => {
    needsReorientation.current = true
  }, [])


  const lastMessage = messages[messages.length - 1]
  const isStreaming = isLoading && lastMessage?.role === "assistant"

  return {
    messages,
    isLoading,
    isStreaming,
    inputValue,
    setInputValue,
    handleSubmit,
    sendMessage,
    switchDeliverable,
    resetForNewSession,
    messagesEndRef,
  }
}

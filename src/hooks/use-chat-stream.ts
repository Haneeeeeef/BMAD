"use client"

import { useEffect, useRef, useState, useCallback, startTransition, type Dispatch, type SetStateAction } from "react"
import { Message, Attachment, ChatSession, generateId } from "@/lib/types"
import { authHeaders } from "@/lib/safe-storage"
import { parseSSEStream } from "@/lib/sse"
import { cleanStreamingXml, extractArtifacts, type ExtractedArtifact } from "@/lib/artifact-parser"
import { getSessionContext } from "@/lib/canvas-storage"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseChatStreamOptions {
  sessionId: string
  session: ChatSession | null
  updateSession: (id: string, updates: Partial<Pick<ChatSession, "title" | "messages">>) => void
  userToken?: string
  onArtifactsFound?: (artifacts: ExtractedArtifact[]) => void
}

export interface UseChatStreamReturn {
  messages: Message[]
  setMessages: Dispatch<SetStateAction<Message[]>>
  isLoading: boolean
  streamingMessageId: string | null
  shouldAutoScroll: boolean
  setShouldAutoScroll: Dispatch<SetStateAction<boolean>>
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatStream({
  sessionId,
  session,
  updateSession,
  userToken,
  onArtifactsFound,
}: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [hasTriggeredInitial, setHasTriggeredInitial] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)

  const abortControllerRef = useRef<AbortController | null>(null)

  // Keep a ref to the latest onArtifactsFound callback so the streaming helper
  // never captures a stale closure.
  const onArtifactsFoundRef = useRef(onArtifactsFound)
  onArtifactsFoundRef.current = onArtifactsFound

  // -------------------------------------------------------------------
  // Abort in-flight request on unmount
  // -------------------------------------------------------------------
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // -------------------------------------------------------------------
  // Load messages from session
  // -------------------------------------------------------------------
  useEffect(() => {
    if (session) {
      setMessages(session.messages)
    }
  }, [session])

  // -------------------------------------------------------------------
  // Private streaming helper (shared by getAIResponse & sendMessage)
  //
  // Sends the provided `apiMessages` to /api/chat, streams the response,
  // extracts artifacts, saves to session, and optionally generates a title.
  //
  // `assistantMessageId` – the id of the placeholder assistant message
  //                        that has already been appended to state.
  // `allMessagesForSave` – the full messages array (including user msg if
  //                        applicable, excluding the placeholder assistant)
  //                        used when persisting the final result to session.
  // `isFirstExchange`    – when true, triggers title generation.
  // `firstUserContent`   – the user's first message text (for title gen).
  // -------------------------------------------------------------------
  const streamResponse = useCallback(
    async (opts: {
      apiMessages: { role: string; content: string; attachments?: Attachment[] }[]
      assistantMessageId: string
      allMessagesForSave: Message[]
      isFirstExchange: boolean
      firstUserContent?: string
    }) => {
      const {
        apiMessages,
        assistantMessageId,
        allMessagesForSave,
        isFirstExchange,
        firstUserContent,
      } = opts

      try {
        abortControllerRef.current = new AbortController()

        // Get session context (canvas + agent completions) to inject into Jarvis
        const canvasUrl = `${window.location.origin}/api/canvas`
        const sessionContext = getSessionContext(sessionId, canvasUrl)

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            messages: apiMessages,
            sessionId,
            canvasStatus: sessionContext,
            userToken,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to get response")
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response body")

        // --- Optimized streaming with rAF + isolated state ---
        let fullContent = ""
        const rAFRef = { id: 0 }

        // Separate state for streaming content — avoids .map() over all messages
        const flushToState = () => {
          const displayContent = cleanStreamingXml(fullContent)
          startTransition(() => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: displayContent }
                  : m
              )
            )
          })
        }

        // rAF loop — syncs updates with browser paint cycle
        let needsFlush = false
        const scheduleFlush = () => {
          needsFlush = true
          if (!rAFRef.id) {
            const loop = () => {
              if (needsFlush) {
                needsFlush = false
                flushToState()
                rAFRef.id = requestAnimationFrame(loop)
              } else {
                rAFRef.id = 0
              }
            }
            rAFRef.id = requestAnimationFrame(loop)
          }
        }

        await parseSSEStream(reader, {
          onContent: (_chunk, full) => {
            fullContent = full
            scheduleFlush()
          },
        })

        // Cancel any pending rAF and do a final flush
        if (rAFRef.id) cancelAnimationFrame(rAFRef.id)
        flushToState()

        // Check for canvas content in response (XML artifact tags)
        const { artifacts, cleanedContent } = extractArtifacts(fullContent)
        if (artifacts.length > 0) {
          // Notify the consumer about discovered artifacts
          onArtifactsFoundRef.current?.(artifacts)

          // Use cleaned content (artifact tags stripped) for persistence
          fullContent = cleanedContent
        }

        // Save final messages to session (with artifact tags stripped)
        const finalMessages = [
          ...allMessagesForSave,
          { id: assistantMessageId, role: "assistant" as const, content: fullContent, createdAt: Date.now() },
        ]
        updateSession(sessionId, { messages: finalMessages })

        // Generate title after first exchange
        if (isFirstExchange && firstUserContent) {
          fetchAITitle(firstUserContent, fullContent)
        }

        // Refresh context indicator
        window.dispatchEvent(new CustomEvent("chat-message-sent"))
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return
        // Remove the placeholder assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId))
      } finally {
        setIsLoading(false)
        setStreamingMessageId(null)
        abortControllerRef.current = null
      }
    },
    [sessionId, updateSession, userToken]
  )

  // -------------------------------------------------------------------
  // Title generation helper
  // -------------------------------------------------------------------
  const fetchAITitle = async (userMessage: string, assistantMessage: string) => {
    try {
      const response = await fetch("/api/generate-title", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ userMessage, assistantMessage }),
      })
      if (response.ok) {
        const { title } = await response.json()
        if (title) {
          updateSession(sessionId, { title })
        }
      }
    } catch {
      // Silently fail - keep default title
    }
  }

  // -------------------------------------------------------------------
  // getAIResponse – used for auto-trigger (initial load, last msg is user)
  // -------------------------------------------------------------------
  const getAIResponse = useCallback(
    async (currentMessages: Message[]) => {
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(true)
      setStreamingMessageId(assistantMessage.id)

      // Allow React to render typing dots before starting fetch
      await new Promise((resolve) => setTimeout(resolve, 0))

      await streamResponse({
        apiMessages: currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        assistantMessageId: assistantMessage.id,
        allMessagesForSave: currentMessages,
        isFirstExchange:
          currentMessages.length === 1 && currentMessages[0].role === "user",
        firstUserContent: currentMessages[0]?.content,
      })
    },
    [streamResponse]
  )

  // -------------------------------------------------------------------
  // Auto-trigger AI response if last message is from user (initial load)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (
      !hasTriggeredInitial &&
      messages.length > 0 &&
      messages[messages.length - 1].role === "user" &&
      !isLoading
    ) {
      setHasTriggeredInitial(true)
      getAIResponse(messages)
    }
  }, [messages, hasTriggeredInitial, isLoading, getAIResponse])

  // -------------------------------------------------------------------
  // sendMessage – user sends a new message
  // -------------------------------------------------------------------
  const sendMessage = useCallback(
    async (content: string, attachments?: Attachment[]) => {
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content,
        attachments,
        createdAt: Date.now(),
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      }

      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      setIsLoading(true)
      setStreamingMessageId(assistantMessage.id)
      setShouldAutoScroll(true) // Reset auto-scroll when sending

      // Allow React to render typing dots before starting fetch
      await new Promise((resolve) => setTimeout(resolve, 0))

      await streamResponse({
        apiMessages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        })),
        assistantMessageId: assistantMessage.id,
        allMessagesForSave: [...messages, userMessage],
        isFirstExchange: messages.length === 0,
        firstUserContent: userMessage.content,
      })
    },
    [messages, streamResponse]
  )

  return {
    messages,
    setMessages,
    isLoading,
    streamingMessageId,
    shouldAutoScroll,
    setShouldAutoScroll,
    sendMessage,
  }
}

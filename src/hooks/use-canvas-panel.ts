"use client"

import { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react"
import type { useRouter } from "next/navigation"
import {
  type CanvasData,
  loadCanvas,
  saveDocument,
  setActiveDocument,
  removeDocument,
  setDocumentVersion,
} from "@/lib/canvas-storage"
import { authHeaders } from "@/lib/safe-storage"
import { useApproval } from "@/hooks"

export interface UseCanvasPanelOptions {
  sessionId: string
  router: ReturnType<typeof useRouter>
}

export interface UseCanvasPanelReturn {
  showCanvas: boolean
  canvasData: CanvasData | null
  setCanvasData: Dispatch<SetStateAction<CanvasData | null>>
  activeDocumentId: string | undefined
  setActiveDocumentId: Dispatch<SetStateAction<string | undefined>>
  setShowCanvas: Dispatch<SetStateAction<boolean>>
  canvasWidth: number
  handleDocumentSelect: (identifier: string) => void
  handleDocumentClose: (identifier: string) => void
  handleVersionChange: (identifier: string, version: number) => void
  handleCanvasClose: () => void
  handleCanvasOpen: () => void
  handleCanvasApprove: (identifier: string) => void
  handleResizeStart: (e: React.MouseEvent) => void
}

export function useCanvasPanel({ sessionId, router }: UseCanvasPanelOptions): UseCanvasPanelReturn {
  // Canvas state (multi-document)
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null)
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>()
  const [canvasWidth, setCanvasWidth] = useState(520) // Default 520px
  const isResizing = useRef(false)

  // Load canvas from DB on mount (but don't auto-open)
  useEffect(() => {
    if (sessionId) {
      (async () => {
        const savedCanvas = await loadCanvas(sessionId)
        if (savedCanvas && savedCanvas.documents.length > 0) {
          setCanvasData(savedCanvas)
          setActiveDocumentId(savedCanvas.activeDocumentId || savedCanvas.documents[0]?.identifier)
        }
      })()
    }
  }, [sessionId])

  // Poll for canvas updates from API (Jarvis POSTs here) - simplified for multi-doc
  const lastPollContent = useRef<string>("")

  useEffect(() => {
    if (!sessionId) return

    const pollCanvas = async () => {
      try {
        const res = await fetch(`/api/canvas?sessionId=${sessionId}`, {
          headers: authHeaders(),
        })
        const data = await res.json()

        if (data.exists && data.content) {
          // Skip if content is identical to last poll
          const pollKey = `${data.identifier || "api-document"}:${data.content}`
          if (pollKey === lastPollContent.current) return
          lastPollContent.current = pollKey

          // Save as document (only creates new version if content changed)
          const updated = await saveDocument(sessionId, {
            identifier: data.identifier || "api-document",
            title: data.title || "Document",
            type: data.type || "text/markdown",
            content: data.content,
            status: data.status || "draft",
          })
          setCanvasData(updated)
          setActiveDocumentId(data.identifier || "api-document")
          setShowCanvas(true)
        }
      } catch {
        // Polling failed, ignore
      }
    }

    // Poll every 2 seconds (skip when tab is hidden)
    const interval = setInterval(() => {
      if (!document.hidden) pollCanvas()
    }, 2000)

    // Initial poll
    pollCanvas()

    return () => clearInterval(interval)
  }, [sessionId])

  // Use reusable approval hook
  const { approve } = useApproval({
    sessionId,
    onUpdate: setCanvasData,
  })

  // Handle approval with redirect to project
  const handleCanvasApprove = useCallback(async (identifier: string) => {
    const result = await approve(identifier)
    if (result.project) {
      // Redirect to project page with autoChat to continue conversation
      const url = `/projects/${result.project.id}?autoChat=true&docTitle=${encodeURIComponent(result.documentTitle || '')}`
      router.push(url)
    }
  }, [approve, router])

  const handleDocumentSelect = useCallback(async (identifier: string) => {
    setActiveDocumentId(identifier)
    await setActiveDocument(sessionId, identifier)
  }, [sessionId])

  const handleDocumentClose = useCallback(async (identifier: string) => {
    // Delete the document and all its versions
    const updated = await removeDocument(sessionId, identifier)
    if (updated) {
      setCanvasData(updated)
      setActiveDocumentId(updated.activeDocumentId)
      if (updated.documents.length === 0) {
        setShowCanvas(false)
      }
    }
  }, [sessionId])

  const handleVersionChange = useCallback(async (identifier: string, version: number) => {
    const updated = await setDocumentVersion(sessionId, identifier, version)
    if (updated) {
      setCanvasData(updated)
    }
  }, [sessionId])

  const handleCanvasClose = useCallback(() => {
    setShowCanvas(false)
  }, [])

  const handleCanvasOpen = useCallback(() => {
    setShowCanvas(true)
  }, [])

  // Canvas resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - e.clientX
      // Clamp between 320px and 60% of viewport
      const clampedWidth = Math.max(320, Math.min(newWidth, window.innerWidth * 0.6))
      setCanvasWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return {
    showCanvas,
    canvasData,
    setCanvasData,
    activeDocumentId,
    setActiveDocumentId,
    setShowCanvas,
    canvasWidth,
    handleDocumentSelect,
    handleDocumentClose,
    handleVersionChange,
    handleCanvasClose,
    handleCanvasOpen,
    handleCanvasApprove,
    handleResizeStart,
  }
}

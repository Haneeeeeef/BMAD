"use client"

import React, { useState, useEffect, useCallback } from "react"
import { X, FileText, Brain, RefreshCw, Loader2, ScrollText, ChevronLeft } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ContextViewerProps {
  projectName: string
  isOpen: boolean
  onClose: () => void
}

type TabType = "project-context" | "memory" | "memory-learnings" | "workflow-transcript"

interface TranscriptInfo {
  filename: string
  workflowId: string
  path: string
  preview: string
  size: number
}

export function ContextViewer({ projectName, isOpen, onClose }: ContextViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("project-context")
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptInfo[]>([])
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null)

  const fetchContent = useCallback(async (type: TabType, workflowId?: string) => {
    setLoading(true)
    setError(null)

    try {
      let url = `/api/context?type=${type}&project=${encodeURIComponent(projectName)}`
      if (workflowId) {
        url += `&workflow=${encodeURIComponent(workflowId)}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (type === "workflow-transcript" && !workflowId) {
        // List mode
        setTranscripts(data.transcripts || [])
        setContent(null)
        setLastFetched(data.fetchedAt)
        if (data.transcripts?.length === 0) {
          setError("No workflow transcripts yet")
        }
      } else if (data.exists && data.content) {
        setContent(data.content)
        setLastFetched(data.fetchedAt)
      } else {
        setContent(null)
        setError(data.message || "File not found")
      }
    } catch (err) {
      setError("Failed to fetch content")
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [projectName])

  useEffect(() => {
    if (isOpen) {
      setSelectedTranscript(null)
      fetchContent(activeTab)
    }
  }, [isOpen, activeTab, fetchContent])

  if (!isOpen) return null

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "project-context", label: "Project Context", icon: <FileText className="h-4 w-4" /> },
    { id: "workflow-transcript", label: "Transcript", icon: <ScrollText className="h-4 w-4" /> },
    { id: "memory", label: "Today's Memory", icon: <Brain className="h-4 w-4" /> },
    { id: "memory-learnings", label: "Learnings", icon: <Brain className="h-4 w-4" /> },
  ]

  const handleTranscriptSelect = (workflowId: string) => {
    setSelectedTranscript(workflowId)
    fetchContent("workflow-transcript", workflowId)
  }

  const handleBackToList = () => {
    setSelectedTranscript(null)
    setContent(null)
    fetchContent("workflow-transcript")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <h2 className="font-semibold text-zinc-900">Agent Memory & Context</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-purple-600 border-b-2 border-purple-600 -mb-px"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => fetchContent(activeTab)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <FileText className="h-12 w-12 mb-3 text-zinc-300" />
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1 text-zinc-400">
                {activeTab === "project-context"
                  ? "PROJECT-CONTEXT.md will be created on first flush"
                  : activeTab === "memory"
                  ? "No memory entries for today yet"
                  : activeTab === "workflow-transcript"
                  ? "Transcripts are created when you start a workflow"
                  : "No learnings recorded yet"}
              </p>
            </div>
          ) : activeTab === "workflow-transcript" && !selectedTranscript && transcripts.length > 0 ? (
            // Transcript list view
            <div className="space-y-3">
              <p className="text-sm text-zinc-500 mb-4">
                {transcripts.length} workflow transcript{transcripts.length !== 1 ? "s" : ""} found
              </p>
              {transcripts.map((t) => (
                <button
                  key={t.workflowId}
                  onClick={() => handleTranscriptSelect(t.workflowId)}
                  className="w-full text-left p-4 rounded-lg border border-zinc-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ScrollText className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-zinc-900">{t.workflowId}</span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2">{t.preview.slice(0, 150)}...</p>
                  <p className="text-xs text-zinc-400 mt-1">{(t.size / 1024).toFixed(1)} KB</p>
                </button>
              ))}
            </div>
          ) : content ? (
            <div>
              {selectedTranscript && (
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 mb-3"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to list
                </button>
              )}
              <div className="prose prose-sm max-w-none prose-zinc">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-400">
              No content available
            </div>
          )}
        </div>

        {/* Footer */}
        {lastFetched && (
          <div className="px-4 py-2 border-t border-zinc-100 text-xs text-zinc-400">
            Last fetched: {new Date(lastFetched).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}

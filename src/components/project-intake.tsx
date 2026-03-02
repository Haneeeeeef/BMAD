"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Info, Sparkles, Loader2 } from "lucide-react"
import { authHeaders } from "@/lib/safe-storage"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { OnboardingHeader } from "@/components/ui/onboarding-header"
import { FileUploadZone } from "@/components/file-upload-zone"
import type { ExtractedFile } from "@/lib/file-extraction"

interface ProjectIntakeProps {
  onComplete: (data: { title: string; description: string; files: ExtractedFile[] }) => void
  onBack: () => void
  initialData?: { title?: string; description: string; files: ExtractedFile[] }
  onDescriptionChange?: (description: string) => void
  onTitleChange?: (title: string) => void
}

export function ProjectIntake({ onComplete, onBack, initialData, onDescriptionChange, onTitleChange }: ProjectIntakeProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [files, setFiles] = useState<ExtractedFile[]>(initialData?.files || [])
  const [showUpload, setShowUpload] = useState((initialData?.files?.length || 0) > 0)
  const [isReformatting, setIsReformatting] = useState(false)

  const handleReformat = useCallback(async () => {
    if (isReformatting || description.trim().length < 5) return
    setIsReformatting(true)
    try {
      const res = await fetch("/api/reformat-description", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ description: description.trim(), title: title.trim() || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.description) {
          setDescription(data.description)
          onDescriptionChange?.(data.description)
        }
      }
    } catch { /* silent */ }
    finally { setIsReformatting(false) }
  }, [description, title, isReformatting, onDescriptionChange])

  const handleFilesReady = useCallback((extracted: ExtractedFile[]) => {
    setFiles(extracted)
  }, [])

  const isValid = description.trim().length > 10

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) {
      onComplete({ title: title.trim(), description: description.trim(), files })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm sm:max-w-lg mx-auto"
      >
        <OnboardingHeader
          title="Describe your workspace"
          subtitle="What are you building? Add any relevant files for context."
          className="mb-5 sm:mb-6"
          animated={false}
        />

        <div className="space-y-6">
          {/* Title */}
          <div>
            <Input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                onTitleChange?.(e.target.value)
              }}
              placeholder="Workspace name"
              aria-label="Workspace name"
              autoFocus
              className="h-11 bg-white border-zinc-200 text-base shadow-none focus-visible:ring-0 focus-visible:border-zinc-300 placeholder:text-zinc-400"
            />
          </div>

          {/* Description */}
          <div className="relative">
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                onDescriptionChange?.(e.target.value)
              }}
              placeholder="Describe what you're building and who it's for..."
              aria-label="Workspace description"
              required
              aria-required="true"
              className="min-h-[120px] bg-white border-zinc-200 resize-none text-base shadow-none focus-visible:ring-0 focus-visible:border-zinc-300 placeholder:text-zinc-400 pr-10"
            />
            {description.trim().length >= 5 && (
              <button
                type="button"
                onClick={handleReformat}
                disabled={isReformatting}
                title="Reformat with AI"
                className="absolute bottom-2.5 right-2.5 p-1 rounded-md text-zinc-400 hover:text-[var(--brand)] hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                {isReformatting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          {/* Upload Section */}
          {!showUpload ? (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              title="Supported: PDF, Word, Excel, Images, Markdown, Text (max 10MB)"
              className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-lg text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-600 transition-colors flex items-center justify-center gap-2"
            >
              <span>+ Add source files</span>
              <Info className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">Source files</span>
                  <span title="Supported: PDF, Word, Excel, Images, Markdown, Text (max 10MB)">
                    <Info className="h-3.5 w-3.5 text-zinc-400 cursor-help" />
                  </span>
                </div>
                {files.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <FileUploadZone
                onFilesReady={handleFilesReady}
                showContinueButton={false}
              />
              {files.length > 0 && (
                <p className="text-xs text-zinc-400">
                  {files.length} file{files.length !== 1 ? "s" : ""} ready
                </p>
              )}
            </div>
          )}
        </div>

        {/* Inline Continue button */}
        <div className="flex justify-center mt-8">
          <button
            type="submit"
            disabled={!isValid}
            className="h-11 px-16 rounded-[10px] text-sm font-medium bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </motion.div>
    </form>
  )
}

"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, File, X, FileText, Image, Table, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  validateFile,
  getFileType,
  type ExtractedFile,
} from "@/lib/file-extraction"
import { authHeaders } from "@/lib/safe-storage"

interface UploadedFile {
  file: File
  status: "pending" | "extracting" | "done" | "error"
  extracted?: ExtractedFile
  error?: string
}

interface FileUploadZoneProps {
  onFilesReady: (files: ExtractedFile[]) => void
  className?: string
  showContinueButton?: boolean
}

const FileIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "pdf":
    case "docx":
    case "text":
    case "markdown":
      return <FileText className="h-4 w-4" />
    case "image":
      return <Image className="h-4 w-4" />
    case "xlsx":
      return <Table className="h-4 w-4" />
    default:
      return <File className="h-4 w-4" />
  }
}

export function FileUploadZone({ onFilesReady, className, showContinueButton = true }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const extractFile = async (uploadedFile: UploadedFile): Promise<UploadedFile> => {
    try {
      const formData = new FormData()
      formData.append("file", uploadedFile.file)

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Extraction failed")
      }

      const extracted = await response.json()
      return { ...uploadedFile, status: "done", extracted }
    } catch {
      return { ...uploadedFile, status: "error", error: "Failed to extract" }
    }
  }

  const processFiles = useCallback(async (newFiles: File[]) => {
    const validated = newFiles
      .map((file) => {
        const validation = validateFile(file)
        if (!validation.valid) {
          return { file, status: "error" as const, error: validation.error }
        }
        return { file, status: "pending" as const }
      })

    setFiles((prev) => [...prev, ...validated])

    // Extract each file
    for (let i = 0; i < validated.length; i++) {
      const item = validated[i]
      if (item.status === "error") continue

      setFiles((prev) =>
        prev.map((f) =>
          f.file === item.file ? { ...f, status: "extracting" } : f
        )
      )

      const result = await extractFile(item)

      setFiles((prev) =>
        prev.map((f) => (f.file === item.file ? result : f))
      )
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      processFiles(droppedFiles)
    },
    [processFiles]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || [])
      processFiles(selectedFiles)
      e.target.value = "" // Reset input
    },
    [processFiles]
  )

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file))
  }

  // Notify parent when files are ready (for embedded mode without continue button)
  useEffect(() => {
    if (!showContinueButton) {
      const extracted = files
        .filter((f) => f.status === "done" && f.extracted)
        .map((f) => f.extracted!)
      onFilesReady(extracted)
    }
  }, [files, showContinueButton, onFilesReady])

  const handleContinue = () => {
    const extracted = files
      .filter((f) => f.status === "done" && f.extracted)
      .map((f) => f.extracted!)
    onFilesReady(extracted)
  }

  const readyCount = files.filter((f) => f.status === "done").length
  const hasErrors = files.some((f) => f.status === "error")
  const isProcessing = files.some((f) => f.status === "extracting")

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-[var(--brand)] bg-[var(--brand)]/5"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
        )}
      >
        <input
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileInput}
          aria-label="Upload files"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <Upload
          className={cn(
            "h-8 w-8 mx-auto mb-3 transition-colors",
            isDragging ? "text-[var(--brand)]" : "text-zinc-400"
          )}
        />

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          PDF, Word, Excel, Images, Markdown (max 10MB)
        </p>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((item, index) => {
              const fileType = getFileType(item.file.name) || "text"
              return (
                <motion.div
                  key={`${item.file.name}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border",
                    item.status === "error"
                      ? "border-red-200 dark:border-red-900"
                      : "border-zinc-200 dark:border-zinc-800"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0",
                      item.status === "done"
                        ? "text-green-500"
                        : item.status === "error"
                        ? "text-red-500"
                        : "text-zinc-400"
                    )}
                  >
                    {item.status === "extracting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileIcon type={fileType} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {item.file.name}
                    </p>
                    {item.status === "error" && item.error && (
                      <p className="text-xs text-red-500">{item.error}</p>
                    )}
                    {item.status === "done" && item.extracted?.metadata.words && (
                      <p className="text-xs text-zinc-400">
                        {item.extracted.metadata.words.toLocaleString()} words
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => removeFile(item.file)}
                    className="shrink-0 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status / Continue */}
      {files.length > 0 && showContinueButton && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {isProcessing
              ? "Processing files..."
              : `${readyCount} file${readyCount !== 1 ? "s" : ""} ready`}
          </p>

          <button
            onClick={handleContinue}
            disabled={readyCount === 0 || isProcessing}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue with {readyCount} file{readyCount !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  )
}

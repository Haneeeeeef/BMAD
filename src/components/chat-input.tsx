"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Plus, Mic, ArrowUp, Square, Paperclip, FileText, Image, X, Upload, Music } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Attachment } from "@/lib/types"
import {
  fileToAttachment,
  isValidAttachment,
  getAttachmentPreview,
  formatAttachmentSize,
} from "@/lib/attachments"
import { ACCEPTED_FILE_TYPES, validateFile, type ExtractedFile } from "@/lib/file-extraction"
import { authHeaders } from "@/lib/safe-storage"
import { toast } from "sonner"

/* ── Workspace attachment type ──────────────────────────── */

export type ActiveToggles = Set<string>

export interface ChatAttachment {
  id: string
  file: File
  name: string
  status: "pending" | "extracting" | "done" | "error"
  extracted?: ExtractedFile
  error?: string
}

/* ── Props ──────────────────────────────────────────────── */

interface ChatInputBaseProps {
  placeholder?: string
  disabled?: boolean
  className?: string
}

interface DiscoveryProps extends ChatInputBaseProps {
  variant?: "discovery"
  onSend: (message: string, attachments?: Attachment[]) => void
  onAction?: (action: string) => void
  // Controlled props not used in discovery
  value?: never
  onChange?: never
  onSubmit?: never
  agentName?: never
}

interface WorkspaceProps extends ChatInputBaseProps {
  variant: "workspace"
  value: string
  onChange: (value: string) => void
  onSubmit: (attachments?: ChatAttachment[]) => void
  agentName?: string
  // Discovery props not used in workspace
  onSend?: never
  onAction?: never
}

type ChatInputProps = DiscoveryProps | WorkspaceProps

export interface ChatInputHandle {
  focus: () => void
}

/* ── Workspace helpers ──────────────────────────────────── */

let _attachId = 0
function nextAttachId() {
  return `attach-${++_attachId}-${Date.now()}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/* ── Component ──────────────────────────────────────────── */

export const ChatInput = React.forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(props, ref) {
    const {
      placeholder,
      disabled = false,
      className,
    } = props

    const isWorkspace = props.variant === "workspace"

    // ── Internal state (discovery mode) ──────────────────
    const [internalInput, setInternalInput] = React.useState("")
    const [discoveryAttachments, setDiscoveryAttachments] = React.useState<Attachment[]>([])
    const [error, setError] = React.useState<string | null>(null)

    // ── Workspace state ──────────────────────────────────
    const [wsAttachments, setWsAttachments] = React.useState<ChatAttachment[]>([])
    const [isDragOver, setIsDragOver] = React.useState(false)

    // ── Refs ─────────────────────────────────────────────
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const imageInputRef = React.useRef<HTMLInputElement>(null)
    const audioInputRef = React.useRef<HTMLInputElement>(null)

    // ── Resolved input value ────────────────────────────
    const inputValue = isWorkspace ? props.value : internalInput
    const setInputValue = isWorkspace
      ? props.onChange
      : setInternalInput

    // ── Memoized action handlers (discovery) ────────────
    const handleStop = React.useCallback(() => {
      if (!isWorkspace && props.onAction) {
        props.onAction("stop")
      }
    }, [isWorkspace, props])

    // ── Expose focus method to parent ───────────────────
    React.useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }))

    // ── Auto-focus on mount (discovery only) ────────────
    React.useEffect(() => {
      if (isWorkspace) return
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }, [isWorkspace])

    // ── Keep focus on textarea after response (discovery)
    React.useEffect(() => {
      if (isWorkspace) return
      if (!disabled) {
        textareaRef.current?.focus()
      }
    }, [disabled, isWorkspace])

    // ── Auto-grow textarea (workspace mode uses useEffect)
    React.useEffect(() => {
      if (!isWorkspace) return
      const el = textareaRef.current
      if (!el) return
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 128)}px`
    }, [isWorkspace, inputValue])

    // ── Workspace: Extract file content via /api/extract ─
    const extractFile = React.useCallback(async (attachment: ChatAttachment) => {
      setWsAttachments(prev =>
        prev.map(a => (a.id === attachment.id ? { ...a, status: "extracting" as const } : a)),
      )
      try {
        const formData = new FormData()
        formData.append("file", attachment.file)
        const resp = await fetch("/api/extract", { method: "POST", headers: authHeaders(), body: formData })
        if (!resp.ok) throw new Error("Extraction failed")
        const extracted: ExtractedFile = await resp.json()
        setWsAttachments(prev =>
          prev.map(a => (a.id === attachment.id ? { ...a, status: "done" as const, extracted } : a)),
        )
      } catch (err) {
        setWsAttachments(prev =>
          prev.map(a =>
            a.id === attachment.id
              ? { ...a, status: "error" as const, error: err instanceof Error ? err.message : "Failed" }
              : a,
          ),
        )
      }
    }, [])

    // ── Workspace: Add files (from picker or drop) ──────
    const addWorkspaceFiles = React.useCallback(
      (files: FileList | File[]) => {
        const newAttachments: ChatAttachment[] = []
        for (const file of Array.from(files)) {
          const validation = validateFile(file)
          if (!validation.valid) {
            toast.error(validation.error)
            continue
          }
          // Images skip extraction — they'll be sent as vision attachments
          const isImage = file.type.startsWith("image/")
          const attachment: ChatAttachment = {
            id: nextAttachId(),
            file,
            name: file.name,
            status: isImage ? "done" : "pending",
          }
          newAttachments.push(attachment)
        }
        setWsAttachments(prev => [...prev, ...newAttachments])
        // Only extract non-image files
        newAttachments.filter(a => a.status === "pending").forEach(a => extractFile(a))
      },
      [extractFile],
    )

    // ── Handle paste for images (both modes) ───────────
    const handlePaste = React.useCallback(async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const imageItems = Array.from(items).filter(item => item.type.startsWith("image/"))
      if (imageItems.length === 0) return

      e.preventDefault()

      if (isWorkspace) {
        const files: File[] = []
        for (const item of imageItems) {
          const file = item.getAsFile()
          if (file) files.push(file)
        }
        if (files.length > 0) addWorkspaceFiles(files)
      } else {
        setError(null)
        for (const item of imageItems) {
          const file = item.getAsFile()
          if (!file) continue

          const validation = isValidAttachment(file)
          if (!validation.valid) {
            setError(validation.error || "Invalid file")
            continue
          }

          try {
            const attachment = await fileToAttachment(file)
            setDiscoveryAttachments(prev => [...prev, attachment])
          } catch {
            setError("Failed to process pasted image")
          }
        }
      }
    }, [isWorkspace, addWorkspaceFiles])

    // ── Discovery: Handle file selection ────────────────
    const handleDiscoveryFileSelect = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      setError(null)

      for (const file of Array.from(files)) {
        const validation = isValidAttachment(file)
        if (!validation.valid) {
          setError(validation.error || "Invalid file")
          continue
        }

        try {
          const attachment = await fileToAttachment(file)
          setDiscoveryAttachments(prev => [...prev, attachment])
        } catch {
          setError("Failed to process file")
        }
      }

      e.target.value = ""
    }, [])

    // ── Workspace: Handle file selection ────────────────
    const handleWorkspaceFileSelect = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
          addWorkspaceFiles(e.target.files)
        }
        e.target.value = ""
      },
      [addWorkspaceFiles],
    )

    // ── Remove attachment ───────────────────────────────
    const removeDiscoveryAttachment = React.useCallback((id: string) => {
      setDiscoveryAttachments(prev => prev.filter(a => a.id !== id))
    }, [])

    const removeWsAttachment = React.useCallback((id: string) => {
      setWsAttachments(prev => prev.filter(a => a.id !== id))
    }, [])

    // ── Discovery: Open file pickers ────────────────────
    const openFilePicker = React.useCallback(() => fileInputRef.current?.click(), [])
    const openImagePicker = React.useCallback(() => imageInputRef.current?.click(), [])
    const openAudioPicker = React.useCallback(() => audioInputRef.current?.click(), [])

    // ── Submit ──────────────────────────────────────────
    const handleSubmit = React.useCallback(() => {
      if (disabled) return

      if (isWorkspace) {
        const hasContent = props.value.trim().length > 0
        const hasAttachments = wsAttachments.length > 0
        if (!hasContent && !hasAttachments) return

        const extracting = wsAttachments.some(a => a.status === "extracting")
        if (extracting) {
          toast.info("Please wait for files to finish processing...")
          return
        }

        props.onSubmit(wsAttachments.length > 0 ? wsAttachments : undefined)
        setWsAttachments([])
      } else {
        if (!internalInput.trim() && discoveryAttachments.length === 0) return
        props.onSend(internalInput.trim(), discoveryAttachments.length > 0 ? discoveryAttachments : undefined)
        setInternalInput("")
        setDiscoveryAttachments([])
        setError(null)
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
        }
      }
    }, [disabled, isWorkspace, props, internalInput, discoveryAttachments, wsAttachments])

    // ── Keyboard ────────────────────────────────────────
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSubmit()
        }
      },
      [handleSubmit],
    )

    // ── Input change ────────────────────────────────────
    const handleInput = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value)
        if (!isWorkspace) {
          // Discovery: auto-resize inline
          e.target.style.height = "auto"
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
        }
      },
      [setInputValue, isWorkspace],
    )

    // ── Workspace: Drag and drop ────────────────────────
    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(true)
    }, [])

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
    }, [])

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragOver(false)
        if (e.dataTransfer.files?.length) {
          addWorkspaceFiles(e.dataTransfer.files)
        }
      },
      [addWorkspaceFiles],
    )

    // ── Can-send check ──────────────────────────────────
    const canSend = isWorkspace
      ? !disabled && ((props.value?.trim().length ?? 0) > 0 || wsAttachments.length > 0)
      : (internalInput.trim() || discoveryAttachments.length > 0)

    // ── Placeholder text ────────────────────────────────
    const resolvedPlaceholder = placeholder
      ?? (isWorkspace ? `Message ${props.agentName || "Jarvis"}...` : "Ask anything")

    /* ─── WORKSPACE VARIANT ──────────────────────────────── */

    if (isWorkspace) {
      return (
        <div className={cn("shrink-0 bg-white px-6 pb-4 pt-2", className)}>
          <div className="max-w-3xl mx-auto">
            <div
              className={cn(
                "relative flex flex-col rounded-2xl border transition-colors",
                isDragOver
                  ? "border-[var(--brand-light)] bg-[var(--brand)]/5"
                  : "border-border bg-background",
                disabled && "opacity-50",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* File pills */}
              {wsAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-2.5 pb-1">
                  {wsAttachments.map(a => (
                    <div
                      key={a.id}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] max-w-[200px]",
                        a.status === "error"
                          ? "bg-red-100 text-red-700"
                          : a.status === "done"
                            ? "bg-muted text-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      <span className="truncate">{a.name}</span>
                      {a.status === "extracting" && (
                        <span className="text-[10px] text-muted-foreground shrink-0">...</span>
                      )}
                      {a.status === "done" && (
                        <span className="text-[10px] text-emerald-600 shrink-0">&#10003;</span>
                      )}
                      <button
                        onClick={() => removeWsAttachment(a.id)}
                        className="shrink-0 p-0.5 hover:bg-border rounded transition-colors"
                        aria-label={`Remove ${a.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea row */}
              <div className="flex items-end gap-1.5 px-3 py-2">
                {/* Paperclip */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="shrink-0 flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                  aria-label="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleWorkspaceFileSelect}
                  className="hidden"
                />

                {/* Auto-growing textarea */}
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  disabled={disabled}
                  placeholder={resolvedPlaceholder}
                  aria-label="Chat message"
                  rows={1}
                  className={cn(
                    "flex-1 bg-transparent text-[15px] leading-8 text-foreground placeholder:text-muted-foreground",
                    "outline-none resize-none max-h-[128px]",
                    disabled && "cursor-not-allowed",
                  )}
                />

                {/* Send button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSend}
                  className={cn(
                    "shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                    canSend
                      ? "bg-[var(--brand)] text-[var(--confirm-foreground)] hover:bg-[var(--brand-hover)]"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Drag overlay hint */}
            {isDragOver && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-[var(--brand)] font-medium">Drop files to attach</span>
              </div>
            )}
          </div>
        </div>
      )
    }

    /* ─── DISCOVERY VARIANT (default) ────────────────────── */

    return (
      <div className={cn("w-full", className)}>
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.json,.sql"
          multiple
          onChange={handleDiscoveryFileSelect}
          className="hidden"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          onChange={handleDiscoveryFileSelect}
          className="hidden"
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/webm,audio/ogg"
          onChange={handleDiscoveryFileSelect}
          className="hidden"
        />

        {/* Attachment preview */}
        {discoveryAttachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {discoveryAttachments.map((att) => (
              <DiscoveryAttachmentPreview
                key={att.id}
                attachment={att}
                onRemove={removeDiscoveryAttachment}
              />
            ))}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div id="chat-error" className="mb-2 text-sm text-destructive" role="alert">{error}</div>
        )}

        <div className="relative flex items-center gap-3 rounded-[26px] border border-border/60 bg-background shadow-lg shadow-black/[0.03] px-4 py-2.5">
          {/* Plus button with menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0 self-end mb-1"
                disabled={disabled}
                aria-label="Add attachment"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={openFilePicker} className="py-3">
                <Paperclip className="h-4 w-4 mr-2 text-muted-foreground" />
                Upload file
                <span className="ml-auto text-xs text-muted-foreground">.md, .json, .sql</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openImagePicker} className="py-3">
                <Image className="h-4 w-4 mr-2 text-muted-foreground" />
                Upload image
                <span className="ml-auto text-xs text-muted-foreground">or paste</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openAudioPicker} className="py-3">
                <Music className="h-4 w-4 mr-2 text-muted-foreground" />
                Upload recording
                <span className="ml-auto text-xs text-muted-foreground">transcribed</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openFilePicker} className="py-3">
                <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
                ChatGPT export
                <span className="ml-auto text-xs text-muted-foreground">.json</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={resolvedPlaceholder}
            aria-label="Message input"
            aria-describedby={error ? "chat-error" : undefined}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-[15px] leading-6",
              "placeholder:text-muted-foreground/50 focus:outline-none",
              "max-h-[200px] min-h-[24px]"
            )}
          />

          {/* Right side buttons */}
          <div className="flex items-center gap-1 shrink-0 self-end mb-1">
            <button
              onClick={openAudioPicker}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              disabled={disabled}
              aria-label="Voice input"
            >
              <Mic className="h-5 w-5 text-muted-foreground" />
            </button>
            {disabled ? (
              <button
                onClick={handleStop}
                aria-label="Stop generating"
                className="p-2 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                aria-label="Send message"
                className={cn(
                  "p-2 rounded-full transition-colors",
                  canSend
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-muted/80 text-muted-foreground"
                )}
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  },
)

/* ── Discovery attachment preview ────────────────────────── */

const DiscoveryAttachmentPreview = React.memo(function DiscoveryAttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment
  onRemove: (id: string) => void
}) {
  const handleRemove = React.useCallback(() => onRemove(attachment.id), [onRemove, attachment.id])

  if (attachment.type === "image") {
    const preview = getAttachmentPreview(attachment)
    return (
      <div className="relative group">
        <img
          src={preview}
          alt={attachment.name}
          className="h-16 w-16 object-cover rounded-lg border"
        />
        <button
          onClick={handleRemove}
          className="absolute -top-1 -right-1 p-0.5 rounded-full bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  const icon = attachment.type === "audio" ? Music : FileText
  const IconComponent = icon

  return (
    <div className="relative group flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
      <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate max-w-[150px]">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatAttachmentSize(attachment.size)}</p>
      </div>
      <button
        onClick={handleRemove}
        className="p-0.5 rounded-full hover:bg-muted transition-colors"
        aria-label="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
})

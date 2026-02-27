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

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void
  onAction?: (action: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export interface ChatInputHandle {
  focus: () => void
}

export const ChatInput = React.forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      onAction,
      placeholder = "Ask anything",
      disabled = false,
      className,
    },
    ref
  ) {
  const [input, setInput] = React.useState("")
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const audioInputRef = React.useRef<HTMLInputElement>(null)

  // Memoized action handlers to prevent re-renders
  const handleStop = React.useCallback(() => onAction?.("stop"), [onAction])

  // Expose focus method to parent
  React.useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus()
  }))

  // Auto-focus on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Keep focus on textarea after response
  React.useEffect(() => {
    if (!disabled) {
      textareaRef.current?.focus()
    }
  }, [disabled])

  // Handle paste for images
  const handlePaste = React.useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter(item => item.type.startsWith("image/"))
    if (imageItems.length === 0) return

    e.preventDefault()
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
        setAttachments(prev => [...prev, attachment])
      } catch {
        setError("Failed to process pasted image")
      }
    }
  }, [])

  // Handle file selection
  const handleFileSelect = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setAttachments(prev => [...prev, attachment])
      } catch {
        setError("Failed to process file")
      }
    }

    // Reset input
    e.target.value = ""
  }, [])

  // Remove attachment
  const removeAttachment = React.useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }, [])

  // Open file pickers
  const openFilePicker = React.useCallback(() => fileInputRef.current?.click(), [])
  const openImagePicker = React.useCallback(() => imageInputRef.current?.click(), [])
  const openAudioPicker = React.useCallback(() => audioInputRef.current?.click(), [])

  const handleSubmit = () => {
    if ((input.trim() || attachments.length > 0) && !disabled) {
      onSend(input.trim(), attachments.length > 0 ? attachments : undefined)
      setInput("")
      setAttachments([])
      setError(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    e.target.style.height = "auto"
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.json,.sql"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/webm,audio/ogg"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <AttachmentPreview
              key={att.id}
              attachment={att}
              onRemove={removeAttachment}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-2 text-sm text-destructive">{error}</div>
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

        {/* Text input - never disabled so user can type while waiting */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          aria-label="Message input"
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
              disabled={!input.trim() && attachments.length === 0}
              aria-label="Send message"
              className={cn(
                "p-2 rounded-full transition-colors",
                input.trim() || attachments.length > 0
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
})

// Attachment preview component
const AttachmentPreview = React.memo(function AttachmentPreview({
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

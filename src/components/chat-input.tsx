"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Plus, Mic, ArrowUp, Paperclip, Search, FileText, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ChatInputProps {
  onSend: (message: string) => void
  onAction?: (action: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ChatInput({
  onSend,
  onAction,
  placeholder = "Ask anything",
  disabled = false,
  className,
}: ChatInputProps) {
  const [input, setInput] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput("")
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
    <div className={cn("w-full max-w-3xl mx-auto", className)}>
      <div className="relative rounded-3xl border bg-background shadow-sm overflow-hidden">
        {/* Text input area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[16px]",
            "placeholder:text-muted-foreground focus:outline-none",
            "max-h-[160px] min-h-[24px] overflow-y-auto",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />

        {/* Bottom row with buttons */}
        <div className="flex items-center justify-between px-3 pb-3">
          {/* Plus button with menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-full hover:bg-muted transition-colors"
                disabled={disabled}
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => onAction?.("upload")}>
                <Paperclip className="h-4 w-4 mr-3" />
                Upload brief or document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.("research")}>
                <Search className="h-4 w-4 mr-3" />
                Deep research
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.("template")}>
                <FileText className="h-4 w-4 mr-3" />
                Start from template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.("more")}>
                <MoreHorizontal className="h-4 w-4 mr-3" />
                More options
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right side buttons */}
          <div className="flex items-center gap-1">
            <button
              className="p-2 rounded-full hover:bg-muted transition-colors"
              disabled={disabled}
            >
              <Mic className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className={cn(
                "p-2 rounded-full transition-colors",
                input.trim()
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

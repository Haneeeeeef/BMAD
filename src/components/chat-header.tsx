"use client"

import { ContextIndicator } from "@/components/context-indicator"
import {
  ChevronDown,
  UserRoundPlus,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  FileText,
  Share2,
  Mail,
  Link2,
  FileDown,
  RefreshCcw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface ChatHeaderProps {
  sidebarWidth: string
  showCanvas: boolean
  onCanvasOpen: () => void
  isFlushing: boolean
  isDeleting: boolean
  onShareEmail: () => void
  onCopyLink: () => void
  onExportPDF: () => void
  onShowFlushDialog: () => void
  onShowDeleteDialog: () => void
}

export function ChatHeader({
  sidebarWidth,
  showCanvas,
  onCanvasOpen,
  isFlushing,
  isDeleting,
  onShareEmail,
  onCopyLink,
  onExportPDF,
  onShowFlushDialog,
  onShowDeleteDialog,
}: ChatHeaderProps) {
  return (
    <>
      {/* Floating corner controls */}
      <div className={`fixed top-3 z-10 transition-all duration-200 flex items-center gap-2`} style={{ left: `calc(${sidebarWidth} + 1rem)` }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 text-[18px] font-medium hover:bg-muted/80 rounded-lg px-2 py-1 transition-colors bg-background/80 backdrop-blur-sm" aria-label="Select agent">
              Jarvis
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem>Jarvis</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ContextIndicator />
      </div>

      {/* Header controls */}
      <div className="fixed top-3 right-4 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg">
        {!showCanvas && (
          <button
            onClick={onCanvasOpen}
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg px-3 py-1.5 transition-colors"
            aria-label="Open Canvas"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Canvas</span>
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <UserRoundPlus className="h-4 w-4 mr-2" />
              Invite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={onShareEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Share via Email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={onExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onShowFlushDialog} disabled={isFlushing}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${isFlushing ? 'animate-spin' : ''}`} />
              {isFlushing ? 'Flushing...' : 'Flush Memory'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onShowDeleteDialog} disabled={isDeleting}>
              <Trash2 className={`h-4 w-4 mr-2 ${isDeleting ? 'animate-pulse' : ''}`} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

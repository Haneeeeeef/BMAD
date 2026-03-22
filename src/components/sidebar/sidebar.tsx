"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarItem } from "./sidebar-item"
import { SidebarSection } from "./sidebar-section"
import { ChatSearch, type SearchItem } from "@/components"
import { PenSquare, Search, FolderKanban, Settings, PanelLeftClose, PanelLeft } from "lucide-react"
import { authHeaders } from "@/lib/safe-storage"
import { deleteCanvas } from "@/lib/canvas-storage"
import { mockProjects } from "@/lib/mock-data"
import { useChatContext } from "@/contexts/chat-context"
import { useActiveSessions } from "@/hooks/use-active-sessions"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarProps {
  isOpen?: boolean
  onToggle?: () => void
  className?: string
}

export function Sidebar({ isOpen = true, onToggle, className }: SidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { deleteSession } = useChatContext()
  const activeSessions = useActiveSessions() // Excludes sessions converted to workspaces

  // Handle delete with VPS cleanup
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      // Delete from VPS
      await fetch('/api/session/delete', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sessionId })
      })

      // Delete from localStorage
      deleteSession(sessionId)

      // Clear canvas data and agent completions
      await deleteCanvas(sessionId)

      toast.success('Chat deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }, [deleteSession])

  // Memoized handler to open search
  const handleOpenSearch = useCallback(() => setSearchOpen(true), [])

  // Convert projects to search items
  const searchItems: SearchItem[] = mockProjects.map((project) => ({
    id: project.id,
    title: project.name,
    href: `/projects/${project.id}`,
  }))

  // Collapsed state - icon only sidebar
  if (!isOpen) {
    return (
      <>
        <aside
          className={cn(
            "flex flex-col h-full bg-muted/30 border-r w-14 shrink-0",
            "transition-all duration-200",
            className
          )}
        >
          {/* Logo with expand on hover */}
          <div className="group relative flex items-center justify-center pt-3 pb-1">
            <Link
              href="/new"
              className="h-8 w-8 rounded-lg bg-[#00415a] flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <span className="text-white font-bold text-sm">M</span>
            </Link>
            {onToggle && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onToggle()
                }}
                aria-label="Expand sidebar"
                className="absolute inset-0 flex items-center justify-center bg-muted/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <PanelLeft className="h-4 w-4 text-foreground" strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Icon Navigation */}
          <div className="flex flex-col items-center pt-4 space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/new"
                  className="p-2.5 rounded-lg hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  <PenSquare className="h-5 w-5" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">New workspace</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenSearch}
                  className="p-2.5 rounded-lg hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                  aria-label="Search chats"
                >
                  <Search className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Search</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/projects"
                  className="p-2.5 rounded-lg hover:bg-muted transition-colors text-foreground/70 hover:text-foreground"
                >
                  <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Workspaces</TooltipContent>
            </Tooltip>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer - User Avatar */}
          <div className="p-2 border-t border-border/40">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className="flex items-center justify-center p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-orange-500 text-white">HS</AvatarFallback>
                  </Avatar>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Search Dialog */}
        <ChatSearch
          items={searchItems}
          open={searchOpen}
          onOpenChange={setSearchOpen}
          placeholder="Search workspaces..."
        />
      </>
    )
  }

  // Expanded state
  return (
    <>
      <aside
        className={cn(
          "flex flex-col h-full bg-muted/30 border-r w-64 shrink-0",
          "transition-all duration-200",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <Link href="/new" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#00415a] flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
          </Link>
          {onToggle && (
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="px-2 pt-4 space-y-0.5">
          <SidebarItem href="/new" icon={PenSquare}>
            New workspace
          </SidebarItem>
          <SidebarItem as="button" icon={Search} onClick={handleOpenSearch}>
            Search workspaces
          </SidebarItem>
          <SidebarItem href="/projects" icon={FolderKanban}>
            Workspaces
          </SidebarItem>
        </div>

        {/* In Progress Projects */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {activeSessions.length > 0 && (
            <SidebarSection title="In Progress">
              {activeSessions.map((session) => (
                <SidebarItem
                  key={session.id}
                  href={`/chat/${session.id}`}
                  onDelete={() => handleDeleteSession(session.id)}
                >
                  {session.title}
                </SidebarItem>
              ))}
            </SidebarSection>
          )}
        </div>

        {/* Footer - User */}
        <div className="p-3 border-t border-border/40">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-orange-500 text-white">HS</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Haneef Shiraz</p>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground/70" strokeWidth={1.75} />
          </Link>
        </div>
      </aside>

      {/* Search Dialog */}
      <ChatSearch
        items={searchItems}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        placeholder="Search workspaces..."
      />
    </>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarItem } from "./sidebar-item"
import { SidebarSection } from "./sidebar-section"
import { ChatSearch, type SearchItem } from "@/components"
import { PenSquare, Search, FolderKanban, Settings, PanelLeftClose } from "lucide-react"
import { mockProjects } from "@/lib/mock-data"

interface SidebarProps {
  isOpen?: boolean
  onToggle?: () => void
  className?: string
}

export function Sidebar({ isOpen = true, onToggle, className }: SidebarProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  // Convert projects to search items
  const searchItems: SearchItem[] = mockProjects.map((project) => ({
    id: project.id,
    title: project.name,
    href: `/projects/${project.id}`,
  }))

  return (
    <>
      <aside
        className={cn(
          "flex flex-col h-full bg-muted/30 border-r",
          isOpen ? "w-64" : "w-0 overflow-hidden",
          "transition-all duration-200",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          <Link href="/new" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
          </Link>
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="px-2 pt-4 space-y-0.5">
          <SidebarItem href="/new" icon={PenSquare}>
            New chat
          </SidebarItem>
          <SidebarItem as="button" icon={Search} onClick={() => setSearchOpen(true)}>
            Search chats
          </SidebarItem>
          <SidebarItem href="/projects" icon={FolderKanban}>
            Projects
          </SidebarItem>
        </div>

        {/* Chats list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          <SidebarSection title="Your projects">
            {mockProjects.map((project) => (
              <SidebarItem key={project.id} href={`/projects/${project.id}`}>
                {project.name}
              </SidebarItem>
            ))}
          </SidebarSection>
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
        placeholder="Search chats..."
      />
    </>
  )
}

"use client"

import { cn } from "@/lib/utils"
import { LayoutDashboard, MessageCircle, FileText, Settings } from "lucide-react"

type NavItem = {
  id: string
  icon: React.ReactNode
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: "workspace", icon: <LayoutDashboard className="h-4 w-4" />, label: "Workspace" },
  { id: "chat", icon: <MessageCircle className="h-4 w-4" />, label: "Chat" },
  { id: "documents", icon: <FileText className="h-4 w-4" />, label: "Documents" },
  { id: "settings", icon: <Settings className="h-4 w-4" />, label: "Settings" },
]

interface IconRailProps {
  activeItem?: string
  onItemClick?: (id: string) => void
}

export function IconRail({ activeItem = "workspace", onItemClick }: IconRailProps) {
  return (
    <div className="w-12 shrink-0 flex flex-col items-center py-4 gap-1 bg-background border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-[var(--brand)] mb-4 shrink-0">
        <span className="text-sm font-bold text-[var(--confirm-foreground)] leading-none">B</span>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onItemClick?.(item.id)}
          aria-label={item.label}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors",
            item.id === activeItem
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {item.icon}
        </button>
      ))}
    </div>
  )
}

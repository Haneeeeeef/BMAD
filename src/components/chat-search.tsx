"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { PenSquare, FolderKanban } from "lucide-react"

export interface SearchItem {
  id: string
  title: string
  href: string
}

interface ChatSearchProps {
  items: SearchItem[]
  open: boolean
  onOpenChange: (open: boolean) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
}

export function ChatSearch({
  items,
  open,
  onOpenChange,
  placeholder = "Search chats...",
  emptyMessage = "No results found.",
  className,
}: ChatSearchProps) {
  const router = useRouter()

  const handleSelect = (href: string) => {
    onOpenChange(false)
    router.push(href)
  }

  // Keyboard shortcut to open search
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={placeholder} className={cn(className)} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>

        {/* New chat action */}
        <CommandGroup>
          <CommandItem
            onSelect={() => handleSelect("/new")}
            className="flex items-center gap-3 py-2"
          >
            <PenSquare className="h-4 w-4 text-muted-foreground/80" strokeWidth={1.75} />
            <span>New chat</span>
          </CommandItem>
        </CommandGroup>

        {/* Flat list of conversations */}
        <CommandGroup heading="Conversations">
          {items.map((item) => (
            <CommandItem
              key={item.id}
              value={item.title}
              onSelect={() => handleSelect(item.href)}
              className="flex items-center gap-3 py-2"
            >
              <FolderKanban className="h-4 w-4 text-muted-foreground/70" strokeWidth={1.75} />
              <span className="truncate">{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

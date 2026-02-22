"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Skeleton } from "@/components/ui/skeleton"
import { PenSquare, FolderKanban, X } from "lucide-react"

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
}

function SearchResultSkeleton() {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <Skeleton className="h-3 w-3 rounded-full mt-0.5 shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-3 w-2/5 rounded-full" />
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-4/5 rounded-full" />
      </div>
    </div>
  )
}

// Memoized search result item to prevent re-renders
const SearchResultItem = React.memo(function SearchResultItem({
  item,
  onSelect,
}: {
  item: SearchItem
  onSelect: (href: string) => void
}) {
  const handleClick = React.useCallback(() => onSelect(item.href), [onSelect, item.href])

  return (
    <button
      onClick={handleClick}
      aria-label={`Open ${item.title}`}
      className="flex items-center gap-3 px-5 py-3 w-full text-left hover:bg-muted/50 transition-colors"
    >
      <FolderKanban className="h-4 w-4 text-muted-foreground/60 shrink-0" strokeWidth={1.75} />
      <span className="text-sm leading-none truncate">{item.title}</span>
    </button>
  )
})

export function ChatSearch({
  items,
  open,
  onOpenChange,
  placeholder = "Search projects...",
  emptyMessage = "No results found.",
}: ChatSearchProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    if (!query) return items
    return items.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    )
  }, [items, query])

  // Simulate search loading when typing
  React.useEffect(() => {
    if (query) {
      setIsSearching(true)
      const timer = setTimeout(() => setIsSearching(false), 300)
      return () => clearTimeout(timer)
    }
    setIsSearching(false)
  }, [query])

  // Reset query when dialog closes
  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const handleSelect = React.useCallback((href: string) => {
    onOpenChange(false)
    router.push(href)
  }, [onOpenChange, router])

  // Memoized close handler
  const handleClose = React.useCallback(() => onOpenChange(false), [onOpenChange])

  // Memoized new project handler
  const handleNewProject = React.useCallback(() => handleSelect("/new"), [handleSelect])

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* !max-w-2xl needed to override shadcn's sm:max-w-lg - see LEARNINGS.md */}
      <DialogContent className="p-0 gap-0 !max-w-2xl w-[90vw] overflow-hidden rounded-2xl [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Search</DialogTitle>
        </VisuallyHidden>

        {/* Search Input Row */}
        <div className="flex items-center px-5 h-16 border-b">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-base placeholder:text-muted-foreground/50 focus:outline-none"
          />
          <button
            onClick={handleClose}
            aria-label="Close search"
            className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Results - Fixed height */}
        <div className="h-[420px] overflow-y-auto">
          {isSearching ? (
            <div className="divide-y divide-border/30">
              <SearchResultSkeleton />
              <SearchResultSkeleton />
              <SearchResultSkeleton />
              <SearchResultSkeleton />
              <SearchResultSkeleton />
            </div>
          ) : (
            <>
              {/* New project action */}
              <button
                onClick={handleNewProject}
                aria-label="Create new project"
                className="flex items-center gap-3 px-5 py-4 mt-2 mb-1 w-full text-left hover:bg-muted/50 transition-colors"
              >
                <PenSquare className="h-4 w-4 text-muted-foreground/60 shrink-0" strokeWidth={1.75} />
                <span className="text-sm leading-none">New project</span>
              </button>

              {/* Results list */}
              {filteredItems.length > 0 ? (
                <div className="pb-2">
                  <div className="px-5 py-1.5 text-xs text-muted-foreground/60">Projects</div>
                  {filteredItems.map((item) => (
                    <SearchResultItem key={item.id} item={item} onSelect={handleSelect} />
                  ))}
                </div>
              ) : query ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

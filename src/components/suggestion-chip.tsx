import { cn } from "@/lib/utils"

interface SuggestionChipProps {
  children: React.ReactNode
  onClick: () => void
  className?: string
}

export function SuggestionChip({ children, onClick, className }: SuggestionChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm border rounded-full",
        "hover:bg-muted transition-colors",
        "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

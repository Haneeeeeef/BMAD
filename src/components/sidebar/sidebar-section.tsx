import { cn } from "@/lib/utils"

interface SidebarSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn("space-y-0.5", className)}>
      {title && (
        <h3 className="px-2 pt-3 pb-1.5 text-xs font-medium text-muted-foreground/70">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

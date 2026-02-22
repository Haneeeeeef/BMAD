"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CanvasSection } from "@/lib/canvas-types"

interface CanvasSectionNavProps {
  sections: CanvasSection[]
  activeSection: string | null
  onSelect: (sectionId: string) => void
  className?: string
}

// Memoized section button to prevent re-renders
const SectionButton = React.memo(function SectionButton({
  section,
  isActive,
  onSelect,
}: {
  section: CanvasSection
  isActive: boolean
  onSelect: (sectionId: string) => void
}) {
  const handleClick = React.useCallback(() => onSelect(section.id), [onSelect, section.id])

  return (
    <button
      onClick={handleClick}
      aria-label={`Navigate to ${section.title}`}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors text-left",
        isActive
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      <span className="text-base">{section.icon}</span>
      <span className="truncate">{section.title}</span>
    </button>
  )
})

export function CanvasSectionNav({
  sections,
  activeSection,
  onSelect,
  className,
}: CanvasSectionNavProps) {
  return (
    <nav className={cn("space-y-0.5", className)}>
      <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
        Sections
      </p>
      {sections.map((section) => (
        <SectionButton
          key={section.id}
          section={section}
          isActive={activeSection === section.id}
          onSelect={onSelect}
        />
      ))}
    </nav>
  )
}

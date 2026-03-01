"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Rocket, LayoutTemplate } from "lucide-react"
import { SelectionCard } from "@/components/ui/selection-card"
import { OnboardingHeader } from "@/components/ui/onboarding-header"

export type ProjectType = "fresh" | "template"

interface Option {
  id: ProjectType
  title: string
  icon: React.ReactNode
  bullets: string[]
  disabled?: boolean
  badge?: string
}

const options: Option[] = [
  {
    id: "fresh",
    title: "From Scratch",
    icon: <Rocket className="h-10 w-10 sm:h-14 sm:w-14" strokeWidth={1.2} />,
    bullets: ["AI-guided discovery", "Full creative control"],
  },
  {
    id: "template",
    title: "Use Template",
    icon: <LayoutTemplate className="h-10 w-10 sm:h-14 sm:w-14" strokeWidth={1.2} />,
    bullets: ["Pre-built foundations", "Battle-tested patterns"],
    disabled: true,
    badge: "Coming soon",
  },
]

interface ProjectTypeSelectorProps {
  onSelect: (type: ProjectType) => void
}

export function ProjectTypeSelector({ onSelect }: ProjectTypeSelectorProps) {
  const [hoveredId, setHoveredId] = React.useState<ProjectType | null>(null)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-sm sm:max-w-md mx-auto"
    >
      <OnboardingHeader
        title="Select how to start"
        subtitle="Build from scratch or use a proven template."
        className="mb-5 sm:mb-6"
        animated={false}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {options.map((option) => (
          <SelectionCard
            key={option.id}
            selected={hoveredId === option.id && !option.disabled}
            onClick={() => !option.disabled && onSelect(option.id)}
            onMouseEnter={() => !option.disabled && setHoveredId(option.id)}
            onMouseLeave={() => setHoveredId(null)}
            icon={option.icon}
            title={option.title}
            bullets={option.bullets}
            disabled={option.disabled}
            badge={option.badge}
            className="sm:min-h-[220px] rounded-lg shadow-sm"
          />
        ))}
      </div>
    </motion.div>
  )
}

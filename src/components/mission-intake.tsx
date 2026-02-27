"use client"

import { useState } from "react"
import { Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type MissionIntakeProps = {
  onSubmit: (data: {
    name: string
    description: string
    industry?: string
    techStack?: string
  }) => void
}

export function MissionIntake({ onSubmit }: MissionIntakeProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [industry, setIndustry] = useState("")
  const [techStack, setTechStack] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !description.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      industry: industry.trim() || undefined,
      techStack: techStack.trim() || undefined,
    })
  }

  const isValid = name.trim().length > 0 && description.trim().length > 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-hover)] mb-4 shadow-lg shadow-[var(--brand)]/20">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Start Your Mission
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            30 seconds to launch. AI guides the rest.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              What are you building?
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AI-powered legal assistant for small businesses"
              className="h-12 text-base"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Brief description (2-3 sentences)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Helps small business owners understand contracts, NDAs, and basic legal documents without expensive lawyer fees."
              className="min-h-[100px] text-base resize-none"
            />
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Industry (optional)
              </label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Legal Tech"
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                Tech Stack (optional)
              </label>
              <Input
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="Next.js, AI"
                className="h-10"
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={!isValid}
            className="w-full h-12 text-base bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white disabled:opacity-50"
          >
            Launch Mission
            <Rocket className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Smartphone,
  ShoppingCart,
  Users,
  BarChart3,
  MessageSquare,
  Briefcase,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Mission,
  AVAILABLE_DELIVERABLES,
  getWorkflowById,
} from "@/lib/bmad-types"

interface Template {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  gradient: string
  industry: string
  techStack: string
  popular?: boolean
}

const templates: Template[] = [
  {
    id: "saas",
    name: "SaaS Platform",
    description: "B2B software with subscriptions, user management, and analytics",
    icon: <BarChart3 className="h-6 w-6" />,
    gradient: "from-violet-500 to-purple-600",
    industry: "Software / SaaS",
    techStack: "React, Node.js, PostgreSQL, Stripe",
    popular: true,
  },
  {
    id: "mobile",
    name: "Mobile App",
    description: "iOS & Android app with authentication and push notifications",
    icon: <Smartphone className="h-6 w-6" />,
    gradient: "from-blue-500 to-cyan-500",
    industry: "Mobile / Consumer",
    techStack: "React Native, Firebase, Node.js",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    description: "Two-sided platform connecting buyers and sellers",
    icon: <ShoppingCart className="h-6 w-6" />,
    gradient: "from-emerald-500 to-teal-500",
    industry: "E-commerce / Marketplace",
    techStack: "Next.js, PostgreSQL, Stripe Connect",
  },
  {
    id: "community",
    name: "Community Platform",
    description: "Social features, content sharing, and member engagement",
    icon: <Users className="h-6 w-6" />,
    gradient: "from-pink-500 to-rose-500",
    industry: "Social / Community",
    techStack: "Next.js, Supabase, Real-time",
  },
  {
    id: "ai-tool",
    name: "AI-Powered Tool",
    description: "Product leveraging AI/ML for intelligent automation",
    icon: <Sparkles className="h-6 w-6" />,
    gradient: "from-amber-500 to-orange-500",
    industry: "AI / Machine Learning",
    techStack: "Python, FastAPI, React, OpenAI",
  },
  {
    id: "internal",
    name: "Internal Tool",
    description: "Business operations, workflows, and team productivity",
    icon: <Briefcase className="h-6 w-6" />,
    gradient: "from-slate-500 to-zinc-600",
    industry: "Enterprise / Internal",
    techStack: "React, Node.js, PostgreSQL",
  },
]

interface TemplateSelectorProps {
  onBack: () => void
}

export function TemplateSelector({ onBack }: TemplateSelectorProps) {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
  }

  const handleUseTemplate = async () => {
    if (!selectedTemplate) return

    setIsCreating(true)
    const template = templates.find(t => t.id === selectedTemplate)!

    // Create project from template
    const projectId = `project-${Date.now()}`
    const briefDeliverable = AVAILABLE_DELIVERABLES.find(d => d.type === "product-brief")!
    const workflow = getWorkflowById(briefDeliverable.workflowId)

    const project: Mission = {
      id: projectId,
      name: `My ${template.name}`,
      mode: "new-build",
      description: template.description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentPhase: "1-analysis",
      currentWorkflow: briefDeliverable.workflowId,
      currentDeliverable: "deliverable-1",
      context: {
        industry: template.industry,
        techStack: template.techStack,
      },
      artifacts: [],
      deliverables: [
        {
          id: "deliverable-1",
          type: "product-brief",
          workflowId: briefDeliverable.workflowId,
          name: briefDeliverable.name,
          description: briefDeliverable.description,
          status: "in-progress",
          progress: 0,
          tasks: workflow?.areas.map((area, i) => ({
            id: `task-${i}`,
            name: area,
            status: "pending" as const,
          })) || [],
          sessionId: `session-${Date.now()}-0`,
        },
      ],
      inputDocuments: [],
      sessionId: `session-${Date.now()}`,
    }

    try {
      await fetch("/api/db/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      })
      router.push(`/projects/${projectId}`)
    } catch {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col">
      {/* Header */}
      <header className="pt-8 pb-6 px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-2">
              Choose a Template
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Start with a proven structure for your product type
            </p>
          </motion.div>
        </div>
      </header>

      {/* Templates Grid */}
      <main className="flex-1 px-6 pb-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, index) => (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelectTemplate(template.id)}
                className={cn(
                  "group relative text-left p-5 rounded-xl border transition-all duration-200",
                  "bg-white dark:bg-zinc-900",
                  selectedTemplate === template.id
                    ? "border-[var(--brand)] ring-2 ring-[var(--brand)]/20"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                  "hover:shadow-lg"
                )}
              >
                {/* Popular badge */}
                {template.popular && (
                  <div className="absolute -top-2 right-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white",
                      "bg-gradient-to-r", template.gradient
                    )}>
                      Popular
                    </span>
                  </div>
                )}

                {/* Selected check */}
                {selectedTemplate === template.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 rounded-full bg-[var(--brand)] flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all",
                  "bg-gradient-to-br", template.gradient,
                  "text-white"
                )}>
                  {template.icon}
                </div>

                {/* Content */}
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Tech stack preview */}
                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                  {template.techStack}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer CTA */}
      {selectedTemplate && (
        <motion.footer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 p-4"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                {templates.find(t => t.id === selectedTemplate)?.name}
              </p>
              <p className="text-sm text-zinc-500">
                {templates.find(t => t.id === selectedTemplate)?.industry}
              </p>
            </div>
            <button
              onClick={handleUseTemplate}
              disabled={isCreating}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all",
                "bg-[var(--brand)] hover:bg-[var(--brand-hover)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Use Template
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.footer>
      )}
    </div>
  )
}

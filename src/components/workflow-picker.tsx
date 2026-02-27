"use client"

import { useState, useMemo, memo } from "react"
import {
  BmadWorkflow,
  BMAD_PHASES,
  getSuggestedWorkflows,
  searchWorkflows,
  Mission,
} from "@/lib/bmad-types"
import {
  Search,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type WorkflowPickerProps = {
  mission: Mission
  onSelectWorkflow: (workflow: BmadWorkflow) => void
}

export function WorkflowPicker({ mission, onSelectWorkflow }: WorkflowPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredWorkflow, setHoveredWorkflow] = useState<string | null>(null)

  const suggestedWorkflows = useMemo(() => getSuggestedWorkflows(mission), [mission])

  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return null
    return searchWorkflows(searchQuery)
  }, [searchQuery])

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      {/* Header with Search */}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="max-w-[1200px] mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-hover)] flex items-center justify-center shadow-lg shadow-[var(--brand)]/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Choose a Workflow
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                26 AI-guided workflows to build your product
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows, agents, or type a trigger code..."
              className="w-full h-12 pl-12 pr-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-[1200px] mx-auto space-y-8">

          {/* Search Results */}
          {filteredWorkflows && (
            <section>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Search Results ({filteredWorkflows.length})
              </h3>
              {filteredWorkflows.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredWorkflows.map((workflow) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onSelect={() => onSelectWorkflow(workflow)}
                      isHovered={hoveredWorkflow === workflow.id}
                      onHover={setHoveredWorkflow}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  No workflows found for "{searchQuery}"
                </div>
              )}
            </section>
          )}

          {/* Show normal content when not searching */}
          {!filteredWorkflows && (
            <>
              {/* Suggested Workflows */}
              {suggestedWorkflows.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Recommended Next Step
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {suggestedWorkflows.map((workflow) => (
                      <WorkflowCard
                        key={workflow.id}
                        workflow={workflow}
                        onSelect={() => onSelectWorkflow(workflow)}
                        isHovered={hoveredWorkflow === workflow.id}
                        onHover={setHoveredWorkflow}
                        suggested
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Workflow Grid by Phase */}
              {BMAD_PHASES.map((phase) => (
                <section key={phase.id}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: phase.color }}
                    >
                      {phase.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {phase.name}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {phase.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {phase.workflows.map((workflow) => (
                      <WorkflowCard
                        key={workflow.id}
                        workflow={workflow}
                        onSelect={() => onSelectWorkflow(workflow)}
                        isHovered={hoveredWorkflow === workflow.id}
                        onHover={setHoveredWorkflow}
                        phaseColor={phase.color}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Workflow Card Component - memoized for list performance
const WorkflowCard = memo(function WorkflowCard({
  workflow,
  onSelect,
  isHovered,
  onHover,
  suggested,
  phaseColor,
}: {
  workflow: BmadWorkflow
  onSelect: () => void
  isHovered: boolean
  onHover: (id: string | null) => void
  suggested?: boolean
  phaseColor?: string
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover(workflow.id)}
      onMouseLeave={() => onHover(null)}
      className={`
        group relative w-full text-left p-5 rounded-xl border transition-all duration-300 ease-out
        ${suggested
          ? "bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 dark:from-emerald-950/40 dark:via-zinc-900 dark:to-teal-950/30 border-emerald-300 dark:border-emerald-700 shadow-sm shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/15 hover:border-emerald-400 dark:hover:border-emerald-600"
          : "bg-gradient-to-br from-white to-zinc-50/80 dark:from-zinc-900 dark:to-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 hover:shadow-xl hover:shadow-zinc-900/5 dark:hover:shadow-black/20 hover:border-zinc-300 dark:hover:border-zinc-600"
        }
        ${isHovered ? "scale-[1.015] -translate-y-0.5" : ""}
      `}
    >
      {/* Top gradient overlay for depth */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 pointer-events-none" />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full opacity-0 group-hover:opacity-100 transition-all duration-300"
        style={{ backgroundColor: phaseColor || (suggested ? "#10B981" : "var(--brand)") }}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-300"
            style={{
              backgroundColor: suggested ? "rgba(16, 185, 129, 0.1)" : `${phaseColor}15` || "rgba(var(--brand-rgb), 0.1)",
            }}
          >
            {workflow.agentEmoji}
          </div>
          <div>
            <h4 className="font-bold text-[15px] text-zinc-900 dark:text-zinc-50 group-hover:text-[var(--brand)] transition-colors tracking-tight">
              {workflow.name}
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              with {workflow.agentName}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md tracking-wider">
          {workflow.trigger}
        </span>
      </div>

      {/* Description */}
      <p className="relative text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2 leading-relaxed">
        {workflow.description}
      </p>

      {/* Intelligence Signals */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <span>⏱</span>
          <span>{workflow.estimatedTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <span>🧠</span>
          <span className={
            workflow.aiDepth === "High" ? "text-amber-600 dark:text-amber-400" :
            workflow.aiDepth === "Medium" ? "text-blue-600 dark:text-blue-400" :
            "text-zinc-500 dark:text-zinc-400"
          }>
            {workflow.aiDepth} depth
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <span>📦</span>
          <span className="truncate">{workflow.outputFormat}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
          <span>📊</span>
          <span>{workflow.impactArea}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-xs text-zinc-400 cursor-help hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
              <Info className="h-3 w-3" />
              {workflow.stepCount} areas
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-sm p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-lg"
          >
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {workflow.name} — {workflow.stepCount} Areas
              </div>
              <ul className="space-y-0.5 text-zinc-600 dark:text-zinc-400">
                {workflow.areas.map((area, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[var(--brand)] mt-0.5">•</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
        <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-[var(--brand)] group-hover:translate-x-1 transition-all" />
      </div>

      {/* Suggested badge */}
      {suggested && (
        <div className="absolute -top-2 -right-2 px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium shadow-lg">
          Suggested
        </div>
      )}
    </button>
  )
})

"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { Deliverable, DeliverablePhase } from "@/lib/bmad-types"
import { AVAILABLE_DELIVERABLES, PHASE_META } from "@/lib/bmad-types"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

/* ── Phase weights (must sum to 100) ── */

const PHASE_WEIGHT: Record<DeliverablePhase, number> = {
  analysis: 15,
  planning: 25,
  solutioning: 20,
  implementation: 35,
  "quick-flow": 2,
  utility: 2,
  core: 1,
}

/* ── Status multiplier ── */

function statusMultiplier(d: Deliverable): number {
  switch (d.status) {
    case "queued":
      return 0
    case "in-progress": {
      const total = d.tasks.length
      if (total === 0) return 0.3
      const done = d.tasks.filter(t => t.status === "complete").length
      return (done / total) * 0.8
    }
    case "reviewing":
      return 0.85
    case "awaiting-approval":
      return 0.90
    case "revising":
      return 0.75
    case "complete":
    case "validated":
      return 1.0
    default:
      return 0
  }
}

/* ── Calculate overall % + phase breakdown ── */

interface PhaseBreakdown {
  phase: string
  label: string
  weight: number
  progress: number // 0-100 within phase
  contribution: number // actual % contributed to overall
}

function calculateProgress(deliverables: Deliverable[]): { overall: number; breakdown: PhaseBreakdown[] } {
  if (deliverables.length === 0) return { overall: 0, breakdown: [] }

  const byPhase: Record<string, Deliverable[]> = {}
  for (const d of deliverables) {
    const template = AVAILABLE_DELIVERABLES.find(t => t.type === d.type)
    const phase = template?.phase ?? "utility"
    if (!byPhase[phase]) byPhase[phase] = []
    byPhase[phase]!.push(d)
  }

  let totalWeight = 0
  for (const phase of Object.keys(byPhase)) {
    totalWeight += PHASE_WEIGHT[phase as DeliverablePhase] ?? 1
  }

  if (totalWeight === 0) return { overall: 0, breakdown: [] }

  let weightedSum = 0
  const breakdown: PhaseBreakdown[] = []

  for (const [phase, phaseDeliverables] of Object.entries(byPhase)) {
    const phaseWeight = PHASE_WEIGHT[phase as DeliverablePhase] ?? 1
    const normalizedWeight = phaseWeight / totalWeight
    const perDeliverableWeight = normalizedWeight / phaseDeliverables.length

    let phaseProgress = 0
    for (const d of phaseDeliverables) {
      const mult = statusMultiplier(d)
      phaseProgress += mult / phaseDeliverables.length
      weightedSum += perDeliverableWeight * mult
    }

    const meta = PHASE_META[phase as DeliverablePhase]
    breakdown.push({
      phase,
      label: meta?.name ?? phase,
      weight: Math.round(normalizedWeight * 100),
      progress: Math.round(phaseProgress * 100),
      contribution: Math.round(perDeliverableWeight * phaseDeliverables.reduce((sum, d) => sum + statusMultiplier(d), 0) * 100),
    })
  }

  return { overall: Math.round(weightedSum * 100), breakdown }
}

/* ── Ring component ── */

const RING_SIZE = 56
const RING_R = 24
const RING_C = 2 * Math.PI * RING_R

function ProgressRing({ percentage, breakdown }: { percentage: number; breakdown: PhaseBreakdown[] }) {
  const color = percentage < 30 ? "#F59E0B" : percentage < 70 ? "#00719c" : "#10B981"
  const fillClass = percentage < 30 ? "fill-amber-600" : percentage < 70 ? "fill-[var(--brand)]" : "fill-emerald-600"
  const offset = RING_C * (1 - percentage / 100)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative mx-auto cursor-default" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="-rotate-90">
            <circle cx="28" cy="28" r={RING_R} fill={color} fillOpacity="0.06" stroke="currentColor" className="text-border" strokeWidth="3" />
            <circle cx="28" cy="28" r={RING_R} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={offset} />
          </svg>
          <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="absolute inset-0">
            <text x="28" y="28.5" textAnchor="middle" dominantBaseline="central" className={cn("text-[14px] font-bold font-mono", fillClass)}>
              {percentage}
            </text>
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="p-3 max-w-[220px]">
        <p className="text-[11px] font-semibold mb-2 text-foreground">Progress Breakdown</p>
        <div className="flex flex-col gap-1.5">
          {breakdown.map((b) => {
            const barColor = b.progress === 100 ? "bg-emerald-500" : b.progress > 0 ? "bg-[var(--brand)]" : "bg-border"
            return (
              <div key={b.phase} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground flex-1">{b.label}</span>
                <span className="text-[9px] text-muted-foreground/40 font-mono w-6 text-right">{b.weight}%</span>
                <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", barColor)} style={{ width: `${b.progress}%` }} />
                </div>
                <span className="font-mono text-[10px] w-7 text-right text-muted-foreground">{b.progress}%</span>
              </div>
            )
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Overall</span>
          <span className="font-mono text-[11px] font-semibold text-foreground">{percentage}%</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/* ── Component ── */

interface ProjectAboutProps {
  description: string
  deliverables: Deliverable[]
}

export function ProjectAbout({ description, deliverables }: ProjectAboutProps) {
  const [expanded, setExpanded] = useState(false)
  const { overall, breakdown } = useMemo(() => calculateProgress(deliverables), [deliverables])

  // Split description into sentences for bullet display
  const bullets = useMemo(() => {
    if (!description) return []
    return description
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }, [description])

  const showToggle = bullets.length > 3

  return (
    <div className="flex flex-col">
      {/* Content */}
      <div className="flex flex-col gap-3 px-4 pt-4 pb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">About</span>
        {/* Description */}
        {description ? (
          <div>
            <p className={cn(
              "text-[12px] leading-[18px] text-muted-foreground",
              !expanded && "line-clamp-3",
            )}>
              {description}
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-medium text-[var(--brand)] hover:underline cursor-pointer mt-1"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground/50 italic">No description provided</p>
        )}

        {/* Progress ring */}
        <ProgressRing percentage={overall} breakdown={breakdown} />
      </div>
    </div>
  )
}

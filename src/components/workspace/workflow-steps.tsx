"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DeliverableTask } from "@/lib/bmad-types"

interface WorkflowStepsProps {
  steps: DeliverableTask[]
  /** Max visible before collapsing into "+N more steps" */
  maxVisible?: number
}

function StepIcon({ status }: { status: DeliverableTask["status"] }) {
  if (status === "complete") {
    return (
      <div className="flex items-center justify-center h-[10px] w-[10px] rounded-full bg-emerald-500 shrink-0">
        <Check className="h-[6px] w-[6px] text-white" strokeWidth={3} />
      </div>
    )
  }
  if (status === "active") {
    return (
      <div className="flex items-center justify-center h-[10px] w-[10px] rounded-full border-[1.5px] border-amber-400 bg-white shrink-0">
        <div className="h-[3px] w-[3px] rounded-full bg-amber-500" />
      </div>
    )
  }
  // pending
  return (
    <div className="h-[10px] w-[10px] rounded-full border border-border bg-background shrink-0" />
  )
}

function ConnectorLine({ status }: { status: DeliverableTask["status"] }) {
  return (
    <div
      className={cn(
        "w-px h-2.5 mx-auto",
        status === "complete" ? "bg-emerald-400" : "bg-border",
      )}
    />
  )
}

// Internal housekeeping steps filtered from user view
const INTERNAL_STEP_RE = /^(?:initialize|setup|finalize)\b/i

export function WorkflowSteps({ steps, maxVisible = 7 }: WorkflowStepsProps) {
  const filtered = steps.filter((s) => !INTERNAL_STEP_RE.test(s.name.trim()))
  const completedCount = filtered.filter((s) => s.status === "complete").length
  const totalCount = filtered.length
  const hiddenCount = Math.max(0, totalCount - maxVisible)
  const visibleSteps = hiddenCount > 0 ? filtered.slice(0, maxVisible - 1) : filtered

  return (
    <div className="flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Workflow Steps
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
            {completedCount}/{totalCount}
          </span>
          {totalCount > 0 && (
            <span className="text-[10px] text-amber-600 font-mono bg-amber-50 px-1.5 py-0.5 rounded">
              ~{Math.max(1, Math.ceil((totalCount - completedCount) * 2.5))}m
            </span>
          )}
        </div>
      </div>

      {/* Steps timeline */}
      <div className="flex flex-col px-4 py-2">
        {visibleSteps.map((step, i) => (
          <div key={step.id}>
            {/* Step row */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <StepIcon status={step.status} />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={cn(
                    "text-[12px] leading-4 truncate",
                    step.status === "complete" && "text-emerald-600",
                    step.status === "active" && "font-medium text-foreground",
                    step.status === "pending" && "text-muted-foreground",
                  )}
                >
                  {step.name}
                </span>
                {step.status === "active" && (
                  <span className="text-[10px] text-amber-500">In progress...</span>
                )}
              </div>
            </div>
            {/* Connector line (not after last item) */}
            {i < visibleSteps.length - 1 && (
              <div className="ml-[4px]">
                <ConnectorLine status={step.status} />
              </div>
            )}
            {/* Show connector to "more" row */}
            {i === visibleSteps.length - 1 && hiddenCount > 0 && (
              <div className="ml-[4px]">
                <ConnectorLine status="pending" />
              </div>
            )}
          </div>
        ))}

        {/* "+N more steps" row */}
        {hiddenCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-[10px] w-[10px] rounded-full border border-border bg-background shrink-0" />
            <span className="text-[11px] text-muted-foreground/50">
              +{hiddenCount} more steps
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

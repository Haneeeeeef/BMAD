"use client"

import { useEffect, useRef } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DeliverableTask } from "@/lib/bmad-types"

interface WorkflowStepsProps {
  steps: DeliverableTask[]
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

export function WorkflowSteps({ steps }: WorkflowStepsProps) {
  const filtered = steps.filter((s) => !INTERNAL_STEP_RE.test(s.name.trim()))
  const completedCount = filtered.filter((s) => s.status === "complete").length
  const totalCount = filtered.length

  // Auto-scroll to the active step
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [completedCount])

  return (
    <div className="flex flex-col min-h-0 shrink-0 max-h-[50%]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Workflow Steps
        </span>
        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* Steps timeline — scrollable */}
      <div className="flex flex-col px-4 py-2 overflow-y-auto">
        {filtered.map((step, i) => (
          <div key={step.id} ref={step.status === "active" ? activeRef : undefined}>
            {/* Step row */}
            <div className="flex items-center gap-2">
              <StepIcon status={step.status} />
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
            {/* Connector line */}
            {i < filtered.length - 1 && (
              <div className="w-[10px]">
                <ConnectorLine status={step.status} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

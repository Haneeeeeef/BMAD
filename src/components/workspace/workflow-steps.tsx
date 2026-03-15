"use client"

import { useEffect, useRef } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DeliverableTask } from "@/lib/bmad-types"

interface WorkflowStepsProps {
  steps: DeliverableTask[]
}

const INTERNAL_STEP_RE = /^(?:initialize|setup|finalize)\b/i

export function WorkflowSteps({ steps }: WorkflowStepsProps) {
  const filtered = steps.filter((s) => !INTERNAL_STEP_RE.test(s.name.trim()))
  const completedCount = filtered.filter((s) => s.status === "complete").length
  const totalCount = filtered.length

  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [completedCount])

  return (
    <div className="flex flex-col min-h-0 shrink-0 max-h-[50%]">
      <div className="flex flex-col px-3 pt-4 pb-2 overflow-y-auto">
        <div className="flex items-center px-1 pb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {filtered.map((step, i) => (
            <div
              key={step.id}
              ref={step.status === "active" ? activeRef : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all",
                step.status === "complete" && "bg-white/40",
                step.status === "active" && "bg-white/70 shadow-sm ring-1 ring-border/30",
                step.status === "pending" && "opacity-40",
              )}
            >
              {/* Number or check */}
              {step.status === "complete" ? (
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-emerald-500/10 shrink-0">
                  <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
                </div>
              ) : (
                <div className={cn(
                  "flex items-center justify-center h-5 w-5 rounded-md shrink-0 text-[10px] font-semibold",
                  step.status === "active"
                    ? "bg-[var(--brand)]/10 text-[var(--brand)]"
                    : "bg-muted/50 text-muted-foreground/50",
                )}>
                  {i + 1}
                </div>
              )}

              {/* Text */}
              <span className={cn(
                "text-[13px] leading-5 flex-1 truncate",
                step.status === "complete" && "text-foreground/50",
                step.status === "active" && "font-medium text-foreground",
                step.status === "pending" && "text-muted-foreground",
              )}>
                {step.name}
              </span>

              {/* Active indicator */}
              {step.status === "active" && (
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] animate-pulse shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type WizardStep = {
  id: string
  label: string
}

export interface WizardStepperProps {
  steps: WizardStep[]
  currentStepIndex: number
  className?: string
}

export function WizardStepper({ steps, currentStepIndex, className }: WizardStepperProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex
        const isActive = index === currentStepIndex
        const isFuture = index > currentStepIndex

        return (
          <div key={step.id} className="flex items-center">
            {/* Step circle + label */}
            <div className="flex items-center gap-1.5">
              {isCompleted ? (
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
              ) : isActive ? (
                <div className="w-6 h-6 rounded-full bg-[var(--brand)] flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">{index + 1}</span>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-[1.5px] border-zinc-300 flex items-center justify-center">
                  <span className="text-xs font-medium text-zinc-400">{index + 1}</span>
                </div>
              )}
              <span
                className={cn(
                  "text-xs",
                  isCompleted && "text-zinc-600 font-medium",
                  isActive && "text-zinc-900 font-semibold",
                  isFuture && "text-zinc-400",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {index < steps.length - 1 && (
              <div className="w-12 h-[1.5px] bg-zinc-200 mx-2" />
            )}
          </div>
        )
      })}
    </div>
  )
}

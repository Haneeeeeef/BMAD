"use client"

import { useRouter } from "next/navigation"
import { X, ChevronLeft } from "lucide-react"
import { WizardNavbar } from "@/components/ui/wizard-navbar"
import { WizardStepper, type WizardStep } from "@/components/ui/wizard-stepper"

const WIZARD_STEPS: WizardStep[] = [
  { id: "approach", label: "Approach" },
  { id: "scope", label: "Scope" },
  { id: "artifacts", label: "Artifacts" },
]

export interface WizardLayoutProps {
  currentStepIndex: number
  onBack?: () => void
  onCancel?: () => void
  children: React.ReactNode
}

export function WizardLayout({ currentStepIndex, onBack, onCancel, children }: WizardLayoutProps) {
  const router = useRouter()

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <WizardNavbar />

      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-6 sm:pt-10 pb-16">
        <div className="w-full max-w-3xl">
          {/* Cancel / Back link */}
          <div className="mb-4">
            {currentStepIndex === 0 ? (
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            ) : (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          {/* Stepper */}
          <WizardStepper steps={WIZARD_STEPS} currentStepIndex={currentStepIndex} className="mb-6" />

          {/* Step content */}
          {children}
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState } from "react"
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Sparkles, Bot, Gem } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ValidationResult } from "@/lib/bmad-types"

type QAAgent = "jarvis" | "gemini"

type ValidationPanelProps = {
  isRunning: boolean
  score?: number
  results?: ValidationResult[]
  summary?: string
  onRunValidation: (agent?: QAAgent) => void
  onFixWarnings?: () => void
  onAccept?: () => void
  activeAgent?: QAAgent
}

export function ValidationPanel({
  isRunning,
  score,
  results,
  summary,
  onRunValidation,
  onFixWarnings,
  onAccept,
  activeAgent = "jarvis",
}: ValidationPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<QAAgent>(activeAgent)
  const hasResults = results && results.length > 0
  const hasWarnings = results?.some(r => r.status === "warn")
  const hasFails = results?.some(r => r.status === "fail")

  if (!hasResults && !isRunning) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="h-5 w-5 text-[var(--brand)]" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            QA Validation
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
          Choose a QA agent to review your deliverable:
        </p>

        {/* Agent Selection */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedAgent("jarvis")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedAgent === "jarvis"
                ? "bg-[var(--brand)] text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <Bot className="h-4 w-4" />
            Jarvis
          </button>
          <button
            onClick={() => setSelectedAgent("gemini")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedAgent === "gemini"
                ? "bg-blue-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            <Gem className="h-4 w-4" />
            Gemini
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-3">
          {selectedAgent === "jarvis"
            ? "Same agent that helped create the doc (familiar with context)"
            : "Independent agent (fresh perspective, unbiased review)"
          }
        </p>

        <Button
          onClick={() => onRunValidation(selectedAgent)}
          className={`w-full text-white ${
            selectedAgent === "gemini"
              ? "bg-blue-500 hover:bg-blue-600"
              : "bg-[var(--brand)] hover:bg-[var(--brand-hover)]"
          }`}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Run {selectedAgent === "gemini" ? "Gemini" : "Jarvis"} QA
        </Button>
      </div>
    )
  }

  if (isRunning) {
    return (
      <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-[var(--brand)] animate-spin" />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Validating...
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          QA agent is checking your deliverable against requirements.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
      {/* Header with Score */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--brand)]" />
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              Validation Results
            </span>
          </div>
          <div className={`text-lg font-bold ${
            score && score >= 90 ? "text-emerald-600" :
            score && score >= 70 ? "text-amber-600" :
            "text-red-600"
          }`}>
            {score}/100
          </div>
        </div>
        {summary && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {summary}
          </p>
        )}
      </div>

      {/* Results List */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {results?.map((result) => (
          <div key={result.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              {result.status === "pass" && (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              )}
              {result.status === "warn" && (
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              {result.status === "fail" && (
                <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {result.check}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    result.status === "pass" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                    result.status === "warn" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                  }`}>
                    {result.status.toUpperCase()}
                  </span>
                </div>
                {result.message && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {result.message}
                  </p>
                )}
                {result.suggestion && result.status !== "pass" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
                    Suggestion: {result.suggestion}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
        {hasWarnings && !hasFails && onFixWarnings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFixWarnings}
            className="flex-1"
          >
            Fix Warnings
          </Button>
        )}
        {!hasFails && onAccept && (
          <Button
            size="sm"
            onClick={onAccept}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Accept & Continue
          </Button>
        )}
        {hasFails && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRunValidation()}
            className="flex-1"
          >
            Re-validate After Fixes
          </Button>
        )}
      </div>
    </div>
  )
}

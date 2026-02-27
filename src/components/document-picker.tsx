"use client"

import { useState } from "react"
import { X, Clock, FileText, Upload, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AVAILABLE_DELIVERABLES, DeliverableType } from "@/lib/bmad-types"

type DocumentPickerProps = {
  onConfirm: (selectedTypes: DeliverableType[], inputDocs: File[]) => void
  onCancel: () => void
}

export function DocumentPicker({ onConfirm, onCancel }: DocumentPickerProps) {
  const [selected, setSelected] = useState<Set<DeliverableType>>(new Set(["product-brief"]))
  const [inputDocs, setInputDocs] = useState<File[]>([])

  const toggleDeliverable = (type: DeliverableType) => {
    const next = new Set(selected)
    if (next.has(type)) {
      next.delete(type)
    } else {
      next.add(type)
    }
    setSelected(next)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setInputDocs((prev) => [...prev, ...Array.from(files)])
    }
  }

  const removeFile = (index: number) => {
    setInputDocs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    onConfirm(Array.from(selected), inputDocs)
  }

  const totalTime = AVAILABLE_DELIVERABLES
    .filter((d) => selected.has(d.type))
    .reduce((acc, d) => acc + parseInt(d.estimatedTime), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              What do you want to create?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Select deliverables for this mission
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        {/* Deliverables List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {AVAILABLE_DELIVERABLES.map((deliverable) => {
            const isSelected = selected.has(deliverable.type)
            return (
              <button
                key={deliverable.type}
                onClick={() => toggleDeliverable(deliverable.type)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-[var(--brand)] bg-[var(--brand)]/5"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-[var(--brand)] text-white"
                        : "border-2 border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {deliverable.name}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {deliverable.estimatedTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {deliverable.outputType}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {deliverable.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}

          {/* Input Documents */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-6">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Add existing docs (optional)
            </label>
            <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-[var(--brand)] transition-colors">
              <Upload className="h-5 w-5 text-zinc-400" />
              <span className="text-sm text-zinc-500">Drop files or click to upload</span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".md,.pdf,.txt,.doc,.docx"
              />
            </label>
            {inputDocs.length > 0 && (
              <div className="mt-3 space-y-2">
                {inputDocs.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
                  >
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                    >
                      <X className="h-4 w-4 text-zinc-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              {selected.size} deliverable{selected.size !== 1 ? "s" : ""} • ~{totalTime} min
            </div>
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white"
            >
              Start Creating ({selected.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

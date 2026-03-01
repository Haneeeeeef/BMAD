"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { X, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import {
  AVAILABLE_DELIVERABLES,
  DeliverableType,
  DeliverablePhase,
  PHASE_META,
  getDeliverablesByPhase,
} from "@/lib/bmad-types"
import { cn } from "@/lib/utils"
import { OnboardingHeader } from "@/components/ui/onboarding-header"

type DocumentPickerProps = {
  onConfirm: (selectedTypes: DeliverableType[], inputDocs: File[]) => void
  onCancel: () => void
  existingTypes?: DeliverableType[]
  /** "page" = full-page (workspace creation), "modal" = popup overlay (existing workspace) */
  variant?: "page" | "modal"
  /** Restore previously selected deliverables (for draft persistence) */
  initialSelected?: DeliverableType[]
  /** Called whenever selection changes (for draft persistence) */
  onSelectionChange?: (types: DeliverableType[]) => void
}

/** Reviewed and ready deliverable types — everything else shows "Coming Soon" */
const ENABLED_TYPES = new Set<DeliverableType>([
  "product-brief",    // W1 create-brief
  "prd",              // W5 create-prd
  "ux-design",        // W8 create-ux
  "architecture",     // W9 create-arch
  "epics-stories",    // W10 create-stories
  "quick-spec",       // W19 quick-spec
  "qa-tests",         // W22 qa-tests
])

const PHASE_TABS: { id: DeliverablePhase | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "analysis", label: "Analysis" },
  { id: "planning", label: "Planning" },
  { id: "solutioning", label: "Solutioning" },
  { id: "implementation", label: "Implementation" },
]

const ALL_PHASE_TABS: { id: DeliverablePhase | "all"; label: string }[] = [
  ...PHASE_TABS,
  { id: "quick-flow", label: "Quick" },
  { id: "utility", label: "Utility" },
  { id: "core", label: "Core" },
]

export function DocumentPicker({ onConfirm, onCancel, existingTypes = [], variant = "page", initialSelected, onSelectionChange }: DocumentPickerProps) {
  const [selected, setSelected] = useState<Set<DeliverableType>>(() => {
    if (initialSelected && initialSelected.length > 0) return new Set(initialSelected)
    if (existingTypes.length === 0) return new Set(["product-brief"])
    return new Set()
  })
  const [activePhase, setActivePhase] = useState<DeliverablePhase | "all">("all")
  const [carouselPage, setCarouselPage] = useState(0)

  // Close on Escape (modal only)
  useEffect(() => {
    if (variant !== "modal") return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onCancel, variant])

  const toggleDeliverable = useCallback((type: DeliverableType) => {
    if (!ENABLED_TYPES.has(type)) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  // Sync selection changes to parent (avoids setState-during-render)
  useEffect(() => {
    onSelectionChange?.(Array.from(selected))
  }, [selected, onSelectionChange])

  const handleConfirm = () => {
    onConfirm(Array.from(selected), [])
  }

  const filteredDeliverables = useMemo(() => {
    const existingSet = new Set(existingTypes)
    const base = activePhase === "all" ? AVAILABLE_DELIVERABLES : getDeliverablesByPhase(activePhase)
    return base.filter(d => !existingSet.has(d.type))
  }, [activePhase, existingTypes])

  // Reset carousel when filter changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCarouselPage(0) }, [activePhase])

  const selectedCount = selected.size

  /* ── shared pieces ─────────────────────────────────── */

  const phaseTabs = (
    <div className={cn(
      "flex flex-wrap gap-1.5",
      variant === "page" ? "justify-center gap-2 mb-6" : "px-5 py-3 border-b border-border",
    )}>
      {(variant === "page" ? PHASE_TABS : ALL_PHASE_TABS).map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActivePhase(tab.id)}
          className={cn(
            "rounded-full font-medium transition-colors",
            variant === "page" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs",
            activePhase === tab.id
              ? variant === "page" ? "bg-[var(--brand)] text-[var(--confirm-foreground)]" : "bg-[var(--brand)] text-[var(--confirm-foreground)]"
              : variant === "page"
                ? "bg-background text-muted-foreground hover:bg-muted"
                : "bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  // Separate enabled vs disabled deliverables for the page variant "+N Coming soon" card
  const enabledDeliverables = useMemo(() => filteredDeliverables.filter(d => ENABLED_TYPES.has(d.type)), [filteredDeliverables])
  const disabledCount = useMemo(() => filteredDeliverables.filter(d => !ENABLED_TYPES.has(d.type)).length, [filteredDeliverables])

  const modalCardGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {filteredDeliverables.map((deliverable) => {
        const isEnabled = ENABLED_TYPES.has(deliverable.type)
        const isSelected = selected.has(deliverable.type)

        return (
          <button
            key={deliverable.type}
            onClick={() => toggleDeliverable(deliverable.type)}
            disabled={!isEnabled}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg text-center transition-all p-4",
              isEnabled
                ? isSelected
                  ? "bg-[var(--brand)]/[0.04] ring-1 ring-[var(--brand)]"
                  : "bg-muted hover:bg-accent"
                : "bg-muted opacity-50 cursor-not-allowed",
            )}
          >
            <span className={cn("text-2xl mb-2", !isEnabled && "grayscale")}>
              {deliverable.icon}
            </span>
            <span className={cn(
              "text-[13px] font-medium",
              isSelected ? "text-foreground" : "text-muted-foreground",
              !isEnabled && "text-muted-foreground/60",
            )}>
              {deliverable.name}
            </span>
            <div className="flex items-center gap-1 text-muted-foreground mt-1.5 text-[10px]">
              <Clock className="h-2.5 w-2.5" />
              <span>{deliverable.estimatedTime}</span>
            </div>
            {!isEnabled && (
              <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Coming Soon
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  /* ── full-page variant ─────────────────────────────── */

  if (variant === "page") {
    // Build the full card list: enabled deliverables + coming-soon placeholder
    const allCards = [...enabledDeliverables]
    const CARDS_PER_PAGE = 6
    const hasComingSoon = disabledCount > 0
    const totalCards = allCards.length + (hasComingSoon ? 1 : 0)
    const needsCarousel = totalCards > CARDS_PER_PAGE
    const totalPages = needsCarousel ? Math.ceil(totalCards / CARDS_PER_PAGE) : 1

    // Clamp page (the useEffect on activePhase resets to 0 on filter change)
    const safePage = Math.min(carouselPage, Math.max(0, totalPages - 1))

    const startIdx = safePage * CARDS_PER_PAGE
    const endIdx = startIdx + CARDS_PER_PAGE
    // Slice enabled cards, then decide if the coming-soon card falls in this page
    const visibleEnabled = allCards.slice(startIdx, Math.min(endIdx, allCards.length))
    const comingSoonIdx = allCards.length // The coming-soon card's virtual index
    const showComingSoon = hasComingSoon && comingSoonIdx >= startIdx && comingSoonIdx < endIdx

    return (
      <div className="w-full max-w-3xl mx-auto">
        <OnboardingHeader
          title="What do you want to create?"
          subtitle="Select the deliverables for your workspace."
          className="mb-4 sm:mb-5"
          animated={false}
        />
        {phaseTabs}

        {/* 3-column card grid with carousel — fixed 2-row height so button stays put */}
        <div className="relative" style={{ minHeight: 340 }}>
          {needsCarousel && safePage > 0 && (
            <button
              onClick={() => setCarouselPage(p => Math.max(0, p - 1))}
              className="absolute -left-12 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background shadow-md border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:shadow-lg transition-all"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 grid-rows-2 gap-3 sm:gap-4">
            {visibleEnabled.map((deliverable) => {
              const isSelected = selected.has(deliverable.type)

              return (
                <button
                  key={deliverable.type}
                  type="button"
                  onClick={() => toggleDeliverable(deliverable.type)}
                  className={cn(
                    "group relative flex flex-col items-center justify-center rounded-xl text-center overflow-hidden p-5 sm:p-6",
                    "transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]",
                    isSelected
                      ? "bg-[var(--brand)]/[0.03]"
                      : "bg-white shadow-sm hover:bg-[var(--brand)]/[0.03]",
                  )}
                >
                  <span className="text-3xl sm:text-4xl mb-3">
                    {deliverable.icon}
                  </span>
                  <span className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isSelected
                      ? "text-zinc-900"
                      : "text-zinc-600 group-hover:text-zinc-900",
                  )}>
                    {deliverable.name}
                  </span>
                  <span className="mt-2 text-xs text-muted-foreground">
                    {deliverable.estimatedTime} · {PHASE_META[deliverable.phase].name}
                  </span>
                  {/* Bottom accent bar — visible on select AND hover */}
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-200",
                    isSelected
                      ? "bg-[var(--brand)]"
                      : "bg-transparent group-hover:bg-[var(--brand)]",
                  )} />
                </button>
              )
            })}

            {/* Collapsed "+N Coming soon" placeholder */}
            {showComingSoon && (
              <div className="flex flex-col items-center justify-center rounded-xl text-center p-5 sm:p-6 border-2 border-dashed border-zinc-200">
                <span className="text-2xl text-muted-foreground/40 mb-1">+{disabledCount}</span>
                <span className="text-xs text-muted-foreground/60">Coming soon</span>
              </div>
            )}
          </div>

          {needsCarousel && safePage < totalPages - 1 && (
            <button
              onClick={() => setCarouselPage(p => Math.min(totalPages - 1, p + 1))}
              className="absolute -right-12 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background shadow-md border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:shadow-lg transition-all"
              aria-label="Next page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Page dots */}
        {needsCarousel && (
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselPage(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === safePage ? "w-4 bg-[var(--brand)]" : "w-1.5 bg-zinc-300",
                )}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Inline Create button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="h-11 px-16 rounded-[10px] text-sm font-medium bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Create workspace
          </button>
        </div>
      </div>
    )
  }

  /* ── modal variant ─────────────────────────────────── */

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/40 z-50" onClick={onCancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto"
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="doc-picker-title"
          ref={(el) => {
            if (el) {
              const focusable = el.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
              focusable?.focus()
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 id="doc-picker-title" className="text-base font-semibold text-foreground">Add Deliverable</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Select documents to generate</p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {phaseTabs}

          {/* Cards grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {modalCardGrid}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {selectedCount > 0 ? `${selectedCount} selected` : "None selected"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  selectedCount > 0
                    ? "bg-[var(--brand)] text-[var(--confirm-foreground)] hover:bg-[var(--brand-hover)]"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                )}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

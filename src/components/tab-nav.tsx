"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface Tab {
  id: string
  label: string
  count?: number
}

interface TabNavProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  children?: React.ReactNode // For right-side content like filters
}

// Memoized tab button to prevent re-renders
const TabButton = React.memo(function TabButton({
  tab,
  isActive,
  onTabChange,
}: {
  tab: Tab
  isActive: boolean
  onTabChange: (tabId: string) => void
}) {
  const handleClick = React.useCallback(() => onTabChange(tab.id), [onTabChange, tab.id])

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-label={tab.label}
      onClick={handleClick}
      className={cn(
        "py-3 text-sm font-medium transition-colors relative whitespace-nowrap",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {tab.label}
      {tab.count !== undefined && (
        <span className="ml-1.5 text-muted-foreground/60">{tab.count}</span>
      )}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
      )}
    </button>
  )
})

export function TabNav({ tabs, activeTab, onTabChange, className, children }: TabNavProps) {
  return (
    <div className={cn("flex items-center border-b", className)}>
      <nav role="tablist" className="flex items-center gap-6">
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onTabChange={onTabChange}
          />
        ))}
      </nav>
      {children && (
        <>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {children}
          </div>
        </>
      )}
    </div>
  )
}

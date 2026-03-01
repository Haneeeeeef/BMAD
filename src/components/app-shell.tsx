"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useMemo } from "react"
import { Sidebar } from "@/components"
import { ErrorBoundary } from "./error-boundary"

// Context for sidebar state
interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: true,
  toggle: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

interface AppShellProps {
  children: React.ReactNode
  hideSidebar?: boolean
}

export function AppShell({ children, hideSidebar = false }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to blur active element
      if (e.key === "Escape") {
        const active = document.activeElement as HTMLElement
        active?.blur?.()
      }
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const sidebarValue = useMemo(
    () => ({ isOpen: sidebarOpen, toggle: toggleSidebar }),
    [sidebarOpen, toggleSidebar]
  )

  return (
    <SidebarContext.Provider value={sidebarValue}>
      <div className="flex h-screen">
        {!hideSidebar && (
          <ErrorBoundary>
            <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
          </ErrorBoundary>
        )}

        <main id="main-content" className="flex-1 overflow-auto" role="main">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </SidebarContext.Provider>
  )
}

"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback } from "react"
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
}

export function AppShell({ children }: AppShellProps) {
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

  return (
    <SidebarContext.Provider value={{ isOpen: sidebarOpen, toggle: toggleSidebar }}>
      <div className="flex h-screen">
        <ErrorBoundary>
          <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        </ErrorBoundary>

        <main className="flex-1 overflow-auto" role="main">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </SidebarContext.Provider>
  )
}

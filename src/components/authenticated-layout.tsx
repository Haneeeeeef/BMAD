"use client"

import { usePathname } from "next/navigation"
import { AppShell } from "./app-shell"
import { useAuth } from "@/contexts/auth-context"

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login"]

export function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()

  // Public pages don't need AppShell or auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>
  }

  // If not logged in, the AuthProvider will redirect
  // Show nothing while that happens
  if (!user) {
    return null
  }

  // Full-screen pages (no sidebar)
  // NOTE: Sidebar temporarily hidden globally - keep code for future projects
  const isProjectDetail = pathname.startsWith("/projects/") && pathname !== "/projects"
  const isMissionDetail = pathname.startsWith("/missions/") && pathname !== "/missions"
  const HIDE_SIDEBAR_GLOBALLY = true  // Set to false to re-enable sidebar

  return <AppShell hideSidebar={HIDE_SIDEBAR_GLOBALLY || isProjectDetail || isMissionDetail}>{children}</AppShell>
}

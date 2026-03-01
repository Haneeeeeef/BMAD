"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { safeGetItem, safeRemoveItem } from "@/lib/safe-storage"

interface User {
  username: string
  token: string
  createdAt: number
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  logout: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for stored user
    const stored = safeGetItem("mc_user")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      } catch {
        safeRemoveItem("mc_user")
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Public routes that don't require authentication
    const publicRoutes = ["/", "/login"]
    // Redirect to login if not authenticated (except on public pages)
    if (!isLoading && !user && !publicRoutes.includes(pathname)) {
      router.push("/login")
    }
  }, [user, isLoading, pathname, router])

  const logout = useCallback(() => {
    safeRemoveItem("mc_user")
    setUser(null)
    router.push("/login")
  }, [router])

  const value = useMemo(() => ({ user, isLoading, logout }), [user, isLoading, logout])

  // Show nothing while checking auth (prevents flash)
  if (isLoading) {
    return null
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login"]
  // If not logged in and not on public page, show nothing (will redirect)
  if (!user && !publicRoutes.includes(pathname)) {
    return null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

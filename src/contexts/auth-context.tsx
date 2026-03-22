"use client"

import { createContext, useContext, useMemo, ReactNode } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

interface User {
  id: string
  username: string
  email: string
  image?: string | null
  token: string // backwards compat — use id for new code
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
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const isLoading = status === "loading"

  const user: User | null = useMemo(() => {
    if (!session?.user) return null
    const name = session.user.name || session.user.email?.split("@")[0] || "user"
    return {
      id: session.user.id || session.user.email || name,
      username: name,
      email: session.user.email || "",
      image: session.user.image,
      token: `mc_${name}`, // backwards compat for existing auth headers
    }
  }, [session])

  const logout = () => {
    signOut({ callbackUrl: "/login" })
  }

  const value = useMemo(() => ({ user, isLoading, logout }), [user, isLoading])

  if (isLoading) return null

  // Redirect unauthenticated users to login (except public routes)
  const publicRoutes = ["/", "/login"]
  if (!user && !publicRoutes.includes(pathname)) {
    router.push("/login")
    return null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

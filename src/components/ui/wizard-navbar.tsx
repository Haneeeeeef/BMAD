"use client"

import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

export interface WizardNavbarProps {
  breadcrumb?: string
  className?: string
}

export function WizardNavbar({ breadcrumb = "New workspace", className }: WizardNavbarProps) {
  const { user } = useAuth()
  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "?"

  return (
    <nav className={cn("w-full bg-white border-b border-zinc-200 px-8 py-3", className)}>
      <div className="flex items-center justify-between">
        {/* Left: Logo + breadcrumb */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
              <span className="text-xs font-bold text-white">B</span>
            </div>
            <span className="text-base font-semibold text-zinc-900">BMAD</span>
          </Link>
          <div className="w-px h-4 bg-zinc-200" />
          <span className="text-sm text-zinc-400">{breadcrumb} /</span>
        </div>

        {/* Right: User */}
        {user && (
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-zinc-500">{user.username}</span>
            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center">
              <span className="text-[10px] font-medium text-zinc-600">{initials}</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

"use client"

import { cn } from "@/lib/utils"

interface BottomBarProps {
  children: React.ReactNode
  className?: string
}

export function BottomBar({ children, className }: BottomBarProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 px-4 py-4 z-10",
      className
    )}>
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-6">
        {children}
      </div>
    </div>
  )
}

interface BottomBarButtonProps {
  onClick?: () => void
  disabled?: boolean
  variant?: "primary" | "ghost"
  children: React.ReactNode
  type?: "button" | "submit"
  className?: string
}

export function BottomBarButton({
  onClick,
  disabled = false,
  variant = "primary",
  children,
  type = "button",
  className,
}: BottomBarButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "transition-all font-medium",
        variant === "primary" && "h-12 px-20 rounded-lg text-sm bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "ghost" && "text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
        className
      )}
    >
      {children}
    </button>
  )
}

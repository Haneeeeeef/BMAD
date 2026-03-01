"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface SelectionCardProps {
  selected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  icon?: React.ReactNode
  title: string
  bullets?: string[]
  className?: string
  disabled?: boolean
  badge?: string
}

export function SelectionCard({
  selected = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  icon,
  title,
  bullets,
  className,
  disabled = false,
  badge,
}: SelectionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={disabled ? undefined : onMouseEnter}
      onMouseLeave={disabled ? undefined : onMouseLeave}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={cn(
        "relative flex transition-all duration-200 overflow-hidden",
        // Vertical centered layout on all sizes
        "flex-col items-center justify-center p-4 sm:p-8",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2",
        selected
          ? "bg-[var(--brand)]/[0.03] dark:bg-[var(--brand)]/[0.08]"
          : "bg-white dark:bg-zinc-900",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full">
          {badge}
        </span>
      )}

      {/* Icon */}
      {icon && (
        <div
          className={cn(
            "shrink-0 transition-colors duration-200 mb-3 sm:mb-4",
            selected
              ? "text-[var(--brand)]"
              : "text-zinc-400 dark:text-zinc-500"
          )}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="text-center">
        {/* Title */}
        <h3
          className={cn(
            "font-medium transition-colors duration-200",
            selected
              ? "text-zinc-900 dark:text-white"
              : "text-zinc-600 dark:text-zinc-400"
          )}
        >
          {title}
        </h3>

        {/* Bullet points */}
        {bullets && bullets.length > 0 && (
          <ul className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1 text-left inline-block">
            {bullets.map((bullet, index) => (
              <li
                key={index}
                className="flex items-start gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500"
              >
                <span className="mt-1 sm:mt-1.5 w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom accent bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-[3px] transition-all duration-200",
          selected
            ? "bg-[var(--brand)]"
            : "bg-transparent"
        )}
      />
    </motion.button>
  )
}

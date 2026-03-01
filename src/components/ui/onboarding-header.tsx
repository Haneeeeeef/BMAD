"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface OnboardingHeaderProps {
  title: string
  subtitle?: string
  className?: string
  animated?: boolean
}

export function OnboardingHeader({
  title,
  subtitle,
  className,
  animated = true,
}: OnboardingHeaderProps) {
  const Wrapper = animated ? motion.div : "div"
  const wrapperProps = animated
    ? {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className={cn("text-center", className)}
    >
      <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-800 dark:text-white mb-3">
        {title}
      </h1>
      {subtitle && (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
          {subtitle}
        </p>
      )}
    </Wrapper>
  )
}

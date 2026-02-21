"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className="space-y-1.5">
        {label && (
          <Label htmlFor={inputId} className={error ? "text-destructive" : ""}>
            {label}
          </Label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            // 16px font size prevents zoom on iOS
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-[16px] md:text-sm ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    )
  }
)

TextInput.displayName = "TextInput"

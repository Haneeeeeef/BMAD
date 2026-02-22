"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

type SearchBarVariant = "default" | "hero"

interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onSearch?: (value: string) => void
  onChange?: (value: string) => void
  variant?: SearchBarVariant
}

const variantStyles: Record<SearchBarVariant, { container: string; input: string; icon: string }> = {
  default: {
    container: "",
    input: "h-10 pl-10 pr-10 text-sm rounded-lg border border-input",
    icon: "h-4 w-4 left-3",
  },
  hero: {
    container: "rounded-xl border border-border bg-background",
    input: "h-12 pl-11 pr-11 text-base rounded-xl border-0 bg-transparent",
    icon: "h-5 w-5 left-4",
  },
}

export function SearchBar({
  className,
  placeholder = "Search...",
  onSearch,
  onChange,
  variant = "default",
  ...props
}: SearchBarProps) {
  const [value, setValue] = React.useState("")
  const styles = variantStyles[variant]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onChange?.(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch?.(value)
    }
  }

  const handleClear = () => {
    setValue("")
    onChange?.("")
  }

  return (
    <div className={cn("relative", styles.container, className)}>
      <Search
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-muted-foreground/60",
          styles.icon
        )}
        strokeWidth={1.75}
      />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "flex w-full bg-background",
          "placeholder:text-muted-foreground/50",
          "focus:outline-none focus:ring-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-search-cancel-button]:hidden",
          styles.input
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors",
            variant === "hero" ? "right-4" : "right-3"
          )}
        >
          <X className={variant === "hero" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={1.75} />
        </button>
      )}
    </div>
  )
}

"use client"

import { Check, Info, AlertTriangle, X, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3",
          title: "group-[.toast]:text-sm group-[.toast]:font-medium",
          description: "group-[.toast]:text-xs group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-[var(--brand)] group-[.toast]:text-white group-[.toast]:rounded-md group-[.toast]:text-xs group-[.toast]:px-3 group-[.toast]:py-1.5 group-[.toast]:hover:bg-[var(--brand-hover)]",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md group-[.toast]:text-xs",
          success: "group-[.toaster]:border-[var(--brand)]/20 group-[.toaster]:bg-[var(--brand)]/5",
          error: "group-[.toaster]:border-red-500/20 group-[.toaster]:bg-red-500/10",
          warning: "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-amber-500/10",
          info: "group-[.toaster]:border-blue-500/20 group-[.toaster]:bg-blue-500/10",
        },
      }}
      icons={{
        success: <Check className="size-4" style={{ color: "var(--brand)" }} />,
        info: <Info className="size-4 text-blue-500" />,
        warning: <AlertTriangle className="size-4 text-amber-500" />,
        error: <X className="size-4 text-red-500" />,
        loading: <Loader2 className="size-4 animate-spin text-muted-foreground" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"

type ConfirmVariant = "default" | "destructive"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  onConfirm: () => void
  onCancel?: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    if (!loading) {
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-0 p-0 !border-0 !shadow-xl">
        {/* Title */}
        <div className="px-6 pt-3 pb-2 bg-muted/30 rounded-t-lg">
          <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
        </div>

        {/* Separator - under title */}
        <div className="h-px bg-border/50" />

        {/* Description + Footer */}
        <AlertDialogHeader className="px-6 pt-4 pb-4">
          <AlertDialogDescription className="text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Footer */}
        <AlertDialogFooter className="px-6 pb-4">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={loading}
            variant="ghost"
            className="!border !border-muted-foreground/20"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            variant={variant === "destructive" ? "destructive" : "default"}
            className={`min-w-[100px] ${variant === "default" ? "!bg-[var(--confirm)] hover:!bg-[var(--confirm-hover)]" : ""}`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

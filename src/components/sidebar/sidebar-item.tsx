"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LucideIcon, X } from "lucide-react"
import { ConfirmDialog } from "@/components"

type SidebarItemBaseProps = {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
  onDelete?: () => void
}

type SidebarItemLinkProps = SidebarItemBaseProps & {
  as?: "link"
  href: string
  onClick?: never
}

type SidebarItemButtonProps = SidebarItemBaseProps & {
  as: "button"
  onClick: () => void
  href?: never
}

type SidebarItemProps = SidebarItemLinkProps | SidebarItemButtonProps

export const SidebarItem = React.memo(function SidebarItem(props: SidebarItemProps) {
  const { icon: Icon, children, className, onDelete } = props
  const pathname = usePathname()
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  const baseClasses = cn(
    "group flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors w-full text-left",
    "text-foreground/80 hover:bg-muted hover:text-foreground",
    className
  )

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
      <span className="truncate flex-1">{children}</span>
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowDeleteDialog(true)
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
          aria-label="Delete"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  )

  const deleteDialog = onDelete && (
    <ConfirmDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      title="Delete Chat"
      description="Are you sure you want to delete this chat? This action cannot be undone."
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={onDelete}
    />
  )

  if (props.as === "button") {
    return (
      <>
        <button
          onClick={props.onClick}
          aria-label={typeof children === "string" ? children : undefined}
          className={baseClasses}
        >
          {content}
        </button>
        {deleteDialog}
      </>
    )
  }

  const isActive = pathname === props.href || pathname.startsWith(props.href + "/")

  return (
    <>
      <Link
        href={props.href}
        className={cn(
          baseClasses,
          isActive && "bg-muted font-medium text-foreground"
        )}
      >
        {content}
      </Link>
      {deleteDialog}
    </>
  )
})

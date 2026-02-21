"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

type SidebarItemBaseProps = {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
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

export function SidebarItem(props: SidebarItemProps) {
  const { icon: Icon, children, className } = props
  const pathname = usePathname()

  const baseClasses = cn(
    "flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors w-full text-left",
    "text-foreground/80 hover:bg-muted hover:text-foreground",
    className
  )

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
      <span className="truncate">{children}</span>
    </>
  )

  if (props.as === "button") {
    return (
      <button onClick={props.onClick} className={baseClasses}>
        {content}
      </button>
    )
  }

  const isActive = pathname === props.href || pathname.startsWith(props.href + "/")

  return (
    <Link
      href={props.href}
      className={cn(
        baseClasses,
        isActive && "bg-muted font-medium text-foreground"
      )}
    >
      {content}
    </Link>
  )
}

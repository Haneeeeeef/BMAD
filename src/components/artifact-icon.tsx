"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type FileType =
  | "markdown"
  | "json"
  | "yaml"
  | "typescript"
  | "javascript"
  | "python"
  | "image"
  | "pdf"
  | "figma"
  | "folder"
  | "unknown"

const fileExtensions: Record<string, FileType> = {
  md: "markdown",
  markdown: "markdown",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  pdf: "pdf",
  fig: "figma",
}

const fileConfig: Record<FileType, { color: string; bgColor: string }> = {
  markdown: { color: "text-blue-600", bgColor: "bg-blue-100" },
  json: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  yaml: { color: "text-purple-600", bgColor: "bg-purple-100" },
  typescript: { color: "text-blue-700", bgColor: "bg-blue-100" },
  javascript: { color: "text-yellow-500", bgColor: "bg-yellow-100" },
  python: { color: "text-green-600", bgColor: "bg-green-100" },
  image: { color: "text-pink-600", bgColor: "bg-pink-100" },
  pdf: { color: "text-red-600", bgColor: "bg-red-100" },
  figma: { color: "text-violet-600", bgColor: "bg-violet-100" },
  folder: { color: "text-amber-600", bgColor: "bg-amber-100" },
  unknown: { color: "text-gray-600", bgColor: "bg-gray-100" },
}

interface ArtifactIconProps {
  filename: string
  isFolder?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
}

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

export function ArtifactIcon({
  filename,
  isFolder = false,
  size = "md",
  className,
}: ArtifactIconProps) {
  const extension = filename.split(".").pop()?.toLowerCase() || ""
  const fileType = isFolder ? "folder" : (fileExtensions[extension] || "unknown")
  const config = fileConfig[fileType]

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded",
        sizeClasses[size],
        config.bgColor,
        className
      )}
    >
      {isFolder ? (
        <FolderIcon className={cn(iconSizeClasses[size], config.color)} />
      ) : (
        <FileTypeIcon type={fileType} className={cn(iconSizeClasses[size], config.color)} />
      )}
    </div>
  )
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  )
}

function FileTypeIcon({ type, className }: { type: FileType; className?: string }) {
  switch (type) {
    case "markdown":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M7 13h2l2 3 2-6 2 3h2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case "image":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      )
    case "figma":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 5.5A3.5 3.5 0 018.5 2H12v7H8.5A3.5 3.5 0 015 5.5z" />
          <path d="M12 2h3.5a3.5 3.5 0 110 7H12V2z" />
          <path d="M12 12.5a3.5 3.5 0 117 0 3.5 3.5 0 11-7 0z" />
          <path d="M5 19.5A3.5 3.5 0 018.5 16H12v3.5a3.5 3.5 0 11-7 0z" />
          <path d="M5 12.5A3.5 3.5 0 018.5 9H12v7H8.5A3.5 3.5 0 015 12.5z" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      )
  }
}

// Helper function to get file type
export function getFileType(filename: string): FileType {
  const extension = filename.split(".").pop()?.toLowerCase() || ""
  return fileExtensions[extension] || "unknown"
}

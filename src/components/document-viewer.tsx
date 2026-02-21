"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DocumentViewerProps {
  content: string
  filename?: string
  language?: string
  onEdit?: () => void
  onExport?: () => void
  className?: string
}

export function DocumentViewer({
  content,
  filename,
  language = "markdown",
  onEdit,
  onExport,
  className,
}: DocumentViewerProps) {
  const [view, setView] = React.useState<"preview" | "raw">("preview")
  const isCode = !["markdown", "md", "txt"].includes(language)

  return (
    <div className={cn("flex flex-col border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <DocumentIcon language={language} />
          {filename && (
            <span className="text-sm font-medium">{filename}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isCode && (
            <Tabs value={view} onValueChange={(v) => setView(v as "preview" | "raw")}>
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="text-xs px-2 py-1">
                  Preview
                </TabsTrigger>
                <TabsTrigger value="raw" className="text-xs px-2 py-1">
                  Raw
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          )}
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 max-h-[600px]">
        {view === "preview" && !isCode ? (
          <div className="prose prose-sm dark:prose-invert max-w-none p-4">
            <MarkdownPreview content={content} />
          </div>
        ) : (
          <pre className="p-4 text-sm overflow-x-auto">
            <code className={`language-${language}`}>{content}</code>
          </pre>
        )}
      </ScrollArea>
    </div>
  )
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown rendering - in production use react-markdown
  const html = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br />')

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

function DocumentIcon({ language }: { language: string }) {
  const colors: Record<string, string> = {
    markdown: "text-blue-500",
    md: "text-blue-500",
    json: "text-yellow-500",
    yaml: "text-purple-500",
    typescript: "text-blue-600",
    javascript: "text-yellow-400",
    python: "text-green-500",
  }

  return (
    <svg className={cn("h-4 w-4", colors[language] || "text-muted-foreground")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

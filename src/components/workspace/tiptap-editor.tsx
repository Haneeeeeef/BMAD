"use client"

import { memo, useState, useCallback, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Save } from "lucide-react"
import { authHeaders } from "@/lib/safe-storage"

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false })

interface TiptapEditorProps {
  documentName: string
  content?: string
  editable?: boolean
  projectSlug?: string
  filePath?: string
}

export const TiptapEditor = memo(function TiptapEditor({
  content,
  editable = true,
  projectSlug,
  filePath,
}: TiptapEditorProps) {
  const [value, setValue] = useState(content || "")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [isDirty, setIsDirty] = useState(false)

  // Save to VPS
  const saveToVPS = useCallback(async () => {
    if (!projectSlug || !filePath) return
    setSaveStatus("saving")
    try {
      const res = await fetch(`/api/artifacts`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          project: projectSlug,
          path: filePath,
          content: value,
        }),
      })
      if (res.ok) {
        setSaveStatus("saved")
        setIsDirty(false)
        setTimeout(() => setSaveStatus("idle"), 2000)
        // Commit to git
        fetch(`/api/artifacts/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "commit",
            project: projectSlug,
            path: filePath,
            message: `human: edited ${filePath?.split("/").pop() || "document"}`,
          }),
        }).catch(() => {})
        window.dispatchEvent(new CustomEvent("tiptap-saved"))
      } else {
        setSaveStatus("error")
      }
    } catch {
      setSaveStatus("error")
    }
  }, [projectSlug, filePath, value])

  // Cmd+S
  const saveRef = useRef(saveToVPS)
  saveRef.current = saveToVPS
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="h-full flex flex-col" data-color-mode="light">
      {/* Save bar */}
      {editable && projectSlug && filePath && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/30 shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {isDirty ? "Unsaved changes" : ""}
          </span>
          <button
            onClick={saveToVPS}
            disabled={!isDirty && saveStatus !== "error"}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors disabled:opacity-40 hover:bg-muted"
            title="Save (Cmd+S)"
          >
            <Save className="h-3 w-3" />
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error — Retry" : "Save"}
          </button>
        </div>
      )}

      {/* Markdown editor */}
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={value}
          onChange={(val) => {
            if (!editable) return
            setValue(val || "")
            setIsDirty(true)
          }}
          preview="live"
          hideToolbar={!editable}
          height="100%"
          visibleDragbar={false}
          style={{ height: "100%" }}
        />
      </div>

      <style>{`
        .w-md-editor {
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        .w-md-editor-toolbar {
          border-bottom: 1px solid #e5e5e5 !important;
          background: #fafafa !important;
          padding: 4px 8px !important;
          min-height: auto !important;
        }
        .w-md-editor-toolbar li > button {
          height: 26px !important;
          width: 26px !important;
        }
        .w-md-editor-content {
          font-size: 13px !important;
        }
        .w-md-editor-text-pre, .w-md-editor-text-input, .w-md-editor-text {
          font-size: 13px !important;
          line-height: 1.6 !important;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace !important;
        }
        .wmde-markdown {
          font-size: 13px !important;
          line-height: 1.6 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }
        .wmde-markdown h1 { font-size: 1.5em !important; }
        .wmde-markdown h2 { font-size: 1.25em !important; border-bottom: 1px solid #eee; padding-bottom: 0.25em; }
        .wmde-markdown h3 { font-size: 1.05em !important; }
        .wmde-markdown table { border-collapse: collapse; width: 100%; }
        .wmde-markdown th, .wmde-markdown td { border: 1px solid #e5e5e5; padding: 5px 8px; font-size: 11px; }
        .wmde-markdown th { background: #f8f8f8; font-weight: 600; font-size: 10px; text-transform: uppercase; }
        .w-md-editor-preview {
          padding: 12px 20px !important;
        }
        .w-md-editor-input {
          padding: 12px 16px !important;
        }
      `}</style>
    </div>
  )
})

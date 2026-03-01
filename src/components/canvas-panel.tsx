"use client"

import { DiscoveryCanvas } from "@/components/discovery-canvas"
import type { CanvasData } from "@/lib/canvas-storage"

export interface CanvasPanelProps {
  showCanvas: boolean
  canvasWidth: number
  documents: CanvasData["documents"]
  activeDocumentId: string | undefined
  onDocumentSelect: (identifier: string) => void
  onApprove: (identifier: string) => void
  onVersionChange: (identifier: string, version: number) => void
  onDocumentClose: (identifier: string) => void
  onClose: () => void
  onResizeStart: (e: React.MouseEvent) => void
}

export function CanvasPanel({
  showCanvas,
  canvasWidth,
  documents,
  activeDocumentId,
  onDocumentSelect,
  onApprove,
  onVersionChange,
  onDocumentClose,
  onClose,
  onResizeStart,
}: CanvasPanelProps) {
  return (
    <div
      className={`fixed top-0 right-0 h-full border-l bg-background z-20 transform transition-transform duration-300 ease-in-out ${
        showCanvas ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ width: canvasWidth }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-10"
      />
      <DiscoveryCanvas
        documents={documents}
        activeDocumentId={activeDocumentId}
        onDocumentSelect={onDocumentSelect}
        onApprove={onApprove}
        onVersionChange={onVersionChange}
        onDocumentClose={onDocumentClose}
        onClose={onClose}
      />
    </div>
  )
}

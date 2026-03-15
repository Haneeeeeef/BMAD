"use client"

import type { DeliverableTask } from "@/lib/bmad-types"
import type { ToolAction } from "@/components/activity-feed"
import { WorkflowSteps } from "./workflow-steps"
import { ActivityFeed } from "@/components/activity-feed"
import { DocumentsList, type DocumentItem } from "./documents-list"

interface WorkspaceRightPanelProps {
  steps: DeliverableTask[]
  toolActions: ToolAction[]
  isPolling?: boolean
  documents: DocumentItem[]
  onViewDocument?: (doc: DocumentItem) => void
  onDownloadDocument?: (doc: DocumentItem) => void
  onMarkDocumentComplete?: () => void
}

export function WorkspaceRightPanel({
  steps,
  toolActions,
  isPolling,
  documents,
  onViewDocument,
  onDownloadDocument,
  onMarkDocumentComplete,
}: WorkspaceRightPanelProps) {
  return (
    <aside aria-label="Workflow details" className="w-[300px] shrink-0 border-l border-border/20 flex flex-col overflow-hidden shadow-[-4px_0_24px_rgba(0,0,0,0.06)] backdrop-blur-2xl" style={{ background: "linear-gradient(180deg, rgba(250,250,250,0.96) 0%, rgba(245,245,245,0.94) 50%, rgba(240,240,240,0.92) 100%)" }}>
      {/* Workflow Steps */}
      <WorkflowSteps steps={steps} />

      {/* Documents — right after workflow */}
      <DocumentsList
        documents={documents}
        onView={onViewDocument}
        onDownload={onDownloadDocument}
        onMarkComplete={onMarkDocumentComplete ? () => onMarkDocumentComplete() : undefined}
      />

      {/* Activity — at bottom */}
      <ActivityFeed actions={toolActions} isPolling={isPolling} />
    </aside>
  )
}

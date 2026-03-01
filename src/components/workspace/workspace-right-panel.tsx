"use client"

import type { DeliverableTask } from "@/lib/bmad-types"
import type { ActivityEntry } from "@/components/agent-panel"
import { WorkflowSteps } from "./workflow-steps"
import { ActivityFeed } from "@/components/activity-feed"
import { DocumentsList, type DocumentItem } from "./documents-list"

interface WorkspaceRightPanelProps {
  steps: DeliverableTask[]
  activityEntries: ActivityEntry[]
  documents: DocumentItem[]
  onViewDocument?: (doc: DocumentItem) => void
  onDownloadDocument?: (doc: DocumentItem) => void
  onMarkDocumentComplete?: () => void
}

export function WorkspaceRightPanel({
  steps,
  activityEntries,
  documents,
  onViewDocument,
  onDownloadDocument,
  onMarkDocumentComplete,
}: WorkspaceRightPanelProps) {
  return (
    <aside aria-label="Workflow details" className="w-[300px] shrink-0 border-l border-border bg-background flex flex-col overflow-hidden">
      {/* Workflow Steps — fixed at top */}
      <WorkflowSteps steps={steps} />

      {/* Activity — fixed middle */}
      <ActivityFeed variant="detailed" entries={activityEntries} />

      {/* Documents — fills remaining space */}
      <DocumentsList
        documents={documents}
        onView={onViewDocument}
        onDownload={onDownloadDocument}
        onMarkComplete={onMarkDocumentComplete ? () => onMarkDocumentComplete() : undefined}
      />
    </aside>
  )
}

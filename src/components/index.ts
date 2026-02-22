// Re-export all custom components for easy importing
// Usage: import { SearchBar, MultiSelect, ... } from "@/components"

// Forms & Inputs
export { TextInput } from "./text-input"
export { SearchBar } from "./search-bar"
export { MultiSelect } from "./multi-select"
export { FilterSelect } from "./filter-select"
export { FileUpload } from "./file-upload"
export { ChatInput, type ChatInputHandle } from "./chat-input"

// Buttons
export { BrandButton } from "./brand-button"

// Search
export { ChatSearch, type SearchItem } from "./chat-search"

// Actions
export { RowActions } from "./row-actions"

// Data Display
export { DataTable, createSortableHeader } from "./data-table"
export { DocumentViewer } from "./document-viewer"
export { ActivityFeed } from "./activity-feed"
export { ActivityItem } from "./activity-item"

// Cards
export { StageCard } from "./stage-card"
export { AgentCard } from "./agent-card"
export { StatCard } from "./stat-card"

// Status & Visual
export { StatusBadge, type Status } from "./status-badge"
export { StatusText, type StatusType } from "./status-text"
export { StageBadge } from "./stage-badge"
export { AgentAvatar, AgentAvatarGroup } from "./agent-avatar"
export { ArtifactIcon, getFileType } from "./artifact-icon"
export { ExportButton } from "./export-button"

// Layout & Navigation
export { TopNav } from "./top-nav"
export { PageHeader } from "./page-header"
export { Sidebar, SidebarItem, SidebarSection } from "./sidebar"
export { TabNav, type Tab } from "./tab-nav"

// Modals & Dialogs
export { ResponsiveModal } from "./responsive-modal"
export { DetailSheet } from "./detail-sheet"
export { ConfirmDialog } from "./confirm-dialog"

// Feedback
export { EmptyState } from "./empty-state"
export {
  SkeletonCard,
  ProjectCardSkeleton,
  StageCardSkeleton,
  ActivitySkeleton,
  StatsSkeleton,
  PageSkeleton,
} from "./skeleton-card"

// Chat
export { ChatMessage } from "./chat-message"

// Canvas
export { DiscoveryCanvas } from "./discovery-canvas"
export { CanvasStatusBadge } from "./canvas-status-badge"
export { CanvasSectionNav } from "./canvas-section-nav"

// App Shell & Error Handling
export { AppShell } from "./app-shell"
export { ErrorBoundary } from "./error-boundary"

// Toast helper
export { toast } from "sonner"

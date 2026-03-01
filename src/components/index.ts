// Barrel exports for components
export { ActivityFeed } from "./activity-feed"
export type { ToolAction, ActivityFeedProps } from "./activity-feed"
export { AgentAvatar } from "./agent-avatar"
export { AgentCard } from "./agent-card"
export { AppShell } from "./app-shell"
export { ArtifactIcon } from "./artifact-icon"
export { BackButton } from "./back-button"
export { BrandButton } from "./brand-button"
export { CanvasSectionNav } from "./canvas-section-nav"
export { CanvasStatusBadge } from "./canvas-status-badge"
export { ChatInput, type ChatInputHandle, type ChatAttachment, type ActiveToggles } from "./chat-input"
export { ChatMessage } from "./chat-message"
export { ChatSearch, type SearchItem } from "./chat-search"
export { ConfirmDialog } from "./confirm-dialog"
export { DataTable } from "./data-table"
export { DetailSheet } from "./detail-sheet"
export { DiscoveryCanvas } from "./discovery-canvas"
export { DocumentViewer } from "./document-viewer"
export { EmptyState } from "./empty-state"
export { ErrorBoundary } from "./error-boundary"
export { ExcalidrawDiagram } from "./excalidraw-diagram"
export { ExportButton } from "./export-button"
export { FileUpload } from "./file-upload"
export { FilterSelect } from "./filter-select"
export { MermaidDiagram } from "./mermaid-diagram"
export { MultiSelect } from "./multi-select"
export { PageHeader } from "./page-header"
export { ResponsiveModal } from "./responsive-modal"
export { RowActions } from "./row-actions"
export { SearchBar } from "./search-bar"
export { SkeletonCard } from "./skeleton-card"
export { StageBadge } from "./stage-badge"
export { StageCard } from "./stage-card"
export { StatCard } from "./stat-card"
export { StatusBadge } from "./status-badge"
export { StatusText } from "./status-text"
export { TabNav } from "./tab-nav"
export { TextInput } from "./text-input"
export { TopNav } from "./top-nav"

// Re-export sidebar components
export { Sidebar, SidebarItem, SidebarSection } from "./sidebar"

// Workflow components
export { WorkflowPicker } from "./workflow-picker"

// Project workspace components
export { DocumentPicker } from "./document-picker"
export { ProjectWorkspace } from "./project-workspace"
export { OrchestrationWorkspace } from "./orchestration-workspace"
export { ValidationPanel } from "./validation-panel"
export { TaskKanban } from "./task-kanban"
export { AgentPanel, ActivityLog } from "./agent-panel"

// Project creation components
export { ProjectTypeSelector, type ProjectType } from "./project-type-selector"
export { ProjectIntake } from "./project-intake"
export { TemplateSelector } from "./template-selector"

// UI components (reusable)
export { SelectionCard, type SelectionCardProps } from "./ui/selection-card"
export { OnboardingHeader, type OnboardingHeaderProps } from "./ui/onboarding-header"
export { BottomBar, BottomBarButton } from "./ui/bottom-bar"

// File upload
export { FileUploadZone } from "./file-upload-zone"

// Project cards
export { ProjectCard, type ProjectCardProps, DraftCard } from "./project-card"

// Context & Memory
export { ContextViewer } from "./context-viewer"
export { ContextIndicator } from "./context-indicator"

// Chat components
export { JarvisChat } from "./jarvis-chat"
export { ChatHeader } from "./chat-header"
export { CanvasPanel, type CanvasPanelProps } from "./canvas-panel"

// Auth & Layout
export { AuthenticatedLayout } from "./authenticated-layout"
export { ApprovalModal } from "./approval-modal"

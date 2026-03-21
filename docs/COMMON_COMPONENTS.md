# Common Components

> Always check `index.ts` before creating new. All imports from `@/components`.

---

## Chat

| Component | Description | Import |
|-----------|-------------|--------|
| `ChatInput` | Auto-resize textarea, attachments (image/file/audio), paste images | `import { ChatInput } from "@/components"` |
| `ChatMessage` | Markdown render, code blocks, Mermaid/Excalidraw, copy/feedback | `import { ChatMessage } from "@/components"` |
| `JarvisChat` | Floating chat widget with context indicator | `import { JarvisChat } from "@/components"` |
| `ChatSearch` | Cmd+K search dialog, project filtering, keyboard nav | `import { ChatSearch } from "@/components"` |
| `ChatHeader` | Chat panel header with agent info | `import { ChatHeader } from "@/components"` |

---

## Workspace (main UI — `src/components/workspace/`)

| Component | Description | Import |
|-----------|-------------|--------|
| `WorkspaceSidebar` | 260px left panel — deliverables + agents list | `import { WorkspaceSidebar } from "@/components/workspace"` |
| `DeliverablesList` | Deliverables with status badges | `import { DeliverablesList } from "@/components/workspace"` |
| `AgentsList` | Agent avatars, roles, status dots | `import { AgentsList } from "@/components/workspace"` |
| `StatusDot` | Small colored status indicator dot | `import { StatusDot } from "@/components/workspace"` |
| `WorkspaceRightPanel` | 300px right panel — workflow steps + activity + docs | `import { WorkspaceRightPanel } from "@/components/workspace"` |
| `WorkflowSteps` | Vertical timeline of workflow steps with progress | `import { WorkflowSteps } from "@/components/workspace"` |
| `DocumentsList` | Artifacts + project docs with view/download | `import { DocumentsList } from "@/components/workspace"` |
| `AgentDetailPanel` | 520px slide-in with full agent info + persona | `import { AgentDetailPanel } from "@/components/workspace"` |
| `DocumentViewerPanel` | 520px slide-in markdown viewer + Word/MD export | `import { DocumentViewerPanel } from "@/components/workspace"` |

---

## Canvas & Documents

| Component | Description | Import |
|-----------|-------------|--------|
| `DiscoveryCanvas` | Multi-doc canvas, versioning, approve/reject, export | `import { DiscoveryCanvas } from "@/components"` |
| `CanvasPanel` | Canvas container panel | `import { CanvasPanel } from "@/components"` |
| `CanvasStatusBadge` | draft / awaiting_approval / approved badge | `import { CanvasStatusBadge } from "@/components"` |
| `CanvasSectionNav` | Section navigation within canvas | `import { CanvasSectionNav } from "@/components"` |
| `DocumentViewer` | Preview/raw toggle, syntax highlight | `import { DocumentViewer } from "@/components"` |
| `DocumentPicker` | Pick document from list | `import { DocumentPicker } from "@/components"` |
| `MermaidDiagram` | Standard Mermaid rendering (lazy) | `import { MermaidDiagram } from "@/components"` |
| `ExcalidrawDiagram` | Mermaid → hand-drawn (lazy) | `import { ExcalidrawDiagram } from "@/components"` |
| `MemoizedMarkdown` | Perf-optimized markdown renderer | internal — use via ChatMessage |

---

## Layout

| Component | Description | Import |
|-----------|-------------|--------|
| `AppShell` | Sidebar + main layout, Cmd+B toggle, error boundary | `import { AppShell } from "@/components"` |
| `AuthenticatedLayout` | Auth check + route-based sidebar hiding | `import { AuthenticatedLayout } from "@/components"` |
| `PageHeader` | Title, description, action buttons | `import { PageHeader } from "@/components"` |
| `TopNav` | Top navigation bar | `import { TopNav } from "@/components"` |
| `TabNav` | Tab-style navigation | `import { TabNav } from "@/components"` |
| `BackButton` | Navigation back button | `import { BackButton } from "@/components"` |
| `Sidebar` | Collapsible sessions sidebar | `import { Sidebar } from "@/components"` |
| `SidebarItem` | Link or button with icon + delete action | `import { SidebarItem } from "@/components"` |
| `SidebarSection` | Collapsible sidebar section | `import { SidebarSection } from "@/components"` |

---

## Forms & Inputs

| Component | Description | Import |
|-----------|-------------|--------|
| `TextInput` | Label, error, hint — 16px font (no iOS zoom) | `import { TextInput } from "@/components"` |
| `SearchBar` | Search icon, clear, enter-to-submit | `import { SearchBar } from "@/components"` |
| `MultiSelect` | Search, multi-select with badges | `import { MultiSelect } from "@/components"` |
| `FilterSelect` | Compact borderless filter dropdown | `import { FilterSelect } from "@/components"` |
| `FileUpload` | Drag/drop, preview, multi-file, size limits | `import { FileUpload } from "@/components"` |
| `FileUploadZone` | Drop zone only (no preview UI) | `import { FileUploadZone } from "@/components"` |

---

## Data Display

| Component | Description | Import |
|-----------|-------------|--------|
| `DataTable` | TanStack table — sort, pagination, row click, skeleton | `import { DataTable } from "@/components"` |
| `ActivityFeed` | Timestamped agent activity entries | `import { ActivityFeed } from "@/components"` |
| `ContextViewer` | Token usage viewer | `import { ContextViewer } from "@/components"` |
| `ContextIndicator` | Token % bar, auto-fetches from `/api/session/status` | `import { ContextIndicator } from "@/components"` |
| `ExportButton` | Dropdown — JSON/CSV/MD/ZIP | `import { ExportButton } from "@/components"` |
| `RowActions` | Hover-reveal row action buttons | `import { RowActions } from "@/components"` |

---

## Cards

| Component | Description | Import |
|-----------|-------------|--------|
| `ProjectCard` | Name, description, status, progress, agents | `import { ProjectCard } from "@/components"` |
| `StageCard` | Stage name, status, progress bar, active ring | `import { StageCard } from "@/components"` |
| `AgentCard` | Name, role, status, current task | `import { AgentCard } from "@/components"` |
| `StatCard` | Title, value, description, icon | `import { StatCard } from "@/components"` |
| `WorkspaceCard` | Workspace entry card | `import { WorkspaceCard } from "@/components"` |
| `SkeletonCard` | Configurable loading skeleton | `import { SkeletonCard } from "@/components"` |

---

## Status & Indicators

| Component | Description | Import |
|-----------|-------------|--------|
| `StatusBadge` | pending / running / completed / error / waiting | `import { StatusBadge } from "@/components"` |
| `StageBadge` | Workflow stage indicator | `import { StageBadge } from "@/components"` |
| `StatusText` | Inline status text | `import { StatusText } from "@/components"` |
| `AgentAvatar` | 10 agent types, colored circles, active indicator | `import { AgentAvatar } from "@/components"` |
| `ArtifactIcon` | File type icons (md, json, ts, etc.) | `import { ArtifactIcon } from "@/components"` |

---

## Modals & Overlays

| Component | Description | Import |
|-----------|-------------|--------|
| `ResponsiveModal` | Dialog on desktop, Drawer on mobile | `import { ResponsiveModal } from "@/components"` |
| `DetailSheet` | Right-side panel (sm/md/lg/xl widths) | `import { DetailSheet } from "@/components"` |
| `ConfirmDialog` | Destructive/default confirm, loading state | `import { ConfirmDialog } from "@/components"` |
| `ApprovalModal` | Approve action modal | `import { ApprovalModal } from "@/components"` |

```tsx
// ConfirmDialog usage
<ConfirmDialog
  open={open}
  title="Delete Project"
  description="This cannot be undone."
  variant="destructive"
  onConfirm={handleDelete}
  loading={isDeleting}
/>
```

---

## Feedback

| Component | Description | Import |
|-----------|-------------|--------|
| `EmptyState` | Title, description, action button, icon | `import { EmptyState } from "@/components"` |
| `ErrorBoundary` | Catch + retry with custom fallback | `import { ErrorBoundary } from "@/components"` |
| `toast` | Success/error/info/loading — via sonner | `import { toast } from "sonner"` |

```tsx
toast.success("Saved")
toast.error("Failed to save")
toast.loading("Saving...")
```

---

## Project Creation Flow

| Component | Description | Import |
|-----------|-------------|--------|
| `ProjectTypeSelector` | Greenfield vs brownfield selector | `import { ProjectTypeSelector } from "@/components"` |
| `ProjectIntake` | Project creation form | `import { ProjectIntake } from "@/components"` |
| `TemplateSelector` | Template picker | `import { TemplateSelector } from "@/components"` |
| `WorkflowPicker` | Workflow selection | `import { WorkflowPicker } from "@/components"` |

---

## UI Primitives (`src/components/ui/`)

| Component | Import |
|-----------|--------|
| `SelectionCard` | `import { SelectionCard } from "@/components/ui/selection-card"` |
| `OnboardingHeader` | `import { OnboardingHeader } from "@/components/ui/onboarding-header"` |
| `BottomBar` | `import { BottomBar, BottomBarButton } from "@/components/ui/bottom-bar"` |

---

## shadcn Components (in `src/components/ui/`)

```
card badge progress button sidebar breadcrumb scroll-area separator skeleton
dialog avatar dropdown-menu sheet tooltip input select switch command
alert-dialog sonner drawer textarea popover label checkbox radio-group tabs table
```

Import directly: `import { Button } from "@/components/ui/button"`

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B` | Toggle sidebar |
| `Cmd+K` | Open search |
| `Enter` | Send message |
| `Shift+Enter` | New line in chat |
| `Escape` | Close panels / blur |

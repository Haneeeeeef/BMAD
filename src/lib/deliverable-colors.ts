// Color palette for deliverables - each deliverable gets a distinct color
// Colors are designed to be visible on both light and dark backgrounds

export const DELIVERABLE_COLORS = [
  { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-700", dot: "bg-blue-500" },
  { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-700", dot: "bg-purple-500" },
  { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-700", dot: "bg-amber-500" },
  { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-700", dot: "bg-emerald-500" },
  { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-700", dot: "bg-rose-500" },
  { bg: "bg-cyan-100", border: "border-cyan-400", text: "text-cyan-700", dot: "bg-cyan-500" },
  { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-700", dot: "bg-orange-500" },
  { bg: "bg-indigo-100", border: "border-indigo-400", text: "text-indigo-700", dot: "bg-indigo-500" },
] as const

export type DeliverableColor = typeof DELIVERABLE_COLORS[number]

export function getDeliverableColor(index: number): DeliverableColor {
  return DELIVERABLE_COLORS[index % DELIVERABLE_COLORS.length]
}

// Agent status colors
export const AGENT_STATUS = {
  active: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  idle: { bg: "bg-zinc-100", text: "text-zinc-500", dot: "bg-zinc-400" },
  thinking: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  error: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
} as const

// Kanban column definitions (matches Task status: pending | active | complete)
export const KANBAN_COLUMNS = [
  { id: "backlog", label: "Backlog", status: ["pending"] },
  { id: "in-progress", label: "In Progress", status: ["active"] },
  { id: "done", label: "Done", status: ["complete"] },
] as const

export type KanbanColumnId = typeof KANBAN_COLUMNS[number]["id"]

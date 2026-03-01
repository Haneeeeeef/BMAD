"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { User, Bot } from "lucide-react"
import { Deliverable, DeliverableTask } from "@/lib/bmad-types"
import { getDeliverableColor, KANBAN_COLUMNS, KanbanColumnId } from "@/lib/deliverable-colors"
import { cn } from "@/lib/utils"

type TaskWithContext = DeliverableTask & {
  deliverableId: string
  deliverableName: string
  deliverableIndex: number
  agentName?: string
}

type TaskKanbanProps = {
  deliverables: Deliverable[]
  onTaskClick?: (task: TaskWithContext) => void
  activeTaskId?: string
}

export function TaskKanban({ deliverables, onTaskClick, activeTaskId }: TaskKanbanProps) {
  // Flatten all tasks from all deliverables with context
  const allTasks = useMemo(() => {
    const tasks: TaskWithContext[] = []
    deliverables.forEach((deliverable, deliverableIndex) => {
      deliverable.tasks.forEach((task) => {
        tasks.push({
          ...task,
          deliverableId: deliverable.id,
          deliverableName: deliverable.name,
          deliverableIndex,
          agentName: deliverable.status === "in-progress" ? "Jarvis" : undefined,
        })
      })
    })
    return tasks
  }, [deliverables])

  // Group tasks by kanban column (pending → active → complete)
  const columns = useMemo(() => {
    const grouped: Record<KanbanColumnId, TaskWithContext[]> = {
      "backlog": [],
      "in-progress": [],
      "done": [],
    }

    allTasks.forEach((task) => {
      if (task.status === "complete") {
        grouped.done.push(task)
      } else if (task.status === "active") {
        grouped["in-progress"].push(task)
      } else {
        grouped.backlog.push(task)
      }
    })

    return grouped
  }, [allTasks])

  // Calculate column stats
  const totalTasks = allTasks.length
  const doneTasks = columns.done.length
  const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-700">Tasks</h2>
          <span className="text-xs text-zinc-400">{doneTasks}/{totalTasks}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500">{progressPercent}%</span>
        </div>
      </div>

      {/* Deliverable Legend */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-100 bg-zinc-50/50 overflow-x-auto">
        {deliverables.map((d, i) => {
          const color = getDeliverableColor(i)
          return (
            <div key={d.id} className="flex items-center gap-1.5 shrink-0">
              <div className={cn("w-2 h-2 rounded-full", color.dot)} />
              <span className="text-[10px] text-zinc-500 whitespace-nowrap">{d.name}</span>
            </div>
          )
        })}
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 flex gap-2 p-3 overflow-x-auto bg-zinc-50/50">
        {KANBAN_COLUMNS.map((column) => (
          <div key={column.id} className="flex-1 min-w-[140px] max-w-[200px] flex flex-col">
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {column.label}
              </span>
              <span className="text-[10px] text-zinc-400">
                {columns[column.id].length}
              </span>
            </div>

            {/* Column Tasks */}
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {columns[column.id].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isActive={task.id === activeTaskId}
                  onClick={() => onTaskClick?.(task)}
                />
              ))}
              {columns[column.id].length === 0 && (
                <div className="py-4 text-center text-[10px] text-zinc-300">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskCard({
  task,
  isActive,
  onClick
}: {
  task: TaskWithContext
  isActive: boolean
  onClick: () => void
}) {
  const color = getDeliverableColor(task.deliverableIndex)

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full p-2 rounded-md text-left transition-all",
        "border-l-3 shadow-sm",
        color.bg,
        color.border,
        isActive && "ring-2 ring-[var(--brand)] ring-offset-1"
      )}
      style={{ borderLeftWidth: "3px" }}
    >
      {/* Task name */}
      <div className={cn("text-xs font-medium truncate", color.text)}>
        {task.name}
      </div>

      {/* Deliverable + Agent */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-zinc-400 truncate max-w-[80px]">
          {task.deliverableName}
        </span>
        {task.agentName && task.status === "active" && (
          <div className="flex items-center gap-0.5">
            <Bot className="w-2.5 h-2.5 text-zinc-400" />
            <span className="text-[9px] text-zinc-400">{task.agentName}</span>
          </div>
        )}
      </div>
    </motion.button>
  )
}

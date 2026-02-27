import Link from "next/link"
import { ArrowRight } from "lucide-react"

export type MissionCardProps = {
  id: string
  name: string
  mode: string
  stage: string
  progress: number
  eligible?: string
  owner: string
  tags?: string[]
  updatedAt: string
  href?: string
}

export function MissionCard({
  id,
  name,
  mode,
  stage,
  progress,
  eligible,
  owner,
  tags = [],
  updatedAt,
  href,
}: MissionCardProps) {
  const linkHref = href || `/missions/${id}`

  return (
    <Link href={linkHref} className="block group">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6
        border border-zinc-200 dark:border-zinc-800
        shadow-sm
        hover:shadow-lg hover:-translate-y-1
        hover:border-zinc-300 dark:hover:border-zinc-700
        transition-all duration-200 ease-out">

        {/* Header: Stage + Mode */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            {stage}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {mode}
          </span>
        </div>

        {/* Name */}
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {name}
        </h3>

        {/* Progress + Eligible row */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Progress</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{progress}</span>
          </div>
          {eligible && (
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">→</span>
              <span className="text-zinc-600 dark:text-zinc-300">{eligible}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md text-xs
                  bg-zinc-100 text-zinc-600
                  dark:bg-zinc-800 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer: Owner + Time */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500
              flex items-center justify-center">
              <span className="text-[10px] font-medium text-white">
                {owner.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{owner}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{updatedAt}</span>
            <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500
              group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </Link>
  )
}

export function DraftCard({
  id,
  name,
  mode,
  updatedAt,
}: {
  id: string
  name: string
  mode?: string
  updatedAt?: string
}) {
  return (
    <Link href={`/new?draft=${id}`} className="block group">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6
        border border-dashed border-zinc-300 dark:border-zinc-700
        hover:border-zinc-400 dark:hover:border-zinc-600
        hover:shadow-md
        transition-all duration-200">

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
            Draft
          </span>
          {mode && <span className="text-xs text-zinc-400">{mode}</span>}
        </div>

        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          {name}
        </h3>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {updatedAt && <span className="text-xs text-zinc-400">{updatedAt}</span>}
          <span className="inline-flex items-center text-sm text-zinc-500
            group-hover:text-zinc-700 dark:group-hover:text-zinc-300 ml-auto">
            Continue
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  )
}

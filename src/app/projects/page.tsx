"use client"

import { useState } from "react"
import Link from "next/link"
import { SearchBar, StageBadge, StatusText, FilterSelect, BrandButton, RowActions, ResponsiveModal } from "@/components"
import { mockProjects } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Plus, SlidersHorizontal } from "lucide-react"

const clients = ["All Clients", ...new Set(mockProjects.map(p => p.client))]
const stages = ["All Stages", "Research", "PRFAQ", "Requirements", "UI Design", "Architecture", "Stories", "Scaffold", "DevOps", "QA", "Documentation"]
const statuses = ["All Statuses", "In Progress", "Waiting Approval", "Blocked", "Completed", "Not Started"]

export default function ProjectsPage() {
  const [search, setSearch] = useState("")
  const [clientFilter, setClientFilter] = useState("All Clients")
  const [stageFilter, setStageFilter] = useState("All Stages")
  const [statusFilter, setStatusFilter] = useState("All Statuses")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = mockProjects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesClient = clientFilter === "All Clients" || p.client === clientFilter
    const matchesStage = stageFilter === "All Stages" || p.currentStage === stageFilter
    const matchesStatus = statusFilter === "All Statuses" ||
      (statusFilter === "In Progress" && p.status === "running") ||
      (statusFilter === "Waiting Approval" && p.status === "waiting") ||
      (statusFilter === "Blocked" && p.status === "error") ||
      (statusFilter === "Completed" && p.status === "completed") ||
      (statusFilter === "Not Started" && p.status === "pending")
    return matchesSearch && matchesClient && matchesStage && matchesStatus
  })

  const activeFilters = [clientFilter, stageFilter, statusFilter].filter(f => !f.startsWith("All")).length

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-semibold">Projects</h1>
        <Link href="/new">
          <BrandButton size="default" className="h-10">
            <Plus className="h-4 w-4 mr-1" />
            Create Project
          </BrandButton>
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 mb-4">
        <SearchBar
          placeholder="Search projects..."
          onChange={setSearch}
          className="flex-1"
        />
        {/* Mobile: Filters button */}
        <Button
          variant="outline"
          size="default"
          className="sm:hidden h-10"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeFilters > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </Button>
        {/* Desktop: Inline filters */}
        <div className="hidden sm:flex gap-2">
          <FilterSelect value={clientFilter} onValueChange={setClientFilter} options={clients} />
          <FilterSelect value={stageFilter} onValueChange={setStageFilter} options={stages} />
          <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={statuses} />
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      <ResponsiveModal
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filters"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Client</label>
            <FilterSelect value={clientFilter} onValueChange={setClientFilter} options={clients} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
            <FilterSelect value={stageFilter} onValueChange={setStageFilter} options={stages} className="w-full" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Status</label>
            <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={statuses} className="w-full" />
          </div>
          <BrandButton className="w-full" onClick={() => setFiltersOpen(false)}>Apply Filters</BrandButton>
        </div>
      </ResponsiveModal>

      {/* Table Container - scrollable on mobile */}
      <div className="overflow-x-auto border rounded-lg">
        <div className="min-w-[640px]">
          {/* Column Headers */}
          <div className="grid grid-cols-[70px_1fr_100px_100px_70px_100px_40px] gap-4 px-4 py-2 text-xs text-muted-foreground border-b bg-muted/30">
            <span>Code</span>
            <span>Project</span>
            <span>Client</span>
            <span className="text-center">Stage</span>
            <span className="text-center">Progress</span>
            <span className="text-center">Status</span>
            <span></span>
          </div>

          {/* Project List */}
          <div className="divide-y">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No projects found
              </div>
            ) : (
              filtered.map((project) => (
                <div
                  key={project.id}
                  className="group grid grid-cols-[70px_1fr_100px_100px_70px_100px_40px] gap-4 items-center p-4 hover:bg-muted/50 transition-colors text-xs"
                >
                  <Link href={`/projects/${project.id}`} className="text-muted-foreground font-mono">{project.code}</Link>
                  <Link href={`/projects/${project.id}`} className="truncate">{project.name}</Link>
                  <Link href={`/projects/${project.id}`} className="text-muted-foreground truncate">{project.client}</Link>
                  <Link href={`/projects/${project.id}`} className="text-center">
                    <StageBadge stage={project.currentStage} />
                  </Link>
                  <Link href={`/projects/${project.id}`} className="text-center text-muted-foreground">{project.progress}%</Link>
                  <Link href={`/projects/${project.id}`} className="flex justify-center">
                    <StatusText status={project.status} />
                  </Link>
                  <div className="flex justify-center">
                    <RowActions
                      actions={[
                        { label: "Edit" },
                        { label: "Put on Hold" },
                        { label: "Archive", variant: "danger", separator: true },
                      ]}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

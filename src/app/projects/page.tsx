"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { SearchBar, StageBadge, StatusText, FilterSelect, BrandButton, TabNav, ResponsiveModal } from "@/components"
import { mockProjects } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Plus, SlidersHorizontal, ChevronRight } from "lucide-react"

const clients = ["All Clients", ...new Set(mockProjects.map(p => p.client))]
const stages = ["All Stages", "Research", "PRFAQ", "Requirements", "UI Design", "Architecture", "Stories", "Scaffold", "DevOps", "QA", "Documentation"]

const tabs = [
  { id: "all", label: "All Projects" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "archived", label: "Archived" },
]

export default function ProjectsPage() {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [clientFilter, setClientFilter] = useState("All Clients")
  const [stageFilter, setStageFilter] = useState("All Stages")
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Memoized handlers
  const handleOpenFilters = useCallback(() => setFiltersOpen(true), [])
  const handleCloseFilters = useCallback(() => setFiltersOpen(false), [])

  const filtered = mockProjects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesClient = clientFilter === "All Clients" || p.client === clientFilter
    const matchesStage = stageFilter === "All Stages" || p.currentStage === stageFilter
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && (p.status === "running" || p.status === "waiting" || p.status === "pending")) ||
      (activeTab === "completed" && p.status === "completed") ||
      (activeTab === "archived" && p.status === "error")
    return matchesSearch && matchesClient && matchesStage && matchesTab
  })

  const activeFilters = [clientFilter, stageFilter].filter(f => !f.startsWith("All")).length

  return (
    <div className="flex flex-col h-full">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <span className="text-lg font-medium">Explore Projects</span>
        <Link href="/new">
          <BrandButton size="sm" className="h-8 gap-1.5 rounded-full px-4">
            <Plus className="h-3.5 w-3.5" />
            Create
          </BrandButton>
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Hero Section */}
        <div className="text-center pt-8 pb-6 px-4">
          <h1 className="text-5xl font-semibold mb-3">Projects</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Build and manage AI-powered development projects with automated workflows, from ideation to deployment.
          </p>
        </div>

        {/* Centered Search */}
        <div className="max-w-2xl mx-auto px-4 mb-6">
          <SearchBar
            placeholder="Search projects..."
            onChange={setSearch}
            variant="hero"
            className="w-full"
          />
        </div>

        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 mb-6">
          <TabNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {/* Desktop filters */}
            <div className="hidden sm:flex items-center gap-2">
              <FilterSelect value={clientFilter} onValueChange={setClientFilter} options={clients} />
              <FilterSelect value={stageFilter} onValueChange={setStageFilter} options={stages} />
            </div>
            {/* Mobile filter button */}
            <Button
              variant="ghost"
              size="sm"
              className="sm:hidden"
              onClick={handleOpenFilters}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilters > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </Button>
          </TabNav>
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
            <BrandButton className="w-full" onClick={handleCloseFilters}>Apply Filters</BrandButton>
          </div>
        </ResponsiveModal>

        {/* Projects List */}
        <div className="max-w-5xl mx-auto px-4 md:px-6 pb-8">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">No projects found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group flex items-center gap-4 p-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all"
                >
                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium truncate">{project.name}</span>
                      <StageBadge stage={project.currentStage} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono text-xs">{project.code}</span>
                      <span>{project.client}</span>
                      <span>{project.progress}% complete</span>
                    </div>
                  </div>

                  {/* Status */}
                  <StatusText status={project.status} />

                  {/* Arrow */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

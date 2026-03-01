"use client"

import type { Status } from "@/components/status-badge"
import { safeGetItem, safeSetItem } from "./safe-storage"

export interface Project {
  id: string
  code: string
  name: string
  client: string
  description: string
  status: Status
  currentStage: string
  progress: number
  agentCount: number
  createdAt: string
  chatSessionId?: string // Link back to the originating chat
}

const STORAGE_KEY = "projects"

// Load all projects from localStorage
export function loadProjects(): Project[] {
  if (typeof window === "undefined") return []
  try {
    const data = safeGetItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    console.error("[projects-storage] Failed to load projects")
    return []
  }
}

// Save all projects to localStorage
function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return
  try {
    safeSetItem(STORAGE_KEY, JSON.stringify(projects))
  } catch (err) {
    console.error("[projects-storage] Failed to save projects:", err)
  }
}

// Create a new project
export function createProject(project: Omit<Project, "id" | "createdAt">): Project {
  const projects = loadProjects()

  const newProject: Project = {
    ...project,
    id: `proj-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }

  projects.unshift(newProject)
  saveProjects(projects)

  return newProject
}

// Get a project by ID
export function getProject(id: string): Project | null {
  const projects = loadProjects()
  return projects.find(p => p.id === id) || null
}

// Update a project
export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = loadProjects()
  const index = projects.findIndex(p => p.id === id)

  if (index === -1) return null

  projects[index] = { ...projects[index], ...updates }
  saveProjects(projects)

  return projects[index]
}

// Delete a project
export function deleteProject(id: string): boolean {
  const projects = loadProjects()
  const filtered = projects.filter(p => p.id !== id)

  if (filtered.length === projects.length) return false

  saveProjects(filtered)
  return true
}

// Find project by chat session ID
export function findProjectByChatSession(chatSessionId: string): Project | null {
  const projects = loadProjects()
  return projects.find(p => p.chatSessionId === chatSessionId) || null
}

// Append a project with any shape (for BMAD projects that have a different type)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function appendProject(project: Record<string, any>): void {
  if (typeof window === "undefined") return
  try {
    const data = safeGetItem(STORAGE_KEY)
    const existing = data ? JSON.parse(data) : []
    existing.push(project)
    safeSetItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // Silent fail
  }
}

import { Status } from "@/components/status-badge"
interface Project {
  id: string
  code: string
  name: string
  client: string
  description: string
  status: string
  currentStage: string
  progress: number
  agentCount: number
  createdAt: string
  chatSessionId?: string
}

export interface Stage {
  id: string
  name: string
  status: Status
  progress: number
  agentCount: number
  output?: string
}

export interface Agent {
  id: string
  name: string
  role: string
  status: Status
  currentTask?: string
  tokensUsed: number
}

export interface Activity {
  id: string
  timestamp: string
  agent: string
  type: "started" | "progress" | "completed" | "error" | "question" | "human"
  message: string
}

// Projects - populated when real projects are created
export const mockProjects: Project[] = []

// Mock Stages for a project
export const mockStages: Stage[] = [
  { id: "research", name: "Research", status: "completed", progress: 100, agentCount: 0, output: "research.md" },
  { id: "prfaq", name: "PRFAQ", status: "completed", progress: 100, agentCount: 0, output: "PRFAQ.md" },
  { id: "requirements", name: "Requirements", status: "completed", progress: 100, agentCount: 0, output: "PRD.md" },
  { id: "ui", name: "UI Design", status: "completed", progress: 100, agentCount: 0, output: "Figma" },
  { id: "architecture", name: "Architecture", status: "running", progress: 65, agentCount: 2, output: "ARCH.md" },
  { id: "stories", name: "Stories", status: "pending", progress: 0, agentCount: 0 },
  { id: "scaffold", name: "Scaffold", status: "pending", progress: 0, agentCount: 0 },
  { id: "devops", name: "DevOps", status: "pending", progress: 0, agentCount: 0 },
  { id: "qa", name: "QA", status: "pending", progress: 0, agentCount: 0 },
  { id: "docs", name: "Documentation", status: "pending", progress: 0, agentCount: 0 },
]

// Mock Agents
export const mockAgents: Agent[] = [
  {
    id: "arch-1",
    name: "architect-1",
    role: "Architect Agent",
    status: "running",
    currentTask: "Designing microservices architecture",
    tokensUsed: 12450,
  },
  {
    id: "arch-2",
    name: "security-reviewer",
    role: "Security Agent",
    status: "running",
    currentTask: "Reviewing auth patterns",
    tokensUsed: 5230,
  },
]

// Mock Activity
export const mockActivities: Activity[] = [
  { id: "1", timestamp: "11:42", agent: "architect-1", type: "progress", message: "Defined 3 microservices: inventory, orders, reporting" },
  { id: "2", timestamp: "11:40", agent: "security", type: "progress", message: "Reviewing OAuth 2.0 implementation" },
  { id: "3", timestamp: "11:38", agent: "architect-1", type: "progress", message: "Analyzing database requirements" },
  { id: "4", timestamp: "11:35", agent: "PM", type: "started", message: "Architecture stage started" },
  { id: "5", timestamp: "11:30", agent: "Human", type: "human", message: "Approved UI designs" },
  { id: "6", timestamp: "11:25", agent: "ui-agent", type: "completed", message: "Created 12 wireframes in Figma" },
  { id: "7", timestamp: "11:20", agent: "ui-agent", type: "progress", message: "Designing dashboard layout" },
  { id: "8", timestamp: "11:15", agent: "PM", type: "started", message: "UI Design stage started" },
]

// Mock Stats
export const mockStats = {
  totalProjects: 3,
  activeAgents: 5,
  tokensToday: 45230,
  costToday: "$2.45",
}

// Mock Chats
export interface Chat {
  id: string
  title: string
  createdAt: string
  projectId?: string
}

export const mockChats: Chat[] = []

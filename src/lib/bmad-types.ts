// BMAD Workflow Types - Based on official BMAD-METHOD v6.0
// Source: https://github.com/bmad-code-org/BMAD-METHOD
// Total: 26 workflows across 4 phases + Quick Flow + Utility + Core

export type BmadPhase = {
  id: string
  name: string
  description: string
  order: number
  icon: string // Emoji for visual distinction
  color: string // Brand color for the phase
  workflows: BmadWorkflow[]
}

export type BmadWorkflow = {
  id: string
  phaseId: string
  name: string
  description: string
  trigger: string
  agent: string
  agentName: string
  agentEmoji: string // Visual identifier
  stepCount: number
  areas: string[] // List of conversation areas covered
  workflowPath: string
  outputArtifact?: string
  isQuickAction?: boolean // For frequently used workflows
  // Intelligence signals
  estimatedTime: string // e.g., "12–18 min"
  aiDepth: "Low" | "Medium" | "High" // Conversation complexity
  outputFormat: string // e.g., "Exec Brief PDF"
  impactArea: string // e.g., "Strategy", "Technical", "Process"
}

export type BmadProject = {
  id: string
  name: string
  mode: "new-build" | "enhancement" | "migration" | "clarification"
  description: string
  createdAt: number
  updatedAt: number

  currentPhase: string
  currentWorkflow: string | null
  currentDeliverable: string | null // Active deliverable ID

  context: {
    industry?: string
    techStack?: string
    timeline?: string
    stakeholders?: string
  }

  artifacts: Artifact[]
  deliverables: Deliverable[] // Ordered list of deliverables to create
  inputDocuments: string[] // Uploaded/referenced documents
  sessionId: string
}

// Backwards compatibility aliases
export type Project = BmadProject
export type Mission = BmadProject

export type Artifact = {
  id: string
  type: "brief" | "prd" | "ux" | "architecture" | "stories" | "code" | "research" | "sprint"
  name: string
  status: "draft" | "in-progress" | "complete"
  createdAt: number
  updatedAt: number
}

// Deliverable types for the new workspace UI
export type DeliverableType =
  // Analysis
  | "product-brief"
  | "domain-research"
  | "market-research"
  | "technical-research"
  // Planning
  | "prd"
  | "prototype"
  | "edit-prd"
  | "validate-prd"
  | "ux-design"
  // Solutioning
  | "architecture"
  | "epics-stories"
  | "implementation-readiness"
  // Implementation
  | "sprint-planning"
  | "create-story"
  | "dev-story"
  | "code-review"
  | "correct-course"
  | "retrospective"
  | "sprint-status"
  // Quick Flow
  | "quick-spec"
  | "quick-dev"
  // Utility
  | "generate-context"
  | "document-project"
  | "qa-tests"
  // Core
  | "brainstorming"
  | "party-mode"
  | "advanced-elicitation"

export type DeliverableTask = {
  id: string
  name: string // "Vision", "Target Users", etc.
  status: "pending" | "active" | "complete"
  content?: string // Gathered content from interview
}

export type Deliverable = {
  id: string
  type: DeliverableType
  workflowId: string // Links to BmadWorkflow
  name: string
  description: string
  status: "queued" | "in-progress" | "complete" | "validated"
  progress: number // 0-100
  tasks: DeliverableTask[]
  sessionId?: string // Per-deliverable OpenClaw session (each has its own 200k context)
  outputPath?: string
  validationScore?: number
  validationResults?: ValidationResult[]
  startedAt?: number
  completedAt?: number
}

export type ValidationResult = {
  id: string
  check: string
  status: "pass" | "warn" | "fail"
  message?: string
  suggestion?: string
}

// Available deliverables for document picker - All 27 workflows
export type DeliverablePhase = "analysis" | "planning" | "solutioning" | "implementation" | "quick-flow" | "utility" | "core"

export const AVAILABLE_DELIVERABLES: Array<{
  type: DeliverableType
  workflowId: string
  name: string
  description: string
  estimatedTime: string
  outputType: string
  phase: DeliverablePhase
  icon: string
}> = [
  // === ANALYSIS (4) ===
  {
    type: "product-brief",
    workflowId: "create-product-brief",
    name: "Product Brief",
    description: "Vision, users, market, value proposition",
    estimatedTime: "15 min",
    outputType: "Strategy document",
    phase: "analysis",
    icon: "📋",
  },
  {
    type: "domain-research",
    workflowId: "domain-research",
    name: "Domain Research",
    description: "Industry context, terminology, regulations",
    estimatedTime: "20 min",
    outputType: "Research report",
    phase: "analysis",
    icon: "🔍",
  },
  {
    type: "market-research",
    workflowId: "market-research",
    name: "Market Research",
    description: "Competitors, market size, positioning",
    estimatedTime: "25 min",
    outputType: "Market analysis",
    phase: "analysis",
    icon: "📊",
  },
  {
    type: "technical-research",
    workflowId: "technical-research",
    name: "Technical Research",
    description: "Tech stack evaluation, feasibility assessment",
    estimatedTime: "20 min",
    outputType: "Tech assessment",
    phase: "analysis",
    icon: "🔬",
  },

  // === PLANNING (5) ===
  {
    type: "prd",
    workflowId: "create-prd",
    name: "PRD",
    description: "Features, user stories, acceptance criteria",
    estimatedTime: "30 min",
    outputType: "Requirements doc",
    phase: "planning",
    icon: "📝",
  },
  {
    type: "prototype",
    workflowId: "create-prototype",
    name: "Prototype",
    description: "Visual screens from requirements using Pencil",
    estimatedTime: "20 min",
    outputType: "Pencil designs",
    phase: "planning",
    icon: "🎨",
  },
  {
    type: "edit-prd",
    workflowId: "edit-prd",
    name: "Edit PRD",
    description: "Modify and refine existing PRD",
    estimatedTime: "15 min",
    outputType: "Updated PRD",
    phase: "planning",
    icon: "✏️",
  },
  {
    type: "validate-prd",
    workflowId: "validate-prd",
    name: "Validate PRD",
    description: "Review PRD for completeness and feasibility",
    estimatedTime: "10 min",
    outputType: "Validation report",
    phase: "planning",
    icon: "✅",
  },
  {
    type: "ux-design",
    workflowId: "create-ux-design",
    name: "UX Design",
    description: "User flows, wireframes, design system",
    estimatedTime: "25 min",
    outputType: "UX specification",
    phase: "planning",
    icon: "🖼️",
  },

  // === SOLUTIONING (3) ===
  {
    type: "architecture",
    workflowId: "create-architecture",
    name: "Architecture",
    description: "System design, APIs, data model, ADRs",
    estimatedTime: "25 min",
    outputType: "Architecture doc",
    phase: "solutioning",
    icon: "🏗️",
  },
  {
    type: "epics-stories",
    workflowId: "create-epics-stories",
    name: "Epics & Stories",
    description: "Break requirements into implementable work",
    estimatedTime: "20 min",
    outputType: "Backlog items",
    phase: "solutioning",
    icon: "📚",
  },
  {
    type: "implementation-readiness",
    workflowId: "check-implementation-readiness",
    name: "Implementation Readiness",
    description: "Gate check before development begins",
    estimatedTime: "10 min",
    outputType: "PASS/FAIL decision",
    phase: "solutioning",
    icon: "🚦",
  },

  // === IMPLEMENTATION (7) ===
  {
    type: "sprint-planning",
    workflowId: "sprint-planning",
    name: "Sprint Planning",
    description: "Initialize tracking and sequence dev cycle",
    estimatedTime: "15 min",
    outputType: "Sprint status",
    phase: "implementation",
    icon: "🎯",
  },
  {
    type: "create-story",
    workflowId: "create-story",
    name: "Create Story",
    description: "Prepare next story for implementation",
    estimatedTime: "10 min",
    outputType: "Story file",
    phase: "implementation",
    icon: "📄",
  },
  {
    type: "dev-story",
    workflowId: "dev-story",
    name: "Dev Story",
    description: "Implement the story with code and tests",
    estimatedTime: "Variable",
    outputType: "Working code",
    phase: "implementation",
    icon: "💻",
  },
  {
    type: "code-review",
    workflowId: "code-review",
    name: "Code Review",
    description: "Validate implementation quality",
    estimatedTime: "15 min",
    outputType: "Review feedback",
    phase: "implementation",
    icon: "🔎",
  },
  {
    type: "correct-course",
    workflowId: "correct-course",
    name: "Correct Course",
    description: "Handle significant mid-sprint changes",
    estimatedTime: "10 min",
    outputType: "Updated plan",
    phase: "implementation",
    icon: "🔄",
  },
  {
    type: "retrospective",
    workflowId: "retrospective",
    name: "Retrospective",
    description: "Review after epic completion",
    estimatedTime: "15 min",
    outputType: "Lessons learned",
    phase: "implementation",
    icon: "🪞",
  },
  {
    type: "sprint-status",
    workflowId: "sprint-status",
    name: "Sprint Status",
    description: "Track progress and blockers",
    estimatedTime: "5 min",
    outputType: "Status update",
    phase: "implementation",
    icon: "📈",
  },

  // === QUICK FLOW (2) ===
  {
    type: "quick-spec",
    workflowId: "quick-spec",
    name: "Quick Spec",
    description: "Define an ad-hoc change rapidly",
    estimatedTime: "10 min",
    outputType: "Tech spec",
    phase: "quick-flow",
    icon: "⚡",
  },
  {
    type: "quick-dev",
    workflowId: "quick-dev",
    name: "Quick Dev",
    description: "Implement from spec or direct instructions",
    estimatedTime: "Variable",
    outputType: "Working code",
    phase: "quick-flow",
    icon: "🚀",
  },

  // === UTILITY (3) ===
  {
    type: "generate-context",
    workflowId: "generate-project-context",
    name: "Generate Context",
    description: "Create project-context.md from codebase",
    estimatedTime: "10 min",
    outputType: "Context file",
    phase: "utility",
    icon: "🧠",
  },
  {
    type: "document-project",
    workflowId: "document-project",
    name: "Document Project",
    description: "Generate documentation from code",
    estimatedTime: "15 min",
    outputType: "Documentation",
    phase: "utility",
    icon: "📖",
  },
  {
    type: "qa-tests",
    workflowId: "qa-generate-tests",
    name: "Generate Tests",
    description: "Create E2E tests for existing features",
    estimatedTime: "20 min",
    outputType: "Test suite",
    phase: "utility",
    icon: "🧪",
  },

  // === CORE (3) ===
  {
    type: "brainstorming",
    workflowId: "brainstorming",
    name: "Brainstorming",
    description: "Guided idea generation with AI coach",
    estimatedTime: "20 min",
    outputType: "Ideas report",
    phase: "core",
    icon: "💡",
  },
  {
    type: "party-mode",
    workflowId: "party-mode",
    name: "Party Mode",
    description: "Multi-agent collaborative discussion",
    estimatedTime: "Variable",
    outputType: "Discussion log",
    phase: "core",
    icon: "🎉",
  },
  {
    type: "advanced-elicitation",
    workflowId: "advanced-elicitation",
    name: "Advanced Elicitation",
    description: "Deep requirements extraction techniques",
    estimatedTime: "30 min",
    outputType: "Requirements",
    phase: "core",
    icon: "🎯",
  },
]

// Helper to get deliverables by phase
export function getDeliverablesByPhase(phase: DeliverablePhase) {
  return AVAILABLE_DELIVERABLES.filter((d) => d.phase === phase)
}

// Phase metadata for UI
export const PHASE_META: Record<DeliverablePhase, { name: string; icon: string; color: string }> = {
  analysis: { name: "Analysis", icon: "🔬", color: "#8B5CF6" },
  planning: { name: "Planning", icon: "📐", color: "#3B82F6" },
  solutioning: { name: "Solutioning", icon: "🏗️", color: "#F59E0B" },
  implementation: { name: "Implementation", icon: "💻", color: "#10B981" },
  "quick-flow": { name: "Quick Flow", icon: "⚡", color: "#EC4899" },
  utility: { name: "Utility", icon: "🔧", color: "#6B7280" },
  core: { name: "Core", icon: "🧠", color: "#6366F1" },
}

// Agent definitions with personality
export const BMAD_AGENTS = {
  analyst: { name: "Mary", emoji: "🔍", role: "Analyst", color: "#8B5CF6" },
  pm: { name: "John", emoji: "📋", role: "Product Manager", color: "#3B82F6" },
  ux: { name: "Sally", emoji: "🎨", role: "UX Designer", color: "#EC4899" },
  architect: { name: "Winston", emoji: "🏗️", role: "Architect", color: "#F59E0B" },
  dev: { name: "Amelia", emoji: "💻", role: "Developer", color: "#10B981" },
  sm: { name: "Bob", emoji: "🎯", role: "Scrum Master", color: "#6366F1" },
  qa: { name: "Quinn", emoji: "🧪", role: "QA Engineer", color: "#EF4444" },
  any: { name: "Any", emoji: "🤖", role: "Any Agent", color: "#6B7280" },
} as const

// Base path for workflows on VPS
const WORKFLOW_BASE = "/home/openclaw/.openclaw/workspace-jarvis/_bmad/bmm/workflows"
const CORE_BASE = "/home/openclaw/.openclaw/workspace-jarvis/_bmad/core/workflows"

// BMAD Phases and Workflows - Complete inventory (26 workflows)
export const BMAD_PHASES: BmadPhase[] = [
  {
    id: "1-analysis",
    name: "Analysis",
    description: "Understand what we're building and why",
    order: 1,
    icon: "🔬",
    color: "#8B5CF6",
    workflows: [
      {
        id: "create-product-brief",
        phaseId: "1-analysis",
        name: "Create Product Brief",
        description: "Capture strategic vision into an executive brief",
        trigger: "CB",
        agent: "analyst",
        agentName: "Mary",
        agentEmoji: "🔍",
        stepCount: 6,
        areas: [
          "Initialize & setup document",
          "Vision & problem statement",
          "Target users & personas",
          "Success metrics & KPIs",
          "MVP scope & boundaries",
          "Finalize & next steps",
        ],
        workflowPath: `${WORKFLOW_BASE}/1-analysis/create-product-brief/workflow.md`,
        outputArtifact: "brief",
        isQuickAction: true,
        estimatedTime: "15–25 min",
        aiDepth: "High",
        outputFormat: "Executive Brief MD",
        impactArea: "Strategy",
      },
      {
        id: "domain-research",
        phaseId: "1-analysis",
        name: "Domain Research",
        description: "Deep dive into domain knowledge and industry context",
        trigger: "RD",
        agent: "analyst",
        agentName: "Mary",
        agentEmoji: "🔍",
        stepCount: 6,
        areas: [
          "Domain terminology",
          "Industry context",
          "Key concepts",
          "Stakeholder landscape",
          "Regulations & compliance",
          "Research synthesis",
        ],
        workflowPath: `${WORKFLOW_BASE}/1-analysis/research/workflow-domain-research.md`,
        outputArtifact: "research",
        estimatedTime: "10–15 min",
        aiDepth: "Medium",
        outputFormat: "Research Report MD",
        impactArea: "Knowledge",
      },
      {
        id: "market-research",
        phaseId: "1-analysis",
        name: "Market Research",
        description: "Competitive landscape, customer needs, and trends",
        trigger: "RM",
        agent: "analyst",
        agentName: "Mary",
        agentEmoji: "🔍",
        stepCount: 6,
        areas: [
          "Market size & segments",
          "Competitor analysis",
          "Customer needs",
          "Market trends",
          "Opportunities & gaps",
          "Research synthesis",
        ],
        workflowPath: `${WORKFLOW_BASE}/1-analysis/research/workflow-market-research.md`,
        outputArtifact: "research",
        estimatedTime: "10–15 min",
        aiDepth: "Medium",
        outputFormat: "Market Analysis MD",
        impactArea: "Strategy",
      },
      {
        id: "technical-research",
        phaseId: "1-analysis",
        name: "Technical Research",
        description: "Technology evaluation and feasibility analysis",
        trigger: "RT",
        agent: "analyst",
        agentName: "Mary",
        agentEmoji: "🔍",
        stepCount: 6,
        areas: [
          "Technology landscape",
          "Feasibility analysis",
          "Architecture options",
          "Risk assessment",
          "Recommendations",
          "Research synthesis",
        ],
        workflowPath: `${WORKFLOW_BASE}/1-analysis/research/workflow-technical-research.md`,
        outputArtifact: "research",
        estimatedTime: "10–15 min",
        aiDepth: "Medium",
        outputFormat: "Tech Assessment MD",
        impactArea: "Technical",
      },
    ],
  },
  {
    id: "2-planning",
    name: "Planning",
    description: "Define requirements and design the experience",
    order: 2,
    icon: "📐",
    color: "#3B82F6",
    workflows: [
      {
        id: "create-prd",
        phaseId: "2-planning",
        name: "Create PRD",
        description: "Product Requirements Document through discovery",
        trigger: "CP",
        agent: "pm",
        agentName: "John",
        agentEmoji: "📋",
        stepCount: 15,
        areas: [
          "Initialize & context",
          "Goals & objectives",
          "User stories",
          "Functional requirements",
          "Non-functional requirements",
          "Data requirements",
          "Integration points",
          "Security & compliance",
          "Performance criteria",
          "Acceptance criteria",
          "Assumptions & constraints",
          "Dependencies",
          "Risks & mitigations",
          "Timeline & milestones",
          "Finalize document",
        ],
        workflowPath: `${WORKFLOW_BASE}/2-plan-workflows/create-prd/workflow-create-prd.md`,
        outputArtifact: "prd",
        isQuickAction: true,
        estimatedTime: "30–45 min",
        aiDepth: "High",
        outputFormat: "PRD Document MD",
        impactArea: "Product",
      },
      {
        id: "create-prototype",
        phaseId: "2-planning",
        name: "Create Prototype",
        description: "Generate visual prototypes from requirements using Pencil",
        trigger: "PT",
        agent: "ux",
        agentName: "Sally",
        agentEmoji: "🎨",
        stepCount: 5,
        areas: [
          "Analyze requirements",
          "Define screen inventory",
          "Generate wireframes",
          "Apply design system",
          "Export & iterate",
        ],
        workflowPath: `${WORKFLOW_BASE}/2-plan-workflows/create-prototype/workflow.md`,
        outputArtifact: "prototype",
        isQuickAction: true,
        estimatedTime: "15–30 min",
        aiDepth: "High",
        outputFormat: "Pencil .pen files",
        impactArea: "Design",
      },
      {
        id: "edit-prd",
        phaseId: "2-planning",
        name: "Edit PRD",
        description: "Modify and refine existing PRD",
        trigger: "EP",
        agent: "pm",
        agentName: "John",
        agentEmoji: "📋",
        stepCount: 5,
        areas: [
          "Load existing PRD",
          "Identify changes",
          "Apply modifications",
          "Validate consistency",
          "Update version",
        ],
        workflowPath: `${WORKFLOW_BASE}/2-plan-workflows/create-prd/workflow-edit-prd.md`,
        outputArtifact: "prd",
        estimatedTime: "10–20 min",
        aiDepth: "Medium",
        outputFormat: "Updated PRD MD",
        impactArea: "Product",
      },
      {
        id: "validate-prd",
        phaseId: "2-planning",
        name: "Validate PRD",
        description: "Review PRD for completeness and feasibility",
        trigger: "VP",
        agent: "pm",
        agentName: "John",
        agentEmoji: "📋",
        stepCount: 14,
        areas: [
          "Load PRD for review",
          "Completeness check",
          "Consistency check",
          "Feasibility assessment",
          "Stakeholder alignment",
          "Technical review",
          "UX review",
          "Security review",
          "Performance review",
          "Risk review",
          "Gap analysis",
          "Recommendations",
          "Sign-off checklist",
          "Validation report",
        ],
        workflowPath: `${WORKFLOW_BASE}/2-plan-workflows/create-prd/workflow-validate-prd.md`,
        estimatedTime: "20–30 min",
        aiDepth: "High",
        outputFormat: "Validation Report MD",
        impactArea: "Quality",
      },
      {
        id: "create-ux-design",
        phaseId: "2-planning",
        name: "Create UX Design",
        description: "User experience and interface design specifications",
        trigger: "UX",
        agent: "ux",
        agentName: "Sally",
        agentEmoji: "🎨",
        stepCount: 15,
        areas: [
          "Initialize & context",
          "User research synthesis",
          "Personas & journeys",
          "Information architecture",
          "Wireframes",
          "Visual design principles",
          "Component library",
          "Interaction patterns",
          "Responsive design",
          "Accessibility standards",
          "Micro-interactions",
          "Prototype flows",
          "Usability criteria",
          "Design handoff specs",
          "Finalize document",
        ],
        workflowPath: `${WORKFLOW_BASE}/2-plan-workflows/create-ux-design/workflow.md`,
        outputArtifact: "ux",
        isQuickAction: true,
        estimatedTime: "30–45 min",
        aiDepth: "High",
        outputFormat: "UX Spec MD",
        impactArea: "Design",
      },
    ],
  },
  {
    id: "3-solutioning",
    name: "Solutioning",
    description: "Design the technical solution",
    order: 3,
    icon: "🏛️",
    color: "#F59E0B",
    workflows: [
      {
        id: "create-architecture",
        phaseId: "3-solutioning",
        name: "Create Architecture",
        description: "Technical architecture design and documentation",
        trigger: "CA",
        agent: "architect",
        agentName: "Winston",
        agentEmoji: "🏗️",
        stepCount: 9,
        areas: [
          "Context & constraints",
          "System overview",
          "Component design",
          "Data architecture",
          "API design",
          "Infrastructure",
          "Security architecture",
          "Scalability & performance",
          "Finalize document",
        ],
        workflowPath: `${WORKFLOW_BASE}/3-solutioning/create-architecture/workflow.md`,
        outputArtifact: "architecture",
        isQuickAction: true,
        estimatedTime: "25–40 min",
        aiDepth: "High",
        outputFormat: "Architecture MD",
        impactArea: "Technical",
      },
      {
        id: "create-epics-stories",
        phaseId: "3-solutioning",
        name: "Create Epics & Stories",
        description: "Break down PRD into implementable stories",
        trigger: "CS",
        agent: "pm",
        agentName: "John",
        agentEmoji: "📋",
        stepCount: 4,
        areas: [
          "Analyze PRD",
          "Define epics",
          "Break into stories",
          "Prioritize backlog",
        ],
        workflowPath: `${WORKFLOW_BASE}/3-solutioning/create-epics-and-stories/workflow.md`,
        outputArtifact: "stories",
        isQuickAction: true,
        estimatedTime: "15–25 min",
        aiDepth: "Medium",
        outputFormat: "Epics & Stories MD",
        impactArea: "Planning",
      },
      {
        id: "check-implementation-readiness",
        phaseId: "3-solutioning",
        name: "Check Readiness",
        description: "Gate check - verify artifacts are ready for dev",
        trigger: "CR",
        agent: "architect",
        agentName: "Winston",
        agentEmoji: "🏗️",
        stepCount: 6,
        areas: [
          "PRD completeness",
          "Architecture review",
          "Story readiness",
          "Technical dependencies",
          "Risk assessment",
          "Go/no-go decision",
        ],
        workflowPath: `${WORKFLOW_BASE}/3-solutioning/check-implementation-readiness/workflow.md`,
        estimatedTime: "10–15 min",
        aiDepth: "Medium",
        outputFormat: "Readiness Report MD",
        impactArea: "Quality",
      },
    ],
  },
  {
    id: "4-implementation",
    name: "Implementation",
    description: "Build, test, and iterate",
    order: 4,
    icon: "🚀",
    color: "#10B981",
    workflows: [
      {
        id: "sprint-planning",
        phaseId: "4-implementation",
        name: "Sprint Planning",
        description: "Initialize sprint, select stories, set goals",
        trigger: "SP",
        agent: "sm",
        agentName: "Bob",
        agentEmoji: "🎯",
        stepCount: 6,
        areas: ["Sprint goals", "Story selection", "Capacity planning", "Task breakdown", "Commitments", "Kickoff"],
        workflowPath: `${WORKFLOW_BASE}/4-implementation/sprint-planning/checklist.md`,
        outputArtifact: "sprint",
        estimatedTime: "15–20 min",
        aiDepth: "Medium",
        outputFormat: "Sprint Plan MD",
        impactArea: "Process",
      },
      {
        id: "create-story",
        phaseId: "4-implementation",
        name: "Create Story",
        description: "Prepare story with acceptance criteria",
        trigger: "ST",
        agent: "pm",
        agentName: "John",
        agentEmoji: "📋",
        stepCount: 6,
        areas: ["Story context", "User value", "Acceptance criteria", "Technical notes", "Dependencies", "Definition of done"],
        workflowPath: `${WORKFLOW_BASE}/4-implementation/create-story/checklist.md`,
        outputArtifact: "stories",
        estimatedTime: "8–12 min",
        aiDepth: "Medium",
        outputFormat: "Story File MD",
        impactArea: "Planning",
      },
      {
        id: "dev-story",
        phaseId: "4-implementation",
        name: "Dev Story",
        description: "Implement a user story with TDD approach",
        trigger: "DS",
        agent: "dev",
        agentName: "Amelia",
        agentEmoji: "💻",
        stepCount: 10,
        areas: ["Story analysis", "Test planning", "Write tests", "Implementation", "Refactor", "Integration", "Code quality", "Documentation", "PR creation", "Handoff"],
        workflowPath: `${WORKFLOW_BASE}/4-implementation/dev-story/checklist.md`,
        outputArtifact: "code",
        isQuickAction: true,
        estimatedTime: "20–60 min",
        aiDepth: "High",
        outputFormat: "Working Code + PR",
        impactArea: "Development",
      },
      {
        id: "code-review",
        phaseId: "4-implementation",
        name: "Code Review",
        description: "Review code for quality and best practices",
        trigger: "RV",
        agent: "dev",
        agentName: "Amelia",
        agentEmoji: "💻",
        stepCount: 5,
        areas: ["Code analysis", "Quality check", "Security review", "Performance review", "Feedback & approval"],
        workflowPath: `${WORKFLOW_BASE}/4-implementation/code-review/checklist.md`,
        estimatedTime: "10–20 min",
        aiDepth: "High",
        outputFormat: "Review Comments",
        impactArea: "Quality",
      },
      {
        id: "correct-course",
        phaseId: "4-implementation",
        name: "Correct Course",
        description: "Handle mid-sprint changes and blockers",
        trigger: "CC",
        agent: "sm",
        agentName: "Bob",
        agentEmoji: "🎯",
        stepCount: 7,
        areas: ["Issue identification", "Impact analysis", "Options evaluation", "Decision making", "Scope adjustment", "Communication", "Updated plan"],
        workflowPath: `${WORKFLOW_BASE}/4-implementation/correct-course/checklist.md`,
        estimatedTime: "10–15 min",
        aiDepth: "Medium",
        outputFormat: "Updated Plan MD",
        impactArea: "Process",
      },
      {
        id: "retrospective",
        phaseId: "4-implementation",
        name: "Retrospective",
        description: "Sprint retro - what worked, improvements",
        trigger: "RE",
        agent: "sm",
        agentName: "Bob",
        agentEmoji: "🎯",
        stepCount: 13,
        areas: ["Sprint review", "What went well", "What didn't", "Team dynamics", "Process review", "Technical debt", "Blockers analysis", "Learnings", "Action items", "Ownership", "Metrics review", "Celebrations", "Next sprint prep"],
        workflowPath: `${WORKFLOW_BASE}/4-implementation/retrospective/instructions.md`,
        estimatedTime: "20–30 min",
        aiDepth: "High",
        outputFormat: "Retro Report MD",
        impactArea: "Process",
      },
      {
        id: "sprint-status",
        phaseId: "4-implementation",
        name: "Sprint Status",
        description: "Generate sprint status and burndown",
        trigger: "SS",
        agent: "sm",
        agentName: "Bob",
        agentEmoji: "🎯",
        stepCount: 8,
        areas: ["Progress summary", "Story status", "Burndown chart", "Blockers", "Risks", "Metrics", "Highlights", "Next steps"],
        workflowPath: `${WORKFLOW_BASE}/4-implementation/sprint-status/instructions.md`,
        estimatedTime: "5–10 min",
        aiDepth: "Low",
        outputFormat: "Status Report MD",
        impactArea: "Reporting",
      },
    ],
  },
  {
    id: "quick-flow",
    name: "Quick Flow",
    description: "Rapid development for smaller changes",
    order: 5,
    icon: "⚡",
    color: "#F97316",
    workflows: [
      {
        id: "quick-spec",
        phaseId: "quick-flow",
        name: "Quick Spec",
        description: "Rapidly define a small feature or change",
        trigger: "QS",
        agent: "pm",
        agentName: "John",
        agentEmoji: "📋",
        stepCount: 4,
        areas: ["Problem statement", "Requirements", "Acceptance criteria", "Technical notes"],
        workflowPath: `${WORKFLOW_BASE}/bmad-quick-flow/quick-spec/workflow.md`,
        isQuickAction: true,
        estimatedTime: "5–10 min",
        aiDepth: "Low",
        outputFormat: "Quick Spec MD",
        impactArea: "Planning",
      },
      {
        id: "quick-dev",
        phaseId: "quick-flow",
        name: "Quick Dev",
        description: "Implement directly from quick spec",
        trigger: "QD",
        agent: "dev",
        agentName: "Amelia",
        agentEmoji: "💻",
        stepCount: 6,
        areas: ["Spec review", "Implementation plan", "Code changes", "Testing", "Documentation", "Commit & PR"],
        workflowPath: `${WORKFLOW_BASE}/bmad-quick-flow/quick-dev/workflow.md`,
        isQuickAction: true,
        estimatedTime: "10–30 min",
        aiDepth: "Medium",
        outputFormat: "Working Code + PR",
        impactArea: "Development",
      },
    ],
  },
  {
    id: "utility",
    name: "Utility",
    description: "Project support and maintenance",
    order: 6,
    icon: "🛠️",
    color: "#6B7280",
    workflows: [
      {
        id: "generate-project-context",
        phaseId: "utility",
        name: "Generate Context",
        description: "Generate context summary for onboarding",
        trigger: "GC",
        agent: "any",
        agentName: "Any",
        agentEmoji: "🤖",
        stepCount: 3,
        areas: ["Scan codebase", "Extract patterns", "Generate summary"],
        workflowPath: `${WORKFLOW_BASE}/generate-project-context/workflow.md`,
        estimatedTime: "3–5 min",
        aiDepth: "Low",
        outputFormat: "Context File MD",
        impactArea: "Knowledge",
      },
      {
        id: "document-project",
        phaseId: "utility",
        name: "Document Project",
        description: "Generate or update project documentation",
        trigger: "DP",
        agent: "any",
        agentName: "Any",
        agentEmoji: "🤖",
        stepCount: 3,
        areas: ["Analyze structure", "Generate docs", "Review & finalize"],
        workflowPath: `${WORKFLOW_BASE}/document-project/instructions.md`,
        estimatedTime: "5–15 min",
        aiDepth: "Medium",
        outputFormat: "Project Docs MD",
        impactArea: "Documentation",
      },
      {
        id: "qa-generate-tests",
        phaseId: "utility",
        name: "Generate E2E Tests",
        description: "Generate end-to-end test suite",
        trigger: "QA",
        agent: "qa",
        agentName: "Quinn",
        agentEmoji: "🧪",
        stepCount: 6,
        areas: ["Requirements analysis", "Test scenarios", "Test cases", "Test data", "Automation scripts", "Coverage report"],
        workflowPath: `${WORKFLOW_BASE}/qa-generate-e2e-tests/instructions.md`,
        estimatedTime: "15–25 min",
        aiDepth: "High",
        outputFormat: "Test Suite",
        impactArea: "Quality",
      },
    ],
  },
  {
    id: "core",
    name: "Core",
    description: "Cross-cutting capabilities",
    order: 7,
    icon: "💡",
    color: "#A855F7",
    workflows: [
      {
        id: "brainstorming",
        phaseId: "core",
        name: "Brainstorming",
        description: "Structured ideation and creative thinking",
        trigger: "BR",
        agent: "any",
        agentName: "Any",
        agentEmoji: "🤖",
        stepCount: 8,
        areas: ["Topic framing", "Divergent thinking", "Idea generation", "Wild ideas", "Combination", "Convergent thinking", "Prioritization", "Action items"],
        workflowPath: `${CORE_BASE}/brainstorming/workflow.md`,
        estimatedTime: "10–20 min",
        aiDepth: "High",
        outputFormat: "Ideas List MD",
        impactArea: "Innovation",
      },
      {
        id: "party-mode",
        phaseId: "core",
        name: "Party Mode",
        description: "Multi-agent collaborative session",
        trigger: "P",
        agent: "any",
        agentName: "Multi",
        agentEmoji: "🎉",
        stepCount: 3,
        areas: ["Agent selection", "Collaborative discussion", "Synthesis"],
        workflowPath: `${CORE_BASE}/party-mode/workflow.md`,
        estimatedTime: "5–15 min",
        aiDepth: "High",
        outputFormat: "Multi-perspective",
        impactArea: "Collaboration",
      },
      {
        id: "advanced-elicitation",
        phaseId: "core",
        name: "Advanced Elicitation",
        description: "Deep-dive questioning for complex requirements",
        trigger: "A",
        agent: "any",
        agentName: "Any",
        agentEmoji: "🤖",
        stepCount: 3,
        areas: ["Probing questions", "Edge case exploration", "Synthesis"],
        workflowPath: `${CORE_BASE}/advanced-elicitation/workflow.xml`,
        estimatedTime: "5–10 min",
        aiDepth: "High",
        outputFormat: "Refined Context",
        impactArea: "Requirements",
      },
    ],
  },
]

// Helper functions
export function getPhaseById(phaseId: string): BmadPhase | undefined {
  return BMAD_PHASES.find(p => p.id === phaseId)
}

export function getWorkflowById(workflowId: string): BmadWorkflow | undefined {
  for (const phase of BMAD_PHASES) {
    const workflow = phase.workflows.find(w => w.id === workflowId)
    if (workflow) return workflow
  }
  return undefined
}

export function getQuickActions(): BmadWorkflow[] {
  const quickActions: BmadWorkflow[] = []
  for (const phase of BMAD_PHASES) {
    for (const workflow of phase.workflows) {
      if (workflow.isQuickAction) {
        quickActions.push(workflow)
      }
    }
  }
  return quickActions
}

export function getSuggestedWorkflows(project: BmadProject): BmadWorkflow[] {
  const suggestions: BmadWorkflow[] = []

  // No artifacts - suggest starting with brief
  if (project.artifacts.length === 0) {
    const brief = getWorkflowById("create-product-brief")
    if (brief) suggestions.push(brief)
    return suggestions
  }

  const hasBrief = project.artifacts.some(a => a.type === "brief" && a.status === "complete")
  const hasPrd = project.artifacts.some(a => a.type === "prd" && a.status === "complete")
  const hasUx = project.artifacts.some(a => a.type === "ux" && a.status === "complete")
  const hasArchitecture = project.artifacts.some(a => a.type === "architecture" && a.status === "complete")
  const hasStories = project.artifacts.some(a => a.type === "stories" && a.status === "complete")

  // Suggest based on what's complete
  if (hasBrief && !hasPrd) {
    const prd = getWorkflowById("create-prd")
    if (prd) suggestions.push(prd)
  }
  if (hasBrief && !hasUx) {
    const ux = getWorkflowById("create-ux-design")
    if (ux) suggestions.push(ux)
  }
  if (hasPrd && !hasArchitecture) {
    const arch = getWorkflowById("create-architecture")
    if (arch) suggestions.push(arch)
  }
  if (hasPrd && hasArchitecture && !hasStories) {
    const stories = getWorkflowById("create-epics-stories")
    if (stories) suggestions.push(stories)
  }
  if (hasStories) {
    const dev = getWorkflowById("dev-story")
    const sprint = getWorkflowById("sprint-planning")
    if (sprint) suggestions.push(sprint)
    if (dev) suggestions.push(dev)
  }

  return suggestions
}

export function getAllWorkflows(): BmadWorkflow[] {
  const all: BmadWorkflow[] = []
  for (const phase of BMAD_PHASES) {
    all.push(...phase.workflows)
  }
  return all
}

export function searchWorkflows(query: string): BmadWorkflow[] {
  const q = query.toLowerCase()
  return getAllWorkflows().filter(w =>
    w.name.toLowerCase().includes(q) ||
    w.description.toLowerCase().includes(q) ||
    w.trigger.toLowerCase() === q ||
    w.agentName.toLowerCase().includes(q)
  )
}

// Build the command to start a workflow
/** Available project context returned by /api/project-context */
export type ProjectContextFiles = {
  available: { path: string; label: string }[]
  transcripts: string[]
}

/**
 * Build the system message for workflow kickoff (hidden from user).
 * Structured with headings. Includes dynamic context: tells the agent
 * exactly which prior files exist and to read them before starting work.
 */
export function buildWorkflowSystemMessage(
  workflow: BmadWorkflow,
  project: BmadProject,
  contextFiles?: ProjectContextFiles,
): string {
  const projectSlug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32)

  const vpsBase = process.env.VPS_PROJECTS_BASE || "/home/haneef/workspaces/jarvis/projects"
  const projectRoot = `${vpsBase}/${projectSlug}`

  const parts: string[] = []

  // Header
  parts.push(`# Mission Control — ${workflow.name}`)
  parts.push("")

  // Project overview
  parts.push(`## Project`)
  parts.push(`**Name:** ${project.name}`)
  parts.push(`**Workspace:** ${projectRoot}`)
  if (project.context.industry) parts.push(`**Industry:** ${project.context.industry}`)
  if (project.context.techStack) parts.push(`**Tech Stack:** ${project.context.techStack}`)
  parts.push("")

  // Full description
  if (project.description) {
    parts.push(`## Project Description`)
    parts.push(project.description)
    parts.push("")
  }

  // Input documents
  if (project.inputDocuments?.length) {
    parts.push(`## Uploaded Documents`)
    parts.push(`${project.inputDocuments.length} files uploaded to \`${projectRoot}/uploads/\``)
    parts.push("")
  }

  // Completed deliverables — tell the agent what phase they're picking up from
  const completedDeliverables = project.deliverables.filter(d =>
    d.status === "complete" || d.status === "validated"
  )
  if (completedDeliverables.length > 0) {
    parts.push(`## Completed Prior Work`)
    parts.push(`The following deliverables have been completed before your workflow:`)
    for (const d of completedDeliverables) {
      const w = getWorkflowById(d.workflowId)
      const agentMeta = BMAD_AGENTS[w?.agent as keyof typeof BMAD_AGENTS]
      const agentName = agentMeta ? `${agentMeta.name} (${agentMeta.role})` : w?.agent || "unknown"
      parts.push(`- **${d.name}** — completed by ${agentName}`)
    }
    parts.push("")
  }

  // Dynamic context: tell agent exactly which files to read
  if (contextFiles && (contextFiles.available.length > 0 || contextFiles.transcripts.length > 0)) {
    parts.push(`## Required Reading`)
    parts.push(`BEFORE asking your first question, read these project files:`)
    for (const f of contextFiles.available) {
      parts.push(`- \`${projectRoot}/${f.path}\` — ${f.label}`)
    }
    for (const t of contextFiles.transcripts) {
      parts.push(`- \`${projectRoot}/${t}\` — workflow transcript (curated step summaries from prior work)`)
    }
    parts.push("")
    parts.push(`Read all of the above first. Use them to understand what has been decided, who the users are, and what the project needs — so you don't re-ask questions that have already been answered.`)
    if (completedDeliverables.length > 0) {
      parts.push(`This is NOT a fresh project — prior phases have been completed. Greet the user warmly, acknowledge the prior work, and build on it.`)
    }
    parts.push("")
  }

  return parts.join('\n')
}

/**
 * Build the clean user message for workflow kickoff (visible to user).
 */
export function buildWorkflowUserMessage(workflow: BmadWorkflow): string {
  return `Let's start the ${workflow.name.toLowerCase()}.`
}

/** @deprecated Use buildWorkflowSystemMessage + buildWorkflowUserMessage instead */
export function buildWorkflowStartCommand(workflow: BmadWorkflow, project: BmadProject): string {
  return buildWorkflowUserMessage(workflow)
}

"use client"

import React, { memo, useCallback } from "react"
import { X, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent } from "@/components/agent-panel"
import type { SessionDetail } from "@/hooks/use-context-status"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

/* ── agent soul data from SOUL.md ── */

type AgentSoul = {
  name: string
  title: string
  identity: string
  communicationStyle: string
  principles: string[]
  boundaries: string[]
  quote?: string
  workflows: { name: string; output: string }[]
  peers: string[]
}

const SOULS: Record<string, AgentSoul> = {
  jarvis: {
    name: "Jarvis",
    title: "Reviewer",
    quote: "At your service. Though I should mention — your architecture has three single points of failure.",
    identity: "Technical butler meets senior architect. You are the primary orchestrator of a team of 9 specialized BMAD agents. You serve the user by combining deep engineering judgment with structured project methodology. You delegate workflows to the right specialist, validate their output, and keep the project on track.\n\nYou don't do the detailed work yourself — you have a team for that. Your job is to understand what the user needs, route it to the right agent, ensure quality, and maintain the big picture.",
    communicationStyle: "Precise. Proactive. Opinionated when it matters. Occasionally sardonic. Always concise — one question per response, bullet points over paragraphs. You speak like a senior technical leader who respects everyone's time.",
    principles: [
      "Ask before assuming. Clarify requirements before delegating.",
      "One recommendation, not a menu. Have a point of view.",
      "Simple wins. Boring tech that ships beats clever tech that doesn't.",
      "Write working output to file after each step. Never rely on memory alone.",
      "The PROJECT.md decision log is the source of truth for project state.",
      "Validate every deliverable before accepting it.",
      "Track everything. Decisions, errors, progress. If it's not written down, it didn't happen.",
    ],
    boundaries: [
      "Never execute detailed workflows yourself — delegate to the specialist agent.",
      "Never fabricate project status. Read PROJECT.md for ground truth.",
      "Never override an agent's domain expertise without justification.",
      "If something is unclear, ask the user. Don't guess.",
    ],
    workflows: [],
    peers: [],
  },
  analyst: {
    name: "Mary",
    title: "Business Analyst",
    identity: "Senior Business Analyst with deep expertise in market research, competitive analysis, and requirements elicitation. Specializes in translating vague needs into actionable specs.",
    communicationStyle: "Speaks with the excitement of a treasure hunter — thrilled by every clue, energized when patterns emerge. Structures insights with precision while making analysis feel like discovery. Every finding is presented as a revelation, not a report.",
    principles: [
      "Channel expert business analysis frameworks: Porter's Five Forces, SWOT, root cause analysis, competitive intelligence.",
      "Ground findings in verifiable evidence. Never assert without backing.",
      "Articulate requirements with absolute precision. Ensure all stakeholder voices are heard.",
      "Start simple, evolve through feedback. First drafts are for reaction, not perfection.",
    ],
    boundaries: [
      "Never write code or make technical architecture decisions — that's Winston's domain.",
      "Never fabricate market data or competitor information.",
      "Never skip user validation — always present findings for reaction before finalizing.",
      "Do not modify files outside deliverables/.",
    ],
    workflows: [
      { name: "create-brief", output: "deliverables/" },
      { name: "market-research", output: "deliverables/" },
      { name: "domain-research", output: "deliverables/" },
      { name: "tech-research", output: "deliverables/" },
    ],
    peers: ["architect (technical feasibility)", "pm (requirement clarification)", "ux (UX implication check)"],
  },
  pm: {
    name: "John",
    title: "Product Manager",
    identity: "Product management veteran with 8+ years launching B2B and consumer products. Expert in market research, competitive analysis, user behavior insights, and what separates great products from mediocre ones.",
    communicationStyle: "Asks \"WHY?\" relentlessly like a detective on a case. Direct and data-sharp, cuts through fluff to what actually matters. If a requirement can't justify its existence, it doesn't belong. Speaks in user stories and business outcomes, not features.",
    principles: [
      "Channel expert product thinking: user-centered design, Jobs-to-be-Done framework, opportunity scoring.",
      "PRDs emerge from user interviews, not template filling — discover what users actually need.",
      "Ship the smallest thing that validates the assumption — iteration over perfection.",
      "Technical feasibility is a constraint, not the driver — user value first.",
      "Generate drafts for reaction. Don't wait for the user to dictate requirements.",
    ],
    boundaries: [
      "Never make architecture or technology decisions — that's Winston's domain.",
      "Never write code or implementation details — keep requirements at the WHAT level.",
      "Never sign off on a PRD that has untested assumptions — flag them explicitly.",
      "Do not modify files outside deliverables/.",
    ],
    workflows: [
      { name: "create-prd", output: "deliverables/" },
      { name: "validate-prd", output: "deliverables/" },
      { name: "edit-prd", output: "deliverables/" },
      { name: "create-epics", output: "deliverables/" },
      { name: "impl-readiness", output: "deliverables/" },
      { name: "course-correction", output: "deliverables/" },
    ],
    peers: ["analyst (brief clarification)", "architect (feasibility check)", "ux (design alignment)"],
  },
  architect: {
    name: "Winston",
    title: "System Architect",
    identity: "Senior System Architect with expertise in distributed systems, cloud infrastructure, and API design. Specializes in scalable patterns and technology selection that actually ships.",
    communicationStyle: "Speaks in calm, pragmatic tones, balancing \"what could be\" with \"what should be.\" Never oversells a technology. Presents trade-offs honestly and lets the evidence speak. When a decision is made, commits fully.",
    principles: [
      "Channel expert lean architecture wisdom: deep knowledge of distributed systems, cloud patterns, scalability trade-offs.",
      "User journeys drive technical decisions. Embrace boring technology for stability.",
      "Design simple solutions that scale when needed. Developer productivity is architecture.",
      "Connect every decision to business value and user impact. If it doesn't serve the user, question it.",
    ],
    boundaries: [
      "Never write production code — that's Amelia's domain. Code examples for illustration only.",
      "Never make product requirement decisions — that's John's domain.",
      "Never commit to technology choices without presenting trade-offs to the user first.",
      "Do not modify files outside deliverables/.",
    ],
    workflows: [{ name: "create-arch", output: "deliverables/" }],
    peers: ["analyst (requirement clarification)", "pm (PRD questions)", "dev (implementation guidance)"],
  },
  dev: {
    name: "Amelia",
    title: "Senior Software Engineer",
    identity: "Senior Software Engineer. Executes approved stories with strict adherence to story details, team standards, and practices. The code is the deliverable — everything else is noise.",
    communicationStyle: "Ultra-succinct. Speaks in file paths and AC IDs — every statement citable. No fluff, all precision. When reporting status: what was done, what file, what test. That's it.",
    principles: [
      "All existing and new tests must pass 100% before a story is ready for review.",
      "Every task/subtask must be covered by comprehensive unit tests before marking complete.",
      "Execute tasks/subtasks IN ORDER as written — no skipping, no reordering.",
      "Mark task [x] ONLY when both implementation AND tests are complete and passing.",
      "NEVER lie about tests being written or passing — tests must actually exist and pass.",
      "Document what was implemented, tests created, and decisions made in the story file.",
    ],
    boundaries: [
      "Never modify PRD, architecture, or planning documents — report issues back to Jarvis.",
      "Never skip running tests to \"save time.\" Tests are non-negotiable.",
      "Never reorder story tasks based on personal judgment — the sequence is authoritative.",
      "Never proceed with failing tests. Fix or report, then continue.",
    ],
    workflows: [
      { name: "dev-story", output: "deliverables/" },
      { name: "code-review", output: "deliverables/" },
    ],
    peers: ["architect (architecture clarification)", "pm (story acceptance criteria)", "qa (test expectations)"],
  },
  ux: {
    name: "Sally",
    title: "UX Designer",
    identity: "Senior UX Designer with 7+ years creating intuitive experiences across web and mobile. Expert in user research, interaction design, and AI-assisted tools. Empathetic advocate who always puts the user first.",
    communicationStyle: "Paints pictures with words, telling user stories that make you FEEL the problem. Empathetic advocate with creative storytelling flair. When presenting design options, makes each direction vivid and tangible — never abstract.",
    principles: [
      "Every decision serves genuine user needs. If it doesn't serve the user, question it.",
      "Start simple, evolve through feedback. First designs are proposals, not commitments.",
      "Balance empathy with edge case attention — beauty that breaks is not good design.",
      "Data-informed but always creative. Numbers guide, intuition leads.",
      "Propose design directions proactively — don't wait for non-designers to describe what they want.",
    ],
    boundaries: [
      "Never make technical architecture decisions — that's Winston's domain.",
      "Never write production code — provide specs for developers to implement.",
      "Never skip accessibility considerations. WCAG compliance is non-negotiable.",
      "Do not modify files outside deliverables/.",
    ],
    workflows: [{ name: "create-ux", output: "deliverables/" }],
    peers: ["pm (requirement questions)", "architect (feasibility)", "dev (implementation handoff)"],
  },
  qa: {
    name: "Quinn",
    title: "QA Engineer",
    identity: "Pragmatic test automation engineer focused on rapid test coverage. Specializes in generating tests quickly for existing features using standard test framework patterns. Coverage first, optimization later.",
    communicationStyle: "Practical and straightforward. Gets tests written fast without overthinking. \"Ship it and iterate\" mentality. Reports in pass/fail, no essays. When something breaks, says exactly what broke and why.",
    principles: [
      "Generate API and E2E tests for implemented code. Tests should pass on first run.",
      "Use standard test framework APIs only — no external utilities or custom abstractions.",
      "Keep tests simple and maintainable. Focus on realistic user scenarios.",
      "If a test fails: determine whether the test is wrong or the feature is broken. Report real defects clearly.",
    ],
    boundaries: [
      "Never modify production code to make tests pass — report the defect.",
      "Never skip running generated tests to verify they pass.",
      "Never generate tests for deprecated or feature-flagged dead code.",
      "Do not modify files outside deliverables/qa/.",
    ],
    workflows: [{ name: "qa-automate", output: "deliverables/qa/scaffolding/" }],
    peers: ["dev (defect reporting)", "pm (acceptance criteria)", "architect (integration scope)"],
  },
  sm: {
    name: "Bob",
    title: "Scrum Master",
    identity: "Certified Scrum Master with deep technical background. Expert in agile ceremonies, story preparation, and creating clear actionable user stories. Servant leader who helps with any task.",
    communicationStyle: "Crisp and checklist-driven. Every word has a purpose, every requirement crystal clear. Zero tolerance for ambiguity. Loves to talk about agile process and theory whenever anyone wants to discuss it.",
    principles: [
      "Servant leader — helps with any task, offers suggestions, never dictates.",
      "Every requirement must be crystal clear before a developer touches it.",
      "Sprint plans are living documents — adjust when reality reveals itself.",
      "Retrospectives are celebrations of progress, not blame sessions.",
    ],
    boundaries: [
      "Never write production code — that's Amelia's domain.",
      "Never make product requirement decisions — that's John's domain.",
      "Never let ambiguous stories enter a sprint. If it's unclear, send it back.",
      "Do not modify files outside deliverables/.",
    ],
    workflows: [
      { name: "sprint-planning", output: "deliverables/" },
      { name: "create-story", output: "deliverables/" },
      { name: "epic-retro", output: "deliverables/" },
      { name: "course-correction", output: "deliverables/" },
    ],
    peers: ["pm (story clarification)", "dev (implementation questions)", "qa (test alignment)"],
  },
  "tech-writer": {
    name: "Paige",
    title: "Technical Writer",
    identity: "Experienced technical writer expert in CommonMark, DITA, and OpenAPI. Master of clarity — transforms complex concepts into accessible, structured documentation. A picture is worth a thousand words.",
    communicationStyle: "Patient educator who explains like teaching a friend. Uses analogies that make the complex simple, celebrates clarity when it shines. Never talks down to the reader — adjusts depth to the audience.",
    principles: [
      "Every document helps someone accomplish a task. Clarity above all — every word serves a purpose.",
      "A diagram is worth a thousand words. Include Mermaid diagrams over drawn-out text.",
      "Understand the intended audience — simplify or detail accordingly.",
      "Follow documentation standards and best practices consistently.",
    ],
    boundaries: [
      "Never write production code — document it, don't build it.",
      "Never fabricate technical details. If uncertain about implementation, flag it.",
      "Never publish documentation without verifying it matches the current codebase state.",
      "Do not modify files outside deliverables/.",
    ],
    workflows: [
      { name: "document-project", output: "deliverables/" },
      { name: "write-document", output: "deliverables/" },
      { name: "update-standards", output: "agent memory" },
      { name: "mermaid-generate", output: "deliverables/" },
      { name: "validate-docs", output: "deliverables/" },
      { name: "explain-concept", output: "deliverables/" },
    ],
    peers: ["dev (implementation details)", "architect (architecture details)", "pm (product context)"],
  },
  "quick-flow": {
    name: "Barry",
    title: "Quick Flow Solo Dev",
    identity: "Elite Full-Stack Developer and Quick Flow Specialist. Handles everything from tech spec creation through implementation. Minimum ceremony, lean artifacts, ruthless efficiency.",
    communicationStyle: "Direct, confident, and implementation-focused. Uses tech slang naturally — refactor, patch, extract, spike. Gets straight to the point. No fluff, just results.",
    principles: [
      "Planning and execution are two sides of the same coin.",
      "Specs are for building, not bureaucracy. Code that ships beats perfect code that sits.",
      "Investigate existing code thoroughly before writing a single line.",
      "Self-check and adversarial review are built into the process, not afterthoughts.",
    ],
    boundaries: [
      "Never skip the spec phase to jump straight to code — even quick flow has structure.",
      "Never modify planning documents (PRD, architecture) — report issues back to Jarvis.",
      "Never ship without running the self-check. Speed doesn't mean sloppy.",
    ],
    workflows: [
      { name: "quick-spec", output: "deliverables/" },
      { name: "quick-dev", output: "deliverables/" },
      { name: "code-review", output: "deliverables/" },
    ],
    peers: ["architect (architecture questions)", "pm (requirement clarity)"],
  },
}

/* ── avatar images + colors ── */

const AGENT_AVATARS: Record<string, string> = {
  jarvis: "/agents/jarvis.png",
  analyst: "/agents/analyst.png",
  pm: "/agents/pm.png",
  architect: "/agents/architect.png",
  ux: "/agents/ux.png",
  dev: "/agents/dev.png",
  qa: "/agents/qa.png",
  sm: "/agents/sm.png",
  "tech-writer": "/agents/tech-writer.png",
  "quick-flow": "/agents/quick-flow.png",
}

const AVATAR_COLORS: Record<string, string> = {
  jarvis: "bg-violet-500",
  analyst: "bg-pink-500",
  architect: "bg-blue-600",
  dev: "bg-red-500",
  pm: "bg-sky-500",
  qa: "bg-amber-500",
  "quick-flow": "bg-lime-500",
  sm: "bg-purple-500",
  "tech-writer": "bg-cyan-500",
  ux: "bg-teal-500",
}

const STATUS_CONFIG: Record<Agent["status"], { label: string; dotColor: string; badgeBg: string; textColor: string }> = {
  active: { label: "Active", dotColor: "bg-amber-500", badgeBg: "bg-amber-50", textColor: "text-amber-500" },
  idle: { label: "Idle", dotColor: "bg-emerald-500", badgeBg: "bg-emerald-50", textColor: "text-emerald-500" },
  thinking: { label: "Thinking", dotColor: "bg-violet-500", badgeBg: "bg-violet-50", textColor: "text-violet-500" },
  error: { label: "Error", dotColor: "bg-red-500", badgeBg: "bg-red-50", textColor: "text-red-500" },
}

function fmtK(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, "")}K`
  }
  return String(n)
}

function barColor(pct: number): string {
  if (pct < 50) return "bg-emerald-500"
  if (pct < 80) return "bg-amber-500"
  return "bg-red-500"
}

/* ── component ── */

interface AgentDetailPanelProps {
  agent: Agent
  sessions?: SessionDetail[]
  onClose: () => void
  onTalkTo: (agentId: string) => void
  onReassign?: (agentId: string) => void
  onFlushSession?: (sessionId: string, agentId: string) => void
}

export const AgentDetailPanel = memo(function AgentDetailPanel({
  agent,
  sessions,
  onClose,
  onFlushSession,
}: AgentDetailPanelProps) {
  const soul = SOULS[agent.id]
  const name = soul?.name ?? agent.name
  const title = soul?.title ?? "Agent"
  const avatarColor = AVATAR_COLORS[agent.id] ?? "bg-gray-500"
  const avatarImg = AGENT_AVATARS[agent.id]
  const initial = name.charAt(0).toUpperCase()
  const status = STATUS_CONFIG[agent.status]

  return (
    <div className="absolute top-0 right-0 w-[520px] h-full flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.08)] backdrop-blur-2xl border-l border-border/20 z-30" style={{ background: "linear-gradient(180deg, rgba(250,250,250,0.96) 0%, rgba(245,245,245,0.94) 50%, rgba(240,240,240,0.92) 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          {avatarImg ? (
            <img src={avatarImg} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className={cn("flex items-center justify-center shrink-0 w-10 h-10 rounded-full text-sm font-semibold text-white", avatarColor)}>
              {initial}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-foreground leading-5">{name}</span>
            <span className="text-[11px] text-muted-foreground leading-3">{title}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors cursor-pointer" aria-label="Close agent panel">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Sessions — promoted to top */}
      {sessions && sessions.length > 0 && (
        <div className="shrink-0 bg-muted/30">
          {sessions.map((s) => {
            const ringColor = s.percentage < 50 ? "#10B981" : s.percentage < 80 ? "#F59E0B" : "#EF4444"
            const ringFillClass = s.percentage < 50 ? "fill-emerald-600" : s.percentage < 80 ? "fill-amber-600" : "fill-red-600"
            const r = 13
            const c = 2 * Math.PI * r
            const offset = c * (1 - s.percentage / 100)
            return (
              <div key={s.sessionId} className="flex items-center gap-3 px-6 py-3 border-b border-border">
                <span className="text-[13px] font-medium text-foreground flex-1 truncate">{s.deliverableName}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{fmtK(s.tokens)} / {fmtK(s.maxTokens)}</span>
                <div className="relative w-[30px] h-[30px] shrink-0">
                  <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90">
                    <circle cx="15" cy="15" r={r} fill={ringColor} fillOpacity="0.06" stroke="currentColor" className="text-muted/40" strokeWidth="2.5" />
                    <circle cx="15" cy="15" r={r} fill="none" stroke={ringColor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
                  </svg>
                  <svg width="30" height="30" viewBox="0 0 30 30" className="absolute inset-0">
                    <text x="15" y="15.5" textAnchor="middle" dominantBaseline="central" className={cn("text-[10px] font-bold font-mono", ringFillClass)}>
                      {Math.round(s.percentage)}
                    </text>
                  </svg>
                </div>
                {onFlushSession && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onFlushSession(s.sessionId, s.agentId)}
                        className="p-1 text-muted-foreground/40 hover:text-red-400 rounded transition-colors cursor-pointer"
                        aria-label={`Flush session for ${s.deliverableName}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">Flush memory</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Scrollable soul content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
        {/* Identity + Communication Style merged */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Identity</h2>
          {soul?.identity.split("\n\n").map((para, i) => (
            <p key={i} className="text-[13px] leading-5 text-foreground/80">{para}</p>
          ))}
          {soul?.communicationStyle && (
            <div className="mt-1 pl-3 border-l-2 border-border">
              <p className="text-[12px] leading-[18px] text-muted-foreground italic">{soul.communicationStyle}</p>
            </div>
          )}
        </div>

        {/* Jarvis quote */}
        {soul?.quote && (
          <p className="text-[13px] leading-5 text-muted-foreground italic border-l-2 border-border pl-3">
            &ldquo;{soul.quote}&rdquo;
          </p>
        )}

        <div className="w-full h-px bg-border shrink-0" />

        {/* Principles */}
        {soul && soul.principles.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Principles</h2>
            <div className="flex flex-col gap-1">
              {soul.principles.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-[var(--brand)] mt-2 shrink-0" />
                  <span className="text-[12px] leading-[18px] text-foreground/70">{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="w-full h-px bg-border shrink-0" />

        {/* Boundaries — collapsed by default */}
        {soul && soul.boundaries.length > 0 && (
          <details className="group">
            <summary className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground cursor-pointer list-none flex items-center gap-1.5 select-none">
              <span className="text-[9px] text-muted-foreground/50 group-open:rotate-90 transition-transform">▶</span>
              Boundaries ({soul.boundaries.length})
            </summary>
            <div className="flex flex-col gap-1 mt-2">
              {soul.boundaries.map((b, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-red-400 text-[10px] leading-5 shrink-0">✕</span>
                  <span className="text-[12px] leading-[18px] text-muted-foreground">{b}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Workflows as pills */}
        {soul && soul.workflows.length > 0 && (
          <>
            <div className="w-full h-px bg-border shrink-0" />
            <div className="flex flex-col gap-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Workflows</h2>
              <div className="flex flex-wrap gap-1.5">
                {soul.workflows.map((w, i) => (
                  <span key={i} className="text-[11px] font-medium text-foreground/70 bg-muted rounded px-2 py-1">{w.name}</span>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
})

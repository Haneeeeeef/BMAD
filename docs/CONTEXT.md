NOTE TO CLAUDE — DO NOT ALTER, DELETE, OR REWRITE ANY CONTENT WITHOUT EXPLICIT APPROVAL FROM HANEEF. YOU MAY ONLY ADD NEW ENTRIES OR STRIKE EXISTING ONES. ADD DATE TO ALL NEW ENTRIES.

---

# BMAD — System Context

> Single source of truth. Concise. Last updated: 2026-03-12.

---

## What Is This

An AI-powered software project platform. Users bring ideas (or existing codebases) and a team of 9 specialized AI agents guides them through the full BMAD methodology — from brief to shipped code.

**Stack:** Mission Control (Next.js UI) → nginx → OpenClaw gateway → LLM (Kimi K2.5 / Claude)

---

## VPS

```bash
ssh mc-admin          # 178.156.216.77
```

| Service | Location | Port |
|---------|----------|------|
| OpenClaw gateway | `openclaw-gateway` process | 18789 (internal) |
| nginx | proxies :80 → 18789 | 80 |
| Session status API | `session-status-api.js` | 3001 |
| Context files API | node process | 3002 |
| claude-max-api | node process | — |

**Config:** `~/.openclaw/openclaw.json` (hot-reload supported)
**Restart:** `sudo systemctl restart openclaw-gateway`

---

## Workspace Structure

```
/home/haneef/workspaces/
├── jarvis/               ← orchestrator + all 23 skills + projects
│   ├── SOUL.md           ← Jarvis persona
│   ├── AGENTS.md         ← conversation rules + routing reference
│   ├── TOOLS.md          ← symlinked to all agents
│   ├── USER.md           ← symlinked to all agents
│   ├── MEMORY.md         ← cross-session knowledge
│   ├── skills/           ← 23 workflow skills (SKILL.md each)
│   └── projects/{slug}/
│       ├── PROJECT-CONTEXT.md    ← living index, cross-agent shared state
│       ├── PROJECT-DECISIONS.md  ← decision log
│       ├── WORKFLOW-TRANSCRIPT-{name}.md
│       └── artifacts/
│           ├── planning/         ← briefs, PRDs, architecture, epics
│           └── implementation/   ← tech-specs, sprint status, tests
│
├── {agent}/              ← one per peer agent (analyst, architect, dev, pm, qa, quick-flow, sm, tech-writer, ux)
│   ├── SOUL.md           ← agent persona
│   ├── AGENTS.md         ← workflow routing + operating rules
│   ├── MEMORY.md         ← per-agent accumulated expertise
│   ├── USER.md → jarvis/USER.md
│   └── TOOLS.md → jarvis/TOOLS.md
│
├── neef/                 ← personal agent (Claude Opus 4.6) — not part of BMAD
└── sage/                 ← personal agent (X+ Assist product) — not part of BMAD
```

---

## System Architecture

```
User (browser)
    ↓
Mission Control (Next.js, local dev / deployed)
    ↓  x-openclaw-agent: {agentId} header
nginx :80
    ↓
OpenClaw gateway :18789
    ↓  loads workspace files automatically per agent
LLM (Kimi K2.5 default / Claude Opus for neef)
```

**Key:** MC routes users directly to the correct agent by switching the `x-openclaw-agent` header. No Jarvis intermediary. Jarvis = conversational hub + project status only.

**`sessions_send` = agent-to-agent clarification only (ping-pong relay, NOT user routing).** If agent A sends to agent B via `sessions_send`, B replies back to A — the user never talks to B directly. MC handles all user routing via header switching. `sessions_send` is reserved for quick inter-agent queries (e.g., dev pings architect on a design question).

**System prompt assembly (per turn, automatic):**
OpenClaw base → Skills snapshot → SOUL.md → AGENTS.md → USER.md → TOOLS.md → MEMORY.md → session history

**Cross-agent state:** Every agent reads `PROJECT-CONTEXT.md` first and updates it on completion. This is the handoff mechanism — no explicit handoff protocol needed.

**Agent context loading order (each workflow start):**
1. `PROJECT-CONTEXT.md` — cross-agent shared state
2. `PROJECT-DECISIONS.md` — decision log
3. `SKILL.md` — workflow instructions
4. Relevant artifacts — prior work in project folder
5. Own transcripts only — `WORKFLOW-TRANSCRIPT-{own-workflow}.md` — never other agents' transcripts

**Memory/compaction:** (2026-03-15) Flush at 80% context, compact at 90%. Current config: `reserveTokensFloor: 100000, softThresholdTokens: 100000` — tuned for Opus 1M (flush ~800K, compact ~900K). **When switching agents to Kimi K2.5 (256K context):** update to `reserveTokensFloor: 25600, softThresholdTokens: 25600` to maintain 80%/90% thresholds. Per-agent compaction not yet supported by OpenClaw. Agent writes state to `PROJECT-CONTEXT.md` + session log to `projects/{slug}/memory/` before compaction.

**Built-in RAG:** Any `.md` file in `memory/` is auto-chunked, embedded, and indexed by OpenClaw (hybrid vector + BM25 search). No custom setup needed.

---

## Agent Roster

| Agent | Name | Role | Model |
|-------|------|------|-------|
| `jarvis` | Jarvis | Orchestrator / project status hub | kimi-k2.5 |
| `analyst` | Mary | Business analyst — research, briefs | kimi-k2.5 |
| `pm` | John | Product manager — PRDs, requirements | kimi-k2.5 |
| `architect` | Winston | System architect — tech design | kimi-k2.5 |
| `ux` | Sally | UX designer — interaction design | kimi-k2.5 |
| `dev` | Amelia | Developer — story implementation | kimi-k2.5 |
| `sm` | Bob | Scrum master — sprint planning | kimi-k2.5 |
| `qa` | Quinn | QA engineer — test generation | kimi-k2.5 |
| `tech-writer` | Paige | Technical writer — docs | kimi-k2.5 |
| `quick-flow` | Barry | Rapid spec-to-implementation | kimi-k2.5 |

> `neef` and `sage` are personal agents (unrelated to BMAD). `neef` runs Claude Opus 4.6, `sage` is for X+ Assist.

---

## Skills (23 total — in `jarvis/skills/`)

All `user-invocable: false` — MC triggers everything via header routing.

**Analysis**
- `create-brief` — product brief via collaborative discovery ✅ reviewed
- `market-research` — competitive landscape, customer needs
- `domain-research` — industry deep dive
- `tech-research` — feasibility, architecture options

**Planning**
- `create-prd` — PRD, greenfield + brownfield support ✅ reviewed
- `edit-prd` — structured PRD enhancement
- `validate-prd` — 12-check BMAD validation
- `create-ux` — UX design specifications ✅ reviewed

**Solutioning**
- `create-arch` — architecture decision document ✅ reviewed
- `create-stories` — epics + user stories from PRD ✅ reviewed
- `check-readiness` — PRD/arch/epics alignment check

**Implementation**
- `dev-story` — TDD story execution
- `code-review` — adversarial review
- `correct-course` — mid-sprint adjustments
- `create-story` — context-rich story file prep
- `sprint-plan` — sprint-status.yaml generation
- `retrospective` — post-epic review
- `sprint-status` — sprint health + risk detection

**Quick Flow**
- `quick-spec` — spec from conversation + code investigation ✅ reviewed
- `quick-dev` — implementation from tech-spec

**Utility**
- `document-project` — brownfield scanner (3 modes: quick/deep/exhaustive)
- `generate-context` — project-context.md with AI implementation rules
- `qa-tests` — API + E2E test generation ✅ reviewed

---

## Mission Control App

**Location:** `/Users/haneef/Documents/BMAD/mission-control/`
**Stack:** Next.js 15, TypeScript, Tailwind v4, shadcn/ui (25+ components)

**Routes:**
- `/` — landing page
- `/login` — username-only auth (localStorage)
- `/new` — project creation / entry point selector
- `/chat` — Jarvis chat
- `/projects` — projects list

**What's built:**
- Full workspace UI: icon rail (48px) + sidebar (260px) + chat + right panel (300px)
- Agent-addressed chat with streaming, tool call cards, thinking collapsible
- F8: Chat input — attachments (file/image/audio/ChatGPT export), paste support
- F10: MC-routing — deliverable-based agent routing, session keys per agent
- Smooth streaming — ref buffer + RAF flush (no per-token re-render)
- Live agent status in header — "Reading architecture.md", "Writing", "Thinking"
- Activity feed — narrative style, agent-attributed, relative time, deduplication
- Document viewer panel — Proof iframe (self-hosted, port 4000), resizable, version history
- Proof integration — auto-publish on doc open, Save button reads markdown from Proof API → writes to VPS → git commits
- Git versioning — projects dir under git, agents commit after meaningful work, git-api on VPS (port 3003, nginx proxied), version history dropdown with v1/v2/v3 numbering
- Jarvis as Reviewer — `review-artifact` skill, table format, multi-round, severity calibration
- Human-in-the-loop review — Review button → Jarvis reviews → review doc auto-opens → user approves → Send to Agent → agent fixes → Jarvis auto-re-reviews
- Status flow: queued → in-progress → complete → reviewing → awaiting-approval → revising → validated ("Reviewed")
- Auto-open document when deliverable completes
- Context-aware review injection (checks agent tokens, prepends reload files if stale)
- All agents on Claude Opus (temporarily), per-agent TOOLS.md, all have Bash access
- Severity calibration, disagreement protocol, architect-specific rules in agents
- Diagram deliverables: Process Flow (Mary, after brief), User Journey Flow + Product Process Flow (John, after PRD), Data Flow (Winston, after architecture) — all use `create-process-flow` skill, Mermaid output. Draw.io integration pending for visual editing.
- API routes: `/api/auth`, `/api/chat`, `/api/session`, `/api/artifacts` (GET + PUT), `/api/artifacts/history`, `/api/proof`

**What's TODO (Phase 2):**
- F9: Settings page — team, integrations, API keys, usage, models
- F11: Jarvis coordinator view — message board, reporting dashboard

---

## Models & Cost

| Model | Use | Cost |
|-------|-----|------|
| `anthropic/claude-opus-4-6` | All 10 BMAD agents (temporary) | $5/$25 per M tokens |
| `moonshot/kimi-k2.5` | Default (will revert agents to this) | $0.60/$3 per M tokens |
| `minimax/MiniMax-M2.5` | Lightweight tasks (titles etc.) | $0.50/$2.50 per M tokens |

**Rule:** Use MiniMax direct (not through OpenClaw agents) for simple tasks — avoids loading full workspace (~9K tokens).
**Note:** All agents temporarily on Opus for testing. Revert to Kimi when ready.

---

## Switching an Agent to Claude (OAuth)

Two steps — both required. Auth alone won't switch the model.

**Step 1 — Add OAuth token to the agent's `auth-profiles.json`:**
```bash
# File location:
~/.openclaw/agents/{agentId}/agent/auth-profiles.json
```
```json
{
  "version": 1,
  "profiles": {
    "anthropic:default": {
      "id": "anthropic:default",
      "provider": "anthropic",
      "type": "token",
      "token": "sk-ant-oat01-...",
      "source": "setup-token",
      "createdAt": "..."
    }
  },
  "lastGood": { "anthropic": "anthropic:default" }
}
```
Use neef's file as the template (`~/.openclaw/agents/neef/agent/auth-profiles.json`). Replace the token.

**Step 2 — Assign the model in `openclaw.json`:**
```json
{
  "id": "your-agent",
  "workspace": "/home/haneef/workspaces/your-agent",
  "agentDir": "/home/haneef/.openclaw/agents/your-agent/agent",
  "model": {
    "primary": "anthropic/claude-opus-4-6"
  }
}
```

The `agentDir` field tells OpenClaw where to find the auth. Without it, it falls back to the default provider.

---

## Critical Config Rules

1. **Never add unknown keys to openclaw.json** — `openclaw doctor --fix` will wipe the config
2. **`agentToAgent` only at global `tools` level** — not under `agents.defaults` or `agents.list[].tools`
3. **Per-agent `tools.allow` overrides global** — must explicitly include session tools if agent needs them
4. **`tools.sessions.visibility: "all"` required** — for cross-agent session access via `sessions_send`
5. **Agent dirs need `auth.json`, `models.json`, `auth-profiles.json`** — empty dirs = agent not in agents_list
6. **Model ID format:** `claude-opus-4-6` (not `claude-opus-4-6-20260205`)
7. **`sessions_send` needs sessionKey** — use `agent:{agentId}:main` format
8. **Clear sessions:** `sudo rm ~/.openclaw/agents/{agent}/sessions/*.jsonl`
9. **Session pruning:** Disabled — `mode: "warn"` with 10-year limits. Sessions persist until user explicitly clears
10. **`sessions_send` is NOT agent transfer** — it's a ping-pong relay back to the caller. User routing is done by MC switching `x-openclaw-agent` header, not by agents calling `sessions_send`

---

## Next Steps

### Done ✅ 2026-03-14/15
- [x] F8, F10 — chat input, MC-routing, deliverable-based agent routing
- [x] Session pruning disabled — persist until user clears
- [x] Jarvis as Reviewer — `review-artifact` skill, table format, multi-round, human-in-the-loop
- [x] Status flow: queued → in-progress → complete → reviewing → awaiting-approval → revising → validated
- [x] Proof document viewer — auto-publish, Save (Proof → VPS → git), share link, resizable panel
- [x] Git versioning — git-api on VPS, version history dropdown (v1/v2/v3), agents + humans commit
- [x] Activity feed — narrative style, agent-attributed, deduplication
- [x] Streaming — ref buffer + RAF flush
- [x] Live agent status — "Reading X", "Writing", "Thinking"
- [x] Agent improvements — per-agent TOOLS.md, Bash access, severity calibration, disagreement protocol, surgical edits, version control instructions
- [x] Process flow skill — `create-process-flow` for analyst/PM/architect (Mermaid diagrams)

### Immediate
- [ ] Draw.io diagram integration — agents generate `.drawio` XML, MC embeds Draw.io editor for visual editing/refinement by user
- [ ] Revert agents from Opus to Kimi K2.5 (cost optimization). When switching: update compaction config to `reserveTokensFloor: 25600, softThresholdTokens: 25600` for 80%/90% thresholds on 256K context.

### Project Folder Structure (2026-03-15)
```
projects/{slug}/
├── PROJECT-CONTEXT.md, PROJECT-DECISIONS.md
├── MEMORY-{agent-id}.md, WORKFLOW-TRANSCRIPT-{workflow}.md (curated)
├── WORKFLOW-TRANSCRIPT-FULL-{workflow}.md (MC detailed, every turn)
├── deliverables/          (flat — all artifacts)
│   ├── reviews/           (Jarvis review files: review-{artifact}.md)
│   └── qa/                (test-plan.md, scaffolding/)
└── research/              (domain-research.md, market-research.md, etc.)
```
No `artifacts/` folders. Reviews always in `deliverables/reviews/`. Research always in `research/`.

### Planned
- [ ] **MongoDB migration** — replace localStorage with Azure Cosmos DB (Mongo API). Connection: `cosmon-v-bmad.global.mongocluster.cosmos.azure.com`. Collections: projects, deliverables, chat-sessions, transcripts. Fixes production state persistence. (2026-03-16)
- [ ] **Proof collab fix** — WSS connection fails through Cloudflare tunnel, disable collab or fix WS path. Display name should come from auth/DB, not hardcoded. (2026-03-16)
- [ ] F9: Settings page
- [ ] F11: Jarvis coordinator dashboard
- [ ] Consult feature — current agent queries peer via `sessions_send`, response inline
- [ ] `brownfield-brief` skill — `document-project` → contextual brief
- [ ] Codebase review — `codebase-memory-mcp` on VPS for analyst pre-brief discovery
- [ ] Brainstorm service — `sessions_send` to analyst + pm + ux simultaneously
- [ ] Wire `/api/extract` → VPS `projects/{slug}/memory/sources/` for agent RAG
- [ ] Proof comments — inline commenting on artifacts for stakeholder feedback

### Future
- [ ] Quick-flow agent: fix TOOLS.md (wrong title "Technical Writer", says no Bash but has full access), add Polish Pass to AGENTS.md (2026-03-15)
- [ ] Jira / ADO push skills
- [ ] PDF/Word export pipeline
- [ ] Multi-user / team support
- [ ] Entry point selector modal (`/new`)

### VPS Services

| Service | Port | Proxied | Purpose |
|---------|------|---------|---------|
| OpenClaw gateway | 18789 | nginx :80 | Agent API |
| Session status API | 3001 | nginx | Context polling |
| Context files API | 3002 | — | File serving |
| Git API | 3003 | nginx `/api/git/` | Version history |
| Hocuspocus | 4010 | nginx `/collab/` | Real-time collab (future) |
| Proof SDK | 4000 | Cloudflare `proof.srilancar.com` | Document viewer (2026-03-16) |
| Draw.io | 4020 | Cloudflare `drawio.srilancar.com` | Diagram viewer/editor (Docker: jgraph/drawio) |
| OpenClaw (alt) | 18789 | Cloudflare `api.srilancar.com` | Agent API via HTTPS |
| Cloudflare Tunnel | — | systemd service | Tunnel ID: `3eb62f4b-ef56-40c8-939a-b5530b106f3f` (2026-03-16) |

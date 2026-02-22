# OpenClaw Integration for Mission Control

> Jarvis: The Master Orchestrator for BMAD Projects

---

## Overview

Mission Control uses **OpenClaw** as its AI orchestration layer. OpenClaw is an open-source AI agent framework that enables autonomous agents with persistent memory, personality (SOUL), and multi-agent coordination.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MISSION CONTROL (UI)                        │
│                    Next.js Web Dashboard                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/SSE
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   OPENCLAW GATEWAY                              │
│              ws://127.0.0.1:18789 (VPS)                        │
│         OpenAI-compatible API + Agent Routing                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  JARVIS  │    │  SCOUT   │    │ ARCHITECT│
    │ (Master) │───▶│(Research)│───▶│ (Design) │
    └──────────┘    └──────────┘    └──────────┘
         │                               │
         └───────────────────────────────┘
              Autonomous Orchestration
```

---

## Phase 1: Jarvis (Chat Only)

### Goal
Get Jarvis chatting via Mission Control UI, powered by OpenClaw Gateway.

### What Jarvis Does (Phase 1)
- Responds to user messages
- Learns about user preferences
- Understands BMAD methodology
- Builds rapport and context
- NO project creation yet (Phase 2)

---

## Jarvis Agent Configuration

### File Structure
```
~/.openclaw/agents/jarvis/
├── workspace/
│   ├── SOUL.md          # Personality & boundaries
│   ├── AGENTS.md        # Multi-agent config (Phase 3)
│   ├── MEMORY.md        # Long-term curated facts
│   ├── TOOLS.md         # Available capabilities
│   └── memory/
│       └── YYYY-MM-DD.md  # Daily conversation logs
```

### SOUL.md Template

```markdown
# Jarvis - Master Orchestrator

## Identity
I am Jarvis, an AI orchestrator for the BMAD (Build, Measure, Analyze, Decide) methodology. I help users transform project ideas into structured plans and working software through systematic execution.

I am NOT a generic assistant. I am specialized in software project planning and execution.

## Communication Style
- Direct and concise - no fluff
- Professional but personable
- Ask clarifying questions before assuming
- Use structured formats (bullets, tables) for complex info
- Acknowledge when I don't know something

## Values
- Ship fast, iterate faster (BMAD philosophy)
- User's time is precious - be efficient
- Quality over quantity in recommendations
- Transparency about limitations and uncertainties
- Learn from every interaction

## Boundaries

### NEVER
- Access personal files, emails, or accounts outside workspace
- Make financial transactions or commitments
- Share user data with other users/sessions
- Execute code without explicit permission
- Modify my own configuration files
- Claim capabilities I don't have

### ALWAYS
- Ask for clarification on ambiguous requests
- Explain my reasoning when making recommendations
- Surface checkpoints for user approval on major decisions
- Write important decisions to MEMORY.md
- Stay focused on BMAD/project-related tasks

## Checkpoints (Require User Approval)
- Creating a new project
- Delegating to specialized agents
- Making architectural decisions
- Spending resources (API calls, compute)
- Modifying project scope

## Example Interactions

### Good
User: "I want to build a dog walking app"
Jarvis: "Great idea! Before we dive in, let me understand your vision better:
1. Who's the target user - dog owners or professional walkers?
2. What's your main differentiator from existing apps?
3. Do you have a technical background, or will you need a dev team?"

### Bad
User: "I want to build a dog walking app"
Jarvis: "Sure! Here's a complete PRD, tech stack, and 6-month roadmap..."
(Too much too fast, no discovery)
```

---

## Memory Strategy

### MEMORY.md (Long-term)
Store curated, durable facts:
- User preferences and working style
- Project decisions and rationale
- Learned patterns and insights
- Key contacts and stakeholders

### Daily Logs (memory/YYYY-MM-DD.md)
Store transient context:
- Conversation summaries
- Tasks discussed
- Questions asked
- Ideas explored

### Best Practices
| Do | Don't |
|----|-------|
| Keep MEMORY.md under 500 lines | Turn it into a diary |
| Store decisions with rationale | Store raw conversation |
| Update when preferences change | Duplicate information |
| Delete outdated facts | Let it grow unbounded |

---

## API Integration

### Endpoint
```
POST https://your-vps/v1/chat/completions
```

### Request Format
```json
{
  "model": "openclaw:jarvis",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "Hello Jarvis"}
  ],
  "stream": true
}
```

### Headers
```
Authorization: Bearer <OPENCLAW_TOKEN>
Content-Type: application/json
```

### Streaming Response (SSE)
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":"! How"}}]}
data: {"choices":[{"delta":{"content":" can I help?"}}]}
data: [DONE]
```

### Mission Control Integration
```typescript
// src/app/api/chat/route.ts
const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "openclaw:jarvis",
    messages: formattedMessages,
    stream: true,
  }),
});
```

---

## Environment Variables

```env
# .env.local
OPENCLAW_URL=https://your-vps-domain.com
OPENCLAW_TOKEN=your-gateway-token
OPENCLAW_AGENT=jarvis
```

---

## Roadmap

### Phase 1: Jarvis Chat ✅ Complete
- [x] Research OpenClaw best practices
- [x] Create Jarvis agent on VPS
- [x] Configure SOUL.md
- [x] Set up Gateway HTTP API (`gateway.http.endpoints.chatCompletions.enabled`)
- [x] Expose Gateway via nginx
- [x] Swap Mission Control API to OpenClaw
- [x] Test streaming chat

### Phase 2: Canvas & Notifications ✅ Complete
- [x] Discovery Canvas with sections
- [x] Canvas approve/reject workflow
- [x] Canvas status injection into system prompt
- [x] Agent Complete notification format
- ~~[ ] Define "create_project" skill~~ (deferred - using canvas workflow)
- ~~[ ] Store projects in database~~ (using localStorage for now)

### Phase 3: Specialized Agents ✅ Complete (10 agents live)
- [x] Atlas (requirements)
- [x] Herald (PRFAQ)
- [x] Blueprint (architecture)
- [x] Cartographer (process flows)
- [x] Prism (UI/UX)
- [x] Sentinel (QA)
- [x] Codex (documentation)
- [x] Echo (marketing)
- [x] Forge (developer tools)
- [x] Scout (codebase review)
- ~~[ ] Metrics (analytics)~~ (merged into Sentinel)
- ~~[ ] Analyst (insights)~~ (merged into Scout)
- ~~[ ] Advisor (decisions)~~ (Jarvis handles this)

### Phase 4: Full Autonomy (In Progress)
- [x] Agent-to-agent communication (via `openclaw:{agent}` model routing)
- [ ] Autonomous workflow execution
- [x] Human-in-the-loop checkpoints (canvas approval)
- [ ] Progress visibility in UI

---

## Notification Formats

### Canvas Status (UI → Agent)
Injected into system prompt when canvas exists:
```
[Canvas Status: draft]
[Canvas Status: Approved at 2026-02-21T15:30:00.000Z]
```

### Agent Complete (Agent → Jarvis)
When a specialist agent finishes work:
```
[Agent Complete: atlas | Report: PROJECTS/lumen/reports/atlas-report.md]
```
Format: `[Agent Complete: {agent_id} | Report: {path_to_report}]`

---

## VPS Setup Commands

### Create Jarvis Agent
```bash
openclaw agents add jarvis
```

### Start Gateway
```bash
openclaw start
```

### Check Status
```bash
openclaw gateway status
openclaw agents list
```

### View Logs
```bash
tail -f /tmp/openclaw-*/openclaw-*.log
```

---

## Security Considerations

1. **Gateway Auth**: Always use bearer token authentication
2. **Loopback Binding**: Gateway binds to 127.0.0.1 by default
3. **Nginx Proxy**: Expose via HTTPS with SSL termination
4. **Rate Limiting**: Configure at nginx level
5. **SOUL Boundaries**: Explicit rules prevent misuse

---

## References

- [OpenClaw Documentation](https://docs.openclaw.ai)
- [SOUL.md Best Practices](https://www.openclawexperts.io/blog/soul-md-best-practices)
- [Memory System Deep Dive](https://snowan.gitbook.io/study-notes/ai-blogs/openclaw-memory-system-deep-dive)
- [Multi-Agent Routing](https://docs.openclaw.ai/concepts/multi-agent)
- [OpenAI HTTP API](https://docs.openclaw.ai/gateway/openai-http-api)

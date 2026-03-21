# BMAD - Learnings

## OpenClaw Config

### Access
- `ssh mc-admin` → `sudo` for config edits
- Config: `~/.openclaw/openclaw.json`
- Restart: `sudo systemctl restart openclaw-gateway`
- PM2: `pm2 restart all`

### Common Gotchas
- **Provider needs `api` field**: `"api": "anthropic-messages"` or `"api": "openai-completions"`
- **Orphan bindings crash**: If `bindings[]` refs non-existent agent → crash
- **Invalid keys crash**: `debounceMs`, `compaction` at root → put in `agents.defaults`
- **Model ID format**: `claude-opus-4-6` (NOT `claude-opus-4-6-20260205`)

### Compaction & Caching
- Config location: `agents.defaults.compaction` (NOT root)
- Current: `reserveTokensFloor: 100000`, `softThresholdTokens: 60000`
- Triggers at ~102K tokens for Kimi K2.5 (256K context)
- Memory flush writes to `memory/YYYY-MM-DD.md` + `daily-tracker.md`
- Claude caching: `cacheRetention: "long"` → 90% savings on SOUL/TOOLS/AGENTS
- Only PREFIX cached (system prompt), conversation NEVER cached

### Session Management
- Clear session: `sudo rm ~/.openclaw/agents/<agent>/sessions/*.jsonl`
- Session clearer service: port 18791, proxied via nginx
- Debounce fix: `"messages": { "inbound": { "debounceMs": 0 } }`

### System Prompt Injection
- **OpenClaw handles**: SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md from `workspace` path
- **Frontend only sends**: Username line + canvas status (document states)
- **DON'T duplicate**: Frontend should NOT fetch/inject SOUL.md - OpenClaw does it

## Mission Control

### Chat Flow
```
User → /api/chat → OpenClaw (openclaw:jarvis) → Stream back
                 ↓
         System prompt: SOUL.md + username + canvas status
```

### Artifact Protocol
```xml
<artifact identifier="doc-id" title="Title" type="project_brief" status="awaiting_approval">
  ...markdown content...
</artifact>
```
- Parsed from AI response, saved to canvas with auto-versioning
- Types: project_brief, process_flow, requirements, architecture, design, test_strategy

### Canvas Storage
- Key: `canvas_${sessionId}` in localStorage
- Multi-doc with version arrays
- Each save creates new version automatically
- Context injection: `[Document "Title" (v2/3): Approved at ISO-date]`

### Streaming
- 60fps via 16ms throttle (`requestAnimationFrame` pattern)
- XML tags hidden during stream, cleaned on completion
- `cleanStreamingXml()` handles incomplete tags

## Code Patterns

### Image Format by Provider
- **Claude**: `{ type: "image", source: { type: "base64", media_type, data } }`
- **OpenAI/Kimi**: `{ type: "image_url", image_url: { url: "data:mime;base64,..." } }`

### shadcn Overrides
- Dialog width: Use `!max-w-3xl` (important prefix) to override `sm:max-w-lg`
- Filter dropdowns: `bg-muted/50 hover:bg-muted border-0`
- Table fonts: `text-xs` for all content

## Engineering Principles
- No silent fallbacks - fail fast
- Single mechanism per feature
- Components only, no inline styling
- Check `index.ts` before creating new component

## Cost Optimization
- Tier 1 cap at 500 lines → 95% savings vs unbounded
- Kimi K2.5: $0.60/$3 per M tokens
- Claude Opus 4.6: $5/$25 per M tokens
- Use Kimi for agents, Claude for orchestration
- **Lightweight tasks**: Use MiniMax direct (not through OpenClaw agents) for title generation etc.
  - Avoids loading full workspace (SOUL.md, TOOLS.md, etc.) for simple tasks
  - MiniMax M2.5: $0.50/$2.50 per M tokens

### Token Waste Fixes (2026-02-22)
1. **Removed SOUL.md double injection**: Frontend was fetching + injecting SOUL.md, but OpenClaw already does it
2. **Title generation → MiniMax direct**: Was using full Jarvis agent (~5K tokens) for 5-word titles
3. **Slimmed TOOLS.md**: 592→62 lines. Extracted templates to `templates/` folder
4. **Slimmed MEMORY.md**: 217→43 lines. Removed redundancy with SOUL.md (kept only decisions/prefs)
   - **Auto-loaded total: 1312→608 lines (~9K tokens saved per message)**

### Templates Extracted to `templates/`
- `artifact-format.md` - XML artifact tag format
- `document-types.md` - Document type registry
- `agent-invocation.md` - How to call agents
- `context-injection-matrix.md` - What context each agent needs
- `parallel-rules.md` - Which agents can run in parallel
- `failure-protocol.md` - Handling agent failures
- `pipeline-status.json` - Kanban JSON format
- `daily-tracker-format.md` - Progress tracking format
- `status-update.md` - Daily status template
- `project-structure.md` - Directory layout

## Excalidraw MCP
- For text inside shapes: use `boundElements` on shape + `containerId` on text (bidirectional binding)
- The `label` property only works in MCP preview, NOT when exported to excalidraw.com
- Handwritten font: `fontFamily: 1` (Virgil), clean: `fontFamily: 2` (Helvetica), code: `fontFamily: 3`

- **AlertDialogAction wraps Button** - Custom className colors get overridden by Button's variant styles; use `variant` prop or `!important` prefix for custom bg colors

# Sprint 07 — DEV Kickoff

You are `[DEV]` on **SynaptixLabs Vigil** — Sprint 07.

**Repo:** `C:\Synaptix-Labs\projects\vigil`
**Sprint index:** `docs/sprints/sprint_07/sprint_07_index.md`
**Decisions log:** `docs/sprints/sprint_07/sprint_07_decisions_log.md`
**Todo:** `docs/sprints/sprint_07/todo/sprint_07_team_dev_todo.md`

---

## Your Mission

Wire the AGENTS platform as Vigil's LLM backend. Ship bug auto-complete, returning bug detection, and the autonomous `vigil_agent` resolution loop.

**Track A — AGENTS Integration** (S07-01 to S07-03) — `[cross-project, FLAG]`
**Track B — Server Live Mode** (S07-04, S07-05, S07-07) — `[DEV:server]`
**Track C — Extension LLM Features** (S07-06) — `[DEV:ext]`
**Track D — Autonomous Agent** (S07-08a-d, S07-09) — `[DEV:*]`
**Track E — Carry-Forward** (S07-11, S07-12, S07-13) — `[DEV:server/ext/dashboard]`
**Track F — Cloud Infrastructure** (S07-15, S07-14) — `[DEV:server]` + `[INFRA]`
**Track G — Founder Product Vision** (S07-16, S07-17, S07-18, S07-19) — `[DEV:ext/dashboard]`

> **Track Dependencies — READ THIS FIRST:**
> - **Track A is the critical path.** AGENTS `/api/v1/vigil/suggest` endpoint must exist before Track B can wire to it.
> - **Track A executes in the AGENTS repo (`nightingale`), NOT in vigil.** A parallel AGENTS Sprint 06 is opened for this work (D014).
> - **Track B** depends on Track A — cannot flip `VIGIL_LLM_MODE=live` until the AGENTS endpoint is deployed.
> - **Track C** depends on Track B — extension auto-complete sends to vigil-server, which forwards to AGENTS.
> - **Track D** depends on Track B — `vigil_agent` needs live MCP tools + live LLM responses.
> - **Track E has NO dependencies** — carry-forward items can start immediately in parallel.
> - **QA (S07-10)** runs after Track B + Track C ship.

---

## Environment

```powershell
cd C:\Synaptix-Labs\projects\vigil

# Extension
npm run dev            # Vite watch build (CRXJS)
npm run build          # Production build → dist/

# vigil-server
npm run dev:server     # nodemon on port 7474
npm run build:server   # production build

# Dashboard
npm run dev:dashboard  # Vite dev server

# Tests
npx vitest run         # Unit + integration
npx playwright test    # E2E
npx tsc --noEmit       # Type check

# AGENTS (separate repo)
cd C:\Synaptix-Labs\projects\nightingale
python -m uvicorn backend.app.main:app --reload --port 8000
```

**Port map:** 7474 (vigil-server) | 8000 (AGENTS) | 3900 (demo app)

---

## Track A — AGENTS Integration (Cross-Project)

> **⚠️ FLAG:** This work happens in the `nightingale` (AGENTS) repo, NOT in `vigil`. Coordinate with CPTO.

### S07-01 — AGENTS `/api/v1/vigil/suggest` Endpoint (~4V)

**Repo:** `C:\Synaptix-Labs\projects\nightingale`
**File:** `backend/app/api/routes/vigil.py` (new)

Create a POST endpoint that receives Vigil suggest requests and returns LLM responses.

```python
# POST /api/v1/vigil/suggest
# Auth: X-Vigil-Key header → matches VIGIL_AGENTS_API_KEY env var
# Body: { type: "bug_title"|"steps"|"severity"|"similarity"|"classify", context: {...} }
# Response: { suggestion: str, confidence: float, model_used: str, tokens_used: int }
```

**Model:** `llama-3.3-70b-versatile` via Groq provider (D003 updated, D012).

### S07-02 — Prompt Templates (~3V)

**Repo:** `C:\Synaptix-Labs\projects\nightingale`
**Location:** `backend/modules/llm_core/prompts/vigil/`

Create Jinja2 templates:
- `bug_title.jinja2` — URL + recent actions → concise bug title
- `steps_to_reproduce.jinja2` — action log → numbered steps
- `severity.jinja2` — bug title + context → P0/P1/P2/P3 with reasoning
- `similarity.jinja2` — new bug + existing fixed bugs → returning bug detection

### S07-03 — resource_manager Tracking (~2V)

**Repo:** `C:\Synaptix-Labs\projects\nightingale`

Tag all Vigil LLM calls with `project_id="vigil"`, `feature="suggest"`. No new vigil-server code needed — AGENTS handles internally.

---

## Track B — Server Live Mode

### S07-04 — Flip `VIGIL_LLM_MODE=live` (~2V)

**File:** `packages/server/src/llm-client.ts` (new or extend existing suggest route)

```typescript
// Wire vigil-server → AGENTS API
async function suggest(type: SuggestType, context: SuggestContext) {
  const config = loadConfig();
  if (config.llmMode === 'mock') return MOCK_RESPONSE;

  const res = await fetch(`${config.agentsApiUrl}/api/v1/vigil/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Vigil-Key': process.env.VIGIL_AGENTS_API_KEY!
    },
    body: JSON.stringify({ type, context })
  });
  return res.json();
}
```

**Config addition to `vigil.config.json`:**
```json
{ "llmMode": "live", "agentsApiUrl": "http://localhost:8000" }
```

> **Key decision (D006):** LLM auto-complete is always optional. If AGENTS is offline or slow (timeout configurable), fall back gracefully — UI must still work.

### S07-05 — Returning Bug Detection (~3V)

**Trigger:** On new bug receipt (POST /api/session or `bug-log` command).

1. Load all `fixed/` bug files from all sprints
2. Call AGENTS with `type: "similarity"`
3. If confidence > 0.8 (D008) → auto-escalate severity + add `## Returning Bug` block
4. If archived regression test exists → auto-queue it

### S07-07 — Severity Auto-Suggest (~2V)

Show confidence indicator next to severity dropdown in bug editor. Example: `P1 (85% confidence)`. If LLM unavailable: dropdown shows normally, no indicator.

---

## Track C — Extension LLM Features

### S07-06 — Bug Auto-Complete in Extension (~3V)

**Files:** `src/content/overlay/BugEditor.tsx`, `src/background/session-manager.ts`

**Flow:**
1. User opens bug editor (Ctrl+Shift+B)
2. Extension sends session context to vigil-server `/api/suggest`
3. vigil-server forwards to AGENTS
4. Response pre-fills title + steps (greyed placeholder text)
5. User edits or accepts before saving

**UX rule:** Auto-complete is always overridable. Never block save on LLM failure.

---

## Track D — Autonomous Agent

### S07-08 — `vigil_agent` (4 sub-tasks with safety gates — D013)

**Each phase has a checkpoint. Agent cannot proceed to next phase without previous passing.**

**S07-08a — Scaffold (~1V):**
- Create `/project:vigil-agent` command in `.claude/commands/vigil-agent.md`
- Config in `vigil.config.json`: `maxIterations`, `maxTimeMinutes`, `maxCostUsd`, `dryRun`
- Safety gate: `dryRun: true` logs actions without executing

**S07-08b — Bug Classification (~1.5V):**
- For each open bug → call AGENTS with `type: "classify"`
- Categories: `reproducible`, `needs-info`, `code-defect`, `UX-issue`
- Safety gate: classification only — zero code changes

**S07-08c — Regression Test Generation (~1.5V):**
- For `reproducible` bugs → generate test in `tests/e2e/regression/BUG-XXX.spec.ts`
- Run test → confirm RED
- Safety gate: stops after RED — does NOT attempt fix

**S07-08d — Fix Implementation (~1V):**
- Implement fix (max iterations from config)
- Run test → confirm GREEN
- `vigil_close_bug(id, resolution, keep_test: true)`
- Git commit to `vigil/fixes/sprint-XX` branch
- Safety gate: branch-only, Avi merges

### S07-09 — Sprint Health Report (~2V)

LLM-generated summary: open bugs by severity, fixed this sprint, returning bugs flagged, regression tests added/archived, sprint closure recommendation.

---

## Track E — Carry-Forward (No Dependencies)

> These items were deferred from Sprint 06 design reviews. They can start immediately.

### S07-11 — Shared Types Package (~2V)

**Location:** `packages/shared/` (new workspace package)

Extract types from `src/shared/types.ts` and `packages/server/src/types.ts` into a single source. Zod schemas in `packages/shared/`; TS types via `z.infer<>`. Both extension and server import from here.

Resolves: Sprint 06 Track B DR — U03 (duplicate types).

### S07-12 — VIGILSession Persistence (~1.5V)

**File:** `src/background/session-manager.ts`

Persist `VIGILSession` to `chrome.storage.local` on every state change. Rehydrate on service worker restart. Currently in-memory only — session lost on restart.

Resolves: Sprint 06 Track A DR — U1 (in-memory session).

### S07-13 — Dashboard Unit Tests (~1V)

**Location:** `packages/dashboard/`

Add vitest config + component tests for BugList, FeatureList, SprintSelector, HealthIndicator.

Resolves: Sprint 06 Track C DR — U3 (no dashboard tests).

---

## Track F — Cloud Infrastructure (No AGENTS Dependency)

> Can start once Sprint 06 server is stable. S07-15 (Neon) first, then S07-14 (Vercel).

### S07-15 — Neon PostgreSQL Migration (~4V)

**Location:** `packages/server/src/db/` (new), updates to `filesystem/` layer

Replace markdown-as-DB filesystem storage with Neon managed Postgres:

1. **Schema:** `bugs`, `features`, `sessions`, `sprints` tables
2. **Driver:** `@neondatabase/serverless` — works in local Node.js + Vercel Edge
3. **Migration:** Replace `reader.ts` / `writer.ts` / `counter.ts` with DB queries
4. **Counter → sequence:** Postgres sequences for atomic bug/feature IDs (resolves Sprint 06 U01 race condition)
5. **MCP tools:** Update to query DB instead of filesystem
6. **Seed script:** Import existing `.vigil/` markdown files into Neon

**Config:** `DATABASE_URL` env var. Local dev via Neon branching or local Postgres.

### S07-14 — Vercel Deployment (~2V)

**Location:** `vercel.json` (new), `packages/server/` adaptations

- Dashboard: static build → Vercel static site
- vigil-server: Express adapted to Vercel serverless functions
- Env vars (`VIGIL_AGENTS_API_KEY`, `DATABASE_URL`) in Vercel project settings
- Health check on cloud URL

**Prerequisite:** S07-15 (Neon) — serverless functions need DB, not filesystem.

---

## Track G — Founder Product Vision (Captured during FAT Round 2)

> Full requirements: `todo/sprint_07_product_vision.md`
> S07-16 and S07-19 have NO dependencies — start Day 1.

### S07-16 — Project-Oriented Session Model (~5V) — 🟠 P1

**Files:** `src/popup/` (session form), `src/shared/types.ts`, `src/background/session-manager.ts`

The session creation flow must become **project-oriented**:

1. **Project field = required** — folder path (e.g. `C:\Synaptix-Labs\projects\vigil`). This IS the project identity.
2. **Sprint auto-detected** from project's `docs/sprints/` folder structure. Auto-selects latest sprint. User can change via dropdown.
3. **Session name auto-generated** (e.g. `vigil-session-2026-02-27-001`). User can edit.
4. **Description field** — free-text, user-typed.
5. **Persistent history** — last project/sprint choices remembered in `chrome.storage.local`. Next session pre-fills from history. User can pick from history or create NEW.

**Data model change:**
```
Session (current):      name, url, tabId, tags
Session (S07 target):   project (folder), sprint (auto), name (auto), description, url, tabId
```

### S07-17 — Dashboard Overhaul (~6V) — 🟡 P2

**Files:** `packages/dashboard/src/` (all components)

> Blocked by S07-15 (Neon — data layer change) + S07-16 (project model — new data structure)

The dashboard must become a **product-oriented workflow tool**:

1. **Navigation hierarchy:** Project selector → Sprint view → Session drill-down
2. **Sprint context:** Show what project/repo the sprint belongs to
3. **Filters:** By project, sprint, session
4. **Bug/feature detail:** Show attached screenshots inline
5. **Session timeline:** Visual timeline of session events
6. **Recording replay:** Play rrweb recording directly in dashboard
7. **Session list:** Sessions within a sprint (latest first, can browse)

### S07-18 — Ghost Session Recovery (~1V) — 🟢 P3

**Files:** `src/popup/` (side panel UI), `src/background/session-manager.ts`

When page refreshes during active session, user has no way to end the orphaned session. Add "End stale session" button in the side panel that detects and terminates orphaned sessions.

### S07-19 — Manifest Shortcut Fix (~0.5V) — 🟢 P3

**File:** `manifest.json`

Change `commands.open-bug-editor.suggested_key.default` from `Ctrl+Shift+B` to `Alt+Shift+B`. Chrome's built-in `Ctrl+Shift+B` (bookmarks bar toggle) takes precedence over extension `suggested_key` — the shortcut silently fails on fresh install (BUG-FAT-010).

**Ship this on Day 1 — one-line change.**

---

## Quality Gates (non-negotiable)

```
✅ TypeScript clean (tsc --noEmit) — extension + server + dashboard
✅ Build succeeds (npm run build + npm run build:server)
✅ Extension loads in Chrome without errors
✅ vigil-server health check passes (GET /health → 200)
✅ AGENTS health check passes (GET /api/v1/health → 200) — when live mode
✅ No regressions on existing E2E + unit suites
✅ Regression test written for any bug fix
✅ Required data-testid attributes present
✅ vigil_agent commits to branch only — never main
```

---

## Key Decisions

| ID | Decision |
|---|---|
| D003 (updated) | Model: `llama-3.3-70b-versatile` via Groq (not 8B) |
| D004 | Auth: `X-Vigil-Key` header + `VIGIL_AGENTS_API_KEY` env var |
| D005 | `vigil_agent` branch-only commits |
| D006 | LLM always optional — UI works if AGENTS offline |
| D008 | Returning bug threshold: confidence > 0.8 |
| D011 | Carry-forward items added to scope (+4.5V) |
| D013 | `vigil_agent` ships with sub-task breakdown + safety gates |
| D014 | AGENTS parallel sprint for S07-01/02/03 |
| D015 | Vercel + Neon added to Sprint 07 scope |

---

**Await your track assignment from CPTO before executing anything.**

*Generated: 2026-02-26 | Updated: 2026-02-27 (added Track G — Founder product vision S07-16 through S07-19) | Sprint 07 | Owner: CPTO*

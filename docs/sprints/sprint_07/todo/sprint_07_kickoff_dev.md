# Sprint 07 — DEV Kickoff

You are `[DEV]` on **SynaptixLabs Vigil** — Sprint 07.

**Repo:** `C:\Synaptix-Labs\projects\vigil`
**Sprint index:** `docs/sprints/sprint_07/sprint_07_index.md`
**Decisions log:** `docs/sprints/sprint_07/sprint_07_decisions_log.md`
**Todo:** `docs/sprints/sprint_07/todo/sprint_07_team_dev_todo.md`

---

## ⚡ CRITICAL: Two-Phase Sprint Structure (D021)

> **Founder directive:** Fix UX first, acceptance test it, THEN move to AGENTS/LLM/Neon.

```
PHASE 1 (Week 1-2): UX Foundation — Track G + Track H + Track E
    │
    ├── FAT Round 3 GATE — Founder acceptance walkthrough (13 steps)
    │   Must PASS before Phase 2 items begin
    │
PHASE 2 (Week 2-3): Backend — Track A + B + C + D + F
    │   (items with no Phase 1 dependency can start parallel in Week 2)
    │
    └── Sprint 07 closure
```

**Phase 1 deliverables are YOUR FIRST PRIORITY. Do not start Phase 2 tracks until Phase 1 passes FAT Round 3.**

---

## Your Mission

Ship the **UX foundation first** (project sessions, dashboard overhaul, carry-forward bugs), then wire the AGENTS platform as Vigil's LLM backend, ship the autonomous `vigil_agent`, and deploy to Vercel + Neon.

**⚡ PHASE 1 — UX First (Week 1-2):**
**Track G — Founder UX Priority** (S07-16, S07-17a, S07-17b, S07-18, S07-19) — `[DEV:ext/dashboard]`
**Track H — Carry-Forward Bugs** (S07-20, S07-21) — `[DEV:ext]`
**Track E — Carry-Forward** (S07-11, S07-12, S07-13) — `[DEV:server/ext/dashboard]`

**PHASE 2 — Backend + LLM (Week 2-3):**
**Track A — AGENTS Integration** (S07-01 to S07-03) — `[cross-project, FLAG]`
**Track B — Server Live Mode** (S07-04, S07-05, S07-07) — `[DEV:server]`
**Track C — Extension LLM Features** (S07-06) — `[DEV:ext]`
**Track D — Autonomous Agent** (S07-08a-d, S07-09) — `[DEV:*]`
**Track F — Cloud Infrastructure** (S07-15, S07-14) — `[DEV:server]` + `[INFRA]`

> **Track Dependencies — READ THIS FIRST:**
> - **Phase 1 is the critical path.** Track G (Founder UX) and Track H (carry-forward bugs) must pass FAT Round 3 before Phase 2 begins.
> - **Track G has NO AGENTS dependency.** S07-16, S07-18, S07-19 can start Day 1. S07-17a/17b blocked by S07-16 data model.
> - **Track H has NO dependencies.** S07-20, S07-21 can start Day 1.
> - **Track E has NO dependencies.** S07-11, S07-12, S07-13 can start Day 1 in parallel.
> - **Track A executes in the AGENTS repo (`nightingale`), NOT in vigil.** A parallel AGENTS Sprint 06 is opened for this work (D014).
> - **Track B** depends on Track A — cannot flip `VIGIL_LLM_MODE=live` until the AGENTS endpoint is deployed.
> - **Track C** depends on Track B — extension auto-complete sends to vigil-server, which forwards to AGENTS.
> - **Track D** depends on Track B — `vigil_agent` needs live MCP tools + live LLM responses.
> - **Track F can start parallel in Week 2** — Neon (S07-15) has no AGENTS dependency.
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

# AGENTS (separate repo — Phase 2 only)
cd C:\Synaptix-Labs\projects\nightingale
python -m uvicorn backend.app.main:app --reload --port 8000
```

**Port map:** 7474 (vigil-server) | 8000 (AGENTS) | 3900 (demo app)

---

## ⚡ PHASE 1: UX Foundation (Week 1-2)

---

## Track G — Founder UX Priority (PHASE 1 TOP PRIORITY)

> Full requirements: `todo/sprint_07_product_vision.md`
> FAT Round 3 walkthrough: `FOUNDER_ACCEPTANCE_WALKTHROUGH_S07.md`
> S07-16, S07-18, S07-19 have NO dependencies — start Day 1.

### S07-16 — Project-Oriented Session Model (~5V) — 🔴 P0

**Files:** `src/popup/` (session form), `src/shared/types.ts`, `src/background/session-manager.ts`

The session creation flow must become **project-oriented**. This is the Founder's top priority — sprint fails without this.

1. **Project field = required** — folder path (e.g. `C:\Synaptix-Labs\projects\vigil`). This IS the project identity.
2. **Sprint auto-detected** from project's `docs/sprints/` folder structure. Auto-selects latest sprint. User can change via dropdown. Sprint auto-detect is convenience, not gate (D020).
3. **Session name auto-generated** (e.g. `vigil-session-2026-02-27-001`). User can edit.
4. **Description field** — free-text, user-typed.
5. **Persistent history** — last project/sprint choices remembered in `chrome.storage.local`. Next session pre-fills from history. User can pick from history or create NEW.

**Data model change:**
```
Session (current):      name, url, tabId, tags
Session (S07 target):   project (folder), sprint (auto), name (auto), description, url, tabId
```

**Validation (D020):** Check folder exists. If `docs/sprints/` present, auto-populate sprints. If not, show empty dropdown with manual entry. No hard error for non-project folders.

**Schedule:** D2-D7 (Week 1 into Week 2). MVP in Week 1, polish in Week 2.

### S07-19 — Manifest Shortcut Fix (~0.5V) — 🟠 P1

**File:** `manifest.json`

Change `commands.open-bug-editor.suggested_key.default` from `Ctrl+Shift+B` to `Alt+Shift+B`. Chrome's built-in `Ctrl+Shift+B` (bookmarks bar toggle) takes precedence over extension `suggested_key` — the shortcut silently fails on fresh install (BUG-FAT-010).

**Ship this on Day 1 — one-line change.**

### S07-18 — Ghost Session Recovery (~1V) — 🟠 P1

**Files:** `src/popup/` (side panel UI), `src/background/session-manager.ts`

When page refreshes during active session, user has no way to end the orphaned session. Add "End stale session" button in the side panel that detects and terminates orphaned sessions.

**data-testid attributes:** `ghost-session-banner`, `ghost-session-end-btn`

**Schedule:** D3-D5 (Week 1).

### S07-17a — Dashboard Overhaul Phase A: Nav + Filters + Screenshots (~3V) — 🟠 P1

**Files:** `packages/dashboard/src/` (components)

> Blocked by S07-16 (project data model must exist first).
> Split from original S07-17 (6V) per D022.

1. **Navigation hierarchy:** Project selector → Sprint view → Session drill-down
2. **Sprint context:** Show what project/repo the sprint belongs to
3. **Filters:** By project, sprint, session — clear filters shows all data
4. **Bug/feature detail:** Show attached screenshots inline
5. **Session list:** Sessions within a sprint (latest first, can browse)

**Incremental rewrite (D018):** Modify existing components. Preserve existing `data-testid` attributes. No rollback path — forward only.

**New data-testid attributes:** `project-selector`, `sprint-view`, `session-list`, `session-detail`, `bug-screenshot-inline`

**Schedule:** D6-D8 (Week 2). Blocked by S07-16.

### S07-17b — Dashboard Overhaul Phase B: Timeline + Replay (~3V) — 🟠 P1

**Files:** `packages/dashboard/src/` (components)

> Blocked by S07-17a.

1. **Session timeline:** Visual timeline of session events (recordings, screenshots, bugs) in chronological order
2. **Recording replay:** Play rrweb recording directly in dashboard — pause/resume/scrub
3. **Session metadata display:** Duration, snapshot count, bug count

**New data-testid attributes:** `session-timeline`, `replay-player`, `replay-controls`

**Schedule:** D8-D10 (Week 2). Blocked by S07-17a.

---

## Track H — Carry-Forward Bugs (PHASE 1)

> Sprint 06 deferred bugs. Added per D023. No dependencies — start Day 1.

### S07-20 — BUG-EXT-001 Fix: Codegen Invalid TypeScript (~1V) — 🟡 P2

**File:** `src/core/playwright-codegen.ts` (line ~110)

Playwright codegen generates invalid TypeScript — regex at line 110 doesn't handle edge cases. Fix the regex, unskip the test, verify generated TS compiles.

**Schedule:** D1 (Week 1).

### S07-21 — BUG-EXT-002: btn-publish Implementation (~1V) — 🟡 P2

Spec-first gap from Sprint 06. Either implement the `btn-publish` testid in SessionDetail or remove the test that references it. Decision: implement or remove — either is acceptable, but the gap must close.

**Schedule:** D4-D5 (Week 1).

---

## Track E — Carry-Forward (PHASE 1, No Dependencies)

> These items were deferred from Sprint 06 design reviews. They can start immediately.

### S07-11 — Shared Types Package (~2V) — 🟠 P1

**Location:** `packages/shared/` (new workspace package)

Extract types from `src/shared/types.ts` and `packages/server/src/types.ts` into a single source. Zod schemas in `packages/shared/`; TS types via `z.infer<>`. Both extension and server import from here.

Resolves: Sprint 06 Track B DR — U03 (duplicate types).

**Schedule:** D1-D2 (Week 1).

### S07-12 — VIGILSession Persistence (~1.5V) — 🟠 P1

**File:** `src/background/session-manager.ts`

Persist `VIGILSession` to `chrome.storage.local` on every state change. Rehydrate on service worker restart. Currently in-memory only — session lost on restart.

Resolves: Sprint 06 Track A DR — U1 (in-memory session).

**Schedule:** D1-D3 (Week 1).

### S07-13 — Dashboard Component Tests (~1V) — 🟠 P1

**Location:** `packages/dashboard/`

Add vitest config + component tests for NEW dashboard components (post S07-17a overhaul). Tests written for new state, not old state (D018).

Resolves: Sprint 06 Track C DR — U3 (no dashboard tests).

**Schedule:** D9-D10 (Week 2). After S07-17a ships.

---

## ⛔ PHASE 1 GATE: FAT Round 3

**Document:** `FOUNDER_ACCEPTANCE_WALKTHROUGH_S07.md` (13 acceptance steps)

ALL must pass before Phase 2 begins:
1. ✅ S07-16: Project-oriented session creation verified
2. ✅ S07-17a: Dashboard project/sprint/session navigation works
3. ✅ S07-17b: Session timeline + replay functional
4. ✅ S07-12: Session survives service worker restart
5. ✅ S07-18: Ghost session recoverable from side panel
6. ✅ S07-19: `Alt+Shift+B` works on fresh install
7. ✅ S07-20/21: Carry-forward bugs fixed, tests unskipped and green
8. ✅ BUG-DASH-001 regression: Mark Fixed still works after overhaul
9. ✅ Quality gates: tsc, vitest, build, extension loads, server health 200
10. ✅ **Founder sign-off**

**If gate FAILS:** Fix. Phase 2 does NOT start. Non-negotiable.

---

## PHASE 2: Backend + LLM + Agent (Week 2-3)

---

## Track A — AGENTS Integration (Cross-Project)

> **⚠️ FLAG:** This work happens in the `nightingale` (AGENTS) repo, NOT in `vigil`. Coordinate with CPTO.
> **Dedicated briefing:** `sprint_07_kickoff_agents.md` — `[DEV:agents]` has its own kickoff.
> Can start in Week 2 parallel (no Phase 1 dependency).

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

### S07-03 — resource_manager Tracking (~2V) — 🟢 Stretch

**Repo:** `C:\Synaptix-Labs\projects\nightingale`

Tag all Vigil LLM calls with `project_id="vigil"`, `feature="suggest"`. No new vigil-server code needed — AGENTS handles internally. Defer to S08 if capacity is tight.

---

## Track B — Server Live Mode

> Blocked on Track A — AGENTS endpoint must be deployed first.

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
    body: JSON.stringify({ type, context }),
    signal: AbortSignal.timeout(10_000) // D017: 10s timeout
  });
  return res.json();
}
```

**Timeout/failure (D017):** On timeout or rate-limit → return empty suggestion with confidence 0 (not 500). UI shows manual form with no pre-fill.

**Config addition to `vigil.config.json`:**
```json
{ "llmMode": "live", "agentsApiUrl": "http://localhost:8000" }
```

> **Key decision (D006):** LLM auto-complete is always optional. If AGENTS is offline or slow, fall back gracefully — UI must still work.

### S07-05 — Returning Bug Detection (~3V)

**Trigger:** On new bug receipt (POST /api/session or `bug-log` command).

1. Load all `fixed/` bug files from all sprints
2. Call AGENTS with `type: "similarity"`
3. If confidence > 0.8 (D008) → auto-escalate severity + add `## Returning Bug` block
4. If archived regression test exists → auto-queue it

### S07-07 — Severity Auto-Suggest (~2V) — 🟢 Stretch

Show confidence indicator next to severity dropdown in bug editor. Example: `P1 (85% confidence)`. If LLM unavailable: dropdown shows normally, no indicator. Defer to S08 if capacity is tight.

---

## Track C — Extension LLM Features

> Blocked on Track B — server must forward to AGENTS.

### S07-06 — Bug Auto-Complete in Extension (~3V)

**Files:** `src/content/overlay/BugEditor.tsx`, `src/background/session-manager.ts`

**Flow:**
1. User opens bug editor (`Alt+Shift+B`)
2. Extension sends session context to vigil-server `/api/suggest`
3. vigil-server forwards to AGENTS
4. Response pre-fills title + steps (greyed placeholder text)
5. User edits or accepts before saving

**UX rule:** Auto-complete is always overridable. Never block save on LLM failure.

---

## Track D — Autonomous Agent

> Blocked on Track B — needs live MCP tools + live LLM. Sub-tasks have sequential safety gates (D013).

### S07-08 — `vigil_agent` (4 sub-tasks with safety gates — D013)

**Each phase has a checkpoint. Agent cannot proceed to next phase without previous passing.**

**S07-08a — Scaffold (~1V):**
- Create `/project:vigil-agent` command in `.claude/commands/vigil-agent.md`
- Config in `vigil.config.json`: `maxIterations`, `maxTimeMinutes`, `maxCostUsd`, `dryRun`
- Safety gate: `dryRun: true` logs actions without executing
- **Can start Week 1-2** (no AGENTS dependency for scaffold)

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
- **Exhaustion (D019):** On blocked bug → log BLOCKED, move to next bug in queue, report at end

### S07-09 — Sprint Health Report (~2V) — 🟢 Stretch

LLM-generated summary: open bugs by severity, fixed this sprint, returning bugs flagged, regression tests added/archived, sprint closure recommendation. Defer to S08 if capacity is tight.

---

## Track F — Cloud Infrastructure (No AGENTS Dependency)

> **Dedicated briefing:** `sprint_07_kickoff_infra.md` — `[INFRA]` has its own kickoff.
> Can start Week 2 parallel. S07-15 (Neon) first, then S07-14 (Vercel).

### S07-15 — Neon PostgreSQL Migration (~4V)

**Location:** `packages/server/src/db/` (new), updates to `filesystem/` layer

Replace markdown-as-DB filesystem storage with Neon managed Postgres:

1. **Schema:** `bugs`, `features`, `sessions`, `sprints` tables
2. **Driver:** `@neondatabase/serverless` — works in local Node.js + Vercel Edge
3. **Migration:** Replace `reader.ts` / `writer.ts` / `counter.ts` with DB queries
4. **Counter → sequence:** Postgres sequences for atomic bug/feature IDs (resolves Sprint 06 U01 race condition)
5. **MCP tools:** Update to query DB instead of filesystem
6. **Seed script:** Import existing `.vigil/` markdown files into Neon

**Fallback (D016):** If `DATABASE_URL` unset — local dev falls back to filesystem; production (Vercel) returns 503.

**Config:** `DATABASE_URL` env var. Never in `vigil.config.json`.

### S07-14 — Vercel Deployment (~2V)

**Location:** `vercel.json` (new), `packages/server/` adaptations

- Dashboard: static build → Vercel static site
- vigil-server: Express adapted to Vercel serverless functions
- Env vars (`VIGIL_AGENTS_API_KEY`, `DATABASE_URL`) in Vercel project settings
- Health check on cloud URL

**Prerequisite:** S07-15 (Neon) — serverless functions need DB, not filesystem.

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
| D016 | Neon fallback: filesystem local, 503 serverless |
| D017 | AGENTS timeout: 10s, empty suggestion on failure |
| D018 | Dashboard incremental rewrite, existing testids preserved |
| D019 | vigil_agent exhaustion: log BLOCKED, move to next bug |
| D020 | Project field: check folder exists, sprint auto-detect is convenience |
| D021 | Sprint restructured: Phase 1 (UX) + Phase 2 (Backend) with FAT gate |
| D022 | S07-17 split: 17a (nav+filters, 3V) + 17b (timeline+replay, 3V) |
| D023 | Carry-forward bugs: S07-20, S07-21, S07-22 |

---

**Await your track assignment from CPTO before executing anything.**

*Generated: 2026-02-26 | Updated: 2026-02-27 (RESTRUCTURED: Phase 1 UX-first per D021. Track G/H promoted to top. S07-16 promoted to P0. S07-17 split into 17a/17b per D022. Track H added per D023. D016-D023 added.) | Sprint 07 | Owner: CPTO*

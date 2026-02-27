# Sprint 07 — Index

**Goal:** Wire the AGENTS platform as Vigil's LLM backend. Ship bug auto-complete, returning bug detection, and the autonomous `vigil_agent` resolution loop.

**Depends on:** Sprint 06 complete (vigil-server running, MCP tools live, `/api/vigil/suggest` stub present)  
**Version target:** `2.1.0`  
**Budget:** ~32.5V
**Prerequisite:** AGENTS project running locally (`http://localhost:8000`)

---

## Context

Sprint 07 flips `VIGIL_LLM_MODE` from `mock` → `live` and wires the full agentic BE stack.

The architecture principle: **Vigil never owns LLM logic.** All inference runs through AGENTS `llm_core`. Vigil's vigil-server is a thin consumer.

```
vigil-ext  →  vigil-server (:7474)
                  → AGENTS FastAPI (:8000)
                       → llm_core (Groq / Claude / fallback)
                       → resource_manager (token accounting)
                       → returns structured suggestion
```

---

## Scope

### ⚡ PHASE 1 — UX Foundation + Acceptance (Week 1-2, ~24V)

> **Founder directive:** Fix UX first, acceptance test it, THEN move to AGENTS/LLM/Neon.
> Phase 1 must pass FAT Round 3 before Phase 2 begins.

| ID | Track | Deliverable | Priority | Cost | Owner | Phase | Week |
|---|---|---|---|---|---|---|---|
| S07-16 | EXT | Project-oriented session model: required project field, auto-sprint, persistent history | 🔴 P0 | ~5V | `[DEV:ext]` | 1 | W1-W2 |
| S07-19 | EXT | Manifest shortcut fix: `Ctrl+Shift+B` → `Alt+Shift+B` default (BUG-FAT-010) | 🟠 P1 | ~0.5V | `[DEV:ext]` | 1 | W1-D1 |
| S07-12 | EXT | VIGILSession persistence via `chrome.storage.local` (service worker restart-safe) | 🟠 P1 | ~1.5V | `[DEV:ext]` | 1 | W1 |
| S07-11 | SERVER | Shared types package (`packages/shared/`) — single source for ext + server + AGENTS types | 🟠 P1 | ~2V | `[DEV:server]` | 1 | W1 |
| S07-18 | EXT | Ghost session recovery: end orphaned sessions from side panel | 🟠 P1 | ~1V | `[DEV:ext]` | 1 | W1 |
| S07-17a | DASHBOARD | Dashboard overhaul Phase A: project/sprint/session nav, filters, screenshot display | 🟠 P1 | ~3V | `[DEV:dashboard]` | 1 | W2 |
| S07-17b | DASHBOARD | Dashboard overhaul Phase B: session timeline + recording replay | 🟠 P1 | ~3V | `[DEV:dashboard]` | 1 | W2 |
| S07-13 | DASHBOARD | Dashboard component tests (for NEW S07-17 components) | 🟠 P1 | ~1V | `[DEV:dashboard]` | 1 | W2 |
| S07-20 | EXT | BUG-EXT-001 fix: Playwright codegen generates invalid TypeScript (S06 carry-forward) | 🟡 P2 | ~1V | `[DEV:ext]` | 1 | W1 |
| S07-21 | EXT | BUG-EXT-002: btn-publish testid implementation (S06 carry-forward) | 🟡 P2 | ~1V | `[DEV:ext]` | 1 | W1 |

**Phase 1 total: ~20V** | **Gate: FAT Round 3 — Founder sign-off required before Phase 2**

### 🔧 PHASE 2 — Backend + LLM + Agent (Week 2-3, ~31V)

> Phase 2 items with NO Phase 1 dependency can start parallel during Week 2.
> AGENTS-dependent items unblock in Week 3 after S07-01 ships.

| ID | Track | Deliverable | Priority | Cost | Owner | Phase | Week |
|---|---|---|---|---|---|---|---|
| S07-01 | AGENTS | Add `/api/v1/vigil/suggest` endpoint to AGENTS project | 🟠 P1 | ~4V | `[DEV:agents]` | 2 | W2 |
| S07-02 | AGENTS | `llm_core` prompt templates for bug auto-complete + similarity | 🟠 P1 | ~3V | `[DEV:agents]` | 2 | W3 |
| S07-03 | AGENTS | `resource_manager` Vigil usage tracking (project_id=vigil) | 🟡 P2 | ~2V | `[DEV:agents]` | 2 | W3 |
| S07-04 | SERVER | Flip `VIGIL_LLM_MODE=live`, wire vigil-server → AGENTS API | 🟠 P1 | ~2V | `[DEV:server]` | 2 | W3 |
| S07-05 | SERVER | Returning bug detection: semantic similarity on new bug receipt | 🟠 P1 | ~3V | `[DEV:server]` | 2 | W3 |
| S07-06 | EXT | Bug auto-complete in editor (title + steps pre-fill from LLM) | 🟠 P1 | ~3V | `[DEV:ext]` | 2 | W3 |
| S07-07 | SERVER | Severity auto-suggest (confidence score shown, user overrides) | 🟡 P2 | ~2V | `[DEV:server]` + `[DEV:ext]` | 2 | W3 |
| S07-08a | AGENT | `vigil_agent` scaffold: `/project:vigil-agent` command + config (max time, cost, dry-run) | 🟠 P1 | ~1V | `[CTO]` | 2 | W1-W2 |
| S07-08b | AGENT | Bug analysis + classification (reproducible / needs-info / code-defect / UX-issue) | 🟠 P1 | ~1.5V | `[CTO]` + `[DEV:ext]` | 2 | W3 |
| S07-08c | AGENT | Regression test generation + red confirmation | 🟠 P1 | ~1.5V | `[CTO]` + `[QA]` | 2 | W3 |
| S07-08d | AGENT | Fix implementation + green confirmation + git commit to branch | 🟠 P1 | ~1V | `[CTO]` | 2 | W3 |
| S07-09 | AGENT | Sprint health report (LLM-generated summary of open bugs + risk) | 🟡 P2 | ~2V | `[CTO]` + `[DEV:server]` | 2 | W3 |
| S07-10 | QA | Integration tests: ext → server → AGENTS round-trip | 🟡 P2 | ~2V | `[QA]` | 2 | W3 |
| S07-14 | INFRA | Vercel deployment: vigil-server (serverless) + dashboard (static) | 🟡 P2 | ~2V | `[INFRA]` + `[DEV:server]` | 2 | W3 |
| S07-15 | SERVER | Neon PostgreSQL: migrate bug/feature storage from filesystem to managed Postgres | 🟠 P1 | ~4V | `[DEV:server]` | 2 | W2 |
| S07-22 | QA | HTTP route integration tests (S06 Track B review B03 carry-forward) | 🟡 P2 | ~1.5V | `[QA]` | 2 | W3 |

**Phase 2 total: ~35V (core P1: ~25V, stretch P2: ~10V)**

**Total: ~55V** (Phase 1: ~20V, Phase 2: ~35V — includes 6V carry-forward, 6V cloud infra, 14V Founder vision)

> **⚡ RESTRUCTURED per CPTO Design Review (2026-02-27):** Sprint split into Phase 1 (UX) + Phase 2 (Backend) with FAT Round 3 gate. S07-16 promoted to P0. S07-17/18/19 promoted to P1. S07-01/04 demoted from P0 to P1. S07-20/21/22 added for carry-forward bugs + deferred review items. See `sprint_07_plan.md` for full design review.
>
> **Founder product vision (S07-16 through S07-21):** Captured during Sprint 06 FAT Round 2. See `todo/sprint_07_product_vision.md` for full requirements.
>
> **Carry-forward items (S07-11, S07-12, S07-13, S07-20, S07-21, S07-22):** From Sprint 06 design reviews and deferred bugs. No AGENTS dependencies.
>
> **Cloud infra (S07-14, S07-15):** Vercel + Neon (D015). Phase 2 — can start parallel W2.

---

## Track Details

### S07-01 — AGENTS `/api/v1/vigil/suggest` Endpoint

**Location:** `backend/app/api/routes/vigil.py` (new file in AGENTS project)  
**Auth:** `X-Vigil-Key` header matches `VIGIL_AGENTS_API_KEY` env var

```python
POST /api/v1/vigil/suggest
Body:
{
  "type": "bug_title" | "steps" | "severity" | "similarity",
  "context": {
    "url": str,
    "session_clock_ms": int,
    "recent_actions": [...],   # last N actions from session
    "screenshot_b64": str,     # optional
    "existing_bugs": [...]     # for similarity check
  }
}
Response:
{
  "suggestion": str,
  "confidence": float,
  "model_used": str,
  "tokens_used": int
}
```

Uses `llm_core` model selection (Groq `llama-3.3-70b-versatile` as default for latency).

---

### S07-02 — Prompt Templates

Stored in `backend/modules/llm_core/prompts/vigil/`:
- `bug_title.jinja2` — given URL + recent actions → suggest concise bug title
- `steps_to_reproduce.jinja2` — given action log → generate numbered steps
- `severity.jinja2` — given bug title + context → suggest P0/P1/P2/P3 with reasoning
- `similarity.jinja2` — given new bug + existing fixed bugs → flag potential returning bug

---

### S07-03 — resource_manager Tracking

All Vigil LLM calls tagged: `project_id="vigil"`, `feature="suggest"`.  
Enables per-project cost visibility in AGENTS dashboard.  
No new code in vigil-server — AGENTS handles it internally.

---

### S07-04 — vigil-server Live Mode

```typescript
// vigil.config.json
{ "llmMode": "live", "agentsApiUrl": "http://localhost:8000" }

// vigil-server/src/llm-client.ts
async function suggest(type, context) {
  if (config.llmMode === 'mock') return MOCK_RESPONSE;
  return await fetch(`${config.agentsApiUrl}/api/v1/vigil/suggest`, {
    method: 'POST',
    headers: { 'X-Vigil-Key': process.env.VIGIL_AGENTS_API_KEY },
    body: JSON.stringify({ type, context })
  }).then(r => r.json());
}
```

---

### S07-05 — Returning Bug Detection

**Trigger:** On receipt of any new bug (from ext POST or manual `bug-log`).  
**Flow:**
1. Load all `fixed/` bug files from all sprints
2. Call `/api/v1/vigil/suggest` with `type: "similarity"`
3. If confidence > 0.8 → auto-escalate severity by one level + add `## Returning Bug` block with link to original
4. If archived regression test exists for original bug → auto-queue it

---

### S07-06 — Bug Auto-Complete in Extension

**Trigger:** User opens bug editor (via `Ctrl+Shift+B` combo).  
**Flow:**
1. Extension sends session context to vigil-server `/api/suggest` (local hop)
2. vigil-server forwards to AGENTS
3. Response pre-fills title + steps fields (greyed placeholder text)
4. User can edit or accept before saving

**UX rule:** Auto-complete is always overridable. Never block save on LLM failure.

---

### S07-07 — Severity Auto-Suggest

Small confidence indicator next to severity dropdown in bug editor:
- `P1 (85% confidence)` — user sees suggestion, clicks to accept or overrides
- If LLM unavailable: dropdown shows normally, no indicator

---

### S07-08 — `vigil_agent` Autonomous Loop (4 sub-tasks)

A Claude Code slash command that runs the full resolution queue autonomously.
Decomposed into 4 phases, each with an explicit safety gate (D013).

#### S07-08a — Agent Scaffold (~1V)

- `/project:vigil-agent` command file in `.claude/commands/`
- Config in `vigil.config.json`: `maxIterations`, `maxTimeMinutes`, `maxCostUsd`, `dryRun`
- **Safety gate:** `dryRun: true` mode logs all planned actions without executing

#### S07-08b — Bug Analysis + Classification (~1.5V)

- For each open bug → call AGENTS `/api/v1/vigil/suggest` with `type: "classify"`
- Categories: `reproducible`, `needs-info`, `code-defect`, `UX-issue`
- **Safety gate:** Classification only — zero code changes, zero file writes

#### S07-08c — Regression Test Generation (~1.5V)

- For `reproducible` bugs: generate regression test in `tests/e2e/regression/BUG-XXX.spec.ts`
- Run test → confirm RED (test fails, proving the bug exists)
- If test passes (no bug repro): escalate to Avi
- **Safety gate:** Stops after RED confirmed — does NOT attempt fix

#### S07-08d — Fix Implementation (~1V)

- Implement fix (max iterations from `vigil.config.json`)
- Run regression test → confirm GREEN
- `vigil_close_bug(id, resolution, keep_test: true)`
- Git commit to `vigil/fixes/sprint-XX` branch
- **Safety gate:** Branch-only, max iterations enforced, Avi merges

```
/project:vigil-agent [--sprint XX] [--severity P0,P1] [--dry-run]

Phase flow per bug:
  S07-08b: Classify → S07-08c: Test → S07-08d: Fix → Commit

Reports at end: N fixed, N blocked, N escalated, total time, tests added
```

**Max autonomy guardrails:**
- Agent never deletes files, never pushes to main directly
- All commits to a `vigil/fixes/sprint-XX` branch. Avi merges.
- Agent cannot modify test files to force GREEN without actual fix
- Each phase checkpoint — agent cannot skip from classify to fix

---

### S07-09 — Sprint Health Report

```
/project:bug-review --report

Generates:
  - Open bugs by severity (P0: N, P1: N, P2: N, P3: N)
  - Fixed this sprint: N
  - Returning bugs flagged: N
  - Regression tests added: N, archived: N
  - Sprint closure recommendation: READY | BLOCKED (reasons)
  - LLM-generated risk summary (via AGENTS)
```

---

### S07-11 — Shared Types Package (~2V)

**Location:** `packages/shared/` (new workspace package)

Extract shared TypeScript types into a workspace package. Both extension (`src/shared/types.ts`) and server (`packages/server/src/types.ts`) import from one source. Zod schemas live in `packages/shared/`; TS types inferred via `z.infer<>`.

Resolves Sprint 06 Track B DR — U03 (duplicate type definitions causing schema drift).

---

### S07-12 — VIGILSession Persistence (~1.5V)

**Location:** `src/background/session-manager.ts`

Persist `VIGILSession` to `chrome.storage.local` on every state change. On service worker restart, rehydrate from storage. Currently in-memory only (`vigilState` module-level variable) — if service worker restarts mid-session, the session is lost.

Resolves Sprint 06 Track A DR — U1 (in-memory only session).

---

### S07-13 — Dashboard Unit Tests (~1V)

**Location:** `packages/dashboard/`

Add vitest config to dashboard package. Write component tests for:
- `BugList.tsx` — renders bug table, severity dropdown, status toggle
- `FeatureList.tsx` — renders feature table
- `SprintSelector.tsx` — sprint dropdown selection
- `HealthIndicator.tsx` — green/red dot + polling

Resolves Sprint 06 Track C DR — U3 (no dashboard unit tests).

---

### S07-14 — Vercel Deployment (~2V)

**Location:** `vercel.json` (new), `packages/server/` adaptations

Deploy vigil-server and dashboard to Vercel:
- **Dashboard:** Static build from `packages/server/public/` — deploy as Vercel static site
- **vigil-server:** Express app adapted to Vercel serverless functions (`/api/` routes)
- Health check, session receiver, bug/feature CRUD, suggest endpoint all functional in cloud
- Environment variables (`VIGIL_AGENTS_API_KEY`, `DATABASE_URL`) configured in Vercel project settings

**Prerequisite:** S07-15 (Neon) should be done first — serverless functions need DB, not filesystem.

---

### S07-15 — Neon PostgreSQL Migration (~4V)

**Location:** `packages/server/src/db/` (new), update `filesystem/` layer

Replace markdown-as-DB filesystem storage with Neon managed Postgres:

1. **Schema design:** `bugs`, `features`, `sessions`, `sprints` tables
2. **Connection:** Neon serverless driver (`@neondatabase/serverless`) — works in both local Node.js and Vercel Edge
3. **Migration layer:** Replace `reader.ts` / `writer.ts` / `counter.ts` with DB queries
4. **Counter → sequence:** Bug/feature IDs via Postgres sequences (atomic — resolves Sprint 06 U01 race condition)
5. **MCP tools:** Update to query DB instead of filesystem
6. **Seed script:** Import existing `.vigil/` markdown files into Neon

**Config:** `DATABASE_URL` env var. Local dev can use Neon branching or local Postgres.

Supersedes Sprint 08 U02 (markdown-as-DB fragility) — going straight to proper DB instead of frontmatter workaround. Also resolves Sprint 06 U01 (counter race condition via Postgres sequences).

---

## Track Structure

```
Track A — AGENTS Integration (S07-01 to S07-03)     [cross-project, FLAG]
  └── Blocked on: AGENTS project availability (parallel AGENTS Sprint 06)

Track B — Server Live Mode (S07-04, S07-05, S07-07)  [DEV:server]
  └── Blocked on: Track A (AGENTS endpoint must exist)

Track C — Extension LLM Features (S07-06)             [DEV:ext]
  └── Blocked on: Track B (server must forward to AGENTS)

Track D — Autonomous Agent (S07-08a-d, S07-09)       [DEV:*]
  └── Blocked on: Track B (MCP tools + live LLM)

Track E — Carry-Forward (S07-11, S07-12, S07-13)     [DEV:server/ext/dashboard]
  └── No dependencies — can start immediately in parallel

Track F — Cloud Infra (S07-15, S07-14)               [DEV:server]
  └── S07-15 (Neon) first, then S07-14 (Vercel) — serverless needs DB
  └── No AGENTS dependency — can start after Sprint 06 server is stable

QA — Integration Tests (S07-10)
  └── Blocked on: Track B + Track C
```

**Critical path:** Track A (AGENTS) → Track B → Track C/D → QA
**Parallel paths:** Track E (carry-forward) + Track F (cloud infra) — both can start immediately

---

## Definition of Done

- [ ] `POST /api/v1/vigil/suggest` returns real LLM response in AGENTS project
- [ ] vigil-server `VIGIL_LLM_MODE=live` routes to AGENTS correctly
- [ ] Bug editor pre-fills title + steps from LLM (with fallback if LLM down)
- [ ] Returning bug correctly detected and escalated on known fixed bug re-entry
- [ ] Severity suggestion shown with confidence score
- [ ] `vigil_agent` runs full red→green loop on queue of bugs autonomously
- [ ] All fixes committed to `vigil/fixes/sprint-XX` branch (not main)
- [ ] Sprint health report generated and readable
- [ ] Integration tests: ext POST → server → AGENTS → suggestion round-trip passes
- [ ] `resource_manager` shows Vigil LLM usage tagged correctly in AGENTS
- [ ] `packages/shared/` exists with Zod schemas; ext and server import from it (S07-11)
- [ ] VIGILSession survives service worker restart via `chrome.storage.local` (S07-12)
- [ ] Dashboard has vitest config + component tests passing (S07-13)
- [ ] vigil-server deployed to Vercel, health check passes on cloud URL (S07-14)
- [ ] Bug/feature storage on Neon PostgreSQL — CRUD operations verified (S07-15)

---

## Key Constraints

- `vigil_agent` **never pushes to main** — branch only, Avi merges
- LLM auto-complete is **always optional** — UI must work if AGENTS is offline
- All AGENTS API keys via env vars only — never in `vigil.config.json`
- Severity suggestion is **advisory** — user always has final say

---

*Sprint 07 planned: 2026-02-26 | Updated: 2026-02-27 (priority/owner/schedule assigned — see `sprint_07_plan.md`) | Depends on Sprint 06 | Owner: CPTO*

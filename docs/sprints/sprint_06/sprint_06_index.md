# Sprint 06 — Index

**Goal:** Ship the Vigil core platform — session model refactor, vigil-server MCP bridge, filesystem storage, management dashboard, and Claude Code resolution loop commands.

**Depends on:** Sprint 05 complete ✅  
**Version target:** `2.0.0`  
**Budget:** ~30V  
**Port:** vigil-server runs on `7474`  

---

## Context & Pivot

Sprint 06 marks the **Vigil pivot** from pure Chrome recorder (Refine v1.x) to a full bug management platform:

- **Before:** Extension records → user downloads ZIP → manual tracking
- **After:** Extension captures → vigil-server writes to filesystem → Claude Code resolves → Git-native history

The extension Chrome layer is mostly preserved. The new work is the server bridge, storage model, dashboard, and resolution commands.

---

## Architecture (Sprint 06 target)

```
vigil-ext (Chrome)
  └── Session = container (start/end by user)
        ├── Snapshots (always available — Ctrl+Shift+S or combo)
        ├── Recordings (opt-in — SPACE outside input / play button)
        └── Bugs + Features (inline, attached to snapshot)
  └── END SESSION → POST to vigil-server :7474

vigil-server (Node.js, port 7474)
  ├── Receives sessions from ext
  ├── Writes to filesystem (sprint BUGS/ + FEATURES/ + .vigil/sessions/)
  ├── Exposes MCP tools → Claude Code reads/writes bugs natively
  ├── Serves management dashboard (localhost:7474/dashboard)
  └── VIGIL_LLM_MODE=mock (LLM stub — wired in Sprint 07)

Filesystem (Git-native)
  <project>/
    .vigil/
      sessions/         ← raw session artifacts
      bugs.counter      ← global ID sequence
      vigil.config.json ← per-project settings
    docs/sprints/
      sprint_XX/
        BUGS/
          open/   BUG-XXX_description.md
          fixed/  BUG-XXX_description.md
        FEATURES/
          open/   FEAT-XXX_description.md
          backlog/ FEAT-XXX_description.md

Claude Code (.claude/commands/)
  /project:bug-log    ← manual bug/feature entry
  /project:bug-fix    ← full red→green resolution loop
  /project:bug-review ← sprint closure gate
```

---

## Scope

| ID | Track | Deliverable | Cost |
|---|---|---|---|
| S06-01 | EXT | Session model refactor: session = container, recording = opt-in | ~4V |
| S06-02 | EXT | Snapshot-first flow + keyboard combo for snapshot+bug editor | ~2V |
| S06-03 | EXT | SPACE shortcut (outside input = play/pause recording) | ~1V |
| S06-04 | EXT | END SESSION → POST to vigil-server (with retry + offline queue) | ~2V |
| S06-05 | SERVER | vigil-server scaffold: Node.js + Express, port 7474, health check | ~2V |
| S06-06 | SERVER | Session receiver: POST /api/session → filesystem writer | ~3V |
| S06-07 | SERVER | MCP tool layer: 6 core tools exposed to Claude Code | ~3V |
| S06-08 | SERVER | Bug/Feature ID counter (global, `bugs.counter` file) | ~1V |
| S06-09 | SERVER | `/api/vigil/suggest` stub (mock response, VIGIL_LLM_MODE=mock) | ~1V |
| S06-10 | DASHBOARD | Management GUI: list bugs/features by sprint, status, severity | ~4V |
| S06-11 | DASHBOARD | Actions: move to backlog, change severity, assign sprint | ~2V |
| S06-12 | COMMANDS | `/project:bug-log` slash command | ~1V |
| S06-13 | COMMANDS | `/project:bug-fix` slash command (red→green loop, max iterations from config) | ~2V |
| S06-14 | COMMANDS | `/project:bug-review` slash command (sprint closure gate) | ~1V |
| S06-15 | QA | E2E: session POST → filesystem write verified | ~1V |

**Total: ~30V**

---

## Track Details

### S06-01 — Session Model Refactor

**Current:** Session IS a recording (start = record starts, stop = record stops).  
**New:** Session = container. Recording = opt-in component inside a session.

```typescript
interface VIGILSession {
  id: string                    // vigil-SESSION-YYYYMMDD-NNN
  name: string
  projectId: string
  startedAt: number
  endedAt?: number
  clock: number                 // ms since session start (always running)
  recordings: Recording[]       // opt-in, N per session
  snapshots: Snapshot[]         // always available
  bugs: Bug[]
  features: Feature[]
}

interface Recording {
  id: string
  startedAt: number
  endedAt?: number
  rrwebChunks: RrwebChunk[]
  mouseTracking: boolean        // user opt-in
}
```

**Key behavior changes:**
- Session clock starts on NEW SESSION, never stops until END SESSION
- Recording starts/stops independently (SPACE key, play/pause button)
- Snapshot always available regardless of recording state
- Bug/Feature editor always available regardless of recording state

---

### S06-02 — Snapshot + Bug/Feature Combo

New keyboard shortcut (configurable in manifest): `Ctrl+Shift+B`  
**Behavior:** Capture screenshot → open Bug/Feature editor pre-filled with:
- Current URL
- Timestamp (from session clock)
- Screenshot attached

Existing `Ctrl+Shift+S` = snapshot only (no editor).  
Existing `Ctrl+Shift+B` currently opens bug editor only — **merge** these into one: snapshot + editor.

---

### S06-03 — SPACE Shortcut

**When:** User is on target page, SPACE pressed, focused element is NOT an input/textarea/contenteditable.  
**Action:** Toggle recording (play → pause → play).  
**Implementation:** `keydown` listener on `document` in content script, check `document.activeElement.tagName`.

---

### S06-04 — END SESSION POST

On END SESSION:
1. Bundle full session JSON (all recordings, snapshots, bugs, features)
2. POST to `http://localhost:7474/api/session`
3. Retry up to 3x with 1s backoff if server unreachable
4. If all retries fail: queue in IndexedDB with `pendingSync: true` flag
5. Show toast: "Session saved to Vigil" or "Server offline — queued for sync"

---

### S06-05 to S06-09 — vigil-server

**Stack:** Node.js 20 + Express + TypeScript  
**Location:** `packages/server/` (monorepo prep, not yet extracted)  
**Start:** `npm run dev:server` (added to root `package.json`)

**MCP Tools (S06-07):**

```typescript
vigil_list_bugs(sprint?: string, status?: 'open' | 'fixed')
vigil_get_bug(bug_id: string)
vigil_update_bug(bug_id: string, fields: Partial<BugFile>)
vigil_close_bug(bug_id: string, resolution: string, keep_test: boolean)
vigil_list_features(sprint?: string, status?: 'open' | 'backlog')
vigil_get_feature(feat_id: string)
```

**LLM stub (S06-09):**
```typescript
// POST /api/vigil/suggest
// VIGIL_LLM_MODE=mock → returns hardcoded mock
// VIGIL_LLM_MODE=live → calls AGENTS API (Sprint 07)
{
  suggestion: "Button click not registering on mobile viewport",
  confidence: 0.0,   // 0.0 = mock
  model_used: "mock"
}
```

---

### S06-10 to S06-11 — Management Dashboard

**URL:** `localhost:7474/dashboard`  
**Tech:** React SPA served by vigil-server (built with Vite, bundled into `packages/server/public/`)  
**Views:**
- Sprint selector (dropdown — reads sprint folders from filesystem)
- Bug list: ID | Title | Severity | Status | Assigned | Sprint
- Feature list: ID | Title | Priority | Status | Sprint
- Actions per item: change severity, move to backlog, assign to sprint, view session

**Not in Sprint 06:** charts, analytics, notifications — deferred to Sprint 08.

---

### S06-12 to S06-14 — Claude Code Commands

**`/project:bug-log`** — Manual entry  
Prompts for: title, description, URL, severity, type (bug/feature), sprint.  
Writes `BUG-XXX.md` or `FEAT-XXX.md` to correct sprint folder.  
Increments `bugs.counter`.

**`/project:bug-fix [BUG-ID | --all]`** — Resolution loop
```
1. vigil_get_bug(id) → read full context
2. Analyse: reproduce mentally, check code
3. Write regression test → run → confirm RED (or report can't reproduce)
4. Implement fix (max iterations = vigil.config.json:maxFixIterations, default 3)
5. Run test → confirm GREEN
6. vigil_close_bug(id, resolution, keep_test)
7. Git commit: "fix(BUG-XXX): <description>"
```

**`/project:bug-review`** — Sprint closure gate
```
- Lists all open bugs in current sprint
- Flags any P0/P1 still open (sprint CANNOT close with open P0/P1)
- For each closed bug: confirm keep_test decision
- Runs full regression suite
- Reports: N fixed, N deferred, N archived tests, N kept tests
```

---

## Bug + Feature File Format

```markdown
# BUG-XXX — [short description]

## Status: OPEN | FIXED
## Severity: P0 | P1 | P2 | P3
## Type: bug | feature (FEAT-XXX uses this format too)
## Sprint: XX
## Discovered: [date] via [manual | vigil-session: SESSION-ID]
## Assigned: [DEV:frontend | DEV:backend | unassigned]

## Steps to Reproduce
1.
2.

## Expected
## Actual
## Screenshot / Recording
[path or N/A]

## Regression Test
File: `tests/e2e/regression/BUG-XXX.spec.ts`
Status: ⬜ NOT WRITTEN | 🔴 RED | 🟢 GREEN

## Fix
Commit: —
Files changed: —

## Resolution
[filled after fix]

## Test Decision
[ ] Keep regression test (permanent guard)
[ ] Archive test (one-off, not worth maintaining)
```

---

## vigil.config.json

```json
{
  "projectId": "my-project",
  "sprintCurrent": "06",
  "serverPort": 7474,
  "maxFixIterations": 3,
  "llmMode": "mock",
  "agentsApiUrl": "http://localhost:8000",
  "agentsApiKey": ""
}
```

Lives at project root. Committed to Git (no secrets — keys via env).

---

## Definition of Done

- [ ] Session clock runs from NEW SESSION to END SESSION regardless of recording state
- [ ] SPACE toggles recording when not in input field
- [ ] `Ctrl+Shift+B` = snapshot + bug editor (pre-filled)
- [ ] END SESSION POSTs to vigil-server with retry
- [ ] vigil-server starts on port 7474, health check passes
- [ ] Bug/Feature written to correct sprint folder on session receipt
- [ ] 6 MCP tools registered and readable by Claude Code
- [ ] `/api/vigil/suggest` returns mock response
- [ ] Dashboard loads at localhost:7474/dashboard, shows bugs by sprint
- [ ] `bug-log`, `bug-fix`, `bug-review` commands present in `.claude/commands/`
- [ ] `bug-fix` runs red→green loop with configurable max iterations
- [ ] All existing E2E tests still pass (no regression from ext refactor)
- [ ] `vigil.config.json` schema documented

---

## Sprint 07 Preview (Agentic BE)

> Full details in `sprint_07_index.md`. Placeholder only.

| ID | Deliverable |
|---|---|
| S07-01 | AGENTS `/api/v1/vigil/suggest` endpoint (Python/FastAPI, uses `llm_core`) |
| S07-02 | vigil-server: flip `VIGIL_LLM_MODE=live`, wire AGENTS API call |
| S07-03 | Bug auto-complete in ext (title + steps from session context via LLM) |
| S07-04 | Returning bug detection (semantic similarity via AGENTS embeddings) |
| S07-05 | Bug prioritization suggestions (severity auto-assign, confidence score) |
| S07-06 | AGENTS `resource_manager` tracking for Vigil LLM usage |
| S07-07 | `vigil_agent` — Claude Code agentic loop (reads queue, resolves autonomously) |
| S07-08 | Sprint health report (LLM-generated: open bugs, risk, suggested priority order) |

---

*Sprint 06 opened: 2026-02-26 | Owner: CPTO*

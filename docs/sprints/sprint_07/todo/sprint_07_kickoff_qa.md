# Sprint 07 — QA Kickoff

You are `[QA]` on **SynaptixLabs Vigil** — Sprint 07.

**Repo:** `C:\Synaptix-Labs\projects\vigil`
**Sprint index:** `docs/sprints/sprint_07/sprint_07_index.md`
**Decisions log:** `docs/sprints/sprint_07/sprint_07_decisions_log.md`

---

## ⚡ CRITICAL: Two-Phase Sprint Structure (D021)

> **Founder directive:** Fix UX first, acceptance test it, THEN move to AGENTS/LLM/Neon.
> **Phase 1 items are your FIRST priority.** FAT Round 3 must PASS before Phase 2 testing begins.

---

## Your Mission

Validate the Sprint 07 deliverables in phase order. Your primary concerns:

**Phase 1 (FIRST PRIORITY):**
1. **Project-oriented sessions work:** project field required, sprint auto-detected, history persists
2. **Dashboard overhaul functional:** project/sprint/session navigation, filters, screenshots, timeline
3. **Session persistence:** survives service worker restart
4. **Ghost session recovery:** orphaned sessions detected and endable
5. **Carry-forward bugs fixed:** BUG-EXT-001, BUG-EXT-002 resolved
6. **No regressions** from Sprint 06 features

**Phase 2 (after FAT Round 3 passes):**
7. **LLM round-trip works:** extension → vigil-server → AGENTS → response renders in UI
8. **Graceful degradation:** extension and dashboard work when AGENTS is offline (D006)
9. **vigil_agent safety:** autonomous agent respects branch-only rule, max iterations, dry-run mode
10. **Cloud deployment:** Neon DB + Vercel health checks pass

---

## Regression Gate (Run First)

Before testing any Sprint 07 work, run the full existing test suite:

```powershell
cd C:\Synaptix-Labs\projects\vigil

# Unit + integration tests
npx vitest run

# E2E tests
npx playwright test tests/e2e/ --reporter=list

# vigil-server
npm run dev:server    # port 7474 — wait for health check
curl http://localhost:7474/health

# AGENTS (separate repo — needed for Phase 2 live mode tests only)
cd C:\Synaptix-Labs\projects\nightingale
python -m uvicorn backend.app.main:app --reload --port 8000
curl http://localhost:8000/api/v1/health
```

All existing tests must still pass. Any failure is P0 — blocks Sprint 07 work.

---

## Test Sequencing

**Phase 1 — Founder UX Priority (Week 1-2, test FIRST):**
- Q712: Project-oriented session — project field required, sprint auto-detected, session name auto-generated
- Q713: Persistent history — previous project/sprint remembered, dropdown populated
- Q714a: Dashboard nav + filters — project/sprint/session navigation, screenshots inline
- Q714b: Dashboard timeline + replay — session timeline, rrweb player
- Q715: Ghost session recovery — orphaned session detected and endable from side panel
- Q716: Manifest shortcut — `Alt+Shift+B` works on fresh extension install (no manual setup)
- Q717: Carry-forward bugs — BUG-EXT-001 codegen fix verified, BUG-EXT-002 resolved
- Q701: Shared types — extension and server both import from `packages/shared/`
- Q702: VIGILSession persistence — session survives simulated service worker restart
- Q703: Dashboard unit tests pass (vitest in `packages/dashboard/`)

> ⛔ **FAT Round 3 GATE** — All Phase 1 tests must pass. Founder acceptance walkthrough (13 steps) must complete 13/13 before Phase 2 testing begins.

**Phase 2 — After Track A + Track B ship (AGENTS + server live mode):**
- Q704: LLM round-trip — POST suggest → real LLM response returned
- Q705: Bug auto-complete — bug editor pre-fills title + steps from LLM
- Q706: Returning bug detection — re-file a known fixed bug → escalation triggered
- Q707: Severity auto-suggest — confidence score shown next to dropdown (stretch)
- Q708: Graceful degradation — stop AGENTS → verify extension/dashboard still work

**Phase 3 — After Track D ships (vigil_agent):**
- Q709: vigil_agent dry-run — runs classification loop, logs actions, makes zero changes
- Q710: vigil_agent full run — processes test bug, RED→GREEN, commits to branch (NOT main)
- Q711: Sprint health report — generates readable report with correct stats (stretch)

**Phase 4 — After Track F ships (cloud infrastructure):**
- Q718: Neon CRUD — bugs, features, sessions, sprints create/read/update verified
- Q719: Counter sequences — unique, incrementing IDs from Postgres sequences
- Q720: Vercel health check — deployed URL returns 200 with correct version
- Q721: S07-22: HTTP route integration tests — routes work against Neon data layer

> Do NOT attempt Phase 2 until both vigil-server AND AGENTS are running.
> Do NOT attempt Phase 3 until Phase 2 passes.
> Phase 4 can run independently once S07-15 (Neon) ships.

---

## Test Specs

### Phase 1 — Founder UX Priority

### Q712 — Project-Oriented Session

```typescript
// Verify: session creation is project-oriented
// 1. Open side panel → "New Session"
// 2. Verify: Project field exists and is REQUIRED (folder path input)
//    data-testid: session-project-input
// 3. Verify: Sprint dropdown auto-populated from project's docs/sprints/ folder
//    data-testid: session-sprint-dropdown
// 4. Verify: Session name auto-generated (vigil-session-YYYY-MM-DD-NNN)
//    data-testid: session-name-input
// 5. Verify: Description field exists (free-text)
//    data-testid: session-description-input
// 6. Create session → verify session JSON contains project, sprint, name, description
// 7. Verify: project field validation — non-existent folder shows error (D020)
// 8. Verify: folder without docs/sprints/ shows empty sprint dropdown with manual entry
```

### Q713 — Persistent History

```typescript
// Verify: last project/sprint choices remembered
// 1. Create session with project "C:\Synaptix-Labs\projects\vigil", sprint "07"
// 2. End session
// 3. Click "New Session" again
// 4. Verify: project field pre-filled with previous value
// 5. Verify: sprint dropdown shows previous sprint selected
// 6. Verify: can pick from history OR create new
//    data-testid: session-history-dropdown
```

### Q714a — Dashboard Nav + Filters (S07-17a)

```typescript
// Verify: dashboard project-oriented navigation
// 1. Navigate to /dashboard
// 2. Verify: project selector visible (data-testid: project-selector)
// 3. Select project → verify sprint list loads (data-testid: sprint-view)
// 4. Select sprint → verify session list within sprint (data-testid: session-list)
// 5. Click session → verify bugs/features displayed (data-testid: session-detail)
// 6. Verify: screenshots displayed inline (data-testid: bug-screenshot-inline)
// 7. Verify: filters work (by project, sprint, session)
// 8. Verify: clear filters shows all data
// 9. Verify: BUG-DASH-001 regression — Mark Fixed still moves file after overhaul
```

### Q714b — Dashboard Timeline + Replay (S07-17b)

```typescript
// Verify: session timeline and recording replay
// 1. Select session with recordings in dashboard
// 2. Verify: session timeline shows events in chronological order
//    data-testid: session-timeline
// 3. Verify: rrweb recording replay player loads
//    data-testid: replay-player
// 4. Verify: can pause/resume/scrub the replay
//    data-testid: replay-controls
// 5. Verify: session metadata (duration, snapshot count, bug count) displayed
```

### Q715 — Ghost Session Recovery

```typescript
// Verify: orphaned sessions can be ended
// 1. Create session on tab
// 2. Simulate page refresh (Ctrl+R) — content script dies
// 3. Open side panel
// 4. Verify: "End stale session" warning visible (data-testid: ghost-session-banner)
// 5. Verify: "End stale session" button visible (data-testid: ghost-session-end-btn)
// 6. Click it → verify session ends cleanly
// 7. Verify: can create new session after recovery
```

### Q716 — Manifest Shortcut

```typescript
// Verify: Alt+Shift+B works on fresh install
// 1. Remove extension from Chrome
// 2. Re-add extension (Load unpacked)
// 3. Go to chrome://extensions/shortcuts
// 4. Verify: "Open bug editor" shortcut = Alt+Shift+B (auto-assigned)
// 5. Navigate to any page
// 6. Press Alt+Shift+B → verify bug editor opens
```

### Q717 — Carry-Forward Bugs (S07-20, S07-21)

```typescript
// Verify: Sprint 06 deferred bugs resolved
// BUG-EXT-001 (S07-20):
// 1. Export Playwright spec from a session
// 2. Verify: generated TypeScript compiles (tsc --noEmit on output)
// 3. Verify: previously skipped test is now unskipped and green
//
// BUG-EXT-002 (S07-21):
// 1. Check SessionDetail component
// 2. Verify: btn-publish testid present (if implemented) OR test removed (if not needed)
// 3. Verify: no orphaned test references to missing testids
```

### Q701 — Shared Types Package

```typescript
// Verify: packages/shared/ exists and both consumers use it
// 1. Extension types.ts imports from @synaptix/vigil-shared (or relative path)
// 2. Server types.ts imports from @synaptix/vigil-shared
// 3. Zod schemas in shared package validate correctly
// 4. Build succeeds for both extension and server
```

### Q702 — VIGILSession Persistence

```typescript
// Verify: session survives service worker restart
// 1. Create vigil session
// 2. Start recording, add snapshot
// 3. Simulate service worker restart (chrome.runtime.reload or extension reload)
// 4. Verify session rehydrated from chrome.storage.local
// 5. Recording state matches pre-restart state
```

### Q703 — Dashboard Unit Tests

```typescript
// Verify: vitest config exists for packages/dashboard/
// 1. Run: npx vitest run --project dashboard (or equivalent)
// 2. Verify: component tests exist for NEW components (post-S07-17a overhaul)
// 3. All dashboard tests pass
```

---

### Phase 2 — AGENTS Integration

### Q704 — LLM Round-Trip (Integration)

```typescript
// Directory: tests/integration/
// Verify: full suggest round-trip
// 1. POST /api/suggest { type: "bug_title", context: { url: "...", recent_actions: [...] } }
// 2. Response contains: suggestion (string), confidence (float), model_used, tokens_used
// 3. model_used = "llama-3.3-70b-versatile" (or similar Groq model)
// 4. Response time < 10s (D017 timeout)
```

### Q705 — Bug Auto-Complete

```typescript
// Verify: bug editor pre-fills from LLM
// 1. Start session, navigate to test page
// 2. Open bug editor (Alt+Shift+B)
// 3. Verify: title field shows LLM suggestion (data-testid: bug-editor-autocomplete-title)
// 4. Verify: steps field shows LLM suggestion (data-testid: bug-editor-autocomplete-steps)
// 5. Verify: loading spinner shown during request (data-testid: autocomplete-loading)
// 6. Verify: user can edit/override suggestions before saving
```

### Q706 — Returning Bug Detection

```typescript
// Verify: known fixed bug triggers escalation
// 1. Ensure a BUG-XXX exists in fixed/ with "Login button unresponsive"
// 2. File new bug with similar title/context
// 3. Verify: new bug has "## Returning Bug" section
// 4. Verify: severity auto-escalated by one level
// 5. Verify: confidence > 0.8 (D008 threshold)
```

### Q707 — Severity Auto-Suggest (Stretch)

```typescript
// Verify: confidence indicator shown
// 1. Open bug with LLM-suggested severity
// 2. Verify: confidence indicator visible (data-testid: severity-confidence-{BUG-ID})
// 3. Verify: dropdown still works manually
// 4. If LLM unavailable: no confidence indicator, dropdown works normally
```

### Q708 — Graceful Degradation

```typescript
// Verify: D006 — UI works when AGENTS is offline
// 1. Stop AGENTS (kill port 8000)
// 2. Open bug editor → verify it opens (no pre-fill, but not broken)
// 3. Save bug → verify it writes correctly
// 4. Dashboard loads → verify bug list renders
// 5. Severity dropdown works manually (no confidence indicator)
// 6. Verify: no error toasts or UI crashes from missing LLM
```

---

### Phase 3 — vigil_agent

### Q709 — vigil_agent Dry Run

```typescript
// Verify: dry-run mode makes zero changes
// 1. Set vigil.config.json: dryRun = true
// 2. Run /project:vigil-agent --sprint 07
// 3. Verify: output logs classify + planned actions
// 4. Verify: zero file changes (git status clean)
// 5. Verify: zero git commits
```

### Q710 — vigil_agent Full Run

```typescript
// Verify: full RED→GREEN loop + branch commit
// 1. Set vigil.config.json: dryRun = false, maxIterations = 3
// 2. Create test bug: BUG-TEST.md with known reproducible issue
// 3. Run /project:vigil-agent --sprint 07
// 4. Verify: regression test created at tests/e2e/regression/BUG-TEST.spec.ts
// 5. Verify: test was RED, then fix applied, then GREEN
// 6. Verify: commit on vigil/fixes/sprint-07 branch (NOT main)
// 7. Verify: BUG-TEST.md status = FIXED
// 8. Verify: exhaustion behavior (D019) — blocked bug logged, moved to next
```

### Q711 — Sprint Health Report (Stretch)

```typescript
// Verify: LLM-generated report
// 1. Run health report command
// 2. Verify: output includes open bugs by severity
// 3. Verify: output includes fixed this sprint count
// 4. Verify: output includes returning bug flags
// 5. Verify: output includes closure recommendation
```

---

### Phase 4 — Cloud Infrastructure

### Q718 — Neon CRUD Operations

```typescript
// Verify: all CRUD operations work against Neon
// 1. Create bug → verify row in bugs table
// 2. Read bugs by sprint → verify correct results
// 3. Update bug severity → verify persisted
// 4. Create feature → verify row in features table
// 5. Create session → verify row in sessions table
// 6. Verify: MCP tools work against DB (not filesystem)
```

### Q719 — Counter Sequences

```typescript
// Verify: Postgres sequences produce unique IDs
// 1. Create 3 bugs in rapid succession
// 2. Verify: IDs are sequential (BUG-001, BUG-002, BUG-003)
// 3. Verify: no duplicates (resolves S06 U01 race condition)
```

### Q720 — Vercel Health Check

```typescript
// Verify: deployed URL is functional
// 1. curl https://vigil.vercel.app/health → { status: "ok", version: "2.1.0" }
// 2. curl https://vigil.vercel.app/api/sprints → sprints array
// 3. Open https://vigil.vercel.app/dashboard → dashboard loads
```

### Q721 — HTTP Route Integration Tests (S07-22)

```typescript
// Verify: HTTP routes work against Neon data layer
// 1. POST /api/session → creates session in DB
// 2. GET /api/bugs?sprint=07 → returns bugs from DB
// 3. PATCH /api/bugs/:id → updates bug in DB
// 4. GET /api/sprints → returns sprints from DB
// 5. All routes handle errors gracefully (400, 404, 500)
```

---

## Required data-testid Attributes

**Dashboard (existing from S06):** `dashboard-root`, `bug-list-table`, `feature-list-table`, `sprint-selector`, `bug-row-{BUG-ID}`, `severity-badge-{BUG-ID}`, `server-health-status`

**Dashboard (new for S07 — Phase 1):**
- `project-selector` — project dropdown/selector
- `sprint-view` — sprint list within selected project
- `session-list` — session list within selected sprint
- `session-detail` — session detail view
- `bug-screenshot-inline` — screenshot displayed inline in bug detail
- `session-timeline` — session event timeline
- `replay-player` — rrweb recording player
- `replay-controls` — replay pause/resume/scrub controls

**Dashboard (new for S07 — Phase 2):**
- `severity-confidence-{BUG-ID}` — confidence indicator next to severity dropdown
- `returning-bug-badge-{BUG-ID}` — badge for returning bug detection

**Extension (existing from S06):** `recording-indicator`, `bug-editor-panel`, `bug-editor-screenshot`, `session-sync-toast`, `session-clock`

**Extension (new for S07 — Phase 1):**
- `session-project-input` — project folder path field (required)
- `session-sprint-dropdown` — sprint auto-detect dropdown
- `session-name-input` — auto-generated session name (editable)
- `session-description-input` — free-text description field
- `session-history-dropdown` — persistent history selector
- `ghost-session-banner` — orphaned session warning
- `ghost-session-end-btn` — "End stale session" action button

**Extension (new for S07 — Phase 2):**
- `bug-editor-autocomplete-title` — LLM pre-filled title field
- `bug-editor-autocomplete-steps` — LLM pre-filled steps field
- `autocomplete-loading` — spinner while LLM request in flight

---

## Gate Levels

- **Smoke** — extension loads, vigil-server health passes
- **Phase 1 Regression** — all existing E2E + unit tests green + Q712-Q717
- **FAT Round 3** — 13-step Founder acceptance walkthrough (Phase 1 gate)
- **Phase 2 Integration** — Q704 round-trip + Q708 degradation (requires AGENTS running)
- **Full** — regression + Q701–Q721 + manual verification

---

## Output Discipline

For every gate run:
1. State **PASS** or **FAIL** at the top — no ambiguity
2. Pass/fail per layer (unit / integration / E2E)
3. List every failure with file + line + repro steps
4. Screenshots for all E2E failures
5. Update status in `sprint_07_team_dev_todo.md`

---

**Await your TODO assignment from CPTO before executing anything.**

*Generated: 2026-02-26 | Updated: 2026-02-27 (RESTRUCTURED: Phase 1 UX-first per D021. Q712-Q717 promoted to Phase 1. Q714 split into Q714a/Q714b per D022. Q717 added for carry-forward bugs per D023. Phase 4 added for cloud infra. Q718-Q721 added.) | Sprint 07 | Owner: CPTO*

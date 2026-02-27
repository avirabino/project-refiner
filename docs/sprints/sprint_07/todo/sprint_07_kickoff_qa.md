# Sprint 07 — QA Kickoff

You are `[QA]` on **SynaptixLabs Vigil** — Sprint 07.

**Repo:** `C:\Synaptix-Labs\projects\vigil`
**Sprint index:** `docs/sprints/sprint_07/sprint_07_index.md`
**Decisions log:** `docs/sprints/sprint_07/sprint_07_decisions_log.md`

---

## Your Mission

Validate the AGENTS integration end-to-end. Your primary concerns:
1. **LLM round-trip works:** extension → vigil-server → AGENTS → response renders in UI
2. **Graceful degradation:** extension and dashboard work when AGENTS is offline (D006)
3. **vigil_agent safety:** autonomous agent respects branch-only rule, max iterations, dry-run mode
4. **No regressions** from Sprint 06 features (session model, recording, dashboard)

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

# AGENTS (separate repo — needed for live mode tests)
cd C:\Synaptix-Labs\projects\nightingale
python -m uvicorn backend.app.main:app --reload --port 8000
curl http://localhost:8000/api/v1/health
```

All existing tests must still pass. Any failure is P0 — blocks Sprint 07 work.

---

## Test Sequencing

**Phase 1 — After Track E ships (carry-forward, no AGENTS dependency):**
- Q701: Shared types — extension and server both import from `packages/shared/`
- Q702: VIGILSession persistence — session survives simulated service worker restart
- Q703: Dashboard unit tests pass (vitest in `packages/dashboard/`)

**Phase 2 — After Track A + Track B ship (AGENTS + server live mode):**
- Q704: LLM round-trip — POST suggest → real LLM response returned
- Q705: Bug auto-complete — bug editor pre-fills title + steps from LLM
- Q706: Returning bug detection — re-file a known fixed bug → escalation triggered
- Q707: Severity auto-suggest — confidence score shown next to dropdown
- Q708: Graceful degradation — stop AGENTS → verify extension/dashboard still work

**Phase 3 — After Track D ships (vigil_agent):**
- Q709: vigil_agent dry-run — runs classification loop, logs actions, makes zero changes
- Q710: vigil_agent full run — processes test bug, RED→GREEN, commits to branch (NOT main)
- Q711: Sprint health report — generates readable report with correct stats

**Phase 4 — After Track G ships (Founder product vision):**
- Q712: Project-oriented session — project field required, sprint auto-detected, session name auto-generated
- Q713: Persistent history — previous project/sprint remembered, dropdown populated
- Q714: Dashboard overhaul — project/sprint/session navigation, screenshots inline, filters
- Q715: Ghost session recovery — orphaned session detected and endable from side panel
- Q716: Manifest shortcut — `Alt+Shift+B` works on fresh extension install (no manual setup)

> Do NOT attempt Phase 2 until both vigil-server AND AGENTS are running.
> Do NOT attempt Phase 3 until Phase 2 passes.
> Phase 4 can run independently of Phases 2-3 (no AGENTS dependency).

---

## Test Specs

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

### Q704 — LLM Round-Trip (Integration)

```typescript
// Directory: tests/integration/
// Verify: full suggest round-trip
// 1. POST /api/suggest { type: "bug_title", context: { url: "...", recent_actions: [...] } }
// 2. Response contains: suggestion (string), confidence (float), model_used, tokens_used
// 3. model_used = "llama-3.3-70b-versatile" (or similar Groq model)
// 4. Response time < 5s (acceptable for live LLM)
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

### Q708 — Graceful Degradation

```typescript
// Verify: D006 — UI works when AGENTS is offline
// 1. Stop AGENTS (kill port 8000)
// 2. Open bug editor → verify it opens (no pre-fill, but not broken)
// 3. Save bug → verify it writes to filesystem
// 4. Dashboard loads → verify bug list renders
// 5. Severity dropdown works manually (no confidence indicator)
```

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
```

---

### Q712 — Project-Oriented Session

```typescript
// Verify: session creation is project-oriented
// 1. Open side panel → "New Session"
// 2. Verify: Project field exists and is REQUIRED (folder path input)
// 3. Verify: Sprint dropdown auto-populated from project's docs/sprints/ folder
// 4. Verify: Session name auto-generated (vigil-session-YYYY-MM-DD-NNN)
// 5. Verify: Description field exists (free-text)
// 6. Create session → verify session JSON contains project, sprint, name, description
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
```

### Q714 — Dashboard Overhaul

```typescript
// Verify: dashboard is project-oriented workflow tool
// 1. Navigate to /dashboard
// 2. Verify: project selector visible
// 3. Select project → verify sprint list loads
// 4. Select sprint → verify session list within sprint
// 5. Click session → verify bugs/features with screenshots inline
// 6. Verify: filters work (by project, sprint, session)
```

### Q715 — Ghost Session Recovery

```typescript
// Verify: orphaned sessions can be ended
// 1. Create session on tab
// 2. Simulate page refresh (Ctrl+R) — content script dies
// 3. Open side panel
// 4. Verify: "End stale session" button visible
// 5. Click it → verify session ends cleanly
// 6. Verify: can create new session after recovery
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

---

## Required data-testid Attributes

**Dashboard (existing from S06):** `dashboard-root`, `bug-list-table`, `feature-list-table`, `sprint-selector`, `bug-row-{BUG-ID}`, `severity-badge-{BUG-ID}`, `server-health-status`

**Dashboard (new for S07):**
- `severity-confidence-{BUG-ID}` — confidence indicator next to severity dropdown
- `returning-bug-badge-{BUG-ID}` — badge for returning bug detection

**Extension (existing from S06):** `recording-indicator`, `bug-editor-panel`, `bug-editor-screenshot`, `session-sync-toast`, `session-clock`

**Extension (new for S07):**
- `bug-editor-autocomplete-title` — LLM pre-filled title field
- `bug-editor-autocomplete-steps` — LLM pre-filled steps field
- `autocomplete-loading` — spinner while LLM request in flight
- `session-project-input` — project folder path field (required)
- `session-sprint-dropdown` — sprint auto-detect dropdown
- `session-name-input` — auto-generated session name (editable)
- `session-description-input` — free-text description field
- `session-history-dropdown` — persistent history selector
- `ghost-session-banner` — orphaned session warning
- `ghost-session-end-btn` — "End stale session" action button

---

## Gate Levels

- **Smoke** — extension loads, vigil-server health passes, AGENTS health passes
- **Regression** — all existing E2E + unit tests green
- **Integration** — Q704 round-trip + Q708 degradation
- **Full** — regression + Q701–Q716 + manual verification

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

*Generated: 2026-02-26 | Updated: 2026-02-27 (added Phase 4 — Founder product vision Q712 through Q716) | Sprint 07 | Owner: CPTO*

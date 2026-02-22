# Sprint 04 — Index

**Goal:** Complete the Refine platform architecture — AI recording via Windsurf/Claude, project dashboard, and silence compression daemon.

**Budget:** ~20V  
**Depends on:** Sprint 03 complete (R025 project folder + auto-publish shipped)  
**Version target:** `1.2.0`

---

## Context: VIBE Coding Platform

Sprint 04 closes the loop between manual testing (Chrome extension) and AI-driven acceptance testing (Windsurf/Claude agents). After Sprint 04:

```
[Manual]  FOUNDER records in Chrome → auto-publishes to project folder
[AI]      /refine-record workflow → Cascade navigates app → writes same folder structure
                    ↓
[CPO]  reads report.md → product decisions
[QA]   reads regression.spec.ts → runs or extends tests
[DEV]  reads report.json → fixes bugs
[CTO]  reads session data → architecture review
```

No cloud sync. No server. Filesystem IS the sharing mechanism.

---

## Scope

| ID | Deliverable | Cost |
|---|---|---|
| S04-01 | Windsurf workflow `/refine-record` — AI acceptance recording | ~6V |
| S04-02 | Windsurf workflow `/refine-review` — CPO/QA/DEV reads session artifacts | ~2V |
| S04-03 | `refine.project.json` schema + validation + init command | ~2V |
| S04-04 | Project dashboard — `index.html` generator per project folder | ~5V |
| S04-05 | R015 — Silence compression daemon (prune idle rrweb chunks in background) | ~4V |
| S04-06 | `refine-reporter` Playwright plugin stub (for CI integration, future) | ~1V |

---

## Phase 1 — Windsurf Workflows (~8V)

### S04-01 — `/refine-record` workflow (~6V)

**File:** `.windsurf/workflows/refine-record.md`

**Purpose:** Windsurf/Cascade acts as an acceptance tester. It navigates the target app, logs bugs and features, and writes output to the project folder — same format as the Chrome extension.

**Workflow steps:**
1. Read `refine.project.json` from the current project folder (or prompt user for project name + baseUrl)
2. Launch Playwright (`headless: false`) against `project.baseUrl`
3. Cascade navigates the app according to the test scope (provided by FOUNDER or inferred from PRD)
4. As Cascade finds issues: write structured `bug` entries to an in-memory session object
5. On completion: generate session ID (`ats-YYYY-MM-DD-NNN`), write all artifacts directly to `<outputPath>/<project>/sessions/<id>/`:
   - `report.md` — bugs + features + navigation timeline
   - `report.json` — full structured session
   - `regression.spec.ts` — Playwright spec from navigation steps
6. Update `<project>/index.html` (if exists) with new session entry

**Session JSON schema** — same as Chrome extension `Session` type but with `source: 'ai'` field:
```json
{
  "id": "ats-2026-02-22-001",
  "name": "AI Acceptance Test — TaskPilot Home",
  "source": "ai",
  "project": "taskpilot",
  "startedAt": 1740235200000,
  "duration": 180000,
  "bugCount": 3,
  "pages": ["http://localhost:5173/", "http://localhost:5173/about"]
}
```

**Node.js writes files directly** — no `chrome.downloads` needed. Uses `fs.writeFileSync`.

---

### S04-02 — `/refine-review` workflow (~2V)

**File:** `.windsurf/workflows/refine-review.md`

**Purpose:** Any agent role can invoke this workflow to load the latest session(s) from the project folder into their context.

**Workflow steps:**
1. Read `<project>/sessions/` directory — list sessions sorted by date desc
2. Load the latest N sessions (default: 1, configurable)
3. Read `report.md` from each session → present as structured context
4. Suggest role-appropriate next actions:
   - `[CPO]`: prioritize bugs by impact
   - `[QA]`: extend `regression.spec.ts` with failing assertions
   - `[DEV]`: create fix branches per bug
   - `[CTO]`: architectural observations from session data

---

## Phase 2 — Project Infrastructure (~7V)

### S04-03 — `refine.project.json` schema (~2V)

**Schema:**
```json
{
  "name": "taskpilot",
  "displayName": "TaskPilot",
  "baseUrl": "http://localhost:5173",
  "outputPath": "C:/Synaptix-Labs/projects/taskpilot",
  "description": "Task management SaaS demo app",
  "created": "2026-02-22",
  "version": "1.0"
}
```

**Tasks:**
- Define TypeScript interface `RefineProjectConfig` in `src/shared/types.ts`
- `src/popup/pages/ProjectSettings.tsx`: "Export Config" button → downloads `refine.project.json` to project root
- `src/core/publish.ts`: on first publish, also download `refine.project.json` if not present
- Validation: warn in popup if `outputPath` not set when user tries to publish

---

### S04-04 — Project Dashboard (`index.html` generator) (~5V)

**Purpose:** A static HTML file auto-generated/updated in `<project>/index.html` on every publish. LLM agents and humans can open it in any browser to see all sessions for a project.

**Dashboard features:**
- Table of all sessions (date, name, source: manual/AI, bugs, features, duration)
- Click row → reads and renders `sessions/<id>/report.md` inline
- Filter by source (manual / AI), date range, bug count
- Link to open `regression.spec.ts` in editor (via `vscode://` or file:// protocol)
- No build step — pure vanilla JS + inline CSS, self-contained single file

**Generation:**
- `src/core/publish.ts`: after writing session artifacts, regenerate `index.html` by scanning all `sessions/*/report.json` files
- Also triggered standalone via "Refresh Dashboard" button in `ProjectSettings.tsx`

---

## Phase 3 — Extension Fixes (~5V)

### S04-05 — R015: Silence Compression Daemon (~4V)

**Problem:** Long sessions accumulate rrweb chunks in IndexedDB even after session completes. Idle chunks are never pruned, leading to storage growth.

**Solution:**
- `src/background/service-worker.ts`: `chrome.alarms.create('prune-idle-chunks', { periodInMinutes: 60 })`
- On alarm: for each completed session older than 7 days, compress `RecordingChunk.events` using `CompressionStream` (native browser API, no deps)
- Compressed chunks flagged `{ compressed: true, data: base64string }`
- `src/core/replay-bundler.ts`: decompress on demand before replay
- Unit test: compression round-trip produces identical events

---

### S04-06 — `refine-reporter` Playwright Plugin Stub (~1V)

**Purpose:** Future CI integration. An AI-run Playwright test suite can use this reporter to write Refine-compatible session output.

**Deliverable:** `src/reporter/refine-reporter.ts` — minimal Playwright reporter implementing `onBegin`, `onTestEnd`, `onEnd` lifecycle hooks. Writes stub `report.json` to configured output path. **Not functional yet** — establishes the interface contract.

---

## Acceptance Gates

- [ ] `/refine-record` workflow produces valid `report.md` + `report.json` + `regression.spec.ts` in project folder
- [ ] `regression.spec.ts` from AI session compiles and runs (`tsc --noEmit` + `npx playwright test`)
- [ ] `/refine-review` workflow correctly reads and summarizes latest session in agent context
- [ ] `refine.project.json` downloaded on first publish; `ProjectSettings.tsx` validates schema
- [ ] Project dashboard `index.html` opens in Chrome with all sessions listed
- [ ] R015: Compression alarm fires; round-trip produces identical events; replay still works after compression

---

## Sprint 04 Artifacts

| File | Status |
|---|---|
| `docs/sprints/sprint_04/sprint_04_index.md` | ✅ This file |
| `docs/sprints/sprint_04/todo/sprint_04_team_dev_todo.md` | See dev todo |
| `.windsurf/workflows/refine-record.md` | Implement in sprint |
| `.windsurf/workflows/refine-review.md` | Implement in sprint |

---

*Sprint 04 planned: 2026-02-22 | `[CTO]`*

# sprint_02 — Team DEV Todo: Export + Reports + Ship

**Owner:** `[DEV:export]`
**Sprint:** 02 — FINAL SPRINT — Complete product delivery
**Estimated effort:** ~39V (of 46V sprint total — QA owns ~7V of E2E work)

## Sprint Goals (DEV)

- Build session management UI (list, detail view, delete)
- Implement report generation (JSON + Markdown) from recorded sessions
- Build visual replay bundler (self-contained HTML with rrweb-player)
- Implement Playwright test script codegen from action log
- Build ZIP export (replay + report + screenshots + spec)
- Add keyboard shortcuts (Ctrl+Shift+R/S/B)
- Write unit tests for all export/codegen modules
- Achieve ship-quality across all code

## Reading Order

1. `AGENTS.md` (root Tier-1)
2. `src/core/AGENTS.md` — core module owns report gen, codegen, replay bundler
3. `src/popup/AGENTS.md` — popup owns session list + detail UI
4. `docs/01_ARCHITECTURE.md` §5 Data Flows
5. `docs/03_MODULES.md` — capability registry
6. `docs/0k_PRD.md` — R006, R007, R010-R013 acceptance criteria
7. `docs/sprints/sprint_02/sprint_02_index.md`

---

## Tasks

### Phase 1: Session Management — R007 (~5V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D201 | Session list page | Shows all sessions from Dexie: name, date, duration, status badge (recorded/stopped), bug count, screenshot count. Sorted by date descending. Empty state: "No sessions yet — start one!" Links to session detail. | `src/popup/pages/SessionList.tsx` | ☐ |
| D202 | Session detail page | Single session view: metadata block (ID, name, description, start/stop times, duration), actions timeline (scrollable, shows action type + description + timestamp), bugs list (priority badge + description + screenshot thumbnail), screenshots grid (clickable to expand). | `src/popup/pages/SessionDetail.tsx` | ☐ |
| D203 | Session delete | Delete button on session detail + session list (per-item). Confirm dialog: "Delete session X and all data? This cannot be undone." On confirm: cascade delete session + events + bugs + features + screenshots from Dexie. | `src/popup/pages/SessionDetail.tsx`, `src/popup/pages/SessionList.tsx` | ☐ |
| D204 | Popup routing update | App.tsx routes: `/` → SessionList, `/new` → NewSession (Sprint 01), `/session/:id` → SessionDetail. Back button on detail/new pages. Active session indicator persists across pages. | `src/popup/App.tsx` | ☐ |
| D205 | Unit tests: session queries | Test list query (returns all sessions sorted by date). Test cascade delete (session + related records removed). Test empty state. | `tests/unit/popup/session-list.test.ts` | ☐ |

### Phase 2: Report Generation — R006 (~8V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D206 | Report generator — JSON | Input: session ID. Reads session + events + bugs + features + screenshots from Dexie. Output: `RefineReport` JSON object with: session metadata, pages visited (unique URLs + visit count), actions timeline (chronological), bugs array (with screenshot data URLs), features array, statistics (total actions, duration, pages, bugs, features, screenshots). | `src/core/report-generator.ts` | ☐ |
| D207 | Report generator — Markdown | Same data as JSON but formatted as human-readable markdown: `# Session Report: {name}`, `## Summary` table, `## Pages Visited` list, `## Actions Timeline` table, `## Bugs` (each with priority, description, URL, screenshot as `![](data:image/png;base64,...)`), `## Features`, `## Screenshots` gallery. | `src/core/report-generator.ts` | ☐ |
| D208 | Report UI | "Generate Report" button in SessionDetail. Shows generating spinner → then inline preview (markdown rendered) with "Download JSON" and "Download Markdown" buttons. Downloads via Blob URL + `chrome.downloads.download()`. | `src/popup/pages/SessionDetail.tsx` | ☐ |
| D209 | Unit tests: report gen | Test JSON report structure from mock session data. Test Markdown output contains expected sections. Test report with zero bugs (edge case). Test report with 10+ screenshots (performance). | `tests/unit/core/report-generator.test.ts` | ☐ |

### Phase 3: Visual Replay — R010 (~10V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D210 | Replay bundler | Input: session ID. Reads rrweb events from Dexie. Output: self-contained HTML string with: (1) rrweb-player JS+CSS inlined (no external CDN), (2) events JSON embedded as `<script>` data, (3) playback controls (play/pause, speed selector: 0.5x/1x/2x/4x, timeline scrubber), (4) session metadata header (name, date, duration). | `src/core/replay-bundler.ts` | ☐ |
| D211 | Bug markers on timeline | Red dots on the rrweb-player timeline at timestamps where bugs were logged. Hovering a dot shows bug description tooltip. | `src/core/replay-bundler.ts` | ☐ |
| D212 | Replay UI | "Watch Replay" button in SessionDetail → generates HTML → opens in new tab (`window.open()` with data URL or blob URL). Alternative: download as `replay-{sessionId}.html`. | `src/popup/pages/SessionDetail.tsx` | ☐ |
| D213 | Unit tests: replay bundler | Test output is valid HTML. Test events are embedded correctly. Test bug markers at correct timestamps. Test empty session (edge case — show "No events recorded" message). | `tests/unit/core/replay-bundler.test.ts` | ☐ |

### Phase 4: Playwright Export — R011 (~15V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D214 | Playwright codegen | Input: session's action log (Action[] from Sprint 01). Output: valid Playwright `.spec.ts` string. Generates: `import { test, expect } from '@playwright/test'`, `test('Refine recorded session: {name}', async ({ page }) => { ... })`. Maps actions: navigate → `page.goto(url)`, click → `page.click(selector)`, type → `page.fill(selector, value)`, assert visibility → `expect(page.locator(selector)).toBeVisible()`. | `src/core/playwright-codegen.ts` | ☐ |
| D215 | Selector quality in codegen | Use best selector from action log. Add confidence comment: `// selector: data-testid (high confidence)` or `// selector: CSS path (low confidence — consider adding data-testid)`. Flag selectors with nth-child as `// ⚠️ fragile selector`. | `src/core/playwright-codegen.ts` | ☐ |
| D216 | Bug markers in codegen | Insert comments at bug locations: `// 🐛 BUG [P1]: "Button doesn't respond to click" — 2026-02-26T14:32:00Z`. If bug has screenshot, add: `// Screenshot: see screenshots/bug-XXXXXXXX.png`. | `src/core/playwright-codegen.ts` | ☐ |
| D217 | Codegen UI | "Export Playwright" button in SessionDetail → generates .spec.ts → download as file via `chrome.downloads.download()`. Filename: `refine-{sessionId}.spec.ts`. | `src/popup/pages/SessionDetail.tsx` | ☐ |
| D218 | Syntax validation | Generated script passes: `npx tsc --noEmit` when placed in a Playwright project with `@playwright/test` installed. Test this in CI or unit test by parsing the output with TypeScript compiler API. | `tests/unit/core/playwright-codegen.test.ts` | ☐ |
| D219 | Unit tests: codegen | Test navigate action → `page.goto()`. Test click action → `page.click()`. Test type action → `page.fill()`. Test full session with mixed actions. Test bug comments inserted at correct positions. Test selector confidence comments. Test empty session (edge case). | `tests/unit/core/playwright-codegen.test.ts` | ☐ |

### Phase 5: ZIP Bundle — R012 (~5V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D220 | ZIP export | Uses JSZip (add to dependencies). Bundles: `replay.html`, `report.json`, `report.md`, `regression.spec.ts`, `screenshots/*.png` (each bug screenshot + standalone screenshots). Single ZIP download: `refine-{sessionId}.zip`. | `src/core/zip-exporter.ts` (new) | ☐ |
| D221 | ZIP UI | "Export All (ZIP)" button in SessionDetail → shows progress → triggers download. | `src/popup/pages/SessionDetail.tsx` | ☐ |
| D222 | Unit test: ZIP contents | Test ZIP contains expected files. Test file names match convention. Test ZIP with no screenshots (edge case). | `tests/unit/core/zip-exporter.test.ts` | ☐ |

### Phase 6: Keyboard Shortcuts — R013 (~3V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D223 | Register shortcuts in manifest | Add `commands` section to `manifest.json`: `toggle-recording` (Ctrl+Shift+R), `take-screenshot` (Ctrl+Shift+S), `open-bug-editor` (Ctrl+Shift+B). **CTO must approve manifest change.** | `manifest.json` (CTO approval required) | ☐ |
| D224 | Shortcut handler | `chrome.commands.onCommand.addListener()` in service worker. Routes: `toggle-recording` → start/pause/resume based on current state. `take-screenshot` → capture if session active. `open-bug-editor` → send message to content script to open editor. | `src/background/service-worker.ts` (update) | ☐ |
| D225 | Unit test: command routing | Test each command routes to correct action. Test commands ignored when no active session (except toggle-recording which can start). | `tests/unit/background/commands.test.ts` | ☐ |

### Phase 7: Ship Prep

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D226 | Full build | `npm run build` → clean dist/ | All | ☐ |
| D227 | Type check | `npx tsc --noEmit` → zero errors | All | ☐ |
| D228 | Lint | `npx eslint src/` → zero errors | All | ☐ |
| D229 | All unit + integration tests | `npx vitest run` → green. Coverage: ≥80% shared, ≥70% core, ≥60% content, ≥60% popup | All | ☐ |
| D230 | Manual smoke test | Full flow on TaskPilot: create session → record 3+ pages → screenshot → 2 bugs → stop → view report → watch replay → export Playwright → export ZIP → delete session | All | ☐ |

---

## Critical Rules

1. **All Sprint 01 rules still apply.** Module boundaries, Chrome API isolation, path aliases, TDD.
2. **JSZip is a NEW dependency.** Add to `package.json` — FLAG to CTO for approval.
3. **manifest.json changes require CTO approval.** The `commands` section is new.
4. **Generated files must be standalone.** Replay HTML: zero external deps. Playwright spec: only needs `@playwright/test`. Report MD: standard markdown, no custom syntax.
5. **No screenshots in git.** Screenshot data URLs stay in IndexedDB only. Test with mock data URLs.
6. **rrweb-player inlining.** Bundle rrweb-player JS+CSS into the replay HTML. Do NOT use CDN links. Consider using a build-time script or raw string embedding.
7. **Version 1.0.0.** CTO will bump version in manifest + package.json after all tests pass.

---

## Definition of Done (DEV)

```
✅ npm run build — succeeds
✅ npx tsc --noEmit — zero errors
✅ npx eslint src/ — zero errors
✅ npx vitest run — all tests pass, coverage targets met
✅ Session list shows all sessions with correct metadata
✅ Session detail shows actions, bugs, screenshots
✅ Session delete cascades correctly
✅ JSON + Markdown reports generated correctly
✅ Visual replay opens in new tab with working playback
✅ Bug markers visible on replay timeline
✅ Playwright script generated with correct syntax
✅ Selector confidence comments present in generated code
✅ ZIP bundle contains all 5 file types
✅ Keyboard shortcuts trigger correct actions
✅ Full flow works on TaskPilot demo app
✅ FOUNDER completes real Papyrus acceptance session
```

---

## Risks / Blockers

- **rrweb-player inlining:** Player bundle is ~200KB. Inlining into HTML string may need careful escaping. Test early.
- **JSZip + large sessions:** 30min session with 20 screenshots could be 50MB+ ZIP. Consider screenshot compression or resolution limit.
- **Playwright codegen quality:** Generated scripts won't be perfect — they're a starting point for QA to refine. Document this expectation.
- **chrome.commands limit:** MV3 allows max 4 commands. We use 3 — fits, but no room for expansion.
- **Popup navigation state:** React Router in popup may lose state on popup close/reopen. Use URL hash routing + Dexie as source of truth.

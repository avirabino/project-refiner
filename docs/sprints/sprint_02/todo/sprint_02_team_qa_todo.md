# sprint_02 — Team QA Todo: Export E2E + Full Regression

**Owner:** `[QA]`
**Sprint:** 02 — FINAL SPRINT — Ship-quality E2E coverage
**Estimated effort:** ~7V

## Sprint Goals (QA)

- Write E2E tests for all export features (R006, R007, R010-R013)
- Full regression across all 3 sprints (Sprint 00 + 01 + 02)
- Verify generated outputs (reports, replay, Playwright scripts, ZIP)
- Write the final acceptance test script for FOUNDER walkthrough

## Reading Order

1. `AGENTS.md` (root Tier-1)
2. `docs/04_TESTING.md` — E2E patterns
3. `docs/sprints/sprint_02/sprint_02_index.md` — sprint scope
4. `docs/0k_PRD.md` — R006, R007, R010-R013 acceptance criteria

---

## Tasks

### Phase 1: E2E Tests for Export Features

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| Q201 | E2E: session management | View session list → verify sessions shown with metadata. Open session detail → verify actions, bugs, screenshots displayed. Delete session → confirm dialog → verify removed from list. | `tests/e2e/session-management.spec.ts` | ☐ |
| Q202 | E2E: report generation | Complete a recording session on target app → stop → open session detail → click "Generate Report" → verify JSON download + Markdown download. Verify report contains: session name, pages visited, bugs logged during session. | `tests/e2e/report-generation.spec.ts` | ☐ |
| Q203 | E2E: visual replay | Complete a session → stop → click "Watch Replay" → verify new tab opens with rrweb-player. Verify playback controls visible (play, speed, scrubber). Verify bug markers on timeline if bugs were logged. | `tests/e2e/replay-export.spec.ts` | ☐ |
| Q204 | E2E: Playwright export | Complete a session with clicks + navigation → stop → click "Export Playwright" → verify .spec.ts download. Open downloaded file content → verify contains `page.goto`, `page.click`, `import { test }` from `@playwright/test`. Verify bug comments present if bugs were logged. | `tests/e2e/playwright-export.spec.ts` | ☐ |
| Q205 | E2E: ZIP export | Complete a full session → stop → click "Export All (ZIP)" → verify ZIP download. Verify ZIP filename matches convention. Ideally verify ZIP contains expected files (replay.html, report.json, report.md, regression.spec.ts, screenshots/). | `tests/e2e/zip-export.spec.ts` | ☐ |
| Q206 | E2E: keyboard shortcuts | During recording: press Ctrl+Shift+S → verify screenshot captured. Press Ctrl+Shift+B → verify bug editor opens. Press Ctrl+Shift+R → verify recording pauses. Press again → resumes. | `tests/e2e/keyboard-shortcuts.spec.ts` | ☐ |

### Phase 2: Full Regression

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| Q207 | Sprint 00 regression | All 3 Sprint 00 specs pass: extension-loads, content-script-injects, target-app-navigation | `tests/e2e/*.spec.ts` | ☐ |
| Q208 | Sprint 01 regression | All 5 Sprint 01 specs pass: session-create, recording-flow, control-bar, screenshot-capture, bug-editor | `tests/e2e/*.spec.ts` | ☐ |
| Q209 | Full suite green | `npx playwright test` → ALL specs pass (Sprint 00 + 01 + 02) | All | ☐ |

### Phase 3: Acceptance Script + Report

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| Q210 | FOUNDER acceptance script | Write step-by-step script for Avi to execute final acceptance on Papyrus. Steps: install extension, open Papyrus, create session, record 3+ pages, take 2 screenshots, log 1 bug + 1 feature, stop, generate report, watch replay, export Playwright, export ZIP, delete session. Each step has expected outcome. | `docs/sprints/sprint_02/reviews/acceptance_script.md` | ☐ |
| Q211 | Sprint report | Document: all specs written, issues found, regressions (if any), generated output quality assessment, ship recommendation. | `reports/sprint_02_team_qa_report.md` | ☐ |

---

## Critical Rules

1. **Import from fixture.** All specs use `import { test, expect } from './fixtures/extension.fixture'`.
2. **E2E tests must verify OUTPUTS, not just UI.** Report test: verify downloaded file content. Playwright test: verify generated syntax. ZIP test: verify file list.
3. **Shadow DOM awareness.** Control bar and bug editor are in Shadow DOM — use appropriate Playwright selectors.
4. **Full regression is mandatory.** Every Sprint 00 and 01 spec must still pass. If a regression is found, it's a P0 blocker.
5. **Acceptance script must be FOUNDER-friendly.** No technical jargon. Step 1: "Click the Refine icon in your Chrome toolbar." Not: "Navigate to chrome-extension://..."

---

## Dependency

QA E2E work is **blocked on DEV delivering working export features.** Write spec skeletons with `test.skip()` early. Flip to `test()` as features land.

For session management E2E (Q201): can start as soon as DEV delivers D201-D204.
For export E2E (Q202-Q206): blocked on respective DEV deliverables.

---

## Definition of Done (QA)

```
✅ 6 new E2E specs written and passing (Q201-Q206)
✅ Sprint 00 regression: 3 specs pass (Q207)
✅ Sprint 01 regression: 5 specs pass (Q208)
✅ npx playwright test — ALL green (14+ total specs)
✅ FOUNDER acceptance script written and reviewed
✅ Sprint report written with ship recommendation
✅ No changes to src/ code
```

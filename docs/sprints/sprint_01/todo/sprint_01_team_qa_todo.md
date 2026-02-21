# sprint_01 — Team QA Todo: Recording E2E

**Owner:** `[QA]`
**Sprint:** 01 — E2E coverage for recording engine
**Estimated effort:** ~4V

## Sprint Goals (QA)

- Write E2E tests for the 5 new recording features (R001-R005)
- Maintain Sprint 00 E2E regression (no breakage)
- Update QA target app if new elements needed for E2E

## Reading Order

1. `AGENTS.md` (root Tier-1) — project-wide rules
2. `docs/04_TESTING.md` — E2E patterns, extension fixture
3. `tests/e2e/fixtures/extension.fixture.ts` — the fixture you built in Sprint 00
4. `docs/sprints/sprint_01/sprint_01_index.md` — sprint scope

---

## Tasks

### Phase 1: E2E Tests for Recording Features

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| Q101 | E2E: session creation | Open popup → click "New Session" → fill name → click "Start Recording" → verify recording indicator in popup. Verify content script shows control bar on target app page. | `tests/e2e/session-create.spec.ts` | ☐ |
| Q102 | E2E: recording flow | Start session → navigate target app (home → about → form → home) → click elements → stop recording → verify session exists with events. Check: no recording gaps between page navigations. | `tests/e2e/recording-flow.spec.ts` | ☐ |
| Q103 | E2E: control bar | During recording: control bar visible at bottom of page. Pause button → bar shows "PAUSED". Resume → bar shows "REC". Stop → bar disappears. Verify bar doesn't break target app layout. | `tests/e2e/control-bar.spec.ts` | ☐ |
| Q104 | E2E: screenshot capture | During recording: click screenshot button in control bar → verify screenshot stored (check IndexedDB via JS eval, or verify UI feedback like flash/toast). | `tests/e2e/screenshot-capture.spec.ts` | ☐ |
| Q105 | E2E: bug editor | During recording: click bug button → editor opens with auto-filled URL and screenshot thumbnail → type description → select priority → save → editor closes → recording continues. Verify bug stored in session. | `tests/e2e/bug-editor.spec.ts` | ☐ |

### Phase 2: Regression + Target App

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| Q106 | Sprint 00 regression | Re-run all 3 Sprint 00 E2E specs: extension-loads, content-script-injects, target-app-navigation. All must still pass. | `tests/e2e/*.spec.ts` | ☐ |
| Q107 | Target app updates | Add any new `data-testid` attributes needed for Sprint 01 E2E (e.g., elements to test click recording, form interactions). Document additions. | `tests/fixtures/target-app/*` | ☐ |

### Phase 3: Verification

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| Q108 | All E2E pass | `npx playwright test` → all specs green (Sprint 00 + Sprint 01) | All | ☐ |
| Q109 | Write sprint report | Document: specs written, issues found, regressions (if any), recommendations | `reports/sprint_01_team_qa_report.md` | ☐ |

---

## Critical Rules

1. **Import from fixture, not raw Playwright.** All specs use `import { test, expect } from './fixtures/extension.fixture'`.
2. **E2E requires built extension.** Run `npm run build` before `npx playwright test`.
3. **Headed mode only.** Extensions don't work in headless Chromium.
4. **No source code changes.** QA owns `tests/e2e/`, `tests/fixtures/`, `playwright.config.ts`. Do not modify `src/`.
5. **Every assertion must be meaningful.** Not just "page didn't crash" — assert specific visible text, stored data, UI state.
6. **Shadow DOM awareness.** The control bar and bug editor live inside Shadow DOM. Playwright can pierce Shadow DOM with `page.locator('refine-root')` then chaining. Test this pattern early.

---

## Dependency

QA E2E work is **blocked on DEV delivering a working `dist/`** with recording features. Start writing spec skeletons with `test.skip()` if DEV isn't ready yet. Flip to `test()` once features land.

---

## Definition of Done (QA)

```
✅ 5 new E2E specs written and passing (Q101-Q105)
✅ 3 Sprint 00 regression specs still passing (Q106)
✅ npx playwright test — all green
✅ No changes to src/ code
✅ Sprint report written
```

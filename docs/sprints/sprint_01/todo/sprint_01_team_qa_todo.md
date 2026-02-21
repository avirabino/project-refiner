# Sprint 01 — Team QA Todo

**Owner:** `[QA]`
**Sprint:** 01
**Depends on:** DEV Phase 4 complete (recording engine + control bar + capture all functional)
**Budget:** ~10V (QA share)

---

## Reading Order

1. `AGENTS.md` (root Tier-1)
2. `docs/04_TESTING.md` — E2E patterns + extension fixture
3. `tests/e2e/fixtures/extension.fixture.ts` — reuse from Sprint 00
4. `docs/sprints/sprint_01/sprint_01_index.md`
5. This file

---

## Immediate — No DEV Dependency

### Q100: Enhance QA target app for recording edge cases — 1V ✅ DONE

Add elements to `tests/fixtures/target-app/` that exercise rrweb recording scenarios:

| Page | Element to add | `data-testid` | Tests |
|---|---|---|---|
| `form.html` | Textarea (Description) | `input-description` | Multiline input recording |
| `form.html` | Date input | `input-date` | Date picker recording |
| `index.html` | Delayed element (JS shows after 2s) | `delayed-content` | Dynamic DOM recording |
| `index.html` | Expandable section (click to show/hide) | `toggle-section` | State change recording |

**Acceptance:**
- [x] All new elements have `data-testid`
- [x] Target app still serves cleanly on port 3847
- [x] Existing Sprint 00 E2E specs still pass (3/3 ✅)

---

## After DEV Delivers — E2E Specs

> **Status:** All 5 specs are **written (contract-first)**. Waiting for DEV Phase 3 + 4 delivery to turn green.
> Shared helper: `tests/e2e/helpers/session.ts`
> data-testid contracts documented in `docs/04_TESTING.md` Sprint 01 section.

### Q101: E2E — Session Creation (`tests/e2e/session-create.spec.ts`) — 2V ✅ SPEC WRITTEN

**Test flow:**
1. Open extension popup (`chrome-extension://${extensionId}/src/popup/popup.html`)
2. Click "New Session" button
3. Fill session name: "QA Test Session"
4. Click "Start Recording"
5. Switch to target app tab (`http://localhost:3847`)
6. Assert: floating control bar visible at bottom of page
7. Assert: control bar shows red recording indicator

**Acceptance:**
- [ ] Session appears in popup session list with RECORDING status
- [ ] Control bar renders inside shadow DOM on target app
- [ ] No console errors from extension

---

### Q102: E2E — Control Bar Functionality (`tests/e2e/control-bar.spec.ts`) — 1V ✅ SPEC WRITTEN

**Test flow (assumes active recording from Q101 setup):**
1. Start recording on target app
2. Assert: Pause button visible
3. Click Pause → assert amber indicator, "PAUSED" state
4. Click Resume → assert red indicator returns
5. Navigate to About page → assert control bar persists
6. Click Stop → assert control bar disappears

**Acceptance:**
- [ ] Pause/Resume toggle works
- [ ] Control bar survives page navigation
- [ ] Stop removes control bar from DOM

---

### Q103: E2E — Screenshot Capture (`tests/e2e/screenshot-capture.spec.ts`) — 1V ✅ SPEC WRITTEN

**Test flow:**
1. Start recording on target app
2. Click Screenshot button in control bar
3. Stop recording
4. Open popup → navigate to session
5. Assert: session has at least 1 screenshot stored

**Note:** Verifying IndexedDB from E2E is tricky. Options:
- A) Check popup UI shows screenshot count > 0
- B) Use `page.evaluate()` to query Dexie directly in the extension context

**Acceptance:**
- [ ] Screenshot button doesn't throw errors
- [ ] At least one screenshot persisted (verify via popup UI or DB query)

---

### Q104: E2E — Bug Editor (`tests/e2e/bug-editor.spec.ts`) — 2V ✅ SPEC WRITTEN

**Test flow:**
1. Start recording, navigate to target app form page
2. Click on an input field (to set "last clicked element")
3. Click Bug button in control bar
4. Assert: BugEditor form opens
5. Assert: URL field pre-filled with current page URL
6. Fill title: "Test Bug"
7. Click Save
8. Assert: form closes, returns to control bar
9. Stop recording
10. Verify bug saved (popup UI shows bug count or DB query)

**Acceptance:**
- [ ] Bug editor opens from control bar
- [ ] URL auto-filled
- [ ] Save persists bug and closes editor
- [ ] Cancel closes without saving

---

### Q105: E2E — Session Lifecycle (`tests/e2e/session-lifecycle.spec.ts`) — 1V ✅ SPEC WRITTEN

**Test flow:**
1. Create session → start recording
2. Navigate across 3 pages on target app (index → about → form)
3. Log 1 bug on form page
4. Take 1 screenshot
5. Stop recording
6. Open popup → find session
7. Assert: status is COMPLETED
8. Assert: session has duration > 0

**Acceptance:**
- [ ] Full lifecycle without errors
- [ ] Session status transitions: RECORDING → STOPPED → COMPLETED
- [ ] Multi-page recording doesn't break

---

## Definition of Done

```
✅ QA target app enhanced with 4 new elements + existing specs still pass
✅ 5 new E2E specs written and passing
✅ E2E covers: create, control bar, screenshot, bug editor, full lifecycle
✅ No regressions on Sprint 00 E2E specs (extension-loads, content-script-injects, navigation)
✅ npx playwright test — all specs green
```

---

*Last updated: 2026-02-21*

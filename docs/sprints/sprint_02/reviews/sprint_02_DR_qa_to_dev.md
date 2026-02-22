# Sprint 02 — QA → DEV Design Review

**From:** `[QA]`
**To:** `[DEV:all-modules]`
**Date:** 2026-02-22
**Re:** Sprint 02 implementation requirements, blocking questions, and E2E contract

---

## TL;DR

Sprint 01 delivery is clean — all 10 E2E specs pass, 56/56 unit tests pass, good work. Sprint 02 QA specs are written and waiting. Before you start implementing, read the three blocking questions below. Two of them change how you wire an export button. The data-testid contract at the bottom is non-negotiable — without those exact strings QA specs will time out.

---

## Blocking Questions (need answers before D203–D206)

### B1 — What is the Dexie database name?

Your source map in the dev report lists `DB_NAME` and `KEEPALIVE_ALARM_NAME` as exports from `src/shared/constants.ts`. The actual file at `src/shared/constants.ts` has neither. Q205 (session delete) uses `page.evaluate()` to query IndexedDB directly to verify cascading delete. It needs the exact string.

**QA assumption currently:** `'RefineDB'`

**Action needed:** Confirm or correct. If you change it, update `DB_NAME` in `tests/e2e/helpers/session.ts:86`.

---

### B2 — Does "Watch Replay" open a new tab or trigger a file download?

Your dev report (§1.4 Phase 4) says:
> "Watch Replay" download button

Your dev todo (D206) says:
> "Replay opens in new tab (not download)"

These are different Playwright interception patterns:

| Behaviour | Playwright pattern |
|---|---|
| New tab | `context.waitForEvent('page')` |
| File download | `page.waitForEvent('download')` |

**Q202 spec** currently uses new tab (`context.waitForEvent('page')`).

**Action needed:** Confirm "new tab". If it's a download instead, notify QA to update Q202 before you ship D206.

---

### B3 — How does SessionDetail navigation work?

Q201–Q205 all need to reach the SessionDetail view. The specs currently navigate like this:

```typescript
// After reload:
await popup.getByTestId('session-list-item').first().click();
await expect(popup.getByTestId('session-detail-container')).toBeVisible({ timeout: 3000 });
```

**Questions:**
1. Is clicking `session-list-item` the correct way to reach `SessionDetail`, or will you use a separate route (e.g., hash `#/session/:id`)?
2. Does the popup navigate to a new view (hash change) or expand inline?
3. Does SessionDetail render in the same popup page or open in a new popup window?

**Action needed:** Confirm click-to-navigate is correct. If there's a direct URL route (`#/session/ats-...`), QA will add a `navigateToSessionDetail(sessionId)` helper for faster test setup.

---

## Advisory (non-blocking but read before D208)

### A1 — Keyboard shortcuts E2E testing strategy

`chrome.commands` shortcuts are handled at the browser level. Playwright's `page.keyboard.press('Control+Shift+S')` does reach Chrome's command handler in headful mode, but reliability in CI depends on OS and Chrome version.

**Q206 spec** tests via `page.keyboard.press()` and verifies the *effect* (screenshot count increments, bug editor opens, recording-indicator text changes). This should pass in most headful environments.

If you see Q206 flaking in CI:
- The fix is on the QA side (mark as manual-only)
- No action needed from DEV

**However:** One thing DEV can help with — add a `data-testid="recording-indicator"` text that clearly contains either "RECORDING" or "PAUSED" (not just a CSS class). Q206 test 3 depends on `recording-indicator` text content. Confirm this is already the case (it is per Sprint 01 contract, just double-checking since shortcuts modify state).

### A2 — How many downloads does "Download Report" trigger?

Q201 spec waits for **one** download event (`btn-download-report`). If your implementation triggers two separate downloads (JSON file + MD file sequentially), the spec will only capture the first. Notify QA if it's two downloads so we can update to await both.

**Recommended:** Trigger JSON + MD as two sequential `chrome.downloads.download()` calls. QA will update to `waitForDownload` called twice if confirmed.

---

## data-testid Contract — Sprint 02

**These must be exact.** QA specs use `getByTestId('...')` which matches against `data-testid` attribute only.

### SessionDetail page

All 8 required. `session-detail-container` being absent will cause every Q201–Q205 spec to timeout.

| `data-testid` | Element type | Required by |
|---|---|---|
| `session-detail-container` | Any (root wrapper) | Q201, Q202, Q203, Q204, Q205 |
| `btn-back` | `<button>` | — (future regression) |
| `btn-download-report` | `<button>` | Q201 |
| `btn-watch-replay` | `<button>` | Q202 |
| `btn-export-playwright` | `<button>` | Q203 |
| `btn-download-zip` | `<button>` | Q204 |
| `btn-delete-session` | `<button>` | Q205 |
| `confirm-delete` | `<button>` | Q205 |

### SessionList (existing — confirm no changes)

These are Sprint 01 contracts that Q201–Q205 still rely on via `stopAndOpenDetail()`. Do not rename or remove.

| `data-testid` | Notes |
|---|---|
| `session-list-item` | Must still be present and clickable to reach SessionDetail |
| `session-screenshot-count` | Still used by Q206 (keyboard shortcut → screenshot count check) |
| `session-bug-count` | Still used by regression specs |

### Keyboard shortcuts (manifest.json)

| Command name | Suggested key | Effect |
|---|---|---|
| `toggle-recording` | `Ctrl+Shift+R` | pause if RECORDING → resume if PAUSED |
| `capture-screenshot` | `Ctrl+Shift+S` | screenshot (active session only) |
| `open-bug-editor` | `Ctrl+Shift+B` | open BugEditor (active session only) |

---

## Things QA Found in the Sprint 01 Source

These are low priority — no action required unless you disagree with the QA interpretation.

### `constants.ts` source map mismatch

DEV report §5 source map says:
> `src/shared/constants.ts` — `KEEPALIVE_ALARM_NAME`, `DB_NAME`, `VERSION`

Actual file has none of these (only `SESSION_ID_FORMAT`, `SELECTOR_PRIORITIES`, `LIMITS`, `DEFAULT_VALUES`). Either the source map is stale or these constants live inline in their respective modules. QA doesn't need them exported — just need B1 confirmed above.

### `bug-editor-url` is a `div`, not an `input`

Confirmed from your report: "use `innerText()` not `inputValue()`". The Q104 spec already handles this with `.inputValue().catch(() => innerText())`. Sprint 02 specs use `innerText()` directly. No action needed — just confirming QA is aware.

### Two `btn-new-session` elements

Known Issue 2 in your report. QA helper already uses `.first()`. No action needed.

---

## Sprint 02 QA Spec Inventory (for your reference)

All 6 specs are written and waiting in `tests/e2e/`. They will start failing with **useful error messages** rather than timeouts once you wire the UI — `session-detail-container not visible` etc. Use these as integration smoke tests as you build each phase.

| Spec file | Waits for DEV task(s) |
|---|---|
| `report-export.spec.ts` | D201, D203, D206 |
| `replay-viewer.spec.ts` | D202, D203, D206 |
| `playwright-export.spec.ts` | D204, D203, D206 |
| `zip-export.spec.ts` | D201, D202, D204, D205, D203, D206 |
| `session-delete.spec.ts` | D203, D207 |
| `keyboard-shortcuts.spec.ts` | D208 |

Run individual specs as you complete each phase:
```bash
npx playwright test tests/e2e/session-delete.spec.ts   # After D203 + D207
npx playwright test tests/e2e/report-export.spec.ts    # After D201 + D203 + D206
```

Sprint 00 + 01 specs must stay green throughout. Regression command:
```bash
npx playwright test tests/e2e/extension-loads.spec.ts tests/e2e/content-script-injects.spec.ts tests/e2e/target-app-navigation.spec.ts tests/e2e/session-create.spec.ts tests/e2e/control-bar.spec.ts tests/e2e/screenshot-capture.spec.ts tests/e2e/bug-editor.spec.ts tests/e2e/session-lifecycle.spec.ts
```

---

## Prerequisites Reminder

Before you write a single line of Sprint 02 code:

```bash
npm install rrweb-player@^2.0.0-alpha.17 jszip@^3.10.1
npm install -D @types/jszip
```

`jszip` being absent causes a lint error in `zip-export.spec.ts` (dynamic import inside try/catch — fails gracefully at runtime but the TS compiler flags it). Install it as part of sprint kickoff.

---

*`[QA]` — SynaptixLabs Refine Sprint 02 — 2026-02-22*

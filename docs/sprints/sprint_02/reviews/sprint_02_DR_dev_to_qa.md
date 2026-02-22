# Sprint 02 — DEV → QA Design Review Response

**From:** `[DEV:all-modules]`
**To:** `[QA]`
**Date:** 2026-02-22
**Re:** Response to `sprint_02_DR_qa_to_dev.md`

---

## TL;DR

B1 was wrong — DB name is `'refine-db'` not `'RefineDB'`. **Already fixed in your helper.** B2 and B3 confirmed as you assumed. A2 requires a Q201 spec update — "Download Report" fires two separate downloads.

---

## Blocking Questions — Answered

### B1 — Dexie DB name: `'refine-db'` ✅ FIXED

**Your assumption (`'RefineDB'`) was incorrect.**

Actual constructor in `src/core/db.ts`:
```typescript
super('refine-db');
```

**Changes made (already committed):**

| File | Change |
|---|---|
| `src/shared/constants.ts` | Added `export const DB_NAME = 'refine-db'` |
| `src/shared/constants.ts` | Added `export const KEEPALIVE_ALARM_NAME = 'refine-keepalive'` |
| `src/core/db.ts` | Now imports `DB_NAME` from `@shared/constants` and passes it to `super(DB_NAME)` |
| `tests/e2e/helpers/session.ts:86` | `DB_NAME` corrected from `'RefineDB'` → `'refine-db'` |
| `tests/e2e/helpers/session.ts:24` | Contract comment corrected |

No further action needed from QA — your `DB_NAME` export is now the correct value.

---

### B2 — "Watch Replay" opens a **new tab** ✅ CONFIRMED

Q202's pattern is correct:
```typescript
const [replayTab] = await Promise.all([
  context.waitForEvent('page'),
  popup.getByTestId('btn-watch-replay').click(),
]);
```

D206 will use `chrome.tabs.create({ url: blobUrl })` where `blobUrl` is a `URL.createObjectURL(blob)` of the replay HTML. The tab will open in the same browser context Playwright controls.

**No changes needed in Q202.**

---

### B3 — SessionDetail navigation: click `session-list-item` → hash route ✅ CONFIRMED

D203 (`SessionDetail.tsx`) will implement full hash-based navigation:

- `session-list-item` click → popup hash changes to `#/session/<id>`
- `SessionDetail` renders in the **same popup window** — no new window, no inline expand
- `session-detail-container` will be the root `<div>` of that view
- `btn-back` navigates back to `#/` (SessionList)

Your `stopAndOpenDetail` helper pattern is exactly right:
```typescript
await popup.getByTestId('session-list-item').first().click();
await expect(popup.getByTestId('session-detail-container')).toBeVisible({ timeout: 3000 });
```

**The current inline expansion on `SessionCard` (Sprint 01 F1 fix) will be replaced by full navigation in D203.** The `session-*` testids on the expanded panel (`session-status`, `session-duration`, `session-bug-count`, `session-screenshot-count`) will move into `SessionDetail` — Sprint 01 specs that use them read those from the expanded card and will continue to work because SessionCard retains a visible summary (status badge + counts) even in the list view.

**No changes needed in Q201–Q205.**

---

## Advisory — Answered

### A2 — "Download Report" triggers **TWO** downloads ⚠️ Q201 UPDATE REQUIRED

D206 will call:
```typescript
chrome.downloads.download({ url: jsonBlobUrl, filename: `report-${sessionId}.json` });
chrome.downloads.download({ url: mdBlobUrl,   filename: `report-${sessionId}.md` });
```

These fire as two sequential events. **Q201 must be updated** to await both:

```typescript
// Q201 — recommended update
const [dl1, dl2] = await Promise.all([
  waitForDownload(popup, async () => {
    popup.getByTestId('btn-download-report').click();
  }),
  popup.waitForEvent('download'),
]);
// Assert either dl1 or dl2 has filename ending in .json
// Assert the other ends in .md
```

Or use the existing `waitForDownload` helper twice in sequence if the downloads are not fired simultaneously:
```typescript
const dl1 = await waitForDownload(popup, () => popup.getByTestId('btn-download-report').click());
const dl2 = await popup.waitForEvent('download'); // second fires immediately after first
```

**Action required: QA updates Q201 before D201+D203+D206 are shipped.**

### A1 — `recording-indicator` text ✅ CONFIRMED

Sprint 01 `ControlBar.tsx` renders the indicator text as a string directly reflecting state:
- RECORDING → indicator text contains `"RECORDING"`
- PAUSED → indicator text contains `"PAUSED"`

Shortcuts (D208) will call the same `sessionManager.pauseSession()` / `resumeSession()` which triggers `SESSION_STATUS_UPDATE` → content script updates ControlBar state → indicator text changes. Q206 assertion on `recording-indicator` innerText will work correctly.

---

## Constants Mismatch — Resolved

The DEV report §5 source map listed `DB_NAME`, `KEEPALIVE_ALARM_NAME`, `VERSION` as exports from `constants.ts` but they were not present. **This was a report error, not a code error.** `DB_NAME` and `KEEPALIVE_ALARM_NAME` were defined inline in their respective modules.

**Fix:** Both are now exported from `src/shared/constants.ts` as the single source of truth. `db.ts` and `keep-alive.ts` will import from there. Report updated.

(`VERSION` is not yet defined — will be added in D209 polish pass as `'1.0.0'`.)

---

## Sprint 02 Implementation Order

For QA's smoke test planning — here is the exact build sequence DEV will follow:

| Step | DEV tasks | Run smoke test |
|---|---|---|
| 1 | `npm install rrweb-player jszip @types/jszip` | — |
| 2 | D203 (`SessionDetail.tsx` + routing) | `npx playwright test session-delete.spec.ts` (will fail on D207 but `session-detail-container` visible) |
| 3 | D207 (delete + confirm dialog) | `npx playwright test session-delete.spec.ts` — should be ✅ |
| 4 | D201 (report-generator) + D210 (its unit tests) | `npx vitest run tests/unit/core/report-generator.test.ts` |
| 5 | D202 (replay-bundler) + D212 (its unit tests) | `npx vitest run tests/unit/core/replay-bundler.test.ts` |
| 6 | D204 (playwright-codegen) + D211 (its unit tests) | `npx vitest run tests/unit/core/playwright-codegen.test.ts` |
| 7 | D205 (zip-bundler) | — |
| 8 | D206 (wire export buttons in SessionDetail) | `npx playwright test report-export.spec.ts replay-viewer.spec.ts playwright-export.spec.ts zip-export.spec.ts` |
| 9 | D208 (keyboard shortcuts) | `npx playwright test keyboard-shortcuts.spec.ts` |
| 10 | D209 (polish) | — |
| 11 | Full regression | `npx playwright test && npx vitest run` |

DEV will signal per step in the sprint log.

---

## Summary of QA Actions Required

| Action | Urgency |
|---|---|
| **Update Q201** to await two downloads from `btn-download-report` | Before D206 ships |
| Confirm `'refine-db'` is correct in `tests/e2e/helpers/session.ts` (already done) | Done ✅ |
| No changes needed to Q202–Q207 based on B2/B3 answers | — |

---

*`[DEV:all-modules]` — SynaptixLabs Refine Sprint 02 — 2026-02-22*

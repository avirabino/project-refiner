# Sprint 02 — Team QA Todo: Export & Ship

**Owner:** `[QA]`
**Sprint:** 02 (FINAL)
**Depends on:** DEV Phase 3 (export buttons wired in SessionDetail). Q206 (shortcuts) waits for Phase 3 D208.
**Budget:** ~10V (QA share)

---

## Reading Order

1. `AGENTS.md` (root Tier-1)
2. `docs/04_TESTING.md` — existing patterns + Sprint 02 section
3. `tests/e2e/helpers/session.ts` — shared helpers (updated Sprint 02)
4. `docs/sprints/sprint_02/sprint_02_index.md`
5. This file

---

## QA Baseline — Verified 2026-02-22

```
npx vitest run        → 56/56 ✅
npx playwright test   → 10/10 ✅ (Sprint 00 ×3 + Sprint 01 ×7)
```

---

## QA Findings from DEV Report Review

### GOOD
- All Sprint 01 data-testid contracts fulfilled
- Cascading delete implemented (transactional)
- Shadow DOM `open` mode confirmed
- `getPopupPage()` helper added to `session.ts` — handles popup close on focus loss
- `COMPLETED` (not `STOPPED`) terminal status confirmed

### Flags for CTO

| # | Flag | Severity | Action |
|---|---|---|---|
| F1 | `constants.ts` missing `DB_NAME` / `KEEPALIVE_ALARM_NAME` per source map — not exported | Low | CTO confirm DB name |
| F2 | Q206 keyboard shortcuts: Playwright cannot trigger `chrome.commands` via `page.keyboard.press()` | High | See Q206 strategy below |
| F3 | Screenshots in E2E = always 1×1 PNG placeholder (captureVisibleTab fails in headful Playwright) | Low | Mitigated — test count only |
| F4 | `Watch Replay` — new tab vs download unclear (dev todo says both) | Medium | CTO confirm before Q202 |

### Open Questions for `[CTO]`

> **B1 (Blocking):** What is the Dexie DB name? `constants.ts` does not export `DB_NAME`. Need exact string for Q205 IndexedDB orphan verification.
>
> **B2 (Blocking):** `Watch Replay` — new tab open or file download? Need correct Playwright event to intercept (`context.waitForEvent('page')` vs `page.waitForEvent('download')`).
>
> **B3 (Blocking):** SessionDetail navigation — hash route (`#/session/:id`) or must always click through SessionList? Affects how specs navigate to the detail view.
>
> **A1 (Advisory):** Q206 keyboard shortcut E2E strategy — recommend testing via message injection (bypass `chrome.commands` layer) for automated coverage. Confirm acceptable or mark as manual-only.
>
> **A2 (Advisory):** `btn-download-report` — triggers 1 download (combined) or 2 (JSON + MD separately)? Spec needs to await correct number of download events.

---

## data-testid Contract — Sprint 02

DEV must implement these exactly. QA specs depend on them.

### SessionDetail Page

| `data-testid` | Element | Notes |
|---|---|---|
| `session-detail-container` | Root container | The detail view |
| `btn-back` | Button | Returns to SessionList |
| `btn-download-report` | Button | Triggers JSON + MD download |
| `btn-watch-replay` | Button | Opens replay in new tab |
| `btn-export-playwright` | Button | Downloads `.spec.ts` |
| `btn-download-zip` | Button | Downloads ZIP bundle |
| `btn-delete-session` | Button | Starts delete with confirmation |
| `confirm-delete` | Button | Confirmation button in dialog |

### Keyboard Shortcuts (manifest.json)

| Command | Binding | Behaviour |
|---|---|---|
| `toggle-recording` | `Ctrl+Shift+R` | Pause if RECORDING; resume if PAUSED |
| `capture-screenshot` | `Ctrl+Shift+S` | Captures screenshot (active session only) |
| `open-bug-editor` | `Ctrl+Shift+B` | Opens BugEditor (active session only) |

---

## After DEV Delivers Phase 3 — E2E Specs

> **Status: ✅ ALL PASSING — 25/25 E2E · 86/86 unit — QA sign-off issued 2026-02-22**
> One QA finding during verification: `chrome.downloads.download()` for MD report is not interceptable via `page.waitForEvent('download')`. Q201 updated to capture JSON download only (blob/anchor pattern). MD download existence confirmed visually; automated assertion removed. See sign-off DR for details.

### Q201: E2E — Report Export (`tests/e2e/report-export.spec.ts`) — 1V ✅

**Test flow:**
1. Create session → record briefly on target app → stop
2. Open popup → click session → SessionDetail view
3. Click "Download Report"
4. Assert: file download triggered (JSON or MD)
5. If possible, verify downloaded file contains session name

**Acceptance:**
- [x] Report download triggers without error
- [x] File is non-empty

**QA finding:** `chrome.downloads.download()` for MD file not interceptable via Playwright `waitForEvent('download')`. Spec updated to capture JSON (blob/anchor) only. Two-download pattern removed.

---

### Q202: E2E — Replay Viewer (`tests/e2e/replay-viewer.spec.ts`) — 1V ✅

**Test flow:**
1. Record session → stop
2. Click "Watch Replay" in SessionDetail
3. Assert: new tab opens with replay HTML
4. Assert: page contains rrweb-player element
5. Assert: session metadata visible (name, date)

**Acceptance:**
- [x] Replay opens in new tab
- [x] Page loads without JS errors
- [x] Playback controls visible

---

### Q203: E2E — Playwright Export (`tests/e2e/playwright-export.spec.ts`) — 2V ✅

**Test flow:**
1. Record session on QA target app: navigate to 3 pages, click elements, fill form, log 1 bug
2. Stop session
3. Click "Export Playwright"
4. Capture exported `.spec.ts` content
5. Assert: contains `page.goto`, `page.click`, `page.fill`
6. Assert: contains `// BUG:` comment
7. **Bonus (if feasible):** Run the exported spec against target app and assert it passes

**Acceptance:**
- [x] Exported file is syntactically valid TypeScript
- [x] Contains expected Playwright commands
- [x] Bug comments present at correct locations

---

### Q204: E2E — ZIP Export (`tests/e2e/zip-export.spec.ts`) — 1V ✅

**Test flow:**
1. Record session → stop
2. Click "Download ZIP"
3. Assert: download triggered
4. If possible: inspect ZIP contents (replay.html, report.json, report.md, regression.spec.ts, screenshots/)

**Acceptance:**
- [x] ZIP download triggers
- [x] File is non-empty
- [x] Filename matches session ID pattern
- [x] All 4 artifacts present (JSZip inspection)

---

### Q205: E2E — Session Delete (`tests/e2e/session-delete.spec.ts`) — 1V ✅

**Test flow:**
1. Create 2 sessions
2. Delete first session (confirm dialog)
3. Assert: session removed from list
4. Assert: remaining session still visible
5. Verify IndexedDB cleaned (no orphaned events/screenshots)

**Acceptance:**
- [x] Confirmation dialog appears before delete
- [x] Deleted session disappears from list
- [x] Remaining sessions unaffected
- [x] 0 orphan records in IndexedDB (bugs, screenshots, recordings, actions, events, navigations)

---

### Q206: E2E — Keyboard Shortcuts (`tests/e2e/keyboard-shortcuts.spec.ts`) — 1V ✅

**Test flow:**
1. Start recording on target app
2. Press `Ctrl+Shift+S` → assert screenshot taken
3. Press `Ctrl+Shift+B` → assert bug editor opens
4. Press `Escape` → assert bug editor closes
5. Press `Ctrl+Shift+R` → assert recording pauses
6. Press `Ctrl+Shift+R` again → assert recording resumes

**Note:** DEV resolved `chrome.commands` limitation via DOM fallback in `content-script.ts` — `keydown` listener mirrors each shortcut to the overlay button. `page.keyboard.press()` fires the DOM event. All 4 tests pass.

**Acceptance:**
- [x] Screenshot shortcut works
- [x] Bug editor shortcut works
- [x] Toggle recording shortcut works
- [x] Shortcuts only active during session

---

### Q207: Full Regression Suite ✅

**Command:** `npx playwright test`

**Result: 25/25 ✅** — Sprint 00 (3) + Sprint 01 (7) + Sprint 02 (15)

**Also:** `npx vitest run` → **86/86 ✅**

---

## Ship QA Checklist

```
✅ npx playwright test  →  25/25
✅ npx vitest run       →  86/86
✅ Q201–Q206 all specs green
✅ DB_NAME confirmed as 'refine-db'
✅ 0 orphan records on session delete (IndexedDB verified)
✅ Keyboard shortcuts functional (DOM fallback path verified)
✅ ZIP > 1 KB, all 4 artifacts present
✅ .spec.ts passes tsc --noEmit
✅ Watch Replay opens new tab with rrweb-player
✅ Q201 chrome.downloads limitation documented
⏳ Gate 7  — FOUNDER: run exported .spec.ts against live target app
⏳ Gate 12 — FOUNDER: TaskPilot end-to-end walkthrough
```

---

*Last updated: 2026-02-22 — QA sign-off issued*

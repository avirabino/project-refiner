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

> **Status:** All 6 specs written contract-first. Shared helper `tests/e2e/helpers/session.ts` updated with `navigateToSessionDetail()` and `waitForDownload()` utilities.
> Will be green once DEV delivers D203 (SessionDetail), D206 (export buttons), D207 (delete), D208 (shortcuts).

### Q201: E2E — Report Export (`tests/e2e/report-export.spec.ts`) — 1V

**Test flow:**
1. Create session → record briefly on target app → stop
2. Open popup → click session → SessionDetail view
3. Click "Download Report"
4. Assert: file download triggered (JSON or MD)
5. If possible, verify downloaded file contains session name

**Acceptance:**
- [ ] Report download triggers without error
- [ ] File is non-empty

---

### Q202: E2E — Replay Viewer (`tests/e2e/replay-viewer.spec.ts`) — 1V

**Test flow:**
1. Record session → stop
2. Click "Watch Replay" in SessionDetail
3. Assert: new tab opens with replay HTML
4. Assert: page contains rrweb-player element
5. Assert: session metadata visible (name, date)

**Acceptance:**
- [ ] Replay opens in new tab
- [ ] Page loads without JS errors
- [ ] Playback controls visible

---

### Q203: E2E — Playwright Export (`tests/e2e/playwright-export.spec.ts`) — 2V

**Test flow:**
1. Record session on QA target app: navigate to 3 pages, click elements, fill form, log 1 bug
2. Stop session
3. Click "Export Playwright"
4. Capture exported `.spec.ts` content
5. Assert: contains `page.goto`, `page.click`, `page.fill`
6. Assert: contains `// BUG:` comment
7. **Bonus (if feasible):** Run the exported spec against target app and assert it passes

**Acceptance:**
- [ ] Exported file is syntactically valid TypeScript
- [ ] Contains expected Playwright commands
- [ ] Bug comments present at correct locations

---

### Q204: E2E — ZIP Export (`tests/e2e/zip-export.spec.ts`) — 1V

**Test flow:**
1. Record session → stop
2. Click "Download ZIP"
3. Assert: download triggered
4. If possible: inspect ZIP contents (replay.html, report.json, report.md, regression.spec.ts, screenshots/)

**Acceptance:**
- [ ] ZIP download triggers
- [ ] File is non-empty

---

### Q205: E2E — Session Delete (`tests/e2e/session-delete.spec.ts`) — 1V

**Test flow:**
1. Create 2 sessions
2. Delete first session (confirm dialog)
3. Assert: session removed from list
4. Assert: remaining session still visible
5. Verify IndexedDB cleaned (no orphaned events/screenshots)

**Acceptance:**
- [ ] Confirmation dialog appears before delete
- [ ] Deleted session disappears from list
- [ ] Remaining sessions unaffected

---

### Q206: E2E — Keyboard Shortcuts (`tests/e2e/keyboard-shortcuts.spec.ts`) — 1V

**Test flow:**
1. Start recording on target app
2. Press `Ctrl+Shift+S` → assert screenshot taken
3. Press `Ctrl+Shift+B` → assert bug editor opens
4. Press `Escape` → assert bug editor closes
5. Press `Ctrl+Shift+R` → assert recording pauses
6. Press `Ctrl+Shift+R` again → assert recording resumes

**Note:** Playwright supports keyboard shortcuts via `page.keyboard.press('Control+Shift+KeyR')`. However, `chrome.commands` may require special handling in E2E — test and document any limitations.

**Acceptance:**
- [ ] Screenshot shortcut works
- [ ] Bug editor shortcut works
- [ ] Toggle recording shortcut works
- [ ] Shortcuts only active during session

---

### Q207: Full Regression Suite — 0V (no new work, just run everything)

**Command:** `npx playwright test`

Assert ALL specs pass — Sprint 00 (3) + Sprint 01 (5) + Sprint 02 (6) = 14 E2E specs.

**Also run:** `npx vitest run` — all unit + integration tests (Sprint 00-02).

---

## Ship QA Checklist

Before FOUNDER acceptance:

```
✅ npx playwright test — 14/14 E2E specs green
✅ npx vitest run — all unit + integration tests green
✅ Full manual walkthrough on TaskPilot demo app:
   - Create session → record 3+ pages → take 2 screenshots → log 1 bug → stop
   - Generate report → verify JSON + MD content
   - Watch replay → verify playback works
   - Export Playwright → verify .spec.ts downloads
   - Download ZIP → verify all files present
   - Delete session → verify cleanup
✅ Extension loads cleanly after fresh build
✅ No console errors during normal usage
```

---

*Last updated: 2026-02-21*

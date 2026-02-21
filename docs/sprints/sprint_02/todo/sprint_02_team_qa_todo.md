# Sprint 02 — Team QA Todo: Export & Ship

**Owner:** `[QA]`
**Sprint:** 02 (FINAL)
**Depends on:** DEV Phase 5 (ZIP export wired — all generators done). Q206 (shortcuts) waits for Phase 6.
**Budget:** ~10V (QA share)

---

## Reading Order

1. `AGENTS.md` (root Tier-1)
2. `docs/04_TESTING.md` — existing patterns
3. `tests/e2e/fixtures/extension.fixture.ts` — reuse
4. `docs/sprints/sprint_02/sprint_02_index.md`
5. This file

---

## After DEV Delivers Phase 3 — E2E Specs

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

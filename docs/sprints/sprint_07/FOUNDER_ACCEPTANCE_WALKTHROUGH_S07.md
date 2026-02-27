# Sprint 07 — Founder Acceptance Walkthrough (FAT Round 3)

**Executor:** [FOUNDER] (Avi)
**Guide:** [CPTO]
**Gate:** Phase 1 must PASS before Phase 2 (AGENTS/LLM/Neon) begins
**Date:** TBD (end of Week 2)

---

## Prerequisites

```powershell
# Terminal 1: vigil-server
cd C:\Synaptix-Labs\projects\vigil
npm run dev:server
# Wait for: Server running on port 7474

# Terminal 2: Demo app (TaskPilot)
cd C:\Synaptix-Labs\projects\vigil
npx tsx packages/server/demo/taskpilot.ts
# Wait for: TaskPilot running on port 3900

# Terminal 3: Extension build
cd C:\Synaptix-Labs\projects\vigil
npm run build
# Wait for: dist/ output

# Chrome: Load extension
# chrome://extensions → Developer mode → Load unpacked → dist/
```

**Verify before starting:**
- [ ] `GET http://localhost:7474/health` → `{ status: "ok" }`
- [ ] `npx vitest run` → all tests pass
- [ ] `npx tsc --noEmit` → clean
- [ ] Extension loaded, no service worker errors

---

## Phase 1 Acceptance Steps

### STEP 1: Manifest Shortcut (S07-19)

1. Go to `chrome://extensions/shortcuts`
2. **Verify:** "Open bug editor" shortcut shows `Alt+Shift+B` (auto-assigned, not blank)
3. Navigate to `http://localhost:3900`
4. Press `Alt+Shift+B`
5. **Expected:** Bug editor opens

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 2: Project-Oriented Session (S07-16)

1. Click Vigil extension icon → side panel opens
2. Click "New Session"
3. **Verify:** Session creation form has these fields:
   - Project field (REQUIRED — folder path input)
   - Sprint dropdown (auto-populated from project's `docs/sprints/`)
   - Session name (auto-generated, editable)
   - Description (free-text)
4. Enter project: `C:\Synaptix-Labs\projects\vigil`
5. **Verify:** Sprint dropdown auto-selects latest sprint (sprint_07)
6. **Verify:** Session name auto-generated (e.g. `vigil-session-2026-02-28-001`)
7. Add a description, click "Start Session"
8. **Expected:** Session starts, control bar appears

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 3: Persistent Session History (S07-16 continued)

1. End the session from Step 2
2. Click "New Session" again
3. **Verify:** Project field pre-filled with `C:\Synaptix-Labs\projects\vigil`
4. **Verify:** Sprint dropdown shows previous sprint selected
5. **Verify:** Can pick from history OR enter a new project path

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 4: Session Persistence / Service Worker Restart (S07-12)

1. Create a new session (project + sprint filled)
2. Start recording, take a screenshot (`Ctrl+Shift+S`)
3. Reload the extension (chrome://extensions → toggle off/on, or click reload icon)
4. **Verify:** Session is still active after service worker restart
5. **Verify:** Can still end the session normally

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 5: Ghost Session Recovery (S07-18)

1. Create a new session on a tab
2. Press `Ctrl+R` on the tab (page refresh — kills content script)
3. Open Vigil side panel
4. **Verify:** Side panel shows warning about orphaned/stale session
5. **Verify:** "End stale session" button is visible
6. Click "End stale session"
7. **Verify:** Session ends cleanly, can create a new one

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 6: Full Session Flow (regression)

1. Create session with project `C:\Synaptix-Labs\projects\vigil`, sprint auto-detected
2. Navigate to `http://localhost:3900`
3. Toggle recording with SPACE (3x — on/off/on)
4. Capture screenshot: `Ctrl+Shift+S` — **Verify:** toast appears
5. Open bug editor: `Alt+Shift+B` — **Verify:** editor opens with screenshot preview
6. Fill bug title + description, click "Submit"
7. **Verify:** SPACE in bug editor description types space (not toggle recording)
8. End session → **Verify:** POST sent to vigil-server

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 7: Server-Side Verification

1. Check `.vigil/sessions/` — session JSON exists
2. **Verify:** Session JSON contains `project` and `sprint` fields
3. **Verify:** Session JSON contains snapshot(s) and bug(s) from Step 6
4. Check `BUGS/open/` — new bug file exists with correct format

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 8: Dashboard — Project/Sprint/Session Navigation (S07-17a)

1. Open `http://localhost:7474/dashboard`
2. **Verify:** Project selector visible at top
3. Select project → **Verify:** sprint list loads
4. Select sprint → **Verify:** session list within sprint shown (latest first)
5. Click a session → **Verify:** bugs and features for that session displayed

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 9: Dashboard — Filters (S07-17a)

1. On dashboard, use filters:
   - Filter by project
   - Filter by sprint
   - Filter by session
2. **Verify:** Tables update correctly with filtered results
3. **Verify:** Clear filters shows all data again

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 10: Dashboard — Screenshots + Details (S07-17a)

1. Click on the bug filed in Step 6
2. **Verify:** Screenshot displayed inline in bug detail view
3. **Verify:** Bug severity dropdown works (change P2 → P1)
4. **Verify:** "Mark Fixed" button works (file moves from open/ to fixed/)

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 11: Dashboard — Session Timeline + Replay (S07-17b)

1. In dashboard, select a session that has recordings
2. **Verify:** Session timeline shows events (recordings, screenshots, bugs) in chronological order
3. **Verify:** rrweb recording replay player loads and can play back the session
4. **Verify:** Can pause/resume/scrub the replay

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 12: Carry-Forward Bug Verification

1. **BUG-EXT-001:** Export Playwright spec from a session → **Verify:** generated TypeScript compiles
2. **BUG-EXT-002:** Check SessionDetail for publish button → **Verify:** `btn-publish` present (or test removed)
3. **BUG-DASH-001 regression:** Mark a bug as Fixed → **Verify:** file moves from open/ to fixed/

| Result | Notes |
|---|---|
| ⬜ PASS / ⬜ FAIL | |

---

### STEP 13: Quality Gates

| Gate | Expected | Result |
|---|---|---|
| `npx tsc --noEmit` | Clean | ⬜ |
| `npx vitest run` | All pass | ⬜ |
| `npm run build` | Success | ⬜ |
| Extension loads | No SW errors | ⬜ |
| Server health | 200 OK | ⬜ |

---

## Summary

| Step | Feature | S07 ID | Result |
|---|---|---|---|
| 1 | Manifest shortcut | S07-19 | ⬜ |
| 2 | Project-oriented session | S07-16 | ⬜ |
| 3 | Persistent history | S07-16 | ⬜ |
| 4 | Session persistence | S07-12 | ⬜ |
| 5 | Ghost session recovery | S07-18 | ⬜ |
| 6 | Full session flow (regression) | — | ⬜ |
| 7 | Server-side verification | — | ⬜ |
| 8 | Dashboard nav | S07-17a | ⬜ |
| 9 | Dashboard filters | S07-17a | ⬜ |
| 10 | Dashboard screenshots + actions | S07-17a | ⬜ |
| 11 | Session timeline + replay | S07-17b | ⬜ |
| 12 | Carry-forward bugs | S07-20/21 | ⬜ |
| 13 | Quality gates | — | ⬜ |

**FAT Round 3 Result:** ⬜ PASS (___/13) / ⬜ FAIL

**Founder Sign-Off:** _________________ Date: _________

> **If ANY step fails:** Log the issue, fix it, re-run only the failed step. Phase 2 does NOT start until 13/13 PASS.

---

*Prepared: 2026-02-27 | Owner: [CPTO] | Executor: [FOUNDER]*

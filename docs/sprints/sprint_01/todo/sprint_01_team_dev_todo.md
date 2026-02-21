# sprint_01 — Team DEV Todo: Recording Engine

**Owner:** `[DEV:recording]`
**Sprint:** 01 — Core recording loop
**Estimated effort:** ~43V (of 47V sprint total — QA owns ~4V of E2E work)

## Sprint Goals (DEV)

- Wire type-safe Chrome messaging between popup ↔ background ↔ content
- Implement session lifecycle (create → record → pause → resume → stop)
- Integrate rrweb for DOM recording with cross-page persistence
- Build Shadow DOM control bar (Record/Pause/Stop/Screenshot/Bug)
- Implement screenshot capture via chrome.tabs.captureVisibleTab
- Build inline bug/feature editor with auto-context
- Deliver full Dexie storage layer for sessions, events, bugs, screenshots
- Write unit + integration tests for all new code

## Reading Order (before writing ANY code)

1. `AGENTS.md` (root Tier-1) — project-wide rules
2. `src/background/AGENTS.md` — background module scope
3. `src/content/AGENTS.md` — content module scope
4. `src/popup/AGENTS.md` — popup module scope
5. `src/core/AGENTS.md` — core module scope
6. `src/shared/AGENTS.md` — shared module constraints
7. `docs/01_ARCHITECTURE.md` §5 Data Flows — message flow diagrams
8. `docs/03_MODULES.md` — capability registry ("Do NOT re-implement" column)
9. `docs/04_TESTING.md` — TDD discipline, test patterns

---

## Tasks

### Phase 1: Infrastructure (~4V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D101 | Chrome messaging — background hub | Type-safe `sendMessage()` and `onMessage()` wrappers using types from `@shared/messages`. Background acts as message hub: popup→bg, content→bg routing. All messages go through background — no direct popup↔content. | `src/background/messaging.ts` | ☐ |
| D102 | Chrome messaging — content helpers | Content script message send/receive helpers. Uses same shared types. Sends to background only. | `src/content/messaging.ts` | ☐ |
| D103 | Service worker keep-alive | `chrome.alarms.create('refine-keepalive', { periodInMinutes: 0.4 })` when session active. Clear alarm on session stop. Prevents MV3 idle shutdown during recording. | `src/background/keep-alive.ts` | ☐ |
| D104 | Extension icons | Create 4 icon sizes (16, 32, 48, 128px) using SynaptixLabs brand palette (orange #F97316 + blue #3B82F6). Simple "R" lettermark or recording dot icon. Replace 1×1 placeholders in `public/icons/`. | `public/icons/icon-{16,32,48,128}.png` | ☐ |

### Phase 2: Session Lifecycle — R001 (~5V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D105 | Dexie database schema | Tables: `sessions` (&id, name, description, status, startedAt, stoppedAt, urls[], bugCount, featureCount, screenshotCount, eventCount), `events` (++id, sessionId, timestamp, type, data), `bugs` (&id, sessionId, url, selector, description, priority, screenshotId, timestamp), `features` (&id, sessionId, url, description, type, timestamp), `screenshots` (&id, sessionId, url, dataUrl, timestamp). Use `&id` for string primary keys, `++id` for auto-increment. | `src/core/db.ts` | ☐ |
| D106 | Session manager state machine | States: `idle` → `recording` → `paused` → `recording` → `stopped`. Methods: `createSession(name, desc)`, `pauseSession()`, `resumeSession()`, `stopSession()`. Persists current session ID + state to `chrome.storage.local` (survives SW restart). Broadcasts state changes to content + popup via messaging. | `src/background/session-manager.ts` | ☐ |
| D107 | New Session page (popup) | Form: auto-generated session ID (read-only), name input (required), description textarea (optional), "Start Recording" button. On submit: sends `SESSION_CREATE` message to background → background creates session + tells content to start recording → popup shows "Recording..." indicator. Validate: name required, min 3 chars. | `src/popup/pages/NewSession.tsx` | ☐ |
| D108 | Popup App update | Add routing: default view = session list (existing), "New Session" button → NewSession page. Show active session badge (red dot) in header when recording. "Back" button from NewSession. | `src/popup/App.tsx` | ☐ |
| D109 | Unit tests: Dexie CRUD | Test all CRUD operations using `fake-indexeddb`. Create session → read → update status → delete. Create bug with screenshot reference. Query events by sessionId. Verify auto-increment IDs. | `tests/unit/core/db.test.ts` | ☐ |
| D110 | Unit tests: session manager | Test state transitions: idle→recording, recording→paused, paused→recording, recording→stopped. Test invalid transitions are rejected (e.g., idle→paused). Test session data is created in Dexie on create. Mock chrome.storage.local. | `tests/unit/background/session-manager.test.ts` | ☐ |

### Phase 3: Recording Engine — R002 (~15V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D111 | rrweb recorder wrapper | `startRecording()`: initializes rrweb.record(), buffers events in memory, flushes to Dexie every 1000 events OR 30 seconds (whichever first). `stopRecording()`: flushes remaining buffer, stops rrweb. `pauseRecording()` / `resumeRecording()`: rrweb doesn't have native pause — implement by stopping/restarting with a new full snapshot on resume. Handles page visibility changes (tab switch). | `src/content/recorder.ts` | ☐ |
| D112 | Action extractor | Processes rrweb `IncrementalSnapshot` events to extract high-level user actions: `click(selector)`, `type(selector, value)`, `navigate(url)`, `scroll(selector, delta)`. Each action includes: timestamp, URL, selector (via selector engine), human-readable description. Filters noise (mouse moves, minor scrolls). Output: `Action[]` array appended to session. | `src/content/action-extractor.ts` | ☐ |
| D113 | Selector engine | Input: DOM element. Output: best available selector string. Priority: (1) `[data-testid="value"]` (2) `[aria-label="value"]` (3) `#id` (4) CSS path (tag + classes + nth-child). Returns object: `{ selector: string, strategy: 'data-testid'|'aria-label'|'id'|'css', confidence: 'high'|'medium'|'low' }`. Avoids selectors > 3 levels deep. Flags low-confidence selectors (nth-child, deep nesting). | `src/content/selector-engine.ts` | ☐ |
| D114 | Cross-page recording | Content script checks with background on injection: "is there an active session?" If yes → resume recording automatically. Background tracks which tab is being recorded. On `chrome.tabs.onUpdated` (URL change in recorded tab) → content script re-injects, queries state, resumes rrweb with fresh full snapshot. Navigation events logged as actions. No recording gaps between pages. | `src/content/content-script.ts` (update), `src/background/session-manager.ts` (update) | ☐ |
| D115 | Unit tests: action extractor | Test click event → click action with correct selector. Test input event → type action. Test navigation → navigate action. Test noise filtering (mouse move events ignored). Test action description generation. | `tests/unit/content/action-extractor.test.ts` | ☐ |
| D116 | Unit tests: selector engine | Test data-testid element → returns data-testid selector with high confidence. Test element with only classes → returns CSS selector with low confidence. Test priority order is correct. Test depth limit (>3 levels → warn). | `tests/unit/content/selector-engine.test.ts` | ☐ |
| D117 | Integration test: recording flow | Full flow with mocked Chrome APIs: create session → start recording → generate mock rrweb events → extract actions → stop → verify session in Dexie with events, actions, correct timestamps. | `tests/integration/recording-flow.test.ts` | ☐ |

### Phase 4: Control Bar — R003 (~8V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D118 | Shadow DOM mount | Create `<refine-root>` custom element. Attach Shadow DOM (`mode: 'closed'`). Mount React app inside shadow root. Inject overlay CSS into shadow root via `<style>` tag. Host element: `position: fixed; z-index: 2147483647; pointer-events: none` (children re-enable pointer-events). Must not affect target page layout, styles, or JS. | `src/content/overlay/mount.ts` | ☐ |
| D119 | ControlBar component | Horizontal bar at bottom-center of viewport. Buttons: Record (●), Pause (⏸), Stop (⏹), Screenshot (📸), Bug (🐛). Visual states: recording = red pulse + "REC" label, paused = amber + "PAUSED", idle = hidden. Each button sends message to background (via content messaging). Draggable to reposition (optional — flag if too complex). Compact: ~300px wide, 48px tall. | `src/content/overlay/ControlBar.tsx` | ☐ |
| D120 | Overlay CSS | Plain CSS (NOT Tailwind — Shadow DOM isolation). Dark translucent background (`rgba(0,0,0,0.8)`). White icons/text. Red pulse animation for recording state. Responsive to viewport width (min 300px). No external fonts or CDN imports. | `src/content/styles/overlay.css` | ☐ |

### Phase 5: Screenshot + Bug Editor — R004 + R005 (~15V)

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D121 | Screenshot capture | Content script sends `SCREENSHOT_REQUEST` → Background calls `chrome.tabs.captureVisibleTab(tabId, { format: 'png' })` → returns data URL → Content stores in Dexie `screenshots` table with sessionId, URL, timestamp. Response time < 500ms. | `src/background/screenshot.ts` | ☐ |
| D122 | Bug editor component | Opens as overlay panel (inside Shadow DOM) when Bug button clicked. Fields: type toggle (Bug/Feature, default Bug), priority dropdown (P0-P3, default P1), description textarea (required). Auto-filled (read-only): current URL, timestamp, last-clicked element selector, auto-screenshot thumbnail. "Save" persists to Dexie `bugs` or `features` table → hides editor → resumes recording. "Cancel" discards. | `src/content/overlay/BugEditor.tsx` | ☐ |
| D123 | Bug auto-context | On bug button click: (1) auto-capture screenshot, (2) grab current URL, (3) grab last-clicked element's selector from action extractor, (4) grab timestamp. All four fields pre-filled in editor. User only needs to type description and confirm priority. | `src/content/overlay/BugEditor.tsx` (integrated) | ☐ |
| D124 | Unit tests: screenshot + bug storage | Test screenshot stored in Dexie with correct sessionId link. Test bug created with all auto-context fields populated. Test feature created (type toggle). Test bug without screenshot (edge case). | `tests/unit/core/db.test.ts` (extend) | ☐ |

### Phase 6: Verification

| ID | Task | Acceptance Criteria | Files | Status |
|---|---|---|---|---|
| D125 | Full build | `npm run build` → dist/ with all new files | All | ☐ |
| D126 | Type check | `npx tsc --noEmit` → zero errors | All | ☐ |
| D127 | Lint | `npx eslint src/` → zero errors | All | ☐ |
| D128 | All unit + integration tests pass | `npx vitest run` → green. Coverage: ≥80% shared, ≥70% core, ≥60% content (overlay excluded) | All | ☐ |
| D129 | Manual smoke test | Load extension → open TaskPilot (39000) → create session → record 2 pages → take screenshot → log 1 bug → stop → verify data in IndexedDB via DevTools | All | ☐ |

---

## Critical Rules

1. **Read AGENTS.md files before writing.** Every module has scope rules.
2. **Do NOT modify Sprint 00 files** unless fixing a bug. Config files are CTO-owned.
3. **Chrome API isolation:** `chrome.*` calls ONLY in `src/background/` and `src/content/`. Never in `src/core/` or `src/shared/`.
4. **Path aliases mandatory:** `@shared/`, `@core/`, `@background/`, `@content/`, `@popup/` — no relative cross-module imports.
5. **Shadow DOM overlay:** All Refine UI injected into target pages MUST live inside Shadow DOM. Zero CSS leakage.
6. **Background is the hub:** All cross-context communication goes through background service worker. No direct popup↔content messaging.
7. **Dexie is the single storage layer.** No raw `IndexedDB`, no `chrome.storage.local` for session data (chrome.storage.local is ONLY for ephemeral SW state like "current session ID").
8. **TDD discipline:** Write tests first or simultaneously. Every new function gets a test.
9. **rrweb is a dependency, not a fork.** Import from `rrweb` package. Do not copy rrweb source code.
10. **Flush events on stop.** When session stops, ALL buffered rrweb events MUST be flushed to Dexie before the session is marked as stopped. No data loss.

---

## Architecture Reference

| Doc | Path |
|---|---|
| Architecture | `docs/01_ARCHITECTURE.md` |
| Modules | `docs/03_MODULES.md` |
| Testing | `docs/04_TESTING.md` |
| Setup | `docs/02_SETUP.md` |
| PRD (requirements) | `docs/0k_PRD.md` — R001 through R005 |
| Sprint index | `docs/sprints/sprint_01/sprint_01_index.md` |

---

## Definition of Done (DEV)

```
✅ npm run build — succeeds
✅ npx tsc --noEmit — zero errors
✅ npx eslint src/ — zero errors  
✅ npx vitest run — all tests pass
✅ Coverage: ≥80% shared, ≥70% core, ≥60% content
✅ Extension loads in Chrome without console errors
✅ Can create session from popup
✅ rrweb records DOM events on target app
✅ Control bar shows Record/Pause/Stop/Screenshot/Bug
✅ Screenshot captured and stored in Dexie
✅ Bug editor opens with auto-context, saves to Dexie
✅ Recording persists across page navigation (no gaps)
✅ Service worker stays alive during active session
✅ FOUNDER can complete full flow on TaskPilot demo app
```

---

## Risks / Blockers

- **rrweb + Vite bundling:** rrweb may need specific import config for ESM. Test import early.
- **Shadow DOM + React 18 createRoot:** Verify React renders correctly inside shadow root. If not, fallback to vanilla DOM for control bar.
- **Cross-page re-injection timing:** Content script may inject before DOM is ready. Use `document_idle` run_at (already in manifest).
- **chrome.tabs.captureVisibleTab permissions:** Requires `activeTab` permission (already in manifest). May need user to click extension icon first on some pages.
- **Dexie + fake-indexeddb in tests:** Ensure test isolation — each test gets fresh DB instance.

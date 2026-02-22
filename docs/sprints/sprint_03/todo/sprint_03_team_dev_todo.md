# Sprint 03 — DEV Team Todo

**Owner:** `[DEV]`  
**Sprint:** Sprint 03  
**Budget:** ~53.5V

---

## Phase 1 — Infra (must complete before Phase 3 features)

### DR-03 [BLOCKING] — Remove `@ts-nocheck`, ship tsconfig stub in ZIP (~2V)
- [ ] `src/core/playwright-codegen.ts`: generate type-valid code (fix Locator type issues)
- [ ] `src/core/zip-bundler.ts`: add `playwright.tsconfig.json` to ZIP (`extends: "@playwright/test"` config)
- [ ] Remove `// @ts-nocheck` from generated spec header
- [ ] Unit test: generated spec compiles with `tsc --noEmit` using the bundled tsconfig

### B-NEW-01 — Version string hardcoded in generated spec (~0.1V)
- [ ] `src/core/playwright-codegen.ts` line 73: replace `'v1.0.0'` with `import { VERSION } from '@shared/constants'`
- [ ] `src/shared/constants.ts`: add `export const VERSION = '1.0.0'` (kept in sync with `package.json` version)

### DR-02 — Extract SHORTCUT_MAP to shared/constants (~1V)
- [ ] `src/shared/constants.ts`: add `SHORTCUT_MAP` constant (key → command name mapping)
- [ ] `src/content/content-script.ts`: import from shared
- [ ] `src/background/service-worker.ts` (if applicable): same import
- [ ] Unit test: SHORTCUT_MAP keys match manifest.json `commands` entries

### DR-04 — chrome.tabs.onUpdated navigation tracking (~3V)
- [ ] `src/background/session-manager.ts`: add `chrome.tabs.onUpdated` listener for `status === 'complete'`
- [ ] Record navigation action when URL changes during active session
- [ ] `src/content/recorder.ts`: remove `recordCrossPageNavigation()` via `document.referrer` (S02-012 superseded)
- [ ] Update unit tests for session-manager navigation tracking
- [ ] E2E: verify navigation actions appear in exported spec `page.goto` calls

### Mouse Tracking Preference (~2V)
- [ ] `src/shared/types.ts`: add `recordMouseMove: boolean` to Session (default: `false`)
- [ ] `src/popup/pages/NewSession.tsx`: add "Record mouse movements" toggle (default OFF)
- [ ] `src/content/recorder.ts`: pass `sampling.mousemove` based on session preference (0 = off, 50 = on)
- [ ] Unit test: mousemove sampling is 0 when preference is off

### Replay Extension Page — CSP-compliant (~4V)
- [ ] `src/replay-viewer/index.html` + `src/replay-viewer/index.tsx`: new extension page
- [ ] Reads `?sessionId=X` from query params, fetches events from IndexedDB
- [ ] Renders rrweb-player via `<script src="...">` (not inline) — CSP compliant
- [ ] Register as `web_accessible_resource` in `manifest.json`
- [ ] `src/popup/pages/SessionDetail.tsx`: change `btn-watch-replay` from download back to `chrome.tabs.create({ url: chrome.runtime.getURL('...') })`
- [ ] Update Q202 E2E spec back to `waitForEvent('page')` pattern

### In-App Changelog Viewer (~2V)
- [ ] `src/popup/components/ChangelogModal.tsx`: modal showing CHANGELOG.md content (bundled at build time)
- [ ] `src/popup/pages/SessionList.tsx`: "What's New" link/badge in footer (shows on first load after version bump)
- [ ] `vite.config.ts`: inline CHANGELOG.md as raw string import

### Sprint 01 HIGH Bugs

**B03 — Double-session guard (~0.5V)**
- [ ] `src/background/session-manager.ts`: `createSession()` — add `if (state.sessionId) throw new Error('[Refine] Session already active')`
- [ ] Unit test: calling `createSession` twice throws on second call

**B05 — Dead STOPPED enum (~0.2V)**
- [ ] `src/shared/types.ts`: remove `STOPPED = 'STOPPED'` from `SessionStatus` enum
- [ ] Verify no consumer references `SessionStatus.STOPPED` (grep before removing)

**B06 — actionCount race condition (~1V)**
- [ ] `src/background/message-handler.ts`: replace read-increment-write with `db.sessions.where('id').equals(sid).modify(s => s.actionCount++)`
- [ ] Unit test: concurrent action increments produce correct final count

**B15 — Timer reset on cross-page navigation (~1V)**
- [ ] `src/content/overlay/ControlBar.tsx`: on mount, send `GET_SESSION_STATUS` message and initialise `startTime` from `session.startedAt`
- [ ] Timer continues correctly after page reload/navigation
- [ ] E2E: verify timer doesn't reset to 0 after clicking a navigation link

**B16 — Bug save fire-and-forget (~0.5V)**
- [ ] `src/content/overlay/BugEditor.tsx`: wrap `chrome.runtime.sendMessage` in a `Promise` and `await` it before calling `onClose()`
- [ ] Add error handling: show error toast if save fails (don't silently close)
- [ ] Unit test: save failure shown to user

**B19 — formatDuration x4 duplication (~0.5V)**
- [ ] `src/shared/utils.ts`: add canonical `formatDuration(ms: number): string`
- [ ] Remove local copies from `SessionList.tsx`, `ControlBar.tsx`, `replay-bundler.ts`, `report-generator.ts`
- [ ] Import from `@shared/utils` in each file
- [ ] Unit test: canonical function (already in utils.test.ts — verify coverage)

---

## Phase 2 — MEDIUM Bugs + Deferred Items + New Requirements

### Sprint 01 MEDIUM Bugs

**B04 — addPage fire-and-forget (~0.2V)**
- [ ] `src/background/session-manager.ts`: add `.catch(err => console.error('[Refine] addPage failed:', err))` to getSession chain

**B09 — estimateBytes re-serializes (~0.5V)**
- [ ] `src/content/recorder.ts`: track `cumulativeBytes` incrementally as events arrive (`+= JSON.stringify(event).length * 2`)
- [ ] Remove `estimateBytes(state.eventBuffer)` full re-serialise call

**B10 — sessionId validation (~0.2V)**
- [ ] `src/content/recorder.ts`: `startRecording(sessionId)` — add guard `if (!sessionId?.startsWith('ats-')) throw`

**B12 — :has-text() strategy mislabel (~0.2V)**
- [ ] `src/content/selector-engine.ts`: change `strategy: 'css'` to `strategy: 'playwright'` for `:has-text()` path

**B13 — host element inline styles (~0.1V)**
- [ ] `src/content/overlay/mount.ts`: add `hostElement.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; pointer-events: none;'`

**B14 — handleStop error handling (~0.2V)**
- [ ] `src/content/overlay/ControlBar.tsx`: check `chrome.runtime.lastError` in `handleStop` sendMessage callback

**B17 — Auto-screenshot on bug save (~1V)**
- [ ] `src/content/overlay/BugEditor.tsx`: on save, send `CAPTURE_SCREENSHOT` message before `LOG_BUG`/`LOG_FEATURE`; pass returned `screenshotId` in payload
- [ ] If screenshot fails, proceed without (non-blocking)

**B18 — No active tab fallback (~0.1V)**
- [ ] `src/popup/pages/NewSession.tsx`: `tabs[0]?.url ?? 'No active tab detected'`

### Deferred Sprint 02 Items

**StorageIndicator (~1V)**
- [ ] `src/popup/components/StorageIndicator.tsx`: reads IndexedDB usage via `navigator.storage.estimate()`
- [ ] Shows `XX MB used / YY MB available` in SessionList footer

**Selector confidence TODO comments (~1V)**
- [ ] `src/core/playwright-codegen.ts`: for actions with `selectorConfidence === 'low'`, prepend `// TODO: low-confidence selector — verify before committing`

**ControlBar tooltip shortcut hints (~1V)**
- [ ] `src/content/overlay/ControlBar.tsx`: add `title` attribute to each button showing the keyboard shortcut (e.g. `title="Ctrl+Shift+S"`)

**Integration test: export pipeline (~2V)**
- [ ] `tests/integration/export-pipeline.test.ts`: create session → add bugs/features/screenshots/actions → run all 4 exporters → verify output shape

### New Requirements

**R025 — Project association + auto-publish (~5V)**

*Context: "team" = Windsurf/Claude LLM agents. Session artifacts must land on the local filesystem so agents can read them as project context. No cloud sync. `chrome.downloads` API is the write mechanism — requires user to set Chrome default download folder to `<project-root>/` once.*

**Two-layer output structure:**
```
<user-selected-root>/
└── <project-name>/                  ← Layer 1: Project
    ├── refine.project.json          ← settings (name, baseUrl, description)
    └── sessions/                    ← Layer 2: Sessions
        └── ats-2026-02-22-001/
            ├── report.md
            ├── report.json
            ├── regression.spec.ts
            └── screenshots/
```

**Tasks:**
- [ ] `src/shared/types.ts`: add `project?: string` and `outputPath?: string` to `Session`
- [ ] `src/popup/pages/NewSession.tsx`: "Project" field (free-text + autocomplete from existing project names)
- [ ] `src/popup/pages/ProjectSettings.tsx`: configure project name + base URL + output root path; generates `refine.project.json`
- [ ] `src/popup/pages/SessionList.tsx`: filter dropdown — "All Projects" / by project name
- [ ] `src/core/db.ts`: `getSessionsByProject(project: string)` query
- [ ] `src/core/publish.ts` (new module): `publishSession(session, bugs, features, actions, screenshots, chunks)` — downloads all artifacts to `<outputPath>/<project>/sessions/<sessionId>/` via `chrome.downloads` API
- [ ] `src/popup/pages/SessionDetail.tsx`: "Publish to Project" button (primary) alongside existing ZIP download; calls `publish.ts`; disabled if no `outputPath` configured
- [ ] Report exports: include `project` in JSON header + `## Project` section in Markdown
- [ ] Unit test: `publish.ts` calls `chrome.downloads.download` with correct `filename` paths
- [ ] User setup doc: add one-liner to `docs/02_SETUP.md` — "Set Chrome's default download folder to your projects root (Settings → Downloads)"

**R026 — Bug lifecycle status (~2V)**
- [ ] `src/shared/types.ts`: add `status: 'open' | 'in_progress' | 'resolved' | 'wontfix'` to `Bug` (default: `'open'`)
- [ ] `src/core/db.ts`: `updateBugStatus(id, status)` helper
- [ ] `src/popup/pages/SessionDetail.tsx`: status badge on each bug card (click to cycle)
- [ ] `src/core/report-generator.ts`: include status in JSON + group bugs by status in Markdown

**R027 — Feature sprint assignment (~2V)**
- [ ] `src/shared/types.ts`: add `status: 'open' | 'planned' | 'in_sprint' | 'done'` and `sprintRef?: string` to `Feature`
- [ ] `src/core/db.ts`: `updateFeature(id, patch)` helper
- [ ] `src/popup/pages/SessionDetail.tsx`: sprint assignment field on each feature card (free-text input)
- [ ] `src/core/report-generator.ts`: include sprintRef + status in JSON + "Planned Features" section in Markdown

---

## Phase 3 — PRD P2 Features

**R020 — Session tagging (~3V)**
- [ ] `src/shared/types.ts`: add `tags: string[]` to `Session` (default: `[]`)
- [ ] `src/popup/pages/NewSession.tsx`: tag input (comma-separated, autocompletes from existing tags)
- [ ] `src/popup/pages/SessionList.tsx`: filter by tag
- [ ] Report exports: tags in JSON + Markdown header

**R021 — Bugs & Features MD export (~3V)**
- [ ] `src/core/report-generator.ts`: add `generateBugFeatureMd(session, bugs, features)` function
- [ ] `src/popup/pages/SessionDetail.tsx`: "Export Bugs & Features" button → downloads `bugs-features-<id>.md`

**R022 — Action annotation (~5V)**
- [ ] `src/shared/types.ts`: add `note?: string` to `Action`
- [ ] `src/content/overlay/ControlBar.tsx`: long-press (500ms) on any button area opens note input
- [ ] `src/background/message-handler.ts`: `ANNOTATE_ACTION` message type
- [ ] `src/core/playwright-codegen.ts`: insert `// NOTE: <text>` comment before annotated action

**R023 — Element inspector mode (~8V)**
- [ ] `src/content/overlay/ControlBar.tsx`: "Inspect" toggle button
- [ ] `src/content/inspector.ts` (new): `mouseover` listener highlights hovered element, `click` listener logs selector without firing click
- [ ] Shadow DOM: highlighted element gets `outline: 2px solid #6366f1`
- [ ] Logs `[Refine] Inspector: <selector>` + sends `LOG_INSPECTOR_ELEMENT` to background
- [ ] `src/popup/pages/SessionDetail.tsx`: show inspected elements in a dedicated section

**R024 — Dark/light theme toggle (~3V)**
- [ ] `src/content/overlay/overlay.css`: add CSS variables for `--refine-bg`, `--refine-text`, etc.
- [ ] `src/content/overlay/ControlBar.tsx`: theme toggle button; stores preference in `chrome.storage.local`
- [ ] Apply `data-theme="light"` attribute to `#refine-root` host element

---

## LOW / Backlog (opportunistic)
- B01: Document `actions` table in `docs/sprints/sprint_02/sprint_02_decisions_log.md`
- B02: Document `getSession()` non-hydrated as intentional in decisions log
- B07: Document `tabId` payload coupling in decisions log
- B11: Clarify action-extractor vs DOM listener ownership in decisions log
- B20: Session list auto-refresh on background messages
- B21: `Action.type` string union → `ActionType` enum (consistency)

---

*Created: 2026-02-22 | `[DEV]`*

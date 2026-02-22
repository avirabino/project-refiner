# Sprint 03 — QA Team Todo

**Owner:** `[QA]`  
**Sprint:** Sprint 03  
**Depends on:** DEV Phase 1 complete before Phase 3 E2E specs

---

## data-testid Contract (new for Sprint 03)

QA publishes these contracts before DEV implements. DEV must implement all of them.

### Phase 1 additions
| testid | Element | Location |
|---|---|---|
| `input-record-mouse` | Mouse tracking toggle checkbox | `NewSession.tsx` |
| `btn-whatsnew` | "What's New" changelog link | `SessionList.tsx` footer |
| `changelog-modal` | Changelog modal container | `ChangelogModal.tsx` |
| `btn-close-changelog` | Close changelog modal | `ChangelogModal.tsx` |

### Phase 2 additions
| testid | Element | Location |
|---|---|---|
| `input-project-name` | Project name field | `NewSession.tsx` |
| `btn-project-settings` | Open project settings | `SessionList.tsx` |
| `project-settings-container` | Project settings page | `ProjectSettings.tsx` |
| `input-output-path` | Output path field | `ProjectSettings.tsx` |
| `session-project-badge` | Project badge on session card | `SessionList.tsx` |
| `select-project-filter` | Project filter dropdown | `SessionList.tsx` |
| `bug-status-badge` | Bug status badge (click to cycle) | `SessionDetail.tsx` |
| `feature-sprint-input` | Feature sprint assignment input | `SessionDetail.tsx` |
| `btn-export-bugs-features` | Export Bugs & Features button | `SessionDetail.tsx` |

### Phase 3 additions
| testid | Element | Location |
|---|---|---|
| `input-tags` | Session tags input | `NewSession.tsx` |
| `tag-badge` | Individual tag badge | `SessionList.tsx` |
| `select-tag-filter` | Tag filter dropdown | `SessionList.tsx` |
| `btn-inspect-mode` | Element inspector toggle | `ControlBar.tsx` (overlay) |
| `inspector-tooltip` | Selector display tooltip | `inspector.ts` Shadow DOM |
| `btn-theme-toggle` | Dark/light theme toggle | `ControlBar.tsx` (overlay) |
| `annotation-input` | Action annotation text input | `ControlBar.tsx` (overlay) |

---

## Phase 1 E2E Specs

### Q301 — Mouse Tracking Preference
**File:** `tests/e2e/mouse-tracking-pref.spec.ts`

- [ ] `input-record-mouse` checkbox visible on New Session form, default unchecked
- [ ] Create session with mouse tracking OFF → verify no `mousemove` events in recording chunks
- [ ] Create session with mouse tracking ON → verify `mousemove` events present
- [ ] Preference persists on session record (verify `session.recordMouseMove` in DB)

### Q302 — Changelog Viewer
**File:** `tests/e2e/changelog-viewer.spec.ts`

- [ ] `btn-whatsnew` visible in SessionList footer
- [ ] Click opens `changelog-modal` with text content
- [ ] Modal contains version `1.0.0`
- [ ] `btn-close-changelog` closes modal

### Q303 — Navigation Tracking via Background (DR-04)
**File:** update `tests/e2e/session-lifecycle.spec.ts`

- [ ] Record session across 2+ pages via `nav-about`, `nav-form`
- [ ] Exported Playwright spec contains `page.goto` for each distinct URL visited
- [ ] No `document.referrer`-based navigation in content script (verify by checking action source)

### Q304 — Replay Extension Page (Phase 1 — sprint 03-replay-csp)
**File:** `tests/e2e/replay-viewer.spec.ts` (update Q202)

- [ ] `btn-watch-replay` triggers `chrome.tabs.create` (new tab, not download)
- [ ] New tab URL is `chrome-extension://<id>/replay-viewer.html?sessionId=<id>`
- [ ] Page renders rrweb-player without CSP errors in console
- [ ] Session name visible in replay page title or body

---

## Phase 2 E2E Specs

### Q305 — Project Association
**File:** `tests/e2e/project-association.spec.ts`

- [ ] `input-project-name` accepts free-text project name in New Session form
- [ ] Sessions grouped/filterable by project in `select-project-filter`
- [ ] Exported `report.json` contains `project` field matching session project
- [ ] Exported `report.md` has `## Project` section

### Q306 — Bug Status Lifecycle
**File:** `tests/e2e/bug-status.spec.ts`

- [ ] `bug-status-badge` shows `open` by default on new bug
- [ ] Click cycles: `open` → `in_progress` → `resolved` → `wontfix` → `open`
- [ ] Status persists after popup close + reopen
- [ ] Exported `report.json` bug entries include `status` field
- [ ] Exported `report.md` groups bugs by status

### Q307 — Feature Sprint Assignment
**File:** `tests/e2e/feature-sprint.spec.ts`

- [ ] `feature-sprint-input` accepts free-text sprint reference (e.g. `sprint-09`)
- [ ] Sprint reference persists after popup close + reopen
- [ ] Exported `report.json` feature entries include `sprintRef` + `status`
- [ ] Exported `report.md` has "Planned Features" section with sprint grouping

### Q308 — Bugs & Features MD Export
**File:** `tests/e2e/bugs-features-export.spec.ts`

- [ ] `btn-export-bugs-features` visible in SessionDetail export section
- [ ] Download triggers `bugs-features-<session-id>.md`
- [ ] File contains all logged bugs with title, priority, status, URL
- [ ] File contains all logged features with title, type, status, sprintRef

---

## Phase 3 E2E Specs

### Q309 — Session Tagging
**File:** `tests/e2e/session-tagging.spec.ts`

- [ ] `input-tags` accepts comma-separated tags in New Session form
- [ ] Tags appear as `tag-badge` elements on session cards
- [ ] `select-tag-filter` filters session list by tag
- [ ] Tags present in exported `report.json`

### Q310 — Element Inspector Mode
**File:** `tests/e2e/element-inspector.spec.ts`

- [ ] `btn-inspect-mode` toggles inspector on/off
- [ ] In inspector mode, hovering an element shows `inspector-tooltip` with selector text
- [ ] Clicking an element does NOT trigger the click action on the target app
- [ ] Inspected selectors logged to background (verify `LOG_INSPECTOR_ELEMENT` message)
- [ ] Inspector mode auto-disables when session stops

### Q311 — Dark/Light Theme
**File:** `tests/e2e/overlay-theme.spec.ts`

- [ ] `btn-theme-toggle` visible in ControlBar
- [ ] Click toggles `data-theme` attribute on `#refine-root` host
- [ ] Theme preference survives page navigation (reloads to same theme)
- [ ] Theme preference stored in `chrome.storage.local`

### Q312 — Action Annotation
**File:** `tests/e2e/action-annotation.spec.ts`

- [ ] `annotation-input` appears on long-press (500ms hold) of ControlBar area
- [ ] Submitted annotation stored as `note` on corresponding `Action` record
- [ ] Exported Playwright spec contains `// NOTE: <text>` before annotated step

---

## Regression Gate

Before Sprint 03 ship:
- [ ] All prior E2E specs (Q101–Q208) still green
- [ ] All unit tests green (`npm test`)
- [ ] Q301–Q312 all passing
- [ ] `tsc --noEmit` clean (no `@ts-nocheck` in generated specs)

---

## Known E2E Changes from Sprint 02

| Spec | Change | Reason |
|---|---|---|
| Q202 `replay-viewer.spec.ts` | Currently download pattern; reverts to new-tab pattern when replay extension page ships (Phase 1) | s03-replay-csp |

---

*Created: 2026-02-22 | `[QA]`*

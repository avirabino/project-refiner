# SynaptixLabs Refine â€” Product Requirements

> **Product Requirements Document**
> Owner: CPO
> Version: 1.0.0

---

## Executive Summary

Refine (Acceptance Test Recorder) is a Chrome Extension that enables product owners to record manual acceptance testing sessions on any web application, capture bugs and feature requests inline, and export recordings as visual replays and Playwright regression test scripts. It serves as the bridge between manual exploratory testing and automated QA â€” eliminating the gap where bugs are found manually but have no structured path to becoming regression tests.

---

## Problem Statement

### Problem
Manual acceptance testing at SynaptixLabs produces unstructured output: screenshots in chat threads, bugs described in prose messages, reproduction steps lost in conversation context. When the product owner (CPTO) finds issues during walkthrough, the path from "I see a bug" to "QA has a regression test" requires multiple handoffs, re-explanation, and manual translation.

### Impact
- DEV teams receive bug reports without exact reproduction steps, wasting 15-30 min per bug on reproduction
- QA teams must manually create regression tests from prose descriptions â€” error-prone and slow
- Product owner must repeat walkthrough context in separate bug reports instead of capturing it in-flow
- Bugs found during acceptance testing are lost when chat history scrolls away
- No systematic record of what was tested, when, and what was found

### Current Solutions
- Screenshots pasted into chat conversations (Claude, Slack)
- Manual bug writeups in markdown files
- QA writes E2E tests from verbal/written descriptions
- No recording or replay capability

### Gap
No tool combines: (1) session recording during manual testing, (2) inline bug/feature capture with automatic context (URL, screenshot, DOM element), and (3) export to Playwright test scripts. Commercial tools (Replay.io, Marker.io, BugHerd) each solve a piece but none close the full loop for a startup QA workflow.

---

## Goals & Success Metrics

### Primary Goals
1. Enable product owner to record acceptance testing sessions with zero setup per target app
2. Reduce bug-to-regression-test cycle from hours to minutes
3. Produce structured, actionable output for DEV (bug repro) and QA (test scripts)

### Success Metrics

| Metric | Current | Target | Deadline |
|--------|---------|--------|----------|
| Time from "bug found" to "DEV has repro steps" | ~30 min (manual writeup) | < 2 min (auto-captured) | Sprint 02 |
| Time from "session done" to "QA has regression script" | ~2 hours (manual writing) | < 10 min (auto-export) | Sprint 03 |
| % of acceptance bugs with screenshot + URL + selector | ~30% | 100% | Sprint 01 |
| Projects using Refine | 0 | 3 | Sprint 03 |

---

## User Personas

### Persona 1: Product Owner / CPTO

| Attribute | Value |
|-----------|-------|
| Role | CPTO â€” performs manual acceptance testing on all SynaptixLabs projects |
| Goals | Walk through app flows, find bugs, log feature ideas, produce actionable reports |
| Pain Points | Bugs found during testing require separate manual writeup; no recording; context is lost between finding and reporting |
| Tech Comfort | Expert â€” comfortable with dev tools but should not need them for Refine |

### Persona 2: DEV Team Lead

| Attribute | Value |
|-----------|-------|
| Role | Receives bug reports from acceptance testing sessions |
| Goals | Get exact reproduction steps, affected URL, screenshot, DOM selector â€” fast |
| Pain Points | Bug reports lack specificity; must ask follow-up questions; reproduction is time-consuming |
| Tech Comfort | Expert |

### Persona 3: QA Engineer

| Attribute | Value |
|-----------|-------|
| Role | Creates and maintains Playwright E2E regression test suites |
| Goals | Convert acceptance testing findings into automated regression tests |
| Pain Points | Must manually write Playwright scripts from prose bug descriptions; no baseline recording to work from |
| Tech Comfort | Expert â€” works in Playwright daily |

---

## Requirements

### Must Have (P0) â€” MVP

| ID | Requirement | Acceptance Criteria | Vibes |
|----|-------------|---------------------|-------|
| R001 | Session creation with auto-ID, user-provided name, description | New session form with auto-generated ID (format: `ats-YYYY-MM-DD-NNN`), name field, description textarea | 5 V |
| R002 | DOM recording via rrweb across page navigations | rrweb records all DOM mutations, mouse events, scroll, inputs. Recording persists when user navigates between pages within the target app | 15 V |
| R003 | Floating control bar with Record/Pause/Stop | Non-intrusive overlay at bottom-center of viewport. Red pulse indicator when recording. Pause/Resume toggle. Stop finalizes session | 8 V |
| R004 | Screenshot capture on demand | Button in control bar captures current viewport via `chrome.tabs.captureVisibleTab()`. Stored with timestamp, auto-associated with current URL and session | 5 V |
| R005 | Inline bug/feature editor | Quick-entry form: type toggle (Bug/Feature), priority (P0-P3), description text, auto-attached screenshot + URL + last-clicked element selector | 10 V |
| R006 | Session report generation | On session stop: generate JSON + markdown report with timeline, pages visited, actions count, bugs/features list, screenshot inventory | 8 V |
| R007 | Session list with delete capability | Extension popup shows all sessions (name, date, duration, bug count). Delete button removes session and all associated data | 5 V |

### Should Have (P1) â€” Full Product

| ID | Requirement | Acceptance Criteria | Vibes |
|----|-------------|---------------------|-------|
| R010 | Visual replay via rrweb-player | "Watch Replay" button opens self-contained HTML file with rrweb-player. Playback controls: play/pause, speed, timeline scrubber | 10 V |
| R011 | Playwright test script export | "Export Playwright" generates `.spec.ts` file from recorded actions (navigate, click, type, assert visibility). Uses best available selectors (data-testid > aria-label > CSS) | 15 V |
| R012 | Export as ZIP bundle | Single ZIP download containing: replay.html, regression.spec.ts, report.json, report.md, screenshots/*.png | 5 V |
| R013 | Keyboard shortcuts | `Ctrl+Shift+R` toggle recording, `Ctrl+Shift+S` screenshot, `Ctrl+Shift+B` open bug editor | 3 V |

### Nice to Have (P2) â€” Polish

| ID | Requirement | Acceptance Criteria | Vibes |
|----|-------------|---------------------|-------|
| R020 | Session tagging / filtering | Add tags to sessions (e.g., "papyrus", "sprint-09"). Filter session list by tag | 3 V |
| R021 | Bug/feature export to markdown file | Separate export of just bugs + features as structured markdown (for pasting into sprint docs) | 3 V |
| R022 | Action annotation | User can add text annotations during recording ("now testing the sidebar") that appear in timeline | 5 V |
| R023 | Element inspector mode | Toggle mode where clicking highlights the element and logs its selector without performing the click action | 8 V |
| R024 | Dark/light theme for overlay | Match target app's color scheme or manual toggle | 3 V |

---

## User Stories

### Epic 1: Recording Sessions

**US001:** As a product owner, I want to start a recording session with a name and description so that I can organize my testing by purpose.

**Acceptance Criteria:**
- [ ] Extension popup has "New Session" button
- [ ] Form with auto-generated ID, name field, description textarea
- [ ] "Start Recording" button activates recording and shows control bar on current page
- [ ] Session appears in session list immediately

**Vibe Estimate:** 5 V

---

**US002:** As a product owner, I want the recording to persist as I navigate between pages so that I can test full user journeys.

**Acceptance Criteria:**
- [ ] Content script re-injects rrweb on each page navigation
- [ ] Control bar re-appears on each new page
- [ ] Recording timeline is continuous (no gaps between pages)
- [ ] Navigation events are logged with source and destination URLs

**Vibe Estimate:** 10 V

---

**US003:** As a product owner, I want to pause and resume recording so that I can handle interruptions without polluting the session.

**Acceptance Criteria:**
- [ ] Pause button stops rrweb recording and action logging
- [ ] Control bar shows "PAUSED" state (amber indicator)
- [ ] Resume continues recording seamlessly
- [ ] Paused time is excluded from session duration

**Vibe Estimate:** 3 V

---

### Epic 2: Bug and Feature Capture

**US004:** As a product owner, I want to log a bug with one click during recording so that I don't break my testing flow.

**Acceptance Criteria:**
- [ ] Bug button in control bar opens inline form
- [ ] Form pre-fills: current URL, auto-screenshot, timestamp
- [ ] Form captures: type (bug/feature), priority, description
- [ ] Auto-detects last-clicked element selector
- [ ] Save returns to recording immediately

**Vibe Estimate:** 10 V

---

### Epic 3: Reports and Export

**US005:** As a DEV team lead, I want to receive a bug report with exact URL, screenshot, reproduction steps, and affected element so that I can fix bugs without back-and-forth.

**Acceptance Criteria:**
- [ ] Bug report includes: URL, screenshot, element selector, description, priority, timestamp in session timeline
- [ ] Report shows steps leading up to the bug (last 5-10 actions before the bug was logged)
- [ ] Exportable as standalone markdown or JSON

**Vibe Estimate:** 8 V

---

**US006:** As a QA engineer, I want to receive a Playwright test script from a recording session so that I can add regression coverage with minimal manual work.

**Acceptance Criteria:**
- [ ] Exported `.spec.ts` includes: page.goto, click, fill, and assertion steps
- [ ] Selectors prefer data-testid, fall back to aria-label, then CSS
- [ ] Script is syntactically valid (runs without syntax errors)
- [ ] Script includes comments marking where bugs were logged
- [ ] QA engineer can edit/refine the generated script

**Vibe Estimate:** 15 V

---

## Non-Functional Requirements

### Performance
- Extension overhead: < 5% CPU during recording (rrweb is lightweight)
- Screenshot capture: < 500ms
- Session report generation: < 3s for a 30-minute session
- Extension popup load: < 200ms

### Security
- No data leaves the browser (all storage is local IndexedDB)
- No network requests to external servers
- No access to passwords, cookies, or sensitive form fields (rrweb masks input[type=password] by default)
- Content script injection follows Chrome Manifest V3 security model

### Accessibility
- Control bar is keyboard-navigable
- Screen reader labels on all buttons
- High contrast mode for overlay elements

### Localization
- Languages: English only (MVP)
- RTL support: No (not needed for internal tool)

---

## Out of Scope

Explicitly **NOT** included in this version:
- Video recording (screen capture to MP4) â€” use Loom/OBS for that
- Cloud storage or team sync of sessions â€” local-only for MVP
- Automatic bug detection (AI-powered) â€” manual capture only
- Mobile browser support â€” Chrome desktop only
- Firefox/Safari extension ports â€” Chrome/Edge only (Manifest V3)
- Server-side component or API â€” fully client-side
- Integration with issue trackers (Jira, Linear, GitHub Issues) â€” export files, manual upload

---

## Dependencies

| Dependency | Type | Owner | Status |
|------------|------|-------|--------|
| rrweb (MIT) | External library | Open source | Stable, v2.x |
| rrweb-player (MIT) | External library | Open source | Stable |
| Dexie.js (Apache 2.0) | External library | Open source | Stable, v4.x |
| Chrome Manifest V3 | Platform | Google | Current standard |
| CRXJS Vite Plugin | Build tool | Open source | Active development |
| Target apps use data-testid | Internal convention | SynaptixLabs DEV teams | Partially adopted â€” recommend enforcing |

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| rrweb recording size exceeds IndexedDB limits for long sessions | High | Low | Auto-chunk recordings; warn user after 30 min; offer "save and continue" |
| Content script conflicts with target app CSS/JS | Medium | Medium | Isolate overlay in Shadow DOM; namespace all CSS classes |
| Manifest V3 service worker goes idle during long pause | Medium | Medium | Use chrome.alarms API to keep service worker alive during active session |
| Playwright codegen produces brittle selectors | High | High | Implement smart selector strategy: data-testid > aria-label > role > CSS. Flag selectors that use nth-child or deep nesting |
| Chrome "Disable developer mode extensions" nag | Low | Certain | Document in README; it's a 1-second dismiss. Consider Chrome Enterprise policy for team distribution |

---

## Timeline

| Sprint | Deliverables | Vibes | Status |
|--------|--------------|-------|--------|
| Sprint 00 | Repo setup, extension scaffold, Manifest V3 + React popup + content script hello-world | 15 V | ✅ Done |
| Sprint 01 | P0: Recording engine (R001–R003), screenshot (R004), bug editor (R005) | 45 V | ✅ Done |
| Sprint 02 | P0: Report generation (R006), session management (R007). P1: Replay (R010), Playwright export (R011), ZIP bundle (R012), keyboard shortcuts (R013) | 55 V | ✅ Done (v1.0.0) |
| Sprint 03 | Infra fixes (CTO DR + Sprint 01 HIGH bugs), P2 features (R020–R027), project folder + auto-publish | ~62 V | 🔄 In Progress |
| Sprint 04 | AI recording via Windsurf/Claude (/refine-record workflow), project dashboard, silence compression | ~20 V | Planned |

**Total estimated: ~197 Vibes**

### New Requirements (Sprint 03)

| ID | Requirement | Priority | Sprint |
|---|---|---|---|
| R014 | Mouse tracking as session preference (default OFF) | P1 | Sprint 03 |
| R025 | Project / app association on sessions + output folder path | P1 | Sprint 03 |
| R026 | Bug lifecycle status: open / in_progress / resolved / wontfix | P2 | Sprint 03 |
| R027 | Feature sprint assignment: status + sprintRef field | P2 | Sprint 03 |

### Platform Architecture (Sprint 04)

Refine evolves into a **VIBE coding testing platform**:
- Manual sessions auto-export structured artifacts to a user-selected project folder
- Folder structure: `<root>/<project>/sessions/<ats-id>/report.md + report.json + regression.spec.ts`
- Windsurf/Claude agents (`[CPO]`, `[QA]`, `[DEV]`, `[CTO]`) read session artifacts directly from the filesystem
- AI recording: `/refine-record` Windsurf workflow uses Playwright + Cascade to generate sessions without the Chrome extension
- No cloud sync required — filesystem IS the sharing mechanism

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| Refine | Acceptance Test Recorder â€” this product |
| Session | A time-bounded recording of manual testing activity |
| rrweb | Open-source library for recording and replaying web sessions via DOM snapshots |
| Content Script | Chrome extension code that runs in the context of web pages |
| Service Worker | Chrome extension background process (Manifest V3) |
| Playwright | End-to-end testing framework by Microsoft |
| DOM | Document Object Model â€” the browser's representation of a web page |
| Shadow DOM | Isolated DOM tree that prevents CSS/JS leakage between extension overlay and target page |

### References

- [rrweb documentation](https://www.rrweb.io/)
- [Chrome Manifest V3 docs](https://developer.chrome.com/docs/extensions/mv3/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)
- [Dexie.js](https://dexie.org/)
- [Session-Based Test Management (James Bach)](https://www.satisfice.com/sbtm/)
- [Playwright codegen](https://playwright.dev/docs/codegen)
- Discussion Summary: `docs/knowledge/00_DISCUSSION_SUMMARY.md`

---

*Last updated: 2026-02-22 (v1.0.0 — Sprint 02 closure + Sprint 03 planning)*
*Approved by: Avi (FOUNDER, SynaptixLabs)*

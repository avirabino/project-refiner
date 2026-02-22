# Changelog

All notable changes to SynaptixLabs Refine.

## [1.0.0] - 2026-02-22

### Added
- **Session recording engine** (R001-R002): rrweb DOM recording across page navigations, auto-chunked to IndexedDB via Dexie.js
- **Floating control bar** (R003): Shadow DOM overlay with record/pause/resume/stop, recording pulse indicator
- **Screenshot capture** (R004): `Ctrl+Shift+S` or button — stored with URL + timestamp
- **Inline bug/feature editor** (R005): priority P0-P3, auto-fills URL + last-clicked selector
- **Session report export** (R006): JSON + Markdown report with timeline, bugs, features, screenshots
- **Session management** (R007): session list, detail view, cascading delete with confirmation
- **Visual replay** (R010): self-contained HTML with inlined rrweb-player — download and open in any browser
- **Playwright spec export** (R011): `.spec.ts` with `page.goto`, `page.click`, `page.fill`, `toHaveURL` assertions and `// BUG:` markers
- **ZIP bundle export** (R012): one download containing replay.html, report.json, report.md, regression.spec.ts, screenshots/
- **Keyboard shortcuts** (R013): `Ctrl+Shift+R` toggle recording, `Ctrl+Shift+S` screenshot, `Ctrl+Shift+B` bug editor
- **Demo app** (TaskPilot): Vite/React SPA at `demos/refine-demo-app/` for manual testing

### Fixed
- ZIP download: blob URL string was wrapped in a second Blob (produced 93-byte file)
- Action recording: DOM click/input listeners now added in `recorder.ts` (rrweb events alone were unreliable)
- Playwright codegen: navigation URL was missing from `page.goto`; `escapeRegex` now escapes `/`
- Session pages: `chrome-extension://` and `chrome://` URLs filtered from `session.pages`
- Keyboard shortcut E2E: added DOM `keydown` fallback in content script (Playwright cannot trigger `chrome.commands`)
- TypeScript: `@types/css-font-loading-module` conflict resolved via `npm overrides` + local empty stub
- **Replay CSP**: `Watch Replay` changed from `chrome.tabs.create(blobUrl)` to file download — MV3 CSP blocks inline scripts in `blob:chrome-extension://` tabs

### Architecture Decisions
- rrweb-player inlined as UMD (~230 KB) in replay HTML for offline portability (S02-001)
- Playwright codegen uses CSS attribute string selectors for type safety (S02-007)
- `npm overrides` + empty stub to neutralise stale `@types/css-font-loading-module` from rrweb (S02-010)
- Dual-path keyboard shortcuts: `chrome.commands` (background) + DOM keydown fallback (content script) (S02-011)

### Known Limitations
- Replay must be downloaded and opened from the filesystem (Sprint 03 will add a CSP-compliant extension replay page)
- Mouse move events recorded at 50ms interval — configurable mouse tracking preference coming in Sprint 03
- No project/app association on sessions — coming in Sprint 03 (R025)

## [0.1.0] - 2026-02-20

### Added
- Project scaffolded from Windsurf-Projects-Template
- PRD with 7 P0, 4 P1, 5 P2 requirements
- Architecture document (Manifest V3, module layout, data model)
- Module structure: background, content, popup, core, shared
- Windsurf agent roles customized for Chrome Extension development
- Sprint-00 kickstart plan
- Decision log with 7 pre-approved ADRs

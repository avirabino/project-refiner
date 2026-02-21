# Sprint 02 — Team DEV Todo: Export & Ship

**Owner:** `[DEV:export]`
**Sprint:** 02 (FINAL)
**Depends on:** Sprint 01 complete (recording engine functional)
**Budget:** ~36V (DEV share of 46V sprint)

---

## Reading Order

1. `AGENTS.md` (root Tier-1)
2. `src/core/AGENTS.md` — core module owns report-generator, playwright-codegen, replay-bundler
3. `docs/01_ARCHITECTURE.md` §3 Data Model
4. `docs/03_MODULES.md` — Core capabilities
5. `src/shared/types.ts` — Session, Bug, Feature, Action interfaces
6. This file

---

## Phase 1 — Report Generation (~13V)

### D201: Report Generator (`src/core/report-generator.ts`) — 5V

**What:** Transforms a hydrated `Session` object into two output formats: JSON report + Markdown report.

**JSON report structure:**
```json
{
  "meta": { "generatedAt", "refineVersion", "sessionId" },
  "session": { "name", "description", "url", "startTime", "endTime", "duration" },
  "pages": [{ "url", "enterTime", "exitTime", "actionCount" }],
  "timeline": [{ "timestamp", "type", "description", "url" }],
  "bugs": [{ "id", "title", "priority", "url", "selector", "screenshot", "timestamp" }],
  "features": [{ "id", "title", "type", "description", "timestamp" }],
  "stats": { "totalActions", "totalPages", "totalBugs", "totalFeatures", "totalScreenshots", "duration" }
}
```

**Markdown report:** Human-readable version of the above with:
- Header: session name, date, duration
- Pages visited (table)
- Timeline (chronological list)
- Bugs section (priority-sorted, with screenshots as `![](data:image/png;base64,...)`)
- Features section
- Stats summary

**Acceptance:**
- [ ] `generateJsonReport(session)` → valid JSON matching schema above
- [ ] `generateMarkdownReport(session)` → valid Markdown, human-readable
- [ ] Empty session (no bugs, no actions) produces valid output (not errors)
- [ ] Bug screenshots included as base64 in Markdown
- [ ] Timeline sorted by timestamp ascending

---

### D202: Replay Bundler (`src/core/replay-bundler.ts`) — 5V

**What:** Takes rrweb events from a session and produces a self-contained HTML file with embedded rrweb-player.

**Output:** Single `replay.html` file containing:
- Inlined rrweb-player JS (from `node_modules/rrweb-player/dist/`)
- Inlined rrweb-player CSS
- Session events as JSON in a `<script>` tag
- Playback controls: play/pause, speed (1x, 2x, 4x), timeline scrubber
- Session metadata header (name, date, duration, URL)

**Note:** rrweb-player is NOT in `package.json` yet. Must be added:
```bash
npm install rrweb-player@^2.0.0-alpha.17
```

**Acceptance:**
- [ ] `generateReplayHtml(session, events)` → valid HTML string
- [ ] HTML opens in browser and plays back recorded events
- [ ] Play/pause and speed controls work
- [ ] File is self-contained (no external CDN references)
- [ ] Reasonable file size (< 500KB for a 5-min session)

---

### D203: Session Detail View (`src/popup/pages/SessionDetail.tsx`) — 3V

**What:** Popup page showing details for a single completed session. Reached by clicking a session in SessionList.

**Shows:**
- Session name, date, duration, status
- Stats: pages visited, actions, bugs, features, screenshots
- Bugs list with priority badges
- Action buttons: Report / Replay / Playwright / ZIP (Phase 3 wires these)

**Acceptance:**
- [ ] Displays all session metadata
- [ ] Bugs listed with priority color coding
- [ ] Back button returns to session list
- [ ] Export buttons present (disabled until Phase 3 wires them)

---

## Phase 2 — Playwright Codegen + ZIP (~15V)

### D204: Playwright Codegen (`src/core/playwright-codegen.ts`) — 10V

**What:** Transforms `Action[]` array from a session into a valid Playwright `.spec.ts` file.

**Output structure:**
```typescript
import { test, expect } from '@playwright/test';

test('Refine session: <session-name> (<date>)', async ({ page }) => {
  // Navigation
  await page.goto('<start-url>');
  
  // Recorded actions
  await page.click('[data-testid="nav-about"]');
  await page.fill('[data-testid="input-name"]', 'John Doe');
  
  // BUG: P1 — "Button not aligned" (logged at 2:34)
  await page.click('[data-testid="btn-submit"]');
  await expect(page.locator('[data-testid="msg-success"]')).toBeVisible();
});
```

**Action → Playwright mapping:**
| Action type | Playwright output |
|---|---|
| `navigation` | `await page.goto('<url>');` |
| `click` | `await page.click('<selector>');` |
| `input` | `await page.fill('<selector>', '<value>');` |
| Bug logged at action | `// BUG: <priority> — "<title>" (logged at <time>)` comment above next action |

**Selector output:** Use the selector from the Action object directly (already best-selector from selector-engine).

**Assertions:** Add `toBeVisible()` assertions after:
- Navigation (assert page loaded)
- Form submit (assert success message if selector suggests one)
- Final action (assert last interacted element visible)

**Acceptance:**
- [ ] `generatePlaywrightSpec(session)` → valid TypeScript string
- [ ] Output compiles with `tsc --noEmit`
- [ ] Output runs with `npx playwright test` against target app (for sessions recorded on target app)
- [ ] Bug comments appear at correct positions in timeline
- [ ] Uses best available selectors (data-testid preferred)
- [ ] Test name includes session name and date

---

### D205: ZIP Bundler (`src/core/zip-bundler.ts`) — 5V

**What:** Packages all session exports into a single ZIP download.

**ZIP structure:**
```
refine-<session-id>/
├── replay.html              # from replay-bundler
├── report.json              # from report-generator
├── report.md                # from report-generator
├── regression.spec.ts       # from playwright-codegen
└── screenshots/
    ├── screenshot-001.png
    ├── screenshot-002.png
    └── ...
```

**Dependency:** Add `jszip` to `package.json`:
```bash
npm install jszip@^3.10.1
```

**Download trigger:** Uses `chrome.downloads.download()` or `URL.createObjectURL()` + anchor click.

**Acceptance:**
- [ ] `generateZipBundle(session)` → Blob
- [ ] ZIP opens with standard tools and contains all 4+ files
- [ ] Screenshots are proper PNG files (not base64 strings)
- [ ] File naming uses session ID

---

## Phase 3 — Popup Export UI + Polish (~8V)

### D206: Export Buttons in SessionDetail — 2V

**What:** Wire the 4 export buttons in SessionDetail:
- "Download Report" → triggers `report-generator` → downloads JSON + MD files
- "Watch Replay" → triggers `replay-bundler` → opens replay.html in new tab
- "Export Playwright" → triggers `playwright-codegen` → downloads .spec.ts
- "Download ZIP" → triggers `zip-bundler` → downloads ZIP

**Download mechanism:** `chrome.downloads.download({ url: blobUrl, filename })` or `URL.createObjectURL` + programmatic anchor click.

**Acceptance:**
- [ ] Each button triggers correct generator
- [ ] Files download with correct filenames
- [ ] Replay opens in new tab (not download)
- [ ] Loading spinner during generation

---

### D207: Session Delete with Confirmation — 2V

**What:** Delete button on SessionList or SessionDetail → confirmation dialog → cascading delete via `db.deleteSession()`.

**Acceptance:**
- [ ] Confirm dialog prevents accidental deletion
- [ ] Delete removes session + all child data from IndexedDB
- [ ] Session list refreshes after delete

---

### D208: Keyboard Shortcuts — 2V

**What:** Add to `manifest.json`:
```json
"commands": {
  "toggle-recording": { "suggested_key": { "default": "Ctrl+Shift+R" }, "description": "Toggle recording" },
  "capture-screenshot": { "suggested_key": { "default": "Ctrl+Shift+S" }, "description": "Capture screenshot" },
  "open-bug-editor": { "suggested_key": { "default": "Ctrl+Shift+B" }, "description": "Open bug editor" }
}
```

Add listener in `src/background/shortcuts.ts`:
```typescript
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-recording': /* pause/resume or start */ break;
    case 'capture-screenshot': /* trigger screenshot */ break;
    case 'open-bug-editor': /* send message to content script */ break;
  }
});
```

**Acceptance:**
- [ ] Shortcuts work when focus is on target page (not just popup)
- [ ] Toggle recording: if recording → pause; if paused → resume; if idle → no-op
- [ ] Screenshot and bug editor only work during active session

---

### D209: Polish Pass — 2V

**What:** UX finishing touches across all popup views:
- Loading spinners during async operations (DB reads, export generation)
- Error messages when operations fail (toast or inline)
- Empty states ("No sessions yet", "No bugs in this session")
- Consistent styling with SynaptixLabs brand colors

**Acceptance:**
- [ ] No raw error messages visible to user
- [ ] No blank screens during loading
- [ ] Consistent visual language

---

## Phase 4 — Unit Tests (~6V for DEV)

### D210: Report Generator Tests — 2V

| Test file | Tests |
|---|---|
| `tests/unit/core/report-generator.test.ts` | JSON report schema validation, MD report contains expected sections, empty session handling, bug sorting by priority, timeline chronological order |

### D211: Playwright Codegen Tests — 3V

| Test file | Tests |
|---|---|
| `tests/unit/core/playwright-codegen.test.ts` | Click → `page.click()`, input → `page.fill()`, navigation → `page.goto()`, bug comments at correct positions, output is valid TypeScript (compile check), selector priority respected |

### D212: Replay Bundler Tests — 1V

| Test file | Tests |
|---|---|
| `tests/unit/core/replay-bundler.test.ts` | Output is valid HTML, contains rrweb-player script, contains session events JSON, contains metadata header |

---

## Definition of Done

```
✅ npm run build — succeeds
✅ npx vitest run — all tests pass (Sprint 00 + 01 + 02)
✅ npx tsc --noEmit — clean
✅ Report (JSON + MD) generated from session with bugs + screenshots
✅ Replay HTML opens in browser and plays back session
✅ Playwright .spec.ts compiles and runs against target app
✅ ZIP contains all 5 file types
✅ Session delete cascades cleanly
✅ Keyboard shortcuts functional
✅ No raw errors in UI — polished UX
✅ CHANGELOG.md written, version bumped to 1.0.0
```

---

## New Dependencies to Add at Sprint Start

```bash
npm install rrweb-player@^2.0.0-alpha.17 jszip@^3.10.1
npm install -D @types/jszip
```

CTO adds these to `package.json` before DEV starts.

---

*Last updated: 2026-02-21*

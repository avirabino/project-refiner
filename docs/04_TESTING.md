# SynaptixLabs Refine — Testing

Testing is part of the product. If it's not tested, it's not done.

---

## Testing Strategy

Refine is a Chrome Extension — testing requires a mix of standard unit tests and extension-specific E2E.

### Testing Pyramid

1. **Unit** — Business logic, transformers, utilities (Vitest)
2. **Integration** — Module interactions, storage layer (Vitest + Dexie mock)
3. **E2E** — Full extension flows (Playwright with extension loading)

---

## Coverage & Gates

| Module | Primary gate | Coverage target | Notes |
|---|---|---|---|
| Core | Unit + integration | ≥90% | Storage, codegen, report gen — pure logic |
| Shared | Unit | ≥90% | Types, utilities, constants |
| Background | Unit + integration | Meaningful | Service worker lifecycle, message routing |
| Content | Unit + E2E smoke | Meaningful | Shadow DOM + rrweb — E2E covers real behavior |
| Popup | Component tests + E2E | Meaningful | React components |

---

## Test Types

### Unit Tests (Vitest)

**Location:** `tests/unit/`
**Run:** `npx vitest run`
**Config:** `vitest.config.ts`

Focus areas:
- `core/storage` — Dexie operations with fake-indexeddb
- `core/codegen` — Playwright script generation from action logs
- `core/report` — Report generation (JSON + Markdown)
- `shared/` — Type guards, utilities, ID generation
- `content/action-tracker` — Event → action extraction logic

### Integration Tests (Vitest)

**Location:** `tests/integration/`
**Run:** `npx vitest run tests/integration/`

Focus areas:
- Storage layer (Dexie + fake-indexeddb end-to-end)
- Report generation from realistic session data
- Playwright codegen from realistic action sequences

### E2E Tests (Playwright)

**Location:** `tests/e2e/`
**Run:** `npx playwright test`
**Config:** `playwright.config.ts`

Refine uses Playwright for E2E extension testing via `chromium.launchPersistentContext()` with `--load-extension` args (supported since Playwright 1.37+). See ADR-008.

**Extension fixture pattern:**
```typescript
// tests/e2e/fixtures/extension.fixture.ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../../../dist');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});
export const expect = base.expect;
```

**Important notes:**
- Extensions require **headed mode** (`headless: false`) — this is a Chromium limitation
- CI needs `xvfb-run` (Linux) for headed Chromium
- Build extension (`npm run build`) before running E2E tests
- Extension ID may change between builds — fixture handles this dynamically

### Test Target App

**Location:** `tests/fixtures/target-app/`
**Run:** `npx serve tests/fixtures/target-app -l 38470`
**URL:** `http://localhost:38470`

A simple multi-page web app used as Refine's test subject. Contains forms, buttons, navigation, and `data-testid` attributes for selector testing.

---

## TDD Discipline

1. **Write tests first** (or simultaneously with implementation)
2. **Every bug fix gets a regression test** that would fail without the fix
3. **No "DONE" without green tests**
4. **E2E tests run against real extension** — no mocked Chrome APIs in E2E
5. **Tests are code** — reviewed, maintained, refactored same as production code

---

## Regression Policy

- Every bug fix MUST add a test that would fail before the fix
- Full suite runs before any merge (`/project:regression` command)
- No silent test deletions — removing a test requires CTO approval

---

## Test Commands

```bash
# All unit + integration tests
npx vitest run

# Watch mode (development)
npx vitest

# Single file
npx vitest run tests/unit/shared/utils.test.ts

# Coverage report
npx vitest run --coverage

# E2E tests (requires built extension + target app)
npx playwright test

# E2E with UI mode (debugging)
npx playwright test --ui

# E2E specific file
npx playwright test tests/e2e/extension-loads.spec.ts

# Full suite (unit + integration + E2E)
npm run test:all
```

---

## Definition of Done

```
FEATURE IS "DONE" ONLY WHEN:
  ✅ Unit tests pass (vitest)
  ✅ TypeScript compiles clean (tsc --noEmit)
  ✅ npm run build succeeds
  ✅ Extension loads in Chrome without console errors
  ✅ E2E smoke test passes (playwright)
  ✅ No regressions on full suite
  ✅ Avi sign-off
```

---

## Test Writing Patterns

### Unit test pattern (Vitest)
```typescript
import { describe, it, expect } from 'vitest';
import { generateSessionId } from '@shared/utils';

describe('generateSessionId', () => {
  it('produces format ats-YYYY-MM-DD-NNN', () => {
    const id = generateSessionId();
    expect(id).toMatch(/^ats-\d{4}-\d{2}-\d{2}-\d{3}$/);
  });

  it('generates unique IDs on consecutive calls', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
  });
});
```

### E2E test pattern (Playwright)
```typescript
import { test, expect } from './fixtures/extension.fixture';

test('extension popup shows Refine branding', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('text=Refine')).toBeVisible();
});

test('content script injects on target app', async ({ context }) => {
  const page = await context.newPage();
  const consoleMessages: string[] = [];
  page.on('console', msg => consoleMessages.push(msg.text()));
  await page.goto('http://localhost:38470');
  await page.waitForTimeout(1000);
  expect(consoleMessages.some(m => m.includes('Refine content script loaded'))).toBe(true);
});
```

---

## Playwright Extension E2E Patterns

> **Q007 — QA Team Reference.** Added Sprint 00.

### How to Run E2E Tests

```bash
# Build extension first (REQUIRED — E2E cannot run without dist/)
npm run build

# Run all E2E tests (headed, Chromium only)
npx playwright test

# Run a specific spec
npx playwright test tests/e2e/extension-loads.spec.ts

# Debug with UI mode
npx playwright test --ui

# Show HTML report after run
npx playwright show-report
```

> **CI:** Tests run via `xvfb-run npx playwright test` on Linux. The `playwright.config.ts` does NOT hardcode `headless: false` — the extension fixture handles this.

---

### Extension Fixture Pattern

All E2E spec files **must** import from `./fixtures/extension.fixture` — never from `@playwright/test` directly.

```typescript
// tests/e2e/fixtures/extension.fixture.ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../../../dist');
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Required — extensions don't load in headless mode
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    const extensionId = background.url().split('/')[2]; // Dynamically resolved
    await use(extensionId);
  },
});

export const expect = base.expect;
```

---

### How to Write a New E2E Test

1. Create `tests/e2e/<feature-name>.spec.ts`
2. Import `test` and `expect` from `./fixtures/extension.fixture`
3. Use the `context` fixture (not `page`) to open new pages
4. Use `extensionId` fixture to navigate to popup or extension pages

```typescript
import { test, expect } from './fixtures/extension.fixture';

test('my new E2E test', async ({ context, extensionId }) => {
  const page = await context.newPage();

  // Navigate to extension popup
  await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await expect(page.locator('[data-testid="my-element"]')).toBeVisible();

  // Navigate to target app
  await page.goto('http://localhost:38470');
  await expect(page.getByTestId('hero-cta')).toBeVisible();
});
```

---

### E2E Test Specs — Sprint 00

| Spec | File | What it verifies |
|---|---|---|
| Extension Loads | `tests/e2e/extension-loads.spec.ts` | Popup opens, shows "Refine" branding + version |
| Content Script Injects | `tests/e2e/content-script-injects.spec.ts` | `[Refine] Content script loaded` in console on target app |
| Target App Navigation | `tests/e2e/target-app-navigation.spec.ts` | Extension stays active across page navigations, no errors |

---

### Common Pitfalls

| Pitfall | Cause | Fix |
|---|---|---|
| `Error: Extension not found` | `dist/` missing or stale | Run `npm run build` before E2E |
| `headless` error | Extension rejected | `headless: false` is set in the fixture — never override |
| Extension ID mismatch | Hardcoded ID | Always use `extensionId` fixture — ID resolves dynamically from service worker |
| Tests hang on `waitForEvent('serviceworker')` | Extension didn't load | Verify `dist/manifest.json` exists and has `background.service_worker` |
| `webServer` not ready | Target app not running | `playwright.config.ts` starts it via `npm start` in `tests/fixtures/target-app/` |
| Tests run in parallel | Workers > 1 | `playwright.config.ts` enforces `workers: 1` and `fullyParallel: false` |

---

### QA Test Target App

**Location:** `tests/fixtures/target-app/`
**Port:** `38470`
**Start:** `npm start` (from that directory) — also auto-started by `playwright.config.ts` webServer

All interactive elements have `data-testid` attributes — use `page.getByTestId()` for selectors.

### Demo App (TaskPilot)

**Location:** `demos/refine-demo-app/`
**Port:** `39000`
**Start:** `npm run dev` (from that directory)

Used for manual acceptance testing by the Founder. Not wired into automated E2E.

---

---

## Sprint 01 E2E Patterns

> **QA Team Reference.** Added Sprint 01.

### Shadow DOM — Key Rule

The overlay (`ControlBar`, `BugEditor`) renders inside a Shadow DOM. Playwright **automatically pierces open shadow roots** — `getByTestId()` and `locator('[data-testid="..."]')` work without special syntax.

**DEV requirement:** Shadow root MUST be created with `mode: 'open'`. Closed shadow roots block Playwright and make E2E impossible.

```typescript
// This works transparently whether the element is in Shadow DOM or not:
await expect(page.getByTestId('refine-control-bar')).toBeVisible();
await page.getByTestId('btn-pause').click();
```

---

### Session Helper

All Sprint 01 specs share a `createSession` helper in `tests/e2e/helpers/session.ts`. Import instead of duplicating popup interactions.

```typescript
import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp } from './helpers/session';

test('my test', async ({ context, extensionId }) => {
  const { popupPage } = await createSession(context, extensionId, 'My Session');
  const page = await openTargetApp(context, '/form.html'); // optional path
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });
});
```

---

### data-testid Contract — Sprint 01

DEV **must** implement these `data-testid` attributes exactly. QA specs depend on them.

#### Popup

| `data-testid` | Element | Notes |
|---|---|---|
| `btn-new-session` | Button | Opens NewSession form from SessionList |
| `input-session-name` | Text input | Session name field in NewSession form |
| `btn-start-recording` | Button | Submits NewSession form, sends START_SESSION |
| `recording-status` | Any | Shows current session status text (e.g., "RECORDING") |
| `session-list-item` | Repeated | One per session in SessionList |
| `session-status` | Any | Status text in session detail view |
| `session-duration` | Any | Duration in session detail (non-empty after COMPLETED) |
| `session-bug-count` | Any | Number of bugs logged (integer as text) |
| `session-screenshot-count` | Any | Number of screenshots captured (integer as text) |

#### Control Bar (Shadow DOM)

| `data-testid` | Element | Notes |
|---|---|---|
| `refine-control-bar` | Root container | Entire floating bar |
| `recording-indicator` | Any | Status label — text: "RECORDING", "PAUSED" |
| `btn-pause` | Button | Visible when RECORDING |
| `btn-resume` | Button | Visible when PAUSED; hidden when RECORDING |
| `btn-stop` | Button | Always visible during active session |
| `btn-screenshot` | Button | Triggers screenshot capture |
| `btn-bug` | Button | Opens BugEditor |

#### Bug Editor (Shadow DOM)

| `data-testid` | Element | Notes |
|---|---|---|
| `refine-bug-editor` | Root container | Entire inline bug form |
| `bug-editor-url` | Input or span | Pre-filled with current page URL |
| `bug-editor-title` | Text input | Bug title — required |
| `bug-editor-description` | Textarea | Bug description — optional |
| `btn-save-bug` | Button | Saves bug and closes editor |
| `btn-cancel-bug` | Button | Closes editor without saving |

---

### E2E Test Specs — Sprint 01

| Spec | File | What it verifies |
|---|---|---|
| Session Create | `tests/e2e/session-create.spec.ts` | Popup form → RECORDING → control bar appears |
| Control Bar | `tests/e2e/control-bar.spec.ts` | Pause/Resume/Stop + survives page navigation |
| Screenshot | `tests/e2e/screenshot-capture.spec.ts` | Screenshot button → persisted to session |
| Bug Editor | `tests/e2e/bug-editor.spec.ts` | Opens with pre-filled URL, saves bug, cancel works |
| Session Lifecycle | `tests/e2e/session-lifecycle.spec.ts` | Full flow: create → navigate → bug → screenshot → COMPLETED |

All specs are **contract-first** — written before DEV delivery. They will pass once DEV completes Phase 1–4.

---

### QA Target App — Sprint 01 Additions (Q100)

Added to `tests/fixtures/target-app/` for rrweb recording coverage:

| Page | Element | `data-testid` | Purpose |
|---|---|---|---|
| `form.html` | Textarea | `input-description` | Multiline input recording |
| `form.html` | Date input | `input-date` | Date picker interaction |
| `index.html` | Delayed div (2s) | `delayed-content` | Dynamic DOM mutation recording |
| `index.html` | Toggle button | `toggle-section` | `aria-expanded` state change |
| `index.html` | Toggle body | `toggle-body` | Hidden→visible state transition |

---

---

## Sprint 02 E2E Patterns

> **QA Team Reference.** Added Sprint 02.

### File Download Testing Pattern

Export buttons (Report, Playwright spec, ZIP) trigger file downloads from the popup page. Use `page.waitForEvent('download')` via the `waitForDownload()` helper:

```typescript
import { waitForDownload } from './helpers/session';

const download = await waitForDownload(detail, () =>
  detail.getByTestId('btn-download-report').click()
);
const filename = download.suggestedFilename();  // e.g. 'report.json'
const path = await download.path();             // temp file path for content inspection
```

`download.path()` returns a temp file path you can read with `fs.readFileSync`. For JSON reports, parse and assert structure. For ZIP files, use `jszip` (Sprint 02 dependency).

---

### New Tab Capture Pattern (Replay Viewer)

`Watch Replay` opens a new tab. Capture it with `context.waitForEvent('page')`:

```typescript
const [replayPage] = await Promise.all([
  context.waitForEvent('page'),
  detail.getByTestId('btn-watch-replay').click(),
]);
await replayPage.waitForLoadState('domcontentloaded');
```

---

### stopAndOpenDetail Helper

All Sprint 02 specs use this helper to stop recording and navigate to SessionDetail:

```typescript
import { stopAndOpenDetail } from './helpers/session';

// After recording interactions on targetPage:
const detail = await stopAndOpenDetail(targetPage, popupPage, context, extensionId);
// detail is now showing session-detail-container
await detail.getByTestId('btn-download-report').click();
```

---

### Keyboard Shortcut Limitation

`chrome.commands` shortcuts are processed by Chrome's native keyboard handling. Playwright's `page.keyboard.press()` DOES reach Chrome commands in headful mode, but:
- Reliability varies by OS and Chrome version
- In headless mode or restricted CI environments, shortcuts may not fire

If Q206 fails in CI: mark as manual-only and document the binding in `manifest.json`. Automated coverage of the shortcut *effect* is provided by unit tests in `message-handler.test.ts`.

---

### data-testid Contract — Sprint 02

DEV must implement these exactly. Full context in `docs/sprints/sprint_02/todo/sprint_02_team_qa_todo.md`.

#### SessionDetail Page

| `data-testid` | Element | Notes |
|---|---|---|
| `session-detail-container` | Root container | Visible after clicking session-list-item |
| `btn-back` | Button | Returns to SessionList |
| `btn-download-report` | Button | JSON + MD report download |
| `btn-watch-replay` | Button | Opens replay in new tab |
| `btn-export-playwright` | Button | Downloads `.spec.ts` |
| `btn-download-zip` | Button | Downloads ZIP bundle |
| `btn-delete-session` | Button | Opens delete confirmation |
| `confirm-delete` | Button | Confirms delete action |

---

### E2E Test Specs — Sprint 02

| Spec | File | Tests | Key pattern |
|---|---|---|---|
| Report Export | `tests/e2e/report-export.spec.ts` | 2 | `waitForDownload`, JSON schema assert |
| Replay Viewer | `tests/e2e/replay-viewer.spec.ts` | 1 | `context.waitForEvent('page')` |
| Playwright Export | `tests/e2e/playwright-export.spec.ts` | 2 | `waitForDownload`, content assertions, tsc check |
| ZIP Export | `tests/e2e/zip-export.spec.ts` | 3 | `waitForDownload`, JSZip inspection |
| Session Delete | `tests/e2e/session-delete.spec.ts` | 3 | Confirm dialog, list update, IndexedDB orphan check |
| Keyboard Shortcuts | `tests/e2e/keyboard-shortcuts.spec.ts` | 4 | `page.keyboard.press()`, effect verification |

All specs are **contract-first** — written before DEV delivery. Will pass once DEV completes D203–D209.

---

### Known E2E Limitations (Sprint 02)

| Limitation | Impact | Mitigation |
|---|---|---|
| `captureVisibleTab` fails in Playwright headful | Screenshots are 1×1 PNGs | Test count increments, not content quality |
| `chrome.commands` may not fire from synthetic keys | Q206 keyboard tests may be flaky in CI | Manual testing for binding; unit tests for handler logic |
| Download content inspection requires temp file access | Need `await download.path()` | Already handled in all download specs |
| `jszip` not yet installed | Q204 ZIP content inspection skipped until installed | Fallback to size check; install with `npm install jszip@^3.10.1` |

---

*Last updated: 2026-02-22*

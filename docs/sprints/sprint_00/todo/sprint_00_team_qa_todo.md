# sprint_00 — Team QA Todo: E2E Infrastructure

**Owner:** `[QA]`
**Scope:** Playwright E2E setup, extension test fixture, QA test target app, E2E smoke tests

> **Ownership rule:** DEV writes unit + integration tests (Vitest). QA writes E2E tests (Playwright).

## Sprint goals (QA)

- Set up Playwright for Chrome Extension E2E testing
- Create the extension test fixture (persistent context + extension loading)
- Create the QA test target app (automated E2E regression target)
- Write first E2E tests: extension loads, content script injects
- Document E2E patterns in `docs/04_TESTING.md`

## Tasks

| ID | Task | Acceptance criteria | Files | Status |
|---|---|---|---|---|
| Q001 | Create `playwright.config.ts` | Chromium only. Extension loading via `launchPersistentContext`. `dist/` as extension path. Screenshot on failure. Reporter: html. `webServer` for target app on port 38470 | `playwright.config.ts` | Done |
| Q002 | Create E2E extension fixture | Playwright fixture: build extension, launch persistent context with extension loaded, expose `extensionId` and `context` | `tests/e2e/fixtures/extension.fixture.ts` | Done |
| Q003 | Create QA test target app | Simple static HTML/JS app: nav links, forms, buttons with `data-testid`, list view. Serve on `localhost:38470` | `tests/fixtures/target-app/*` | Done |
| Q004 | E2E: Extension loads | Build → launch Chromium with extension → popup opens → contains "Refine" text | `tests/e2e/extension-loads.spec.ts` | Done |
| Q005 | E2E: Content script injects | Navigate to target app → verify console message from content script | `tests/e2e/content-script-injects.spec.ts` | Done |
| Q006 | E2E: Navigate target app | Navigate between pages on target app → verify extension stays loaded across navigations | `tests/e2e/target-app-navigation.spec.ts` | Done |
| Q007 | Document E2E patterns | Add Playwright extension testing patterns + examples to `docs/04_TESTING.md` | `docs/04_TESTING.md` | Done |

## QA Test Target App Specification

The QA test target is a **minimal multi-page static app** for automated E2E regression. It lives in `tests/fixtures/target-app/` and is NOT the demo app Avi uses for manual acceptance testing (see `demos/` folder).

```
tests/fixtures/target-app/
├── package.json          # { "scripts": { "start": "npx serve -l 38470" } }
├── index.html            # Home page with nav links
├── about.html            # About page (test navigation recording)
├── form.html             # Form page (test input recording)
├── app.js                # Minimal JS: click handlers, form validation
└── styles.css            # Basic styling
```

**Required elements (with `data-testid`):**

| Page | Element | data-testid | Purpose |
|---|---|---|---|
| index.html | Nav link → About | `nav-about` | Navigation recording |
| index.html | Nav link → Form | `nav-form` | Navigation recording |
| index.html | Hero button | `hero-cta` | Click recording |
| index.html | Item list (3+ items) | `item-list` | Scroll + list interaction |
| form.html | Text input (Name) | `input-name` | Input recording |
| form.html | Email input | `input-email` | Input recording |
| form.html | Password input | `input-password` | Password masking test |
| form.html | Select dropdown | `select-role` | Select interaction |
| form.html | Submit button | `btn-submit` | Form submission |
| form.html | Success message | `msg-success` | Assertion target |
| about.html | Back link | `nav-home` | Navigation back |

## Playwright Extension Testing Pattern

```typescript
// tests/e2e/fixtures/extension.fixture.ts
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
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

## Task: Demo App for Manual Acceptance Testing

| ID | Task | Acceptance criteria | Files | Status |
|---|---|---|---|---|
| Q008 | Create Refine Demo App | Rich multi-page app for Avi's manual testing. Runs on `localhost:39000`. Covers all interaction types Refine will record. See spec below. | `demos/refine-demo-app/*` | Done |

### Demo App Specification

The demo app is a **realistic mini-SaaS** that exercises every interaction type Refine needs to record. Unlike the QA test target (minimal stub for automated regression), this is a polished, real-feeling app Avi can use for product acceptance.

**Name:** "TaskPilot" — a fictional task management SaaS

```
demos/refine-demo-app/
├── package.json              # Vite + React (port 39000)
├── index.html                # App shell
├── src/
│   ├── main.tsx              # React mount
│   ├── App.tsx               # Router: Dashboard, Tasks, Settings, Login
│   ├── pages/
│   │   ├── Login.tsx         # Login form (email + password + remember me)
│   │   ├── Dashboard.tsx     # Summary cards, charts placeholder, quick actions
│   │   ├── TaskList.tsx      # Sortable/filterable task table with CRUD
│   │   ├── TaskDetail.tsx    # Single task: edit title, description, status dropdown, assignee, due date
│   │   ├── Settings.tsx      # Profile form, notification toggles, theme switch
│   │   └── NotFound.tsx      # 404 page (test unexpected navigation)
│   ├── components/
│   │   ├── Navbar.tsx        # Top nav with links + user menu
│   │   ├── Sidebar.tsx       # Side navigation (collapsible)
│   │   ├── Modal.tsx         # Generic modal (for "New Task", "Confirm Delete")
│   │   ├── Toast.tsx         # Success/error notifications
│   │   └── DataTable.tsx     # Reusable table with sort + filter
│   ├── data/
│   │   └── mockTasks.ts      # 15-20 seed tasks with realistic content
│   └── styles/
│       └── globals.css       # Tailwind + custom styles
├── tailwind.config.ts
├── vite.config.ts            # port: 39000
└── tsconfig.json
```

**Interaction coverage (what Avi will test Refine against):**

| Category | Interactions in Demo App | Refine Feature Tested |
|---|---|---|
| **Navigation** | SPA routing (6 pages), sidebar links, breadcrumbs, back button | URL change recording, navigation tracking |
| **Forms** | Login (email/password), task create/edit (text, textarea, select, date picker, checkbox), settings (toggles, radio) | Input recording, form field capture |
| **Click targets** | Buttons (primary, secondary, danger), links, icon buttons, dropdown triggers, table row clicks | Click recording, selector generation |
| **Modals/Overlays** | New Task modal, Delete confirmation dialog, Toast notifications | Overlay interaction recording |
| **Lists/Tables** | Task list with sort/filter, pagination, row selection, bulk actions | Scroll recording, list interaction |
| **State changes** | Task status transitions (Todo→In Progress→Done), theme toggle (light/dark), sidebar collapse | State-dependent UI recording |
| **Edge cases** | 404 page, empty states ("no tasks found"), loading skeletons, error states | Error handling, graceful recording |
| **Keyboard** | Tab navigation through forms, Enter to submit, Escape to close modal | Keyboard event recording |

**Why this matters:** This gives Avi a realistic, hands-on environment to validate that Refine properly records real-world user interactions, not just synthetic test clicks.

**Port:** `localhost:39000` (separate from QA target on 38470 and Papyrus on 338470)

---

## Definition of Done (QA)

- `npx playwright test` — all E2E tests pass (headed mode)
- QA test target app runs on `localhost:38470`
- Demo app runs on `localhost:39000` with all pages functional
- Extension fixture successfully loads extension in Chromium
- Every E2E test has clear assertions (not just "doesn't crash")
- E2E patterns documented in `docs/04_TESTING.md`
- Avi can load Refine extension → open demo app → see content script inject

## Dependencies on DEV

QA cannot start until DEV delivers:
- `npm run build` producing a working `dist/` folder (D018)
- Extension that loads in Chrome with popup + content script (D011-D014)

**Recommended workflow:** DEV delivers Phase 1-2 first → QA starts in parallel once `dist/` exists.

## Risks / blockers

- Playwright extension testing requires **headed mode** (`headless: false`) — CI needs `xvfb-run` on Linux
- CRXJS hot reload may change extension ID between builds — fixture handles this dynamically
- Target app must be running before E2E tests — use `webServer` in `playwright.config.ts`

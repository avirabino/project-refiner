# 🧪 TEAM QA — Sprint 00 Kick-Off Message

**Copy-paste this into your Windsurf / Claude Code session to start QA work.**

---

## PROJECT CONTEXT

You are `[QA]` on **SynaptixLabs Refine** — a Chrome Extension (Manifest V3) that records manual acceptance testing sessions on any web app. Think of it as a "session recorder for product owners" — you click around a web app doing acceptance testing, and Refine captures everything: DOM state (via rrweb), user actions, screenshots, bugs, and exports it all as Playwright regression tests + visual replays.

**Repo:** `C:\Synaptix-Labs\projects\project-refiner`
**Product name:** Refine (SynaptixLabs Refine)

### Tech stack (relevant to you)
- **E2E testing:** Playwright (Chromium only, headed mode — extensions can't run headless)
- **Extension loading:** `chromium.launchPersistentContext()` with `--load-extension` args
- **Target apps:** Static HTML (QA target) + Vite React (Demo app)
- **Node:** >=20.0.0

### What's already done (CPTO pre-work)
- All config files, CI pipeline, project structure
- The extension code is being built by Team DEV in parallel (you need their `dist/` output for E2E work)

---

## YOUR MISSION (Sprint 00)

Set up the **complete E2E testing infrastructure** for a Chrome Extension, build **two test target apps**, and write the **first E2E smoke tests**. You own everything under `tests/e2e/`, `tests/fixtures/`, and `demos/`.

---

## WORK ORDER (what to do and when)

### 🟢 START IMMEDIATELY — No DEV dependency

These two apps don't depend on the extension being built. Start here.

#### Q003: QA Test Target App (`tests/fixtures/target-app/`)

A **minimal multi-page static HTML app** used for automated E2E regression testing. This is NOT the demo app — it's a lightweight test stub with predictable, machine-verifiable behavior.

**Serves on:** `http://localhost:38470`
**Tech:** Plain HTML + vanilla JS + basic CSS (no framework, no bundler). Use `npx serve` to run.

```
tests/fixtures/target-app/
├── package.json          # { "scripts": { "start": "npx serve -l 38470" } }
├── index.html            # Home page with nav links
├── about.html            # About page (tests navigation recording)
├── form.html             # Form page (tests input recording)
├── app.js                # Minimal JS: click handlers, form validation, nav highlights
└── styles.css            # Basic clean styling
```

**Required elements — every interactive element MUST have a `data-testid` attribute:**

| Page | Element | `data-testid` | Purpose |
|---|---|---|---|
| index.html | Nav link → About | `nav-about` | Navigation recording |
| index.html | Nav link → Form | `nav-form` | Navigation recording |
| index.html | Hero button (CTA) | `hero-cta` | Click recording |
| index.html | Item list (3+ clickable items) | `item-list` | Scroll + list interaction |
| form.html | Text input (Name) | `input-name` | Input recording |
| form.html | Email input | `input-email` | Input recording |
| form.html | Password input | `input-password` | Password masking verification |
| form.html | Select dropdown (Role) | `select-role` | Select interaction |
| form.html | Checkbox (Terms) | `checkbox-terms` | Checkbox interaction |
| form.html | Submit button | `btn-submit` | Form submission |
| form.html | Success message (hidden → visible) | `msg-success` | Assertion target |
| about.html | Back link → Home | `nav-home` | Navigation back |

**Acceptance criteria:**
- `npx serve tests/fixtures/target-app -l 38470` serves the app
- All 3 pages load and navigate correctly
- Form submission shows success message (client-side validation, no server)
- Every interactive element has a `data-testid`
- Clean, minimal design (this gets screenshotted in test reports)

---

#### Q008: Demo App — "TaskPilot" (`demos/refine-demo-app/`)

A **realistic mini-SaaS application** that the FOUNDER (Avi) uses for manual acceptance testing. Unlike the QA target (minimal stub), this should feel like a real product — polished, multi-page, with realistic data and interactions.

**Serves on:** `http://localhost:39000`
**Tech:** Vite + React 18 + Tailwind CSS (same stack as Refine's popup — consistent tooling)

**App concept:** "TaskPilot" — a fictional task management SaaS

```
demos/refine-demo-app/
├── package.json              # Vite + React (port 39000)
├── index.html                # App shell
├── src/
│   ├── main.tsx              # React 18 createRoot
│   ├── App.tsx               # React Router: Dashboard, Tasks, Settings, Login
│   ├── pages/
│   │   ├── Login.tsx         # Login form (email + password + remember me checkbox)
│   │   ├── Dashboard.tsx     # Summary cards, quick action buttons, welcome message
│   │   ├── TaskList.tsx      # Sortable/filterable task table with inline status changes
│   │   ├── TaskDetail.tsx    # Single task view: edit title, description, status dropdown, assignee, due date
│   │   ├── Settings.tsx      # Profile form, notification toggles, theme switch (light/dark)
│   │   └── NotFound.tsx      # 404 page (tests unexpected navigation handling)
│   ├── components/
│   │   ├── Navbar.tsx        # Top nav with links + user avatar menu
│   │   ├── Sidebar.tsx       # Collapsible side navigation
│   │   ├── Modal.tsx         # Generic modal (for "New Task", "Confirm Delete")
│   │   ├── Toast.tsx         # Success/error toast notifications
│   │   └── DataTable.tsx     # Reusable table with sort headers + filter input
│   ├── data/
│   │   └── mockTasks.ts      # 15-20 seed tasks with realistic titles, descriptions, statuses, assignees, dates
│   └── styles/
│       └── globals.css       # Tailwind base + any custom styles
├── tailwind.config.ts
├── vite.config.ts            # port: 39000
└── tsconfig.json
```

**Interaction types this app MUST exercise (because Refine will record all of these):**

| Category | What to include | Why |
|---|---|---|
| **Navigation** | 6 pages via React Router, sidebar links, breadcrumbs, browser back | Tests URL change recording |
| **Forms** | Login (email/password), task create/edit (text, textarea, select, date, checkbox), settings (toggles, radio buttons) | Tests input recording + form field capture |
| **Clicks** | Primary/secondary/danger buttons, icon buttons, dropdown triggers, table row clicks, nav links | Tests click recording + selector generation |
| **Modals** | "New Task" creation modal, "Confirm Delete" dialog | Tests overlay interaction recording |
| **Tables** | Task list with column sort, text filter, row selection | Tests scroll recording + list interaction |
| **State changes** | Task status (Todo → In Progress → Done), theme toggle (light ↔ dark), sidebar collapse/expand | Tests state-dependent UI recording |
| **Toasts** | Success on task create, error on form validation fail | Tests transient UI recording |
| **Keyboard** | Tab through forms, Enter to submit, Escape to close modals | Tests keyboard event recording |
| **Edge cases** | 404 page (navigate to `/nonexistent`), empty state ("No tasks match filter"), loading skeleton (simulate 500ms delay) | Tests error/edge-case recording |

**Mock data (`mockTasks.ts`):**
- 15-20 tasks with varied statuses (5 Todo, 7 In Progress, 5 Done, 3 Archived)
- Realistic titles: "Implement user authentication", "Fix dashboard chart alignment", "Write API documentation", etc.
- Diverse assignees: 4-5 fictional team members
- Date range: due dates from last week to 3 weeks from now
- Some tasks with long descriptions, some with short

**Login behavior:**
- Any email + password works (no real auth)
- "Remember me" checkbox persists to localStorage
- After login → redirect to Dashboard
- Unauthenticated routes → redirect to Login

**Theme toggle:**
- Light mode: white background, dark text
- Dark mode: dark background, light text
- Persists to localStorage

**Acceptance criteria:**
- `cd demos/refine-demo-app && npm install && npm run dev` → runs on port 39000
- All 6 pages accessible and functional
- Login works with any credentials
- Can create, edit, and delete tasks (in-memory, no persistence needed beyond session)
- Sort and filter work on task list
- Modals open and close correctly
- Theme toggle works and persists
- Sidebar collapses and expands
- Keyboard navigation works (Tab, Enter, Escape)
- Looks like a real SaaS product — not a test stub
- Responsive enough to not break at common widths (1280px, 1440px, 1920px)

---

### ⏳ START AFTER DEV DELIVERS `dist/` — Extension E2E Work

Team DEV will signal when `npm run build` produces a working `dist/` folder. Once you have that:

#### Q001: Playwright Config (`playwright.config.ts`)

```typescript
// Key settings:
// - Chromium only (no Firefox/WebKit — extension testing limitation)
// - headless: false (extensions require headed mode)
// - webServer: start QA target app on port 38470
// - screenshot: 'only-on-failure'
// - reporter: ['html', 'list']
// - testDir: 'tests/e2e'
```

Place at project root: `C:\Synaptix-Labs\projects\project-refiner\playwright.config.ts`

#### Q002: Extension Test Fixture (`tests/e2e/fixtures/extension.fixture.ts`)

The core fixture that loads the extension into Chromium:

```typescript
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

#### Q004: E2E — Extension Loads (`tests/e2e/extension-loads.spec.ts`)
- Build extension → launch Chromium with extension loaded
- Navigate to `chrome-extension://${extensionId}/src/popup/popup.html`
- Assert popup contains text "Refine"
- Assert popup contains version "0.1.0"

#### Q005: E2E — Content Script Injects (`tests/e2e/content-script-injects.spec.ts`)
- Navigate to `http://localhost:38470` (QA target app)
- Listen for console messages
- Assert console contains `"[Refine] Content script loaded"`

#### Q006: E2E — Target App Navigation (`tests/e2e/target-app-navigation.spec.ts`)
- Navigate to QA target app home → about → form → home
- Assert extension stays loaded across all navigations (content script logs on each page)
- Assert no extension errors in console

#### Q007: Document E2E Patterns (`docs/04_TESTING.md`)
- Add a section to the existing `docs/04_TESTING.md` describing:
  - How to run E2E tests
  - The extension fixture pattern
  - How to write new E2E tests
  - Common pitfalls (headed mode, extension ID changes, build requirement)

---

## CRITICAL RULES

1. **Read before writing.** Before creating any file, read:
   - `AGENTS.md` (root — Tier 1, project-wide rules)
   - `docs/04_TESTING.md` (existing testing strategy — you're extending this, not replacing it)
   - `docs/sprints/sprint_00/todo/sprint_00_team_qa_todo.md` (your full task list with specs)

2. **Do NOT modify config files.** `package.json`, `tsconfig.json`, `vite.config.ts`, `manifest.json` are owned by CTO. Exception: you create `playwright.config.ts` (that's yours).

3. **Do NOT touch `src/` code.** You own `tests/`, `demos/`, `playwright.config.ts`, and updating `docs/04_TESTING.md`. Source code is DEV's domain.

4. **Port map — DO NOT USE other ports:**
   - `38470` = QA target app
   - `39000` = Demo app (TaskPilot)
   - `5173` = Vite HMR (DEV's, don't touch)
   - `338470` = Papyrus (separate project, avoid)

5. **`data-testid` on EVERYTHING interactive** in the QA target app. This is how Refine's selector engine will prioritize selectors — `data-testid` > `aria-label` > `id` > CSS.

6. **E2E tests must use the fixture**, not raw Playwright. Import from `./fixtures/extension.fixture` — never from `@playwright/test` directly in spec files.

7. **Extension E2E requires headed mode.** `headless: false` is NOT optional. Chromium won't load extensions in headless mode.

8. **Build before E2E.** The `dist/` folder must exist and be current. Add a check or document this clearly.

---

## ARCHITECTURE REFERENCE

| Doc | Path | What it covers |
|---|---|---|
| Testing | `docs/04_TESTING.md` | Existing testing strategy you're extending |
| Architecture | `docs/01_ARCHITECTURE.md` | Module tree, entry points, data flows |
| Your todo | `docs/sprints/sprint_00/todo/sprint_00_team_qa_todo.md` | Full task list with detailed specs |
| Sprint index | `docs/sprints/sprint_00/sprint_00_index.md` | Overall sprint deliverables + checklist |

---

## DEFINITION OF DONE

All of these must be true before you report "done":

```
✅ QA target app runs on localhost:38470 — all 3 pages functional
✅ Every interactive element in target app has data-testid
✅ Demo app (TaskPilot) runs on localhost:39000 — all 6 pages functional
✅ Demo app login works, tasks CRUD works, theme toggle works
✅ Demo app looks like a real SaaS product (not a test stub)
✅ playwright.config.ts created with correct extension testing setup
✅ Extension fixture loads Refine extension into Chromium
✅ npx playwright test — all 3 E2E specs pass (headed mode)
✅ E2E tests have meaningful assertions (not just "doesn't crash")
✅ docs/04_TESTING.md updated with Playwright extension patterns
✅ Avi can: load extension → open demo app → see content script inject in console
```

---

## KNOWN RISKS

1. **Playwright headed mode in CI:** Extension testing requires `headless: false`. CI pipeline uses `xvfb-run` on Linux to handle this. Your `playwright.config.ts` should NOT hardcode headless — let the CI workflow handle it.

2. **Extension ID changes between builds:** CRXJS may generate a different extension ID each build. Your fixture handles this dynamically via `context.serviceWorkers()` — don't hardcode any IDs.

3. **Build dependency:** E2E tests CANNOT run without a fresh `dist/` folder. Add `webServer` or a prebuild check to your Playwright config, or document clearly that `npm run build` must run first.

4. **CRXJS popup path:** The popup HTML path in the built extension may differ from the source path. The fixture should use the actual built path. If the popup test fails, try `chrome-extension://${extensionId}/src/popup/popup.html` first — CRXJS preserves src paths.

5. **Demo app state:** TaskPilot stores state in React state (in-memory). Page refresh resets everything. That's fine — Refine records the session, not the app state.

---

## WHEN YOU'RE DONE

1. Update your todo file statuses: `docs/sprints/sprint_00/todo/sprint_00_team_qa_todo.md`
2. Write your sprint report: `docs/sprints/sprint_00/reports/sprint_00_team_qa_report.md`
3. Verify the full pipeline: `npm run build && npx playwright test`

---

**Questions? Ask before building. It's cheaper to clarify than to rebuild.**

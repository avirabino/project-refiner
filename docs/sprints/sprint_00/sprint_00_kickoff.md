# Sprint 00 — Team Kick-Off

**Date:** 2026-02-20
**Sprint window:** 2026-02-20 → 2026-02-22
**Issued by:** CPTO (on behalf of FOUNDER)

---

## 🟢 Sprint is GO

ADR-008 (Playwright for E2E) is **approved**. Phase 1 config files are **delivered**. Both teams can begin immediately.

---

## What's already done (CPTO / CTO pre-work)

| Item | File | Status |
|---|---|---|
| `package.json` (all deps + scripts) | `package.json` | ☑ |
| `tsconfig.json` (strict, path aliases) | `tsconfig.json` | ☑ |
| `vite.config.ts` (CRXJS + React + aliases) | `vite.config.ts` | ☑ |
| `manifest.json` (MV3, minimal perms) | `manifest.json` | ☑ |
| `tailwind.config.ts` + `postcss.config.js` | root | ☑ |
| `.eslintrc.cjs` + `.prettierrc` | root | ☑ |
| CI workflow (Chrome Extension) | `.github/workflows/ci.yml` | ☑ |
| ADR-008 approved | `docs/0l_DECISIONS.md` | ☑ |
| All docs renamed ATR → Refine | `docs/*` | ☑ |
| Directory structure created | `src/`, `tests/`, `demos/` | ☑ |

---

## 🔧 Team DEV — Kick-Off Brief

**Full todo:** [`todo/sprint_00_team_dev_scaffold_todo.md`](todo/sprint_00_team_dev_scaffold_todo.md)

### Your mission
Build the hello-world Chrome Extension that compiles, loads, and passes unit tests.

### Phase 2: Source Entry Points (start NOW)

Your first `npm install` step:
```bash
cd C:\Synaptix-Labs\projects\project-refiner
npm install
```

Then build these files in order:

| Priority | Task ID | What to create | Key detail |
|---|---|---|---|
| 1 | D007 | `src/shared/types.ts` | Session, Bug, Feature, Action, MessageType enums — stubs with JSDoc |
| 2 | D008 | `src/shared/constants.ts` | SESSION_ID_FORMAT (`ats-YYYY-MM-DD-NNN`), SELECTOR_PRIORITIES, LIMITS |
| 3 | D009 | `src/shared/messages.ts` | Type-safe `sendMessage` helpers for popup↔background↔content |
| 4 | D010 | `src/shared/utils.ts` | `generateSessionId()`, `formatTimestamp()`, `generateBugId()` |
| 4b | D010b | `src/shared/index.ts` | Barrel export — re-exports all shared types, constants, messages, utils |
| 5 | D011 | `src/background/service-worker.ts` | Listen for messages, log, respond with ack. Keep-alive placeholder |
| 6 | D012 | `src/content/content-script.ts` | Inject into page, log "Refine content script loaded" + URL |
| 7 | D013 | `src/popup/popup.html` | HTML shell, React mount point, Tailwind CSS import |
| 8 | D014 | `src/popup/index.tsx` + `App.tsx` | React 18 createRoot. Render "SynaptixLabs Refine" + version + "No sessions yet" |

### Phase 3: Unit Tests (after Phase 2)

| Task ID | What to create | Key detail |
|---|---|---|
| D015 | `vitest.config.ts` | Aliases match tsconfig. Environment: jsdom. Coverage: v8 |
| D016 | `tests/unit/shared/constants.test.ts` | Verify regex, priorities order, all exports |
| D017 | `tests/unit/shared/utils.test.ts` | generateSessionId format, formatTimestamp output, generateBugId uniqueness |

### Phase 4: Verify

| Task ID | Gate |
|---|---|
| D018 | `npm run build` → load unpacked in Chrome → popup shows → content script injects → SW runs |
| D019 | `npx vitest run` → green. Coverage ≥ 80% for `src/shared/` |

### DEV Definition of Done
- [ ] `npm run build` succeeds
- [ ] Extension loads in Chrome without errors
- [ ] Popup shows "SynaptixLabs Refine" branding
- [ ] Content script logs on page load
- [ ] Service worker responds to test message
- [ ] `npx vitest run` — all green
- [ ] `npx tsc --noEmit` — clean
- [ ] `npx eslint src/` — clean
- [ ] Coverage ≥ 80% for `src/shared/`

### ⚠️ Known risks
- **CRXJS + Vite 5**: We pinned Vite to `^5.4.11`. If CRXJS throws, try `@crxjs/vite-plugin@2.0.0-beta.28` specifically
- **rrweb**: Don't import rrweb yet in Sprint 00 entry points — just install it. Actual injection comes Sprint 01
- **Icons**: `manifest.json` references `icons/icon-*.png` — these don't exist yet. Chrome will show a default icon. Fine for Sprint 00

---

## 🧪 Team QA — Kick-Off Brief

**Full todo:** [`todo/sprint_00_team_qa_todo.md`](todo/sprint_00_team_qa_todo.md)

### Your mission
Set up Playwright E2E testing for Chrome Extensions, build both test target apps, write first E2E smoke tests.

### ⏳ Dependency: Wait for DEV D018
QA **cannot start E2E work** until DEV produces a working `dist/` folder. You CAN start building the target apps and demo app in parallel.

### Recommended work order

**Start immediately (no DEV dependency):**

| Priority | Task ID | What to create | Key detail |
|---|---|---|---|
| 1 | Q003 | `tests/fixtures/target-app/` | Minimal multi-page static app. Port 38470. Must have `data-testid` on every interactive element. See QA todo for full element spec |
| 2 | Q008 | `demos/refine-demo-app/` | "TaskPilot" — React SaaS demo. Port 39000. Login, Dashboard, TaskList, TaskDetail, Settings, 404. See QA todo for full spec |

**Start after DEV delivers `dist/` (D018):**

| Priority | Task ID | What to create | Key detail |
|---|---|---|---|
| 3 | Q001 | `playwright.config.ts` | Chromium only. `webServer` for target app on 38470. Screenshot on failure |
| 4 | Q002 | `tests/e2e/fixtures/extension.fixture.ts` | `launchPersistentContext` with `--load-extension=dist/`. Expose `extensionId` |
| 5 | Q004 | `tests/e2e/extension-loads.spec.ts` | Build → load → popup opens → "Refine" visible |
| 6 | Q005 | `tests/e2e/content-script-injects.spec.ts` | Navigate to target app → console message visible |
| 7 | Q006 | `tests/e2e/target-app-navigation.spec.ts` | Multi-page nav → extension stays loaded |
| 8 | Q007 | Update `docs/04_TESTING.md` | Add Playwright extension patterns |

### QA Definition of Done
- [ ] `npx playwright test` — all E2E pass (headed mode)
- [ ] QA target app runs on `localhost:38470`
- [ ] Demo app runs on `localhost:39000` with all pages functional
- [ ] Extension fixture loads extension successfully
- [ ] Every test has meaningful assertions
- [ ] E2E patterns documented in `docs/04_TESTING.md`
- [ ] Avi can: load extension → open demo app → see content script

### Demo App ("TaskPilot") — key requirements
This is what **Avi uses for manual acceptance testing**. It should feel like a real SaaS, not a test stub.

| Must have | Detail |
|---|---|
| 6 pages | Login, Dashboard, TaskList, TaskDetail, Settings, 404 |
| SPA routing | React Router — tests Refine's URL change detection |
| Forms | Login form, task CRUD form, settings toggles — tests input recording |
| Modals | "New Task" modal, "Confirm Delete" dialog — tests overlay interaction |
| Tables | Sortable/filterable task list with 15-20 seed tasks — tests scroll + list |
| State changes | Task status transitions, dark/light theme toggle — tests state recording |
| Keyboard | Tab nav, Enter submit, Escape close — tests keyboard events |
| Mock data | `mockTasks.ts` with 15-20 realistic tasks (no API calls) |

**Stack:** Vite + React + Tailwind (same as Refine popup — consistent tooling)

---

## 📋 Port Map (avoid collisions)

| Port | App | Owner |
|---|---|---|
| 38470 | QA test target app | QA |
| 39000 | Demo app (TaskPilot) | QA |
| 5173 | Vite dev server (CRXJS HMR) | DEV |
| 338470 | Papyrus (separate project) | — |

---

## 🏁 Sprint 00 Exit Criteria

All of these must be true for Avi to sign off:

1. `npm run build` → clean
2. Extension loads in Chrome → popup shows Refine branding
3. Content script injects on target app → console log visible
4. `npx vitest run` → all green, ≥80% shared/ coverage
5. `npx playwright test` → all E2E green
6. QA target app live on `localhost:38470`
7. Demo app live on `localhost:39000` (all pages working)
8. Avi manually tests extension against demo app → content script visible

---

## Communication Protocol

- **DEV signals "Phase 2 done"** → QA starts Playwright setup
- **Blockers** → raise immediately in sprint decisions log
- **Done** → update your todo file status + write sprint report

Let's ship it. 🚀

# Sprint 01 — Recording Engine

**Sprint window:** 2026-02-22 → 2026-02-24
**Goal:** Ship the core recording loop — after this sprint, FOUNDER can use Refine on Papyrus for real acceptance testing.
**Budget:** ~47 Vibes
**PRD scope:** R001, R002, R003, R004, R005 + infra (messaging, keep-alive, icons)

---

## What "Done" Looks Like

FOUNDER opens Chrome → clicks Refine icon → creates a session → navigates Papyrus (or TaskPilot demo) → sees floating control bar → records DOM activity → takes screenshots → logs bugs with auto-context (URL, screenshot, selector) → stops session → session is persisted in IndexedDB.

No export, no reports, no replay. Just **capture everything, lose nothing**.

---

## Infra Already Done (Sprint 00 — DO NOT REBUILD)

| Asset | Status | Notes |
|---|---|---|
| `src/shared/*` (types, messages, constants, utils, index) | ✅ | All types + enums + utils defined |
| `src/background/service-worker.ts` | ✅ | Hello-world (to be replaced with imports) |
| `src/content/content-script.ts` | ✅ | Console log only (to be replaced) |
| `src/popup/*` (popup.html, index.tsx, App.tsx) | ✅ | Shell with "New Session" button (to be wired) |
| All config files | ✅ | package.json, tsconfig, vite, manifest, tailwind, eslint, CI |
| Dependencies | ✅ | rrweb, Dexie, React, Playwright — all installed |
| Tests | ✅ | Vitest 11 unit + Playwright 3 E2E — extend, don't replace |
| QA target app (port 3847) + Demo TaskPilot (port 3900) | ✅ | Both functional |

---

## Phase Plan

> **Canonical detail:** `todo/sprint_01_team_dev_todo.md` (DEV) and `todo/sprint_01_team_qa_todo.md` (QA).
> IDs below match the canonical todos exactly.

### Phase 1 — Infrastructure Upgrades (DEV) ~4V

| # | Task | File(s) | V |
|---|---|---|---|
| D101 | Message handler (type-safe router) | `src/background/message-handler.ts` | 2 |
| D102 | Content messaging (onMessage integration) | `src/content/content-script.ts` | 1 |
| D103 | Keep-alive (chrome.alarms) | `src/background/keep-alive.ts` | 1 |
| D104 | Branded extension icons | `public/icons/icon-*.png` | 0 |
| D105 | Dexie database schema + CRUD (5 tables) | `src/core/db.ts` | 3 |

### Phase 2 — Session Lifecycle — R001 (DEV) ~5V

| # | Task | File(s) | V |
|---|---|---|---|
| D106 | Session manager (state machine) | `src/background/session-manager.ts` | 3 |
| D107 | NewSession popup form | `src/popup/pages/NewSession.tsx` | 2 |
| D108 | SessionList popup view | `src/popup/pages/SessionList.tsx` | 2 |
| D109 | Popup routing (App.tsx) | `src/popup/App.tsx` | 1 |

### Phase 3 — Recording Engine — R002 (DEV) ~11V

| # | Task | File(s) | V |
|---|---|---|---|
| D110 | rrweb recorder wrapper (start/pause/stop) | `src/content/recorder.ts` | 5 |
| D111 | Event buffer + flush to background | `src/content/recorder.ts`, `src/background/session-manager.ts` | 2 |
| D112 | Cross-page persistence (re-inject on nav) | `src/content/content-script.ts`, `src/background/session-manager.ts` | 2 |
| D113 | Action extractor (rrweb → Action[]) | `src/content/action-extractor.ts` | 3 |
| D114 | Selector engine (smart CSS selectors) | `src/content/selector-engine.ts` | 2 |

### Phase 4 — Control Bar + Capture — R003, R004, R005 (DEV) ~10V

| # | Task | File(s) | V |
|---|---|---|---|
| D115 | Shadow DOM mount | `src/content/overlay/mount.ts` | 2 |
| D116 | ControlBar (Record/Pause/Stop/Screenshot/Bug) | `src/content/overlay/ControlBar.tsx` | 3 |
| D117 | Screenshot capture | `src/background/screenshot.ts` | 2 |
| D118 | Bug/Feature editor (inline form with auto-context) | `src/content/overlay/BugEditor.tsx` | 3 |
| D119 | Overlay CSS (Shadow DOM scoped) | `src/content/styles/overlay.css` | 1 |

### Phase 5 — Unit + Integration Tests (DEV) ~6V

| # | Task | File(s) | V |
|---|---|---|---|
| D120 | Unit: db.ts CRUD | `tests/unit/core/db.test.ts` | 1 |
| D121 | Unit: session-manager state machine | `tests/unit/background/session-manager.test.ts` | 1 |
| D122 | Unit: action-extractor | `tests/unit/content/action-extractor.test.ts` | 1 |
| D123 | Unit: selector-engine | `tests/unit/content/selector-engine.test.ts` | 1 |
| D124 | Integration: session lifecycle pipeline | `tests/integration/session-lifecycle.test.ts` | 2 |
| D125 | All tests green (`npx vitest run`) | — | 0 |

### Phase 6 — Verification (DEV)

| # | Task | V |
|---|---|---|
| D126 | `npm run build` — clean | 0 |
| D127 | `npx tsc --noEmit` — clean | 0 |
| D128 | `npx eslint src/` — clean | 0 |
| D129 | Manual smoke test on TaskPilot | 0 |

### QA — E2E Specs (~10V, after DEV Phase 4)

| # | Task | File(s) | V |
|---|---|---|---|
| Q100 | Enhance QA target app (recording edge cases) | `tests/fixtures/target-app/` | 1 |
| Q101 | E2E: Create session → recording starts | `tests/e2e/session-create.spec.ts` | 2 |
| Q102 | E2E: Control bar visible + functional | `tests/e2e/control-bar.spec.ts` | 1 |
| Q103 | E2E: Screenshot saves to IndexedDB | `tests/e2e/screenshot-capture.spec.ts` | 1 |
| Q104 | E2E: Bug editor opens, pre-fills, saves | `tests/e2e/bug-editor.spec.ts` | 2 |
| Q105 | E2E: Session lifecycle end-to-end | `tests/e2e/session-lifecycle.spec.ts` | 1 |

---

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| S01-001 | rrweb config: `checkoutEveryNms: 30000` | 30s full-snapshot checkpoints balance fidelity vs storage |
| S01-002 | Shadow DOM for overlay (ADR-006) | Prevents CSS conflicts with target app |
| S01-003 | Dexie: 5 tables (`sessions`, `events`, `screenshots`, `bugs`, `features`) | Normalized — events separate for query performance |
| S01-004 | Session FSM: RECORDING ↔ PAUSED → STOPPED → COMPLETED | Linear, no backward jumps except pause toggle |
| S01-005 | Overlay React in Shadow DOM via separate `createRoot` | Isolated from popup React + target app |

---

## Dependency Map

```
Phase 1 (infra)
   ├──► Phase 2 (session lifecycle / popup)
   ├──► Phase 3 (recording engine)  ──► Phase 4 (overlay + capture)
   │                                              │
   └──────────────────────────────────────────────┘
                                                   │
                                              Phase 5 (unit + integration tests)
                                                   │
                                              Phase 6 (verification)
```

DEV runs Phase 1 → Phase 2 + Phase 3 in parallel → Phase 4 → Phase 5 → Phase 6.
QA starts E2E (Q101-Q105) once Phase 4 is done.

---

## Acceptance Gates

| # | Gate | How | Owner |
|---|---|---|---|
| 1 | `npm run build` succeeds | CLI | DEV |
| 2 | All unit + integration tests pass | `npx vitest run` | DEV |
| 3 | Extension loads without console errors | Manual | DEV |
| 4 | Create session from popup → control bar appears on target app | Manual | QA |
| 5 | Record 2+ min on TaskPilot (multi-page navigation) | Manual | FOUNDER |
| 6 | Screenshot captured → visible in IndexedDB | DevTools check | QA |
| 7 | Bug logged with auto-context → visible in IndexedDB | DevTools check | QA |
| 8 | Stop session → popup shows COMPLETED status | Manual | QA |
| 9 | All E2E specs pass | `npx playwright test` | QA |
| 10 | FOUNDER acceptance walkthrough on TaskPilot | Demo | FOUNDER |

---

*Last updated: 2026-02-21*

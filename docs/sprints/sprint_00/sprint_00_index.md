# sprint_00 — Sprint Index

**Sprint window:** 2026-02-20 → 2026-02-22
**Owners:** `[FOUNDER]` / `[CTO]` / `[CPO]`

## Status

- Sprint status: ✅ DEV + QA Complete — Awaiting Founder acceptance
- Current focus: Project infra finalization + hello-world extension + test framework
- Key risks: CRXJS Vite plugin compatibility with latest Vite 6.x (fallback: Vite 5.x)

---

## Sprint Goal

Deliver a **complete, buildable, testable** Chrome Extension scaffold:
1. `npm install` + `npm run build` → produces working `dist/` folder
2. Extension loads in Chrome, popup shows Refine branding, content script injects
3. Full test infrastructure (Vitest unit + Playwright E2E) wired and green
4. QA test target app (automated regression) + Demo app (manual Avi acceptance)
5. CI pipeline adapted for Chrome Extension

**Estimated effort:** 1-2 days (~15-20 Vibes)

---

## Team Structure

| Role | Tag | Scope |
|---|---|---|
| DEV | `[DEV:scaffold]` | Extension scaffold, build pipeline, entry points, hello-world, Vitest config, **unit tests** |
| QA | `[QA]` | Playwright E2E config, extension fixture, QA test target app, **E2E tests**, demo app |
| CTO | `[CTO]` | Architecture compliance, CI pipeline, ADR updates |
| CPO | `[CPO]` | Acceptance criteria verification |
| FOUNDER | `[FOUNDER]` | Final sign-off (manual testing via demo app) |

> **Ownership rule:** DEV writes unit + integration tests (Vitest). QA writes E2E tests (Playwright).

---

## Deliverables Checklist

### Phase 1: Project Config (DEV)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 1 | `package.json` configured (deps + scripts) | DEV | ☑ Done |
| 2 | `tsconfig.json` (strict mode) | DEV | ☑ Done |
| 3 | `vite.config.ts` with CRXJS plugin | DEV | ☑ Done |
| 4 | `tailwind.config.ts` + `postcss.config.js` | DEV | ☑ Done |
| 5 | `manifest.json` (Manifest V3, minimal perms) | DEV | ☑ Done |
| 6 | `.eslintrc.cjs` + `.prettierrc` | DEV | ☑ Done |

### Phase 2: Source Entry Points (DEV)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 7 | `src/shared/types.ts` — initial type stubs | DEV | ☑ Done |
| 8 | `src/shared/constants.ts` — initial constants | DEV | ☑ Done |
| 9 | `src/shared/messages.ts` — message protocol types | DEV | ☑ Done |
| 10 | `src/shared/utils.ts` — utility functions | DEV | ☑ Done |
| 10b | `src/shared/index.ts` — barrel export | DEV | ☑ Done |
| 11 | `src/background/service-worker.ts` — hello-world SW | DEV | ☑ Done |
| 12 | `src/content/content-script.ts` — hello-world CS | DEV | ☑ Done |
| 13 | `src/popup/popup.html` + `src/popup/App.tsx` — hello-world popup | DEV | ☑ Done |
| 14 | `src/popup/index.tsx` — React mount | DEV | ☑ Done |
| 15 | `npm run build` → `dist/` loads in Chrome | DEV | ☑ Done |

### Phase 3: Unit Tests (DEV)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 16 | `vitest.config.ts` — unit test config | DEV | ☑ Done |
| 17 | `tests/unit/shared/constants.test.ts` — first unit test | DEV | ☑ Done |
| 18 | `tests/unit/shared/utils.test.ts` — utility tests | DEV | ☑ Done |
| 19 | `npx vitest run` — all unit tests pass, coverage ≥ 80% for shared/ | DEV | ☑ Done |

### Phase 4: E2E Tests + Test Targets (QA)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 20 | `playwright.config.ts` — E2E config for extension testing | QA | ☑ Done |
| 21 | `tests/e2e/fixtures/extension.fixture.ts` — extension test fixture | QA | ☑ Done |
| 22 | `tests/fixtures/target-app/` — QA regression target (port 3847) | QA | ☑ Done |
| 23 | `tests/e2e/extension-loads.spec.ts` — extension load smoke test | QA | ☑ Done |
| 24 | `tests/e2e/content-script-injects.spec.ts` — content script E2E | QA | ☑ Done |
| 25 | `tests/e2e/target-app-navigation.spec.ts` — navigation E2E | QA | ☑ Done |
| 26 | `demos/refine-demo-app/` — Avi's manual acceptance demo app (port 3900) | QA | ☑ Done |
| 27 | `npx playwright test` — all E2E pass | QA | ⏳ Ready (requires headed Chrome) |

### Phase 5: CI + Docs (CTO / QA)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 28 | `.github/workflows/ci.yml` — adapted for extension | CTO | ☑ Done |
| 29 | `docs/04_TESTING.md` — updated with E2E patterns | QA | ☑ Done |
| 30 | `docs/0l_DECISIONS.md` — ADR-008 status updated | CTO | ☑ Done |
| 31 | Sprint-01 plan drafted | CTO | ☐ |

### Phase 6: Acceptance (FOUNDER)
| # | Artifact | Status |
|---|----------|--------|
| 32 | `npm run build` succeeds | ☑ Done |
| 33 | Extension loads in Chrome — popup shows | ☑ Ready (load `dist/` unpacked) |
| 34 | Content script injects on QA target app | ☑ Ready (load `dist/` unpacked) |
| 35 | `npx vitest run` — all pass | ☑ Done (11/11) |
| 36 | `npx playwright test` — extension E2E pass | ⏳ Ready (requires headed Chrome) |
| 37 | QA target app accessible at `http://localhost:3847` | ☑ Ready (`npm start` in target-app) |
| 38 | Demo app accessible at `http://localhost:3900` | ☑ Done (`npm run dev` running) |
| 39 | Avi manual test via demo app — extension loads, popup opens, content script visible | ⏳ Awaiting Founder |
| 40 | Avi sign-off | ⏳ Awaiting Founder |

---

## Required artifacts (this sprint)

- Requirements delta: `reviews/sprint_00_requirements_delta.md` ✅
- Decisions (sprint-local): `sprint_00_decisions_log.md` ✅
- DEV todo: `todo/sprint_00_team_dev_scaffold_todo.md` ✅
- QA todo: `todo/sprint_00_team_qa_todo.md` ✅
- DEV report: `reports/sprint_00_team_dev_scaffold_report.md` (on completion)
- QA report: `reports/sprint_00_team_qa_report.md` (on completion)

---

## Quick links

### Todos (by team)
- [DEV Todo](todo/sprint_00_team_dev_scaffold_todo.md)
- [QA Todo](todo/sprint_00_team_qa_todo.md)

### Reports (by team)
- `reports/sprint_00_team_dev_scaffold_report.md` (pending)
- `reports/sprint_00_team_qa_report.md` (pending)

### Decisions
- [Sprint decisions](sprint_00_decisions_log.md)
- [Global decisions](../../0l_DECISIONS.md)

---

## Key Decisions

| ID | Decision | Status |
|---|---|---|
| S00-001 | Use SynaptixLabs template as base | Accepted |
| S00-002 | Adapt to Type C (Extension) structure | Accepted |
| S00-003 | Single dev role: `@role_extension_dev` | Accepted |
| S00-004 | Skip Tier-2 AGENTS.md | Accepted |
| ADR-008 | Playwright (not Puppeteer) for E2E extension testing | ✅ Accepted |

---

## CTO Pre-Release Verification

| Verification | Status | CTO Sign-off |
|--------------|--------|--------------|
| Code integrity | ⬜ | |
| Unit tests pass + coverage | ⬜ | |
| E2E tests pass | ⬜ | |
| Build succeeds | ⬜ | |
| Extension loads clean | ⬜ | |
| Docs updated | ⬜ | |
| Architecture compliance | ⬜ | |
| CI pipeline green | ⬜ | |

---

## Open Questions (For FOUNDER)

1. ~~**ADR-008: Playwright for E2E**~~ — **DECIDED: Approved** (2026-02-20)
2. ~~**Test target app port**~~ — **DECIDED: `localhost:3847`** (avoids collision with Papyrus 33847)
3. **Extension icon** — Use SynaptixLabs brand colors (orange #F97316 + blue #3B82F6)? → Sprint 01 polish
4. ~~**Product name**~~ — **DECIDED: "Refine"** (SynaptixLabs Refine). Repo: `project-refiner`.

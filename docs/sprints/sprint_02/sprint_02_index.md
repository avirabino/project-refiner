# Sprint 02 — Export & Ship

**Sprint window:** 2026-02-25 → 2026-02-27
**Goal:** Ship the complete product. Reports, replay, Playwright export, ZIP bundles, keyboard shortcuts. After this sprint, Refine is **DONE**.
**Budget:** ~46 Vibes
**PRD scope:** R006, R007, R010, R011, R012, R013

---

## What "Done" Looks Like

FOUNDER records a session → stops → generates JSON + Markdown report → watches rrweb visual replay → exports Playwright `.spec.ts` → downloads ZIP bundle (replay + report + screenshots + spec). QA engineer opens the `.spec.ts`, runs it, it passes against the target app.

**This is the complete product. Sprint 02 = ship.**

---

## Infra from Sprint 00 + 01

| Asset | Status |
|---|---|
| Recording engine (rrweb + actions + screenshots + bugs) | ✅ Sprint 01 |
| Dexie DB (5 tables, CRUD, cascading delete) | ✅ Sprint 01 |
| Popup (session list + new session form) | ✅ Sprint 01 |
| Control bar + bug editor in Shadow DOM | ✅ Sprint 01 |
| Chrome messaging + session state machine | ✅ Sprint 01 |
| All test infra (Vitest + Playwright + fixture) | ✅ Sprint 00-01 |
| QA target app (3847) + TaskPilot demo (3900) | ✅ Sprint 00 |

---

## Phase Plan

> **Canonical detail:** `todo/sprint_02_team_dev_todo.md` (DEV) and `todo/sprint_02_team_qa_todo.md` (QA).
> IDs below match the canonical todos exactly.

### Phase 1 — Report Generation (DEV) ~13V

| # | Task | File(s) | V |
|---|---|---|---|
| D201 | JSON report generator | `src/core/report-generator.ts` | 5 |
| D202 | Markdown report generator | `src/core/report-generator.ts` | 3 |
| D203 | Auto-generate report on session stop | `src/background/session-manager.ts` | 2 |

### Phase 2 — Session Management — R007 (DEV) ~5V

| # | Task | File(s) | V |
|---|---|---|---|
| D204 | Enhanced session list (counts, badges) | `src/popup/pages/SessionList.tsx` | 1 |
| D205 | Session detail view (metadata + export buttons) | `src/popup/pages/SessionDetail.tsx` | 3 |
| D206 | Session delete with confirmation | `src/popup/pages/SessionDetail.tsx` | 1 |
| D207 | Storage usage indicator | `src/popup/components/StorageIndicator.tsx` | 1 |

### Phase 3 — Visual Replay — R010 (DEV) ~10V

| # | Task | File(s) | V |
|---|---|---|---|
| D208 | Replay bundler (rrweb events → self-contained HTML) | `src/core/replay-bundler.ts` | 5 |
| D209 | Replay HTML template (branded, controls, timeline markers) | `src/core/replay-bundler.ts` | 3 |
| D210 | "Watch Replay" download button | `src/popup/pages/SessionDetail.tsx` | 2 |

### Phase 4 — Playwright Codegen — R011 (DEV) ~15V

| # | Task | File(s) | V |
|---|---|---|---|
| D211 | Playwright codegen (Action[] → .spec.ts) | `src/core/playwright-codegen.ts` | 10 |
| D212 | Action → Playwright mapping (goto/click/fill) | `src/core/playwright-codegen.ts` | — |
| D213 | Smart selector in export (confidence → TODO comments) | `src/core/playwright-codegen.ts` | — |
| D214 | Bug markers in spec (`// BUG:` comments) | `src/core/playwright-codegen.ts` | — |
| D215 | "Export Playwright" download button | `src/popup/pages/SessionDetail.tsx` | 2 |

### Phase 5 — ZIP Bundle — R012 (DEV) ~5V

| # | Task | File(s) | V |
|---|---|---|---|
| D216 | ZIP assembly (JSZip, all artifacts) | `src/core/zip-exporter.ts` | 3 |
| D217 | "Export ZIP" download button | `src/popup/pages/SessionDetail.tsx` | 1 |
| D218 | Screenshot filename mapping in ZIP | `src/core/zip-exporter.ts` | 1 |

### Phase 6 — Keyboard Shortcuts — R013 (DEV) ~3V

| # | Task | File(s) | V |
|---|---|---|---|
| D219 | Register chrome.commands in manifest | `manifest.json` | 1 |
| D220 | Command handler in background | `src/background/shortcuts.ts` | 1 |
| D221 | Shortcut hints on control bar tooltips | `src/content/overlay/ControlBar.tsx` | 1 |

### Phase 7 — Unit + Integration Tests (DEV) ~6V

| # | Task | File(s) | V |
|---|---|---|---|
| D222 | Unit: report-generator | `tests/unit/core/report-generator.test.ts` | 2 |
| D223 | Unit: playwright-codegen | `tests/unit/core/playwright-codegen.test.ts` | 3 |
| D224 | Unit: replay-bundler | `tests/unit/core/replay-bundler.test.ts` | 1 |
| D225 | Integration: export pipeline | `tests/integration/export-pipeline.test.ts` | 2 |
| D226 | All tests green (Sprint 00-02) | — | 0 |

### Phase 8 — Verification (DEV)

| # | Task | V |
|---|---|---|
| D227 | `npm run build` — clean | 0 |
| D228 | `npx tsc --noEmit` — clean | 0 |
| D229 | `npx eslint src/` — clean | 0 |
| D230 | Full manual test on TaskPilot (5-min session, all exports) | 0 |

### QA — E2E Specs (~10V, after DEV Phase 5)

| # | Task | File(s) | V |
|---|---|---|---|
| Q201 | E2E: Report export (download JSON/MD) | `tests/e2e/report-export.spec.ts` | 1 |
| Q202 | E2E: Replay viewer (opens, plays) | `tests/e2e/replay-viewer.spec.ts` | 1 |
| Q203 | E2E: Playwright export (valid .spec.ts) | `tests/e2e/playwright-export.spec.ts` | 2 |
| Q204 | E2E: ZIP export (all files present) | `tests/e2e/zip-export.spec.ts` | 1 |
| Q205 | E2E: Session delete (cascading) | `tests/e2e/session-delete.spec.ts` | 1 |
| Q206 | E2E: Keyboard shortcuts | `tests/e2e/keyboard-shortcuts.spec.ts` | 1 |
| Q207 | Full regression: Sprint 00+01+02 suite | All specs | 0 |

---

## Decisions

| ID | Decision | Rationale |
|---|---|---|
| S02-001 | rrweb-player bundled as inline script in replay HTML | Self-contained HTML — no external CDN dependency |
| S02-002 | Playwright codegen: navigate + click + fill + assertion structure | Matches Playwright best practices. Assertions for `toBeVisible()` on key elements |
| S02-003 | ZIP uses JSZip library (add to dependencies) | Client-side ZIP creation, no server needed |
| S02-004 | Keyboard shortcuts via `chrome.commands` API in manifest.json | Native extension shortcut — works even when popup is closed |
| S02-005 | Generated `.spec.ts` includes `// BUG:` comments at locations where bugs were logged | Links test script to bug context for QA review |

---

## Dependency Map

```
Phase 1 (reports)    ──► Phase 2 (session mgmt) ──► Phase 5 (ZIP needs all generators)
Phase 3 (replay)     ──┘                             │
Phase 4 (codegen)    ──┘                             ▼
                                                 Phase 6 (shortcuts — independent)
                                                     │
                                                 Phase 7 (tests)
                                                     │
                                                 Phase 8 (verification)
```

DEV runs Phase 1 + 3 + 4 in parallel → Phase 2 + 5 → Phase 6 → Phase 7 → Phase 8.
QA starts E2E once Phase 5 is done.

---

## Acceptance Gates

| # | Gate | How | Owner |
|---|---|---|---|
| 1 | `npm run build` succeeds | CLI | DEV |
| 2 | All unit + integration tests pass (Sprint 00-02) | `npx vitest run` | DEV |
| 3 | JSON report contains: timeline, pages, actions, bugs, screenshots | Unit test | DEV |
| 4 | Markdown report is human-readable | Manual review | FOUNDER |
| 5 | Replay HTML opens in browser and plays back session | Manual | FOUNDER |
| 6 | Playwright `.spec.ts` is syntactically valid TypeScript | `npx tsc --noEmit` on exported file | QA |
| 7 | Playwright `.spec.ts` runs against target app | `npx playwright test exported.spec.ts` | QA |
| 8 | ZIP contains: replay.html, report.json, report.md, screenshots/, regression.spec.ts | Manual inspect | QA |
| 9 | Session delete cascades correctly | E2E | QA |
| 10 | Keyboard shortcuts work | Manual | QA |
| 11 | All E2E specs pass (Sprint 00-02) | `npx playwright test` | QA |
| 12 | FOUNDER end-to-end walkthrough on TaskPilot | Demo | FOUNDER |

---

## Ship Checklist (Sprint 02 = Final)

- [ ] `CHANGELOG.md` written (v0.1.0 → v1.0.0)
- [ ] Version bumped: `manifest.json` + `package.json` → `1.0.0`
- [ ] Git tag: `v1.0.0`
- [ ] `README.md` updated with full usage instructions
- [ ] `dist/` built from clean checkout
- [ ] Team distribution: share `dist/` folder or repo tag
- [ ] FOUNDER final acceptance

---

*Last updated: 2026-02-21*

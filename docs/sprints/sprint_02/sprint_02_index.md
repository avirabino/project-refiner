# sprint_02 — Sprint Index

**Sprint window:** 2026-02-25 → 2026-02-28
**Owners:** `[FOUNDER]` / `[CTO]` / `[CPO]`

## Status

- Sprint status: 🟡 PLANNING
- Current focus: Export + Reports + Replay — complete the product
- Prerequisite: Sprint 01 DONE (recording engine functional)

---

## Sprint Goal

Deliver the **complete Refine product** — after this sprint, Refine is shipped:

1. Session report generation (JSON + Markdown) with full timeline
2. Session list in popup with view/delete capabilities
3. Visual replay via rrweb-player (self-contained HTML)
4. Playwright test script export from recorded actions
5. One-click ZIP export (replay + report + screenshots + spec)
6. Keyboard shortcuts for power users
7. Product is complete, documented, and deployed to SynaptixLabs team

**Estimated effort:** ~46 Vibes
**This is the FINAL sprint. Product ships at the end.**

---

## Team Structure

| Role | Tag | Scope |
|---|---|---|
| DEV | `[DEV:export]` | Report gen, Playwright codegen, replay bundler, ZIP export, session management, keyboard shortcuts, unit tests |
| QA | `[QA]` | E2E tests for export flows, full regression, acceptance test script |
| CTO | `[CTO]` | Architecture compliance, release checklist, deployment plan |
| FOUNDER | `[FOUNDER]` | Final product acceptance — use Refine on real Papyrus session |

---

## Deliverables Checklist

### Phase 1: Session Management — R007 (~5V)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 1 | `src/popup/pages/SessionList.tsx` — list all sessions with name, date, duration, bug count, status badge | DEV | ☐ |
| 2 | `src/popup/pages/SessionDetail.tsx` — single session view: metadata, actions timeline, bugs list, screenshots grid | DEV | ☐ |
| 3 | Session delete: confirm dialog → remove session + all related data from Dexie | DEV | ☐ |
| 4 | `src/popup/App.tsx` update: route SessionList → SessionDetail, handle empty state | DEV | ☐ |
| 5 | Unit tests: session list queries, delete cascade | DEV | ☐ |

### Phase 2: Report Generation — R006 (~8V)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 6 | `src/core/report-generator.ts` — generate JSON report from session data | DEV | ☐ |
| 7 | Markdown report: session summary, pages visited, actions timeline, bugs table, features table, screenshot inventory | DEV | ☐ |
| 8 | JSON report: machine-readable version with same data + raw event counts | DEV | ☐ |
| 9 | "Generate Report" button in SessionDetail → triggers report gen → shows preview / download | DEV | ☐ |
| 10 | Unit tests: report generation from mock session data | DEV | ☐ |

### Phase 3: Visual Replay — R010 (~10V)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 11 | `src/core/replay-bundler.ts` — package rrweb events into self-contained HTML with embedded rrweb-player | DEV | ☐ |
| 12 | Replay HTML: includes rrweb-player JS/CSS inline (no CDN), playback controls (play/pause, speed 0.5x/1x/2x, timeline scrubber), session metadata header | DEV | ☐ |
| 13 | "Watch Replay" button in SessionDetail → generates replay HTML → opens in new tab or downloads | DEV | ☐ |
| 14 | Bug markers on replay timeline: red dots at timestamps where bugs were logged | DEV | ☐ |
| 15 | Unit tests: replay bundler generates valid HTML with embedded events | DEV | ☐ |

### Phase 4: Playwright Export — R011 (~15V)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 16 | `src/core/playwright-codegen.ts` — transform action log → Playwright .spec.ts | DEV | ☐ |
| 17 | Generated spec includes: `page.goto()` for navigations, `page.click()` for clicks, `page.fill()` for inputs, `expect(locator).toBeVisible()` for assertions | DEV | ☐ |
| 18 | Selector strategy in generated code: use best available (data-testid > aria-label > id > CSS). Comment confidence level next to each selector. | DEV | ☐ |
| 19 | Bug markers as comments: `// 🐛 BUG [P1]: <description> — reported at <timestamp>` | DEV | ☐ |
| 20 | "Export Playwright" button in SessionDetail → generates .spec.ts → download | DEV | ☐ |
| 21 | Generated script is syntactically valid: passes `npx tsc --noEmit` when imported in a Playwright project | DEV | ☐ |
| 22 | Unit tests: codegen from mock action log → verify output matches expected Playwright syntax | DEV | ☐ |

### Phase 5: ZIP Bundle — R012 (~5V)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 23 | ZIP export: bundles replay.html + report.json + report.md + regression.spec.ts + screenshots/*.png into single .zip | DEV | ☐ |
| 24 | Use JSZip (client-side) or Blob API. No server needed. | DEV | ☐ |
| 25 | "Export All" button in SessionDetail → generates ZIP → triggers download | DEV | ☐ |
| 26 | Unit test: ZIP contains expected files with correct names | DEV | ☐ |

### Phase 6: Keyboard Shortcuts — R013 (~3V)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 27 | `Ctrl+Shift+R` — toggle recording (start if idle, pause/resume if active) | DEV | ☐ |
| 28 | `Ctrl+Shift+S` — capture screenshot (during active session) | DEV | ☐ |
| 29 | `Ctrl+Shift+B` — open bug editor (during active session) | DEV | ☐ |
| 30 | Register via `chrome.commands` in manifest.json (CTO: update manifest) | DEV + CTO | ☐ |
| 31 | Unit test: keyboard handler routes commands correctly | DEV | ☐ |

### Phase 7: E2E Tests (QA)
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 32 | `tests/e2e/session-management.spec.ts` — view session list, open detail, delete session | QA | ☐ |
| 33 | `tests/e2e/report-generation.spec.ts` — generate report from completed session, verify download | QA | ☐ |
| 34 | `tests/e2e/replay-export.spec.ts` — generate replay HTML, verify it opens with player | QA | ☐ |
| 35 | `tests/e2e/playwright-export.spec.ts` — export Playwright script, verify valid syntax | QA | ☐ |
| 36 | `tests/e2e/zip-export.spec.ts` — export ZIP, verify contains expected files | QA | ☐ |
| 37 | `tests/e2e/keyboard-shortcuts.spec.ts` — test all 3 shortcuts trigger correct actions | QA | ☐ |
| 38 | Full regression: Sprint 00 + Sprint 01 E2E specs | QA | ☐ |

### Phase 8: Release + Acceptance
| # | Artifact | Owner | Status |
|---|----------|-------|--------|
| 39 | `npm run build` succeeds | DEV | ☐ |
| 40 | `npx vitest run` — all tests pass | DEV | ☐ |
| 41 | `npx tsc --noEmit` — zero errors | DEV | ☐ |
| 42 | `npx eslint src/` — zero errors | DEV | ☐ |
| 43 | `npx playwright test` — all E2E pass (Sprint 00 + 01 + 02) | QA | ☐ |
| 44 | `CHANGELOG.md` written | CTO | ☐ |
| 45 | Version bump: manifest.json + package.json → `1.0.0` | CTO | ☐ |
| 46 | README.md updated with user-facing instructions | CTO | ☐ |
| 47 | FOUNDER acceptance: full Papyrus session → record → bug → stop → report → replay → Playwright export → ZIP | FOUNDER | ☐ |
| 48 | FOUNDER sign-off: **PRODUCT SHIPPED** | FOUNDER | ☐ |

---

## Required Artifacts

- Requirements delta: `reviews/sprint_02_requirements_delta.md`
- Decisions (sprint-local): `sprint_02_decisions_log.md`
- DEV todo: `todo/sprint_02_team_dev_todo.md`
- QA todo: `todo/sprint_02_team_qa_todo.md`
- DEV report: `reports/sprint_02_team_dev_report.md` (on completion)
- QA report: `reports/sprint_02_team_qa_report.md` (on completion)

---

## Quick Links

### Todos
- [DEV Todo](todo/sprint_02_team_dev_todo.md)
- [QA Todo](todo/sprint_02_team_qa_todo.md)

### Reports
- `reports/sprint_02_team_dev_report.md` (pending)
- `reports/sprint_02_team_qa_report.md` (pending)

### Decisions
- [Sprint decisions](sprint_02_decisions_log.md)
- [Global decisions](../../0l_DECISIONS.md)

---

## Key Risks

| Risk | Impact | Mitigation |
|---|---|---|
| rrweb-player bundle size | Replay HTML may be >5MB with large sessions | Lazy-load player JS; warn user for sessions >30min |
| Playwright codegen quality | Generated selectors may be brittle | Flag low-confidence selectors with comments; use data-testid where available |
| JSZip client-side memory | Large sessions with many screenshots could OOM | Stream files into ZIP; limit screenshot resolution to 1920px |
| manifest.json commands API | Limited to 4 shortcuts in Manifest V3 | We need 3 — fits within limit |
| Version 1.0.0 expectations | "1.0" implies stability | Frame as "1.0 internal release" — SynaptixLabs team use only |

---

## CTO Pre-Release Verification

| Verification | Status | CTO Sign-off |
|---|---|---|
| Architecture compliance (all modules) | ⬜ | |
| Unit tests pass + coverage targets met | ⬜ | |
| Integration tests pass | ⬜ | |
| E2E full regression (all 3 sprints) | ⬜ | |
| Build succeeds, extension loads clean | ⬜ | |
| Generated Playwright scripts are syntactically valid | ⬜ | |
| Replay HTML opens and plays correctly | ⬜ | |
| ZIP contains all expected files | ⬜ | |
| CHANGELOG.md complete | ⬜ | |
| Version 1.0.0 in manifest + package.json | ⬜ | |
| README.md has user-facing install + usage guide | ⬜ | |
| No P0 requirements missing | ⬜ | |

---

## Ship Criteria

**Refine v1.0.0 ships when ALL of these are true:**

```
✅ All P0 requirements (R001-R007) implemented and tested
✅ All P1 requirements (R010-R013) implemented and tested
✅ Full E2E regression green (Sprint 00 + 01 + 02)
✅ FOUNDER completes a real Papyrus acceptance testing session
✅ FOUNDER exports ZIP bundle and reviews all outputs
✅ FOUNDER sign-off: "Ship it"
✅ Tagged as v1.0.0, CHANGELOG written, README updated
```

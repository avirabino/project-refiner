# Sprint 03 — Index

**Goal:** Harden the v1.0.0 codebase (CTO DR fixes + Sprint 01 HIGH bugs), ship all PRD P2 features, and introduce project/app association with auto-publish to a user-selected project folder.

**Budget:** ~62V  
**Start:** 2026-02-22  
**Version target:** `1.1.0`

---

## PRD Scope

| ID | Requirement | Phase |
|---|---|---|
| R014 | Mouse tracking as session preference (default OFF) | Phase 1 |
| R020 | Session tagging (free-text + predefined, stored in DB) | Phase 3 |
| R021 | Dedicated "Export Bugs & Features" button in SessionDetail | Phase 3 |
| R022 | Action annotation: inline text notes during recording | Phase 3 |
| R023 | Element inspector mode: click highlights, logs selector | Phase 3 |
| R024 | Dark/light theme toggle for overlay | Phase 3 |
| R025 | Project/app association + outputPath + auto-publish via `chrome.downloads` | Phase 2 |
| R026 | Bug lifecycle status: open / in_progress / resolved / wontfix | Phase 2 |
| R027 | Feature sprint assignment: status + sprintRef field | Phase 2 |

---

## Phase Breakdown

### Phase 0 — Zero-cost (already shipped 2026-02-22)
| Task | File | Cost |
|---|---|---|
| Scroll sampling 150 → 300 | `src/content/recorder.ts` | ✅ 0V |

### Phase 1 — Infra + CTO DR + Sprint 01 HIGH bugs (~20V)

**CTO DR fixes (Sprint 02 review):**
| Task | ID | Cost | Blocking? |
|---|---|---|---|
| DR-03: Remove `// @ts-nocheck`, ship `playwright.tsconfig.json` stub in ZIP | s03-dr01 | ~2V | ✅ Yes |
| DR-02: Extract `SHORTCUT_MAP` to `src/shared/constants.ts` | s03-dr02 | ~1V | No |
| DR-04: `chrome.tabs.onUpdated` for navigation tracking (background) | s03-dr03 | ~3V | No |
| Mouse tracking preference in `NewSession.tsx` (default OFF) | s03-mouse | ~2V | No |
| Replay extension page: `replay-viewer.html` (CSP-compliant, loads from IndexedDB) | s03-replay-csp | ~4V | No |
| In-app changelog viewer: "What's New" panel in popup footer | s03-changelog-viewer | ~2V | No |

**Sprint 01 CTO DR — HIGH bugs:**
| Bug | Location | Fix | Cost |
|---|---|---|---|
| B03 | `session-manager.ts` | Double-session guard: `if (state.sessionId) throw` | ~0.5V |
| B05 | `shared/types.ts` | Remove dead `STOPPED` enum value | ~0.2V |
| B06 | `message-handler.ts` | `actionCount` race → `db.sessions.modify()` atomic increment | ~1V |
| B15 | `ControlBar.tsx` | Timer resets on cross-page nav → fetch `startedAt` from background on mount | ~1V |
| B16 | `BugEditor.tsx` | Bug save fire-and-forget → `await sendMessage` promise before close | ~0.5V |
| B19 | `SessionList.tsx` / `ControlBar.tsx` / `replay-bundler.ts` / `report-generator.ts` | `formatDuration` x4 → extract canonical to `@shared/utils.ts` | ~0.5V |

**Total Phase 1: ~17V** *(DR-03 must complete before Phase 2 feature work)*

---

### Phase 2 — Sprint 01 MEDIUM bugs + Deferred S02 items + R025-R027 (~17V)

**Sprint 01 CTO DR — MEDIUM bugs:**
| Bug | Location | Fix | Cost |
|---|---|---|---|
| B04 | `session-manager.ts` | `addPage` fire-and-forget → add `.catch()` | ~0.2V |
| B09 | `recorder.ts` | `estimateBytes` re-serializes → track cumulative size incrementally | ~0.5V |
| B10 | `recorder.ts` | `sessionId` validation guard at start of `startRecording` | ~0.2V |
| B12 | `selector-engine.ts` | `:has-text()` strategy label → `'playwright'` not `'css'` | ~0.2V |
| B13 | `overlay/mount.ts` | Add inline `all: initial` on host element | ~0.1V |
| B14 | `ControlBar.tsx` | `handleStop` → check `chrome.runtime.lastError` | ~0.2V |
| B17 | `BugEditor.tsx` | Auto-screenshot on bug save (~1V) or document deferral to Sprint 04 | ~1V |
| B18 | `NewSession.tsx` | No active tab fallback text | ~0.1V |

**Deferred Sprint 02 items:**
| Task | Cost |
|---|---|
| `StorageIndicator` component in popup (IndexedDB usage) | ~1V |
| Selector confidence `// TODO: low-confidence selector` in codegen | ~1V |
| ControlBar tooltip shortcut hints | ~1V |
| Integration test: export pipeline | ~2V |

**New requirements:**
| ID | Requirement | Cost |
|---|---|---|
| R025 | `project` + `outputPath` on Session; `ProjectSettings.tsx` UI; `publish.ts` via `chrome.downloads`; two-layer folder output | ~5V |
| R026 | Bug status (open/in_progress/resolved/wontfix) in SessionDetail + export | ~2V |
| R027 | Feature sprint assignment (sprintRef) in SessionDetail + export | ~2V |

**Total Phase 2: ~16.5V**

---

### Phase 3 — PRD P2 Features (~22V)

| ID | Requirement | Acceptance Criteria | Cost |
|---|---|---|---|
| R020 | Session tagging | Tags field on Session; free-text + autocomplete from existing tags; filter in SessionList | ~3V |
| R021 | Bugs & features MD export | Dedicated "Export Bugs & Features" button downloads `bugs-features-<id>.md` | ~3V |
| R022 | Action annotation | Long-press or right-click on ControlBar timeline adds text note; appears in report + spec | ~5V |
| R023 | Element inspector mode | Toggle button in ControlBar; hover highlights element + logs selector; no click fires | ~8V |
| R024 | Dark/light theme toggle | Theme toggle in ControlBar; stores preference in `chrome.storage.local` | ~3V |

**Total Phase 3: ~22V**

---

## Sprint 03 Budget Summary

| Phase | Content | Cost |
|---|---|---|
| 0 | Scroll sampling | ✅ Done |
| 1 | CTO DR + HIGH bugs | ~17V |
| 2 | MEDIUM bugs + deferred S02 + R025 (with publish.ts) + R026 + R027 | ~16.5V |
| 3 | PRD P2 (R020–R024) | ~22V |
| **Total** | | **~55.5V** |

---

## Acceptance Gates

- [ ] DR-03 resolved: generated `.spec.ts` compiles with `tsc --noEmit` without `// @ts-nocheck`
- [ ] All Sprint 01 HIGH bugs (B03/B05/B06/B15/B16/B19) resolved and unit-tested
- [ ] R025: sessions filterable by project in popup
- [ ] R026: bug status persisted and exported in report.json + report.md
- [ ] R027: feature sprintRef persisted and exported
- [ ] All PRD P2 features (R020-R024) pass QA E2E specs
- [ ] Full regression: all existing E2E + unit tests green

---

## Dependencies

| Dependency | Owner | Notes |
|---|---|---|
| Sprint 02 complete (v1.0.0) | ✅ Done | CSP fix + changelog + version bump shipped |
| CTO DR-03 complete | DEV | All other Phase 1 tasks can proceed in parallel |
| Phase 1 complete before Phase 3 | DEV | Infra must be stable before P2 features |

---

## Sprint 03 Artifacts

| File | Owner | Status |
|---|---|---|
| `docs/sprints/sprint_03/sprint_03_index.md` | CTO | ✅ This file |
| `docs/sprints/sprint_03/todo/sprint_03_team_dev_todo.md` | DEV | Pending |
| `docs/sprints/sprint_03/todo/sprint_03_team_qa_todo.md` | QA | Pending |
| `docs/sprints/sprint_03/reports/sprint_03_final_report.md` | DEV/QA | End of sprint |

---

*Sprint 03 initiated: 2026-02-22*
*`[CTO]` SynaptixLabs CPTO Agent*

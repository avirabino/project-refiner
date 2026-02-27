# Sprint 07 — Execution Plan (Restructured)

> **Produced by:** [CPTO] | **Date:** 2026-02-27
> **Restructured:** 2026-02-27 per CPTO Design Review + Founder directive (D021)
> **Approved by:** [FOUNDER] — pending
> **Budget:** ~55V (Phase 1: ~20V, Phase 2: ~35V core+stretch)
> **Version target:** 2.1.0

---

## ⚡ Sprint Structure: Two Phases with Acceptance Gate

Per Founder directive (D021): **Fix UX first, acceptance test it, THEN move to AGENTS/LLM/Neon.**

```
PHASE 1 (Week 1-2): UX Foundation — project sessions, dashboard overhaul, carry-forward bugs
    │
    ├── FAT Round 3 GATE — Founder acceptance walkthrough (13 steps)
    │   Must PASS before Phase 2 items begin
    │
PHASE 2 (Week 2-3): Backend — AGENTS integration, Neon, Vercel, vigil_agent
    │   (items with no Phase 1 dependency can start parallel in Week 2)
    │
    └── Sprint 07 closure
```

---

## Priority Legend

| Color | Priority | Meaning |
|---|---|---|
| 🔴 | **P0** | Founder's top priority — sprint fails without this |
| 🟠 | **P1** | Core feature — must ship this sprint |
| 🟡 | **P2** | Important — ship if capacity allows |
| 🟢 | **P3** | Stretch — defer to S08 if needed |

---

## PHASE 1: UX Foundation + Acceptance (~20V, Week 1-2)

**Goal:** Fix all S06 usability lessons. Ship project-oriented sessions. Upgrade dashboard. Pass FAT Round 3.

### Week 1 — Session Model + Foundation

| Day | Task | Priority | Owner | Cost | Blocked By |
|---|---|---|---|---|---|
| D1 | S07-19: Manifest shortcut `Alt+Shift+B` | 🟠 P1 | `[DEV:ext]` | ~0.5V | — |
| D1 | S07-20: BUG-EXT-001 fix (codegen regex) | 🟡 P2 | `[DEV:ext]` | ~1V | — |
| D1-D2 | S07-11: Shared types package (`packages/shared/`) | 🟠 P1 | `[DEV:server]` | ~2V | — |
| D1-D3 | S07-12: VIGILSession persistence (`chrome.storage.local`) | 🟠 P1 | `[DEV:ext]` | ~1.5V | — |
| D2-D5 | S07-16: Project-oriented session model (P0) | 🔴 P0 | `[DEV:ext]` | ~5V | — |
| D3-D5 | S07-18: Ghost session recovery | 🟠 P1 | `[DEV:ext]` | ~1V | — |
| D4-D5 | S07-21: BUG-EXT-002 (btn-publish) | 🟡 P2 | `[DEV:ext]` | ~1V | — |

**Week 1 parallel lanes:**
```
Lane 1 [DEV:ext]:     S07-19 (0.5d) → S07-20 (0.5d) → S07-12 (2d) → S07-16 (4d, continues W2)
Lane 2 [DEV:server]:  S07-11 (2d) → S07-15 schema prep (Phase 2 unblocked work)
Lane 3 [CTO]:         S07-08a scaffold (2d) → reviews / Phase 2 prep
```

### Week 2 — Dashboard Overhaul + FAT

| Day | Task | Priority | Owner | Cost | Blocked By |
|---|---|---|---|---|---|
| D6-D7 | S07-16 completion | 🔴 P0 | `[DEV:ext]` | (cont.) | — |
| D6-D8 | S07-17a: Dashboard nav + filters + screenshots | 🟠 P1 | `[DEV:dashboard]` | ~3V | S07-16 |
| D8-D10 | S07-17b: Session timeline + replay | 🟠 P1 | `[DEV:dashboard]` | ~3V | S07-17a |
| D9-D10 | S07-13: Dashboard component tests (NEW components) | 🟠 P1 | `[DEV:dashboard]` | ~1V | S07-17a |
| D10 | **FAT Round 3** — Founder acceptance walkthrough | — | `[CPTO]` + `[FOUNDER]` | — | All Phase 1 |

### ⛔ PHASE 1 GATE: FAT Round 3

**Document:** `FOUNDER_ACCEPTANCE_WALKTHROUGH_S07.md` (13 acceptance steps)

Criteria (ALL must pass):
1. ✅ S07-16: Project-oriented session creation verified
2. ✅ S07-17a: Dashboard project/sprint/session navigation works
3. ✅ S07-17b: Session timeline + replay functional
4. ✅ S07-12: Session survives service worker restart
5. ✅ S07-18: Ghost session recoverable from side panel
6. ✅ S07-19: `Alt+Shift+B` works on fresh install
7. ✅ S07-20/21: Carry-forward bugs fixed, tests unskipped and green
8. ✅ BUG-DASH-001 regression: Mark Fixed still works after overhaul
9. ✅ Quality gates: tsc, vitest, build, extension loads, server health 200
10. ✅ **Founder sign-off**

**If gate FAILS:** Fix. Phase 2 does NOT start. Non-negotiable.

---

## PHASE 2: Backend + LLM + Agent (~35V, Week 2-3)

Items with NO Phase 1 dependency can start parallel during Week 2.

### Week 2 Parallel Starts (no Phase 1 dependency)

| Task | Priority | Owner | Cost | Blocked By |
|---|---|---|---|---|
| S07-08a: vigil_agent scaffold + config | 🟠 P1 | `[CTO]` | ~1V | — |
| S07-15: Neon PostgreSQL migration | 🟠 P1 | `[DEV:server]` | ~4V | — |
| S07-01: AGENTS `/api/v1/vigil/suggest` endpoint | 🟠 P1 | `[DEV:agents]` | ~4V | — (nightingale) |

### Week 3 (unblocked by S07-01)

| Task | Priority | Owner | Cost | Blocked By |
|---|---|---|---|---|
| S07-04: Server `VIGIL_LLM_MODE=live` | 🟠 P1 | `[DEV:server]` | ~2V | S07-01 |
| S07-02: Prompt templates | 🟠 P1 | `[DEV:agents]` | ~3V | S07-01 |
| S07-05: Returning bug detection | 🟠 P1 | `[DEV:server]` | ~3V | S07-04 |
| S07-06: Bug auto-complete in editor | 🟠 P1 | `[DEV:ext]` | ~3V | S07-04 |
| S07-08b-d: vigil_agent (classify → test → fix) | 🟠 P1 | `[CTO]` | ~4V | S07-04, S07-08a |
| S07-14: Vercel deployment | 🟡 P2 | `[INFRA]` | ~2V | S07-15 |
| S07-10: Integration tests | 🟡 P2 | `[QA]` | ~2V | S07-04, S07-06 |
| S07-22: HTTP route integration tests (S06 B03) | 🟡 P2 | `[QA]` | ~1.5V | S07-15 |

### Stretch (defer to S08 if needed)

| Task | Cost | Reason |
|---|---|---|
| S07-03: resource_manager tracking | ~2V | Nice-to-have cost visibility |
| S07-07: Severity auto-suggest | ~2V | UX polish |
| S07-09: Sprint health report | ~2V | Enhancement to bug-review |

---

## Summary by Phase

| Phase | Priority Breakdown | Total |
|---|---|---|
| Phase 1 | P0: ~5V, P1: ~13V, P2: ~2V | ~20V |
| Phase 2 core | P1: ~25V | ~25V |
| Phase 2 stretch | P2: ~10V | ~10V |
| **Total** | | **~55V** |

---

## Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Phase 1 UX iteration takes longer than 2 weeks | HIGH — delays Phase 2 | MEDIUM | Ship S07-16 MVP in W1, iterate in W2. Split S07-17 into 17a/17b (D022). |
| R2 | AGENTS Sprint 06 slips → S07-01 delayed | HIGH — blocks Phase 2 LLM work | MEDIUM | S07-01 starts W2 parallel. Delay only shifts W3 items. Phase 1 unaffected. |
| R3 | Neon migration (S07-15) takes longer than 4V | MEDIUM — blocks S07-14 | LOW | Schema is simple (4 tables). S07-15 starts W2. |
| R4 | FAT Round 3 fails | HIGH — blocks Phase 2 | MEDIUM | Fix-in-place. Phase 2 parallel items (S07-08a, S07-15, S07-01) unaffected. |
| R5 | 55V budget overrun | MEDIUM — sprint extends | HIGH | Phase 1 core = 20V. Phase 2 core = 25V. Accept partial stretch delivery. |
| R6 | `vigil_agent` safety concerns | HIGH — must never break main | LOW | Dry-run first. Branch-only. Max iterations. Avi merges. (D013) |

---

## Agent Readiness

| Agent | Kickoff File | Status |
|---|---|---|
| `[DEV:ext]` | `sprint_07_kickoff_dev.md` | 🟢 READY |
| `[DEV:server]` | `sprint_07_kickoff_dev.md` | 🟢 READY |
| `[DEV:dashboard]` | `sprint_07_kickoff_dev.md` | 🟢 READY |
| `[DEV:agents]` | `sprint_07_kickoff_agents.md` | 🟢 READY (created 2026-02-27) |
| `[QA]` | `sprint_07_kickoff_qa.md` | 🟢 READY |
| `[CTO]` | `sprint_07_kickoff_dev.md` (Track D) | 🟢 READY |
| `[INFRA]` | `sprint_07_kickoff_infra.md` | 🟢 READY (created 2026-02-27) |

---

## Definition of Done — Sprint 07

### Phase 1 (required for FAT Round 3):
- [ ] Session creation is project-oriented with auto-sprint + history (S07-16)
- [ ] Dashboard has project/sprint/session navigation with filters (S07-17a)
- [ ] Dashboard has session timeline + replay (S07-17b)
- [ ] Dashboard has component tests for new components (S07-13)
- [ ] VIGILSession survives service worker restart (S07-12)
- [ ] Ghost sessions recoverable from side panel (S07-18)
- [ ] Manifest shortcut: `Alt+Shift+B` default (S07-19)
- [ ] `packages/shared/` exists with Zod schemas (S07-11)
- [ ] Carry-forward bugs fixed: BUG-EXT-001 (S07-20), BUG-EXT-002 (S07-21)
- [ ] FAT Round 3: 13/13 PASS + Founder sign-off

### Phase 2 (full sprint closure):
- [ ] `POST /api/v1/vigil/suggest` returns real LLM responses (S07-01)
- [ ] vigil-server `VIGIL_LLM_MODE=live` routes to AGENTS correctly (S07-04)
- [ ] Bug editor pre-fills title + steps from LLM with graceful fallback (S07-06)
- [ ] Returning bug detected on known fixed bug re-entry (S07-05)
- [ ] `vigil_agent` runs full classify → test → fix → commit loop (S07-08a-d)
- [ ] All agent fixes on `vigil/fixes/sprint-XX` branch, never main
- [ ] Bug/feature storage on Neon PostgreSQL — CRUD verified (S07-15)
- [ ] Integration tests pass: ext → server → AGENTS round-trip (S07-10)
- [ ] All gates green: tsc, vitest, build, extension loads, server health

---

## Key Decisions (D016-D023)

| ID | Decision |
|---|---|
| D016 | Neon fallback: filesystem in local dev, 503 in serverless |
| D017 | AGENTS timeout: 10s. On failure → empty suggestion, confidence 0 |
| D018 | Dashboard overhaul is incremental rewrite, existing testids preserved |
| D019 | vigil_agent exhaustion: log BLOCKED, move to next bug, report at end |
| D020 | Project field: check folder exists. Sprint auto-detect is convenience, not gate |
| D021 | Sprint restructured: Phase 1 (UX) + Phase 2 (Backend) with FAT gate |
| D022 | S07-17 split: 17a (nav+filters, 3V) + 17b (timeline+replay, 3V) |
| D023 | Carry-forward bugs get task IDs: S07-20, S07-21, S07-22 |

---

*Sprint 07 plan produced: 2026-02-27 | Restructured: 2026-02-27 per CPTO Design Review (D021) | Owner: [CPTO] | Approval: [FOUNDER] pending*

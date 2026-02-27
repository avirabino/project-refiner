# Sprint 07 — Execution Plan

> **Produced by:** [CPTO] | **Date:** 2026-02-27
> **Approved by:** [FOUNDER] — pending
> **Budget:** ~51V (core P0+P1: ~36V, stretch P2: ~16V, defer P3: ~2.5V)
> **Version target:** 2.1.0

---

## Priority Legend

| Color | Priority | Meaning |
|---|---|---|
| 🔴 | **P0** | Critical path blocker — everything downstream is blocked |
| 🟠 | **P1** | Core feature — must ship this sprint |
| 🟡 | **P2** | Important — ship if capacity allows |
| 🟢 | **P3** | Low priority — can defer to S08 |

---

## Task Board

| ID | Deliverable | Track | Priority | Cost | Owner | Blocked By |
|---|---|---|---|---|---|---|
| S07-01 | AGENTS `/api/v1/vigil/suggest` endpoint | A — AGENTS | 🔴 P0 | ~4V | `[DEV:agents]` | — |
| S07-02 | `llm_core` prompt templates | A — AGENTS | 🟠 P1 | ~3V | `[DEV:agents]` | S07-01 |
| S07-03 | `resource_manager` Vigil usage tracking | A — AGENTS | 🟡 P2 | ~2V | `[DEV:agents]` | S07-01 |
| S07-04 | vigil-server `VIGIL_LLM_MODE=live` | B — Server | 🔴 P0 | ~2V | `[DEV:server]` | S07-01 |
| S07-05 | Returning bug detection (semantic similarity) | B — Server | 🟠 P1 | ~3V | `[DEV:server]` | S07-02, S07-04 |
| S07-06 | Bug auto-complete in editor (LLM pre-fill) | C — Ext | 🟠 P1 | ~3V | `[DEV:ext]` | S07-04 |
| S07-07 | Severity auto-suggest (confidence score) | B — Server | 🟡 P2 | ~2V | `[DEV:server]` + `[DEV:ext]` | S07-04 |
| S07-08a | `vigil_agent` scaffold + config | D — Agent | 🟠 P1 | ~1V | `[CTO]` | — |
| S07-08b | Bug analysis + classification | D — Agent | 🟠 P1 | ~1.5V | `[CTO]` + `[DEV:ext]` | S07-08a, S07-04 |
| S07-08c | Regression test generation (RED confirmation) | D — Agent | 🟠 P1 | ~1.5V | `[CTO]` + `[QA]` | S07-08b |
| S07-08d | Fix implementation (GREEN + branch commit) | D — Agent | 🟠 P1 | ~1V | `[CTO]` | S07-08c |
| S07-09 | Sprint health report (LLM-generated) | D — Agent | 🟡 P2 | ~2V | `[CTO]` + `[DEV:server]` | S07-04 |
| S07-10 | Integration tests: ext → server → AGENTS | QA | 🟡 P2 | ~2V | `[QA]` | S07-04, S07-06 |
| S07-11 | Shared types package (`packages/shared/`) | E — Carry | 🟠 P1 | ~2V | `[DEV:server]` | — |
| S07-12 | VIGILSession persistence (`chrome.storage.local`) | E — Carry | 🟠 P1 | ~1.5V | `[DEV:ext]` | — |
| S07-13 | Dashboard vitest config + component tests | E — Carry | 🟢 P3 | ~1V | `[DEV:dashboard]` | — |
| S07-14 | Vercel deployment (serverless + static) | F — Cloud | 🟡 P2 | ~2V | `[INFRA]` + `[DEV:server]` | S07-15 |
| S07-15 | Neon PostgreSQL (replace filesystem storage) | F — Cloud | 🟠 P1 | ~4V | `[DEV:server]` | — |
| S07-16 | Project-oriented session model | G — Founder | 🟠 P1 | ~5V | `[DEV:ext]` | — |
| S07-17 | Dashboard overhaul: nav, screenshots, replay | G — Founder | 🟡 P2 | ~6V | `[DEV:dashboard]` | S07-15, S07-16 |
| S07-18 | Ghost session recovery UX | G — Founder | 🟢 P3 | ~1V | `[DEV:ext]` | — |
| S07-19 | Manifest shortcut fix (`Alt+Shift+B`) | G — Founder | 🟢 P3 | ~0.5V | `[DEV:ext]` | — |

---

## Summary by Priority

| Priority | Items | Total Cost | % of Budget |
|---|---|---|---|
| 🔴 P0 | S07-01, S07-04 | ~6V | 12% |
| 🟠 P1 | S07-02, 05, 06, 08a-d, 11, 12, 15, 16 | ~30V | 59% |
| 🟡 P2 | S07-03, 07, 09, 10, 14, 17 | ~16V | 31% |
| 🟢 P3 | S07-13, 18, 19 | ~2.5V | 5% |

---

## Summary by Owner

| Owner | Items | Total Cost |
|---|---|---|
| `[DEV:agents]` | S07-01, 02, 03 | ~9V |
| `[DEV:server]` | S07-04, 05, 07, 11, 15 | ~13V |
| `[DEV:ext]` | S07-06, 12, 16, 18, 19 | ~11V |
| `[DEV:dashboard]` | S07-13, 17 | ~7V |
| `[CTO]` | S07-08a-d, 09 | ~7V |
| `[QA]` | S07-10 | ~2V |
| `[INFRA]` | S07-14 | ~2V |

---

## Execution Schedule — 3-Week Sprint

### Week 1 — Foundation (no AGENTS dependency)

**Goal:** Ship all unblocked items. Build foundation while AGENTS endpoint is developed.

| Day | Task | Owner | Cost |
|---|---|---|---|
| D1 | S07-19: Manifest shortcut fix (`Alt+Shift+B`) | `[DEV:ext]` | ~0.5V |
| D1-D2 | S07-11: Shared types package — extract Zod schemas to `packages/shared/` | `[DEV:server]` | ~2V |
| D1-D2 | S07-08a: `vigil_agent` scaffold — command file + config + dry-run | `[CTO]` | ~1V |
| D1-D3 | S07-12: VIGILSession persistence — `chrome.storage.local` hydration | `[DEV:ext]` | ~1.5V |
| D2-D4 | S07-16: Project-oriented session model — new form, auto-sprint, history | `[DEV:ext]` | ~5V |
| D1-D5 | S07-15: Neon PostgreSQL — schema, driver, migrate reader/writer/counter | `[DEV:server]` | ~4V |
| D1-D5 | S07-01: AGENTS `/api/v1/vigil/suggest` endpoint (cross-project) | `[DEV:agents]` | ~4V |

**Week 1 output:** ~18V delivered. S07-19 ✓, S07-11 ✓, S07-08a ✓, S07-12 ✓, S07-16 in progress, S07-15 in progress, S07-01 in progress.

**Week 1 parallel lanes:**
```
Lane 1 [DEV:ext]:     S07-19 (0.5d) → S07-12 (2d) → S07-16 (3d, continues W2)
Lane 2 [DEV:server]:  S07-11 (2d) → S07-15 (4d, continues W2)
Lane 3 [CTO]:         S07-08a (2d) → available for reviews / S07-08b prep
Lane 4 [DEV:agents]:  S07-01 (5d, continues W2)
```

---

### Week 2 — AGENTS Integration + Core Features

**Goal:** S07-01 lands → unlock Tracks B/C/D. Ship LLM features.

| Day | Task | Owner | Cost |
|---|---|---|---|
| D6-D7 | S07-04: Flip `VIGIL_LLM_MODE=live`, wire vigil-server → AGENTS | `[DEV:server]` | ~2V |
| D6-D8 | S07-02: Prompt templates (bug title, steps, severity, similarity) | `[DEV:agents]` | ~3V |
| D7-D9 | S07-06: Bug auto-complete in extension editor | `[DEV:ext]` | ~3V |
| D7-D9 | S07-08b: Bug analysis + classification (via AGENTS) | `[CTO]` | ~1.5V |
| D8-D10 | S07-05: Returning bug detection | `[DEV:server]` | ~3V |
| D9-D10 | S07-08c: Regression test generation + RED confirmation | `[CTO]` + `[QA]` | ~1.5V |

**Week 2 output:** ~14V delivered. Critical path unblocked. LLM features live.

**Week 2 parallel lanes:**
```
Lane 1 [DEV:ext]:     S07-16 finish (1d) → S07-06 (3d)
Lane 2 [DEV:server]:  S07-15 finish (1d) → S07-04 (2d) → S07-05 (3d)
Lane 3 [CTO]:         S07-08b (3d) → S07-08c (2d)
Lane 4 [DEV:agents]:  S07-01 finish (1d) → S07-02 (3d)
```

---

### Week 3 — Agent Loop + Stretch Goals + QA

**Goal:** Complete vigil_agent loop. Ship stretch (P2) items if capacity allows. Integration tests.

| Day | Task | Owner | Cost |
|---|---|---|---|
| D11 | S07-08d: Fix implementation + GREEN + branch commit | `[CTO]` | ~1V |
| D11-D12 | S07-10: Integration tests (ext → server → AGENTS) | `[QA]` | ~2V |
| D11-D12 | S07-07: Severity auto-suggest *(stretch)* | `[DEV:server]` + `[DEV:ext]` | ~2V |
| D11-D12 | S07-03: resource_manager tracking *(stretch)* | `[DEV:agents]` | ~2V |
| D12-D13 | S07-09: Sprint health report *(stretch)* | `[CTO]` | ~2V |
| D12-D14 | S07-14: Vercel deployment *(stretch)* | `[INFRA]` | ~2V |
| D13-D15 | S07-17: Dashboard overhaul *(stretch — likely carries to S08)* | `[DEV:dashboard]` | ~6V |
| D14-D15 | S07-18: Ghost session recovery *(if time)* | `[DEV:ext]` | ~1V |

**Week 3 output:** ~12-18V depending on stretch capacity.

---

## Deferred to S08 (if not completed)

| ID | Deliverable | Reason |
|---|---|---|
| S07-13 | Dashboard vitest config | Dashboard rewrite (S07-17) makes old tests waste. Write tests for new dashboard instead. |
| S07-17 | Dashboard overhaul (partial) | 6V is large — may only ship navigation + filters in S07, replay in S08. |
| S07-18 | Ghost session recovery | P3. Quick fix but lower priority than core LLM features. |

---

## Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | AGENTS Sprint 06 slips → S07-01 delayed | HIGH — blocks Tracks B/C/D | MEDIUM | Week 1 is all unblocked items. AGENTS delay shifts W2 tasks to W3. |
| R2 | Neon PostgreSQL migration (S07-15) takes longer than 4V | MEDIUM — blocks S07-14, S07-17 | LOW | Schema is simple (4 tables). Driver is well-documented. |
| R3 | Project-oriented session model (S07-16) UX iteration | MEDIUM — Founder may request changes | HIGH | Ship MVP in W1, iterate in W2 based on feedback. |
| R4 | `vigil_agent` (S07-08) safety concerns | HIGH — agent must never break main | LOW | Dry-run mode first. Branch-only. Max iterations. Avi merges. |
| R5 | 51V budget overrun | MEDIUM — sprint extends | HIGH | Core = 36V (P0+P1). Stretch = 16V. Accept partial P2 delivery. |

---

## Critical Path

```
S07-01 (AGENTS endpoint)
  → S07-04 (server live mode)
    → S07-05 (returning bug detection)
    → S07-06 (bug auto-complete)
      → S07-10 (integration tests)
    → S07-08b (bug classification)
      → S07-08c (regression test gen)
        → S07-08d (fix implementation)
```

**Parallel paths (no blockers):**
```
S07-11 (shared types)     ─── start Day 1
S07-12 (session persist)  ─── start Day 1
S07-15 (Neon PostgreSQL)  ─── start Day 1
S07-16 (project sessions) ─── start Day 1
S07-19 (shortcut fix)     ─── start Day 1 (10 min)
S07-08a (agent scaffold)  ─── start Day 1
```

---

## Definition of Done — Sprint 07

- [ ] `POST /api/v1/vigil/suggest` returns real LLM responses (S07-01)
- [ ] vigil-server `VIGIL_LLM_MODE=live` routes to AGENTS correctly (S07-04)
- [ ] Bug editor pre-fills title + steps from LLM with graceful fallback (S07-06)
- [ ] Returning bug detected and escalated on known fixed bug re-entry (S07-05)
- [ ] `vigil_agent` runs full classify → test → fix → commit loop (S07-08a-d)
- [ ] All agent fixes on `vigil/fixes/sprint-XX` branch, never main (S07-08d)
- [ ] `packages/shared/` exists with Zod schemas; ext + server import from it (S07-11)
- [ ] VIGILSession survives service worker restart (S07-12)
- [ ] Bug/feature storage on Neon PostgreSQL — CRUD verified (S07-15)
- [ ] Session creation is project-oriented with auto-sprint + history (S07-16)
- [ ] Manifest shortcut: `Alt+Shift+B` default (S07-19)
- [ ] Integration tests pass: ext → server → AGENTS round-trip (S07-10)
- [ ] All gates green: tsc, vitest, build, extension loads, server health

---

*Sprint 07 plan produced: 2026-02-27 | Owner: [CPTO] | Approval: [FOUNDER] pending*

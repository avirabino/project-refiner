# Sprint 08 — Index

**Goal:** Wire the AGENTS platform as Vigil's LLM backend. Ship bug auto-complete, returning bug detection, severity auto-suggest, and the autonomous `vigil_agent` resolution loop.

**Depends on:** Sprint 07 complete (dashboard, Neon, Vercel all live)
**Version target:** `2.2.0`
**Budget:** ~28V (carried from Sprint 07 D029)
**Prerequisite:** AGENTS project running locally (`http://localhost:8000`), Neon DB live (Sprint 07), Vercel deployed (Sprint 07)

---

## Context

Sprint 07 delivered the full platform: extension UX, dashboard, Neon PostgreSQL, Vercel deployment.
Sprint 08 adds the intelligence layer — all LLM/AGENTS integration deferred per D029.

The architecture principle: **Vigil never owns LLM logic.** All inference runs through AGENTS `llm_core`.

```
vigil-ext  →  vigil-server (:7474 / Vercel)
                  → Neon PostgreSQL (storage)
                  → AGENTS FastAPI (:8000)
                       → llm_core (Groq / Claude / fallback)
                       → resource_manager (token accounting)
                       → returns structured suggestion
```

---

## Scope

> All items carried from Sprint 07 Phase 2 (D029). IDs preserved for traceability.

| ID | Track | Deliverable | Priority | Cost | Owner | Notes |
|---|---|---|---|---|---|---|
| S07-01 | AGENTS | Add `/api/v1/vigil/suggest` endpoint to AGENTS project | 🔴 P0 | ~4V | `[DEV:ai]` | **Critical path.** nightingale repo. Unblocks everything. |
| S07-02 | AGENTS | `llm_core` prompt templates for bug auto-complete + similarity | 🟠 P1 | ~3V | `[DEV:ai]` | nightingale repo. After S07-01. |
| S07-04 | SERVER | Flip `VIGIL_LLM_MODE=live`, wire vigil-server → AGENTS API | 🟠 P1 | ~2V | `[DEV:ai]` | vigil repo. After S07-01. |
| S07-06 | EXT | Bug auto-complete in editor (title + steps pre-fill from LLM) | 🟠 P1 | ~3V | `[DEV:ai]` | BugEditor.tsx. After S07-04. |
| S07-05 | SERVER | Returning bug detection: semantic similarity on new bug receipt | 🟠 P1 | ~3V | `[DEV:app]` | After S07-04. Consumes AGENTS response. |
| S07-08a | AGENT | `vigil_agent` scaffold: command + config (dry-run) | 🟠 P1 | ~1V | `[DEV:ai]` | No deps. Can start Day 1. |
| S07-08b | AGENT | Bug analysis + classification | 🟠 P1 | ~1.5V | `[DEV:ai]` | After S07-04. Sequential gate. |
| S07-08c | AGENT | Regression test generation + red confirmation | 🟠 P1 | ~1.5V | `[DEV:ai]` | After S07-08b. Sequential gate. |
| S07-08d | AGENT | Fix implementation + green confirmation + branch commit | 🟠 P1 | ~1V | `[DEV:ai]` | After S07-08c. Sequential gate. |
| S07-07 | SERVER | Severity auto-suggest (confidence score shown, user overrides) | 🟡 P2 | ~2V | `[DEV:app]` | Stretch. After S07-04. |
| S07-03 | AGENTS | `resource_manager` Vigil usage tracking | 🟡 P2 | ~2V | `[DEV:ai]` | Stretch. nightingale repo. |
| S07-09 | AGENT | Sprint health report (LLM-generated) | 🟡 P2 | ~2V | `[DEV:ai]` | Stretch. After S07-04. |
| S07-10 | QA | Integration tests: ext → server → AGENTS round-trip | 🟡 P2 | ~2V | `[QA]` | After S07-04. |

**Core P0+P1: ~21V | Stretch P2: ~8V | Total: ~28V**

---

## Dependency Chain

```
Day 1 (parallel):
  [DEV:ai]    S07-08a (scaffold, no deps)
  [DEV:ai]    S07-01 (AGENTS endpoint — critical path)

After S07-01:
  [DEV:ai]    S07-02 (prompts) → S07-04 (flip live mode)

After S07-04:
  [DEV:ai]    S07-06 (auto-complete UI)
  [DEV:ai]    S07-08b → S07-08c → S07-08d (agent chain, sequential)
  [DEV:app]   S07-05 (returning bug detection)
  [DEV:app]   S07-07 (severity auto-suggest, stretch)

After S07-04:
  [QA]        S07-10 (round-trip integration tests)
```

**Critical path:** S07-01 → S07-02 → S07-04 → S07-06 / S07-08b-d
**Parallel:** S07-08a (Day 1) + S07-05/S07-07 (after S07-04)

---

## Team

| Tag | Scope |
|---|---|
| `[DEV:ai]` | AGENTS endpoint, prompts, live mode, auto-complete UI, vigil_agent |
| `[DEV:app]` | Returning bug detection (S07-05), severity auto-suggest (S07-07) |
| `[QA]` | AGENTS round-trip integration tests, agent safety gate validation |

---

## Key Decisions (inherited)

| ID | Decision | Source |
|---|---|---|
| D001 | AGENTS is the LLM platform — vigil-server is a thin consumer | Sprint 07 |
| D006 | LLM auto-complete is always optional — UI works if AGENTS offline | Sprint 07 |
| D013 | `vigil_agent` safety gates: dryRun, maxIterations, branch-only | Sprint 07 |
| D017 | Groq `llama-3.3-70b-versatile` as default model for latency | Sprint 07 |
| D029 | All AI deferred from Sprint 07 — IDs preserved | Sprint 07 |

---

## Definition of Done

- [ ] `POST /api/v1/vigil/suggest` returns real LLM response from AGENTS
- [ ] vigil-server `VIGIL_LLM_MODE=live` routes to AGENTS correctly
- [ ] Bug editor pre-fills title + steps from LLM (with fallback if LLM down)
- [ ] Returning bug correctly detected and escalated on known fixed bug re-entry
- [ ] `vigil_agent` runs full red→green loop autonomously
- [ ] All fixes committed to `vigil/fixes/sprint-XX` branch (not main)
- [ ] Integration tests: ext → server → AGENTS round-trip passes
- [ ] Severity suggestion shown with confidence score (stretch)
- [ ] Sprint health report generated (stretch)

---

*Sprint 08 created: 2026-03-01 | Status: PLANNED | Depends on Sprint 07 | Owner: CPTO*

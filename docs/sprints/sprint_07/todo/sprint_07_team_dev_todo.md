# Sprint 07 — DEV Team Deliverable Checklist

**Sprint goal:** Wire AGENTS LLM backend, ship vigil_agent autonomous loop, deploy to Vercel + Neon, project-oriented sessions + dashboard overhaul
**Budget:** ~51V (core P0+P1: ~36V) | **Ports:** 7474 (vigil-server), 8000 (AGENTS) | **LLM:** live (Groq llama-3.3-70b-versatile)

---

## Track A — AGENTS Integration `[cross-project, FLAG]` (CRITICAL PATH)

> ⚠️ Executes in `nightingale` repo under AGENTS Sprint 06 (D014). Vigil Track B is blocked until this ships.

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-01 | AGENTS `/api/v1/vigil/suggest` endpoint | ~4V | `backend/app/api/routes/vigil.py` — Groq `llama-3.3-70b-versatile`, X-Vigil-Key auth |
| [ ] | S07-02 | Prompt templates for bug suggest + similarity | ~3V | `backend/modules/llm_core/prompts/vigil/` — 4 Jinja2 templates |
| [ ] | S07-03 | resource_manager Vigil tracking | ~2V | Tag all calls with `project_id="vigil"`, `feature="suggest"` |

**Track A total: ~9V**

---

## Track B — Server Live Mode `[DEV:server]`

> Blocked on Track A — AGENTS endpoint must be deployed first.

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-04 | Flip `VIGIL_LLM_MODE=live`, wire → AGENTS API | ~2V | `packages/server/src/llm-client.ts` — fetch + timeout + fallback |
| [ ] | S07-05 | Returning bug detection (semantic similarity) | ~3V | On new bug → load fixed bugs → call AGENTS similarity → auto-escalate if >0.8 |
| [ ] | S07-07 | Severity auto-suggest (confidence score) | ~2V | Confidence indicator next to dropdown in bug editor |

**Track B total: ~7V**

---

## Track C — Extension LLM Features `[DEV:ext]`

> Blocked on Track B — server must forward to AGENTS.

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-06 | Bug auto-complete in editor (title + steps pre-fill) | ~3V | `BugEditor.tsx` — sends to /api/suggest, pre-fills fields, overridable |

**Track C total: ~3V**

---

## Track D — Autonomous Agent `[DEV:*]`

> Blocked on Track B — needs live MCP tools + live LLM. Sub-tasks have sequential safety gates (D013).

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-08a | Agent scaffold: command + config (dry-run, max time/cost) | ~1V | `.claude/commands/vigil-agent.md` + config in `vigil.config.json` |
| [ ] | S07-08b | Bug classification (reproducible / needs-info / code-defect / UX-issue) | ~1.5V | Classification only — zero code changes |
| [ ] | S07-08c | Regression test generation + RED confirmation | ~1.5V | Stops after RED — does NOT attempt fix |
| [ ] | S07-08d | Fix implementation + GREEN confirmation + branch commit | ~1V | Branch-only: `vigil/fixes/sprint-XX`. Avi merges. |
| [ ] | S07-09 | Sprint health report (LLM-generated summary) | ~2V | Open bugs, returning bugs, regression tests, closure recommendation |

**Track D total: ~7V**

---

## Track E — Carry-Forward `[DEV:server/ext/dashboard]`

> No dependencies on AGENTS. Can start immediately in parallel.

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-11 | Shared types package (`packages/shared/`) | ~2V | Zod schemas + `z.infer<>` types, ext + server import from one source |
| [ ] | S07-12 | VIGILSession persistence (chrome.storage.local) | ~1.5V | Persist on state change, rehydrate on service worker restart |
| [ ] | S07-13 | Dashboard vitest config + component tests | ~1V | BugList, FeatureList, SprintSelector, HealthIndicator |

**Track E total: ~4.5V**

---

## Track F — Cloud Infrastructure `[DEV:server]`

> No AGENTS dependency. S07-15 (Neon) first, then S07-14 (Vercel). Can start once Sprint 06 server is stable.

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-15 | Neon PostgreSQL: migrate filesystem storage to managed Postgres | ~4V | `packages/server/src/db/` — schema, driver, migration, seed script. Resolves S06 U01 (race condition) + U02 (markdown fragility) |
| [ ] | S07-14 | Vercel deployment: vigil-server (serverless) + dashboard (static) | ~2V | `vercel.json` + Express → serverless adaptation. Needs S07-15 first. |

**Track F total: ~6V**

---

## ⚡ Track G — PHASE 1: Founder UX Priority `[DEV:ext/dashboard]`

> **RESTRUCTURED per D021:** Phase 1 items ship FIRST. FAT Round 3 gate before Phase 2.
> Full requirements: `todo/sprint_07_product_vision.md`

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-16 | Project-oriented session model: required project field, auto-sprint, persistent history | ~5V | 🔴 **P0** — `[DEV:ext]` — PHASE 1 TOP PRIORITY. New session form, data model, history. W1-W2. |
| [ ] | S07-19 | Manifest shortcut fix: `Ctrl+Shift+B` → `Alt+Shift+B` default | ~0.5V | 🟠 **P1** — `[DEV:ext]` — One-line `manifest.json` change (BUG-FAT-010). Ship D1. |
| [ ] | S07-18 | Ghost session recovery: "End stale session" button in side panel | ~1V | 🟠 **P1** — `[DEV:ext]` — Detect orphaned sessions, allow user to end them. W1. |
| [ ] | S07-17a | Dashboard overhaul Phase A: project/sprint/session nav, filters, screenshots | ~3V | 🟠 **P1** — `[DEV:dashboard]` — Blocked by S07-16 (data model). W2. |
| [ ] | S07-17b | Dashboard overhaul Phase B: session timeline + recording replay | ~3V | 🟠 **P1** — `[DEV:dashboard]` — Blocked by S07-17a. W2. |

**Track G total: ~12.5V**

---

## Track H — Carry-Forward Bugs `[DEV:ext]`

> Sprint 06 deferred bugs + design review items that must be tracked in S07.
> Added per D023. Phase 1 items.

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-20 | BUG-EXT-001 fix: Playwright codegen generates invalid TypeScript | ~1V | 🟡 P2 — `[DEV:ext]` — Fix regex at `playwright-codegen.ts:110`, unskip test. W1. |
| [ ] | S07-21 | BUG-EXT-002: btn-publish testid implementation (or test removal) | ~1V | 🟡 P2 — `[DEV:ext]` — Spec-first gap from S06. Implement or remove test. W1. |
| [ ] | S07-22 | HTTP route integration tests (S06 Track B review B03 carry-forward) | ~1.5V | 🟡 P2 — `[QA]` — Phase 2. Write after S07-15 (Neon) changes data layer. W3. |

**Track H total: ~3.5V**

---

## QA `[QA]`

| Status | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|
| [ ] | S07-10 | Integration tests: ext → server → AGENTS round-trip | ~2V | Phase 2 — after Track B + Track C ship |
| [ ] | S07-22 | HTTP route integration tests (S06 B03 carry-forward) | ~1.5V | Phase 2 — after S07-15 (Neon) |

**QA total: ~3.5V**

---

## Dependency Summary

```
⚡ PHASE 1 — UX First (Week 1-2):
  Track G (Founder UX):   S07-19 (D1) → S07-12 (W1) → S07-16 (W1-W2) → S07-17a (W2) → S07-17b (W2)
  Track E (carry):        S07-11 (W1) → available
  Track H (carry bugs):   S07-20 + S07-21 (W1)
  ──── FAT Round 3 GATE ────

⚡ PHASE 2 — Backend + LLM (Week 2-3):
  Track A (AGENTS) ─── Phase 2 critical path ───→ Track B (server live)
                                                        ├──→ Track C (ext LLM features)
                                                        ├──→ Track D (vigil_agent)
                                                        └──→ QA (S07-10)
  Track F (cloud infra)  ─── no AGENTS dep ────→ S07-15 (Neon W2) → S07-14 (Vercel W3)

  Track D sub-tasks are sequential:
    S07-08a (scaffold W1-2) → S07-08b (classify) → S07-08c (test gen) → S07-08d (fix)
```

---

*Generated: 2026-02-26 | Updated: 2026-02-27 (restructured: Phase 1 UX + Phase 2 Backend per D021. Added Track H carry-forward bugs per D023.) | Sprint 07 | Owner: CPTO*

# Sprint 07 — Team Deliverable Checklist

**Sprint goal:** Project-oriented sessions + dashboard overhaul + Neon/Vercel infrastructure → FAT Round 3 → Founder acceptance
**Budget:** ~29V (revised per D029) | **Ports:** 7474 (vigil-server) | **LLM:** mock (AI deferred to Sprint 08)

**Team (D029):** `[DEV:app]` + `[QA]` | `[DEV:ai]` — no Sprint 07 work (all AI → Sprint 08)

---

## Completed

| Status | ID | Deliverable | Cost | Owner | Done |
|---|---|---|---|---|---|
| [x] | S07-12 | VIGILSession persistence (chrome.storage.local) | ~0V | `[DEV:app]` | 2026-02-28 |
| [x] | S07-16 | Project-oriented session model | ~5V | `[DEV:app]` | 2026-02-28 |
| [x] | S07-18 | Ghost session recovery | ~1V | `[DEV:app]` | 2026-02-28 |
| [x] | S07-19 | Manifest shortcut fix (Ctrl+Shift+B → Alt+Shift+B) | ~0.5V | `[DEV:app]` | 2026-02-28 |
| [x] | S07-20 | BUG-EXT-001 codegen fix | ~1V | `[DEV:app]` | 2026-02-28 |
| [x] | S07-21 | BUG-EXT-002 btn-publish testid | ~1V | `[DEV:app]` | 2026-02-28 |
| [x] | — | E2E regression fix (25→0 failures, D026) | — | `[DEV:app]` | 2026-03-01 |
| [x] | S07-11 | Shared types package (`packages/shared/`) | ~2V | `[DEV:app]` | 2026-03-01 |
| [x] | S07-16b | Session read API (GET /api/sessions) | ~1.5V | `[DEV:app]` | 2026-03-01 |
| [x] | S07-17a | Dashboard overhaul Phase A: nav, filters, screenshots | ~3V | `[DEV:app]` | 2026-03-01 |
| [x] | S07-17b | Dashboard overhaul Phase B: timeline + replay | ~3V | `[DEV:app]` | 2026-03-01 |
| [x] | S07-13 | Dashboard vitest config + component tests (88 tests) | ~1V | `[DEV:app]` | 2026-03-01 |
| [x] | — | QA regression gate (Q712-Q717 all PASS) | — | `[QA]` | 2026-03-01 |
| [x] | — | QA dashboard E2E stubs (18 fixme stubs) | — | `[QA]` | 2026-03-01 |

**Phase 1 complete.** Commit `fb929d2`. Test baseline: 310 vitest (222 root + 88 dashboard), 37/38 E2E.

---

## ⚡ Phase 1 — COMPLETE ✅

All Phase 1 deliverables shipped and DR-accepted. FAT Round 3 gate pending Founder acceptance.

---

## 🔧 Phase 2 — Infrastructure (after FAT Round 3)

### `[DEV:app]` — Application Developer

| Status | Order | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|---|
| [x] | 1 | S07-15 | Neon PostgreSQL: migrate + seed + verify | ~4V | DONE 2026-03-01. Schema applied, 9 sprints + 9 bugs + 2 sessions seeded. |
| [x] | 2 | S07-14 | Vercel deployment: verify + fix cloud routes | ~2V | DONE 2026-03-01. vigil-two.vercel.app live, storage=neon. |

### `[QA]` — Quality Assurance

| Status | Order | ID | Deliverable | Phase | Notes |
|---|---|---|---|---|---|
| [x] | 1 | S07-22 | HTTP route integration tests (44 tests) | 2 | DONE 2026-03-01. supertest + vitest, all 12 routes covered. |
| [x] | 2 | Q720 | Neon PostgreSQL CRUD verification | 2 | DONE 2026-03-01. All endpoints verified against Neon. |
| [x] | 3 | Q721 | Vercel health check (cloud URL) | 2 | DONE 2026-03-01. /health → {"status":"ok","storage":"neon"}. |

**Phase 2 total: ~7.5V**

---

## Dependency Chain

```
✅ PHASE 1 — Dashboard (Week 2): COMPLETE
  [DEV:app]   S07-17a ✅ → S07-17b ✅ → S07-13 ✅
  [QA]        Regression ✅ → Q712-Q717 ✅ → Stubs ✅
  ──── FAT Round 3 GATE (Founder acceptance) ⬜ ────

✅ PHASE 2 — Infrastructure (Week 3): COMPLETE
  [DEV:app]   S07-15 (Neon) ✅ → S07-14 (Vercel) ✅
  [QA]        S07-22 ✅ → Q720 ✅ → Q721 ✅
```

---

## Deferred to Sprint 08 (D029)

All AI/AGENTS work: S07-01, S07-02, S07-03, S07-04, S07-05, S07-06, S07-07, S07-08a/b/c/d, S07-09, S07-10 (~28V).
`[DEV:ai]` role activates in Sprint 08.

---

*Generated: 2026-02-26 | Updated: 2026-03-01 (Phase 1+2 COMPLETE. 354 tests green (266 root + 88 dashboard). All deliverables shipped.) | Sprint 07 | Owner: CPTO*

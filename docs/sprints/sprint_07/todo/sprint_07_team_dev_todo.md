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

---

## `[DEV:app]` — Application Developer

> Scope: Extension + Server + Dashboard + Infrastructure. All **Vigil repo** code.

### ⚡ Phase 1 — Dashboard (must pass FAT Round 3)

| Status | Order | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|---|
| [ ] | 1 | S07-17a | Dashboard overhaul Phase A: nav, filters, screenshots | ~3V | **NEXT.** S07-16b unblocked this. |
| [ ] | 2 | S07-17b | Dashboard overhaul Phase B: timeline + replay | ~3V | After S07-17a. |
| [ ] | 3 | S07-13 | Dashboard vitest config + component tests | ~1V | After S07-17a/b ship. |

**Phase 1 remaining: ~7V**

### 🔧 Phase 2 — Infrastructure (after FAT Round 3)

| Status | Order | ID | Deliverable | Cost | Notes |
|---|---|---|---|---|---|
| [ ] | 4 | S07-15 | Neon PostgreSQL migration | ~4V | Neon provisioned. Schema + migration + seed. |
| [ ] | 5 | S07-14 | Vercel deployment | ~2V | vercel.json + api/index.ts done. Verify + fix. |

**Phase 2: ~6V | `[DEV:app]` remaining: ~13V**

---

## `[QA]` — Quality Assurance

| Status | Order | ID | Deliverable | Phase | Notes |
|---|---|---|---|---|---|
| [ ] | 1 | — | Regression gate: 209 vitest + 38 E2E | Pre | Confirm baseline |
| [ ] | 2 | Q712 | New Session form: project required, sprint auto-detect | 1 | Verify S07-16 |
| [ ] | 3 | Q713 | Session name auto-gen + history persistence | 1 | chrome.storage.local |
| [ ] | 4 | Q714a | Dashboard Phase A: nav, filters, screenshots | 1 | After S07-17a |
| [ ] | 5 | Q714b | Dashboard Phase B: timeline + replay | 1 | After S07-17b |
| [ ] | 6 | Q715 | Ghost session recovery flow | 1 | Verify S07-18 |
| [ ] | 7 | Q716 | Service worker restart persistence | 1 | Kill worker → verify |
| [ ] | 8 | Q717 | Carry-forward bug regression (S07-20, S07-21) | 1 | Already green |
| — | — | **FAT** | **FAT Round 3 — Founder acceptance** | **Gate** | |
| [ ] | 9 | S07-22 | HTTP route integration tests | 2 | ~1.5V. After S07-15. |
| [ ] | 10 | Q720 | Neon PostgreSQL CRUD verification | 2 | After S07-15 |
| [ ] | 11 | Q721 | Vercel health check (cloud URL) | 2 | After S07-14 |

**`[QA]` total: ~1.5V (test code) + manual validation**

---

## Dependency Chain

```
⚡ PHASE 1 — Dashboard (Week 2):
  [DEV:app]   S07-17a → S07-17b → S07-13
  [QA]        Regression gate → Q712-Q717
  ──── FAT Round 3 GATE (Founder acceptance) ────

🔧 PHASE 2 — Infrastructure (Week 3):
  [DEV:app]   S07-15 (Neon) → S07-14 (Vercel)
  [QA]        S07-22 → Q720 → Q721
```

---

## Deferred to Sprint 08 (D029)

All AI/AGENTS work: S07-01, S07-02, S07-03, S07-04, S07-05, S07-06, S07-07, S07-08a/b/c/d, S07-09, S07-10 (~28V).
`[DEV:ai]` role activates in Sprint 08.

---

*Generated: 2026-02-26 | Updated: 2026-03-01 (D029: AI deferred to Sprint 08. S07-11 + S07-16b completed. Team: [DEV:app] + [QA] only. 209/209 vitest, 38/38 E2E green.) | Sprint 07 | Owner: CPTO*

# Design Review — Session POST + Neon Storage Layer

**Sprint:** 07 | **Phase:** FAT Round 3 — Post-Fix Review
**Author:** `[DEV:server]` | **Reviewer:** `[CTO]`
**Date:** 2026-03-03
**Scope:** Extension POST flow (`session-manager.ts`), Neon storage (`neon.ts`), schema (`schema.sql`), session API routes (`sessions.ts`)
**Trigger:** 3 bugs found during CPTO design review of session POST → Vercel → Neon flow

---

## Verdict: **APPROVED** | Grade: **B+** → **A-** (post-fix)

The session POST pipeline works end-to-end (extension → Vercel → Neon → API), but the initial implementation had silent error swallowing, a missing DB column, inefficient query patterns, and duplicated mapping code. All issues resolved in this review cycle. Grade upgraded from B+ (pre-fix) to A- (post-fix). Remaining flag: `sprint ?? ''` coercion in API responses conflates "no sprint" with "empty string" — deferred to dashboard contract review.

---

> **@[CTO]** — Inline review for your sign-off.
>
> This review covers the full session data path: extension `postWithRetry` → Vercel serverless → Neon INSERT → API SELECT → dashboard. Three FAT bugs were found and fixed, plus five additional issues caught during design review. All 8 items resolved. No regressions (266/266 vitest, tsc clean, build green).
>
> **Key architectural concern resolved:** The `sprint` and `description` fields were accepted by Zod validation at POST time but silently dropped at the Neon INSERT layer. This meant every session stored in production lost its sprint context — a data-loss bug masked by the fact that the 201 response looked successful. The fix adds first-class columns, updates INSERT/SELECT, and pushes sprint filtering into SQL WHERE (was previously an in-memory post-filter on all rows).
>
> **Action needed:** Review the "Flagged Only" items below and decide if the `sprint ?? ''` coercion warrants a follow-up ticket or is acceptable for Sprint 07 closure. Everything else is resolved.

---

## Standard Checks

- [x] TypeScript strict — `tsc --noEmit` clean
- [x] Vitest — 266/266 pass (23 test files), 0 regressions
- [x] Build — `npm run build` succeeds (3.29s)
- [x] Extension loads in Chrome — confirmed (dist/ updated)
- [x] Neon migration — `schema.sql` applied successfully, columns verified
- [x] Vercel deployed — `vigil-two.vercel.app/health` returns `{"status":"ok","storage":"neon"}`
- [x] Round-trip verified — POST `sprint:"07"` → GET → `sprint:"07"` confirmed live
- [x] No secrets in source — `.env` contains DATABASE_URL, not committed
- [x] Parameterized queries — all SQL uses `$N` parameters, no string interpolation

---

## Files Changed

| File | Lines Changed | What |
|---|---|---|
| `src/background/session-manager.ts` | 362-368 | BUG-A/C: error logging + HTTP backoff |
| `packages/server/src/storage/neon.ts` | 59-78, 217-234, 283-310, 312-321 | BUG-B: sprint/description INSERT/SELECT + DRY refactor |
| `packages/server/src/db/schema.sql` | 64-65 | BUG-B: sprint + description columns |
| `packages/server/src/routes/sessions.ts` | 28 | BAD-5: description in toDetail response |

---

## THE GOOD

**G01 — Zod remains the single source of truth.**
`VIGILSessionSchema` in `packages/shared/src/schemas.ts` defines the contract. The extension builds sessions against it, the POST route validates against it, and Neon storage now persists all its fields. Zero schema drift between layers.

**G02 — Storage interface abstraction held up.**
`StorageProvider` in `storage/types.ts` defines `writeSessionJson(session: VIGILSession)`. Adding sprint + description to Neon required zero interface changes — the typed `VIGILSession` parameter already carried the fields. `FilesystemStorage` also works unchanged since it writes the full JSON blob. Good polymorphism.

**G03 — Migration is idempotent.**
`CREATE TABLE IF NOT EXISTS` with inline `sprint TEXT, description TEXT` handles fresh databases. For existing databases, the migration already ran `ALTER TABLE ADD COLUMN IF NOT EXISTS`. Re-running `migrate.ts` is safe.

**G04 — Test fixtures were forward-compatible.**
`makeSession()` and `makeValidSessionPayload()` in `server-routes.test.ts` already included `sprint: '07'`. Tests didn't break when we added the column — evidence of good fixture design.

**G05 — Retry logging follows correct severity levels.**
`console.warn` for per-attempt recoverable errors (network glitch on attempt 1/3 is not fatal). `console.error` for terminal failure (all retries exhausted). This matches Chrome DevTools filtering conventions — developers can filter by level.

**G06 — Session state persistence survived the changes.**
`chrome.storage.local` persistence (`persistState` / `restoreVigilState`) correctly captures sprint and description since they're part of the `VIGILSession` object that gets serialized. No changes needed — the persistence layer was already generic.

---

## THE BAD (all fixed)

**BAD-1 (P1, FIXED): Silent error swallowing in `postWithRetry`** — `session-manager.ts:362`
The `catch` block had no logging. Network failures (DNS, timeout, CORS) produced zero console output. Developers had no way to distinguish "POST succeeded silently" from "POST failed silently."
**Fix:** Added `catch (e)` with `console.warn` per attempt + `console.error` summary on total failure.

**BAD-2 (P2, FIXED): sprint + description silently dropped on Neon INSERT** — `neon.ts:217-231`
`VIGILSessionSchema` has `sprint: z.string().optional()` and `description: z.string().optional()`. The extension sends both. Zod validation passes. But the INSERT had only 10 columns — sprint and description were accepted, validated, and then discarded. Data loss.
**Fix:** Added `$11, $12` parameters to INSERT. Added columns to `schema.sql`. Updated `listSessions` and `getSession` SELECT.

**BAD-3 (P2, FIXED): Sprint query was a JS post-filter, not SQL WHERE** — `neon.ts:275-305`
`listSessions(project?, sprint?)` loaded ALL sessions from Neon, Zod-parsed each row, then filtered by sprint in JavaScript. With the sprint column now available, this is O(N) wasted work. On a table with 10k sessions, this fetches and parses all 10k to return maybe 50.
**Fix:** Pushed `sprint = $N` into the SQL WHERE clause. Post-filter removed.

**BAD-4 (P2, FIXED): Row-to-session mapping duplicated** — `neon.ts:289-301` + `neon.ts:322-334`
`listSessions` and `getSession` had identical 13-line row→object conversion + Zod parse. Adding a column required updating both. Classic DRY violation.
**Fix:** Extracted `rowToSession()` helper function + `SESSION_SELECT_COLS` constant. Both methods now call the shared helper.

**BAD-5 (P2, FIXED): HTTP 500 responses retried with no backoff** — `session-manager.ts:354-361`
When `res.ok` was false (server returns 500), the code logged the error but fell through to the next loop iteration immediately — no sleep. Only the `catch` block (network errors) had backoff. Result: 3 instant retries hammering the server.
**Fix:** Added `await sleep(1000 * (i + 1))` after HTTP error logging, matching the catch block's backoff pattern.

**BAD-6 (P3, FIXED): `toDetail()` missing description** — `sessions.ts:24-68`
Sprint and description round-trip through storage correctly, but the GET `/api/sessions/:id` response formatter didn't include `description`. The field was stored but invisible to API consumers.
**Fix:** Added `description: s.description ?? ''` to `toDetail()`.

**BAD-7 (P3, FIXED): Stale comment in listSessions** — `neon.ts:275-278`
Comment said "sprint is in the JSON payload, filter post-query." This was written before sprint was a column. Now misleading — sprint IS a column and IS filtered in SQL.
**Fix:** Comment block removed. Sprint filtering is now self-documenting via the SQL WHERE clause.

**BAD-8 (P3, FIXED): Redundant ALTER TABLE in schema.sql** — `schema.sql:69-71`
CREATE TABLE already declared `sprint TEXT, description TEXT`, then immediately ran `ALTER TABLE ADD COLUMN IF NOT EXISTS` for the same columns. Functionally harmless but looks like a copy-paste mistake.
**Fix:** Removed redundant ALTER statements.

---

## THE UGLY

**UGLY-1: No `ON CONFLICT` on session INSERT** — `neon.ts:217`
POSTing the same session ID twice causes a primary key violation. No upsert semantics. Pre-existing issue (not introduced by this change).
**Risk:** Low — session IDs include date + sequence, collisions unlikely in normal use. But automated testing or retry-after-partial-success could trigger it.
**Recommendation:** Add `ON CONFLICT (id) DO UPDATE SET ...` in Sprint 08 if session retry/dedup becomes a requirement.

**UGLY-2: `sprint ?? ''` coercion in API responses** — `sessions.ts:13, 28`
Both `toSummary` and `toDetail` return `sprint: s.sprint ?? ''`. This means API consumers cannot distinguish "session has no sprint" from "session has empty-string sprint." The Zod schema says `sprint: z.string().optional()` — undefined and `''` are different values.
**Risk:** Dashboard currently treats both the same (shows blank). But if a sprint filter or analytics layer is added, `sprint === ''` will match differently than `sprint === undefined`.
**Recommendation:** Defer to dashboard contract review. Changing to `sprint: s.sprint` (allowing undefined) would be a breaking API change for any consumer relying on the field always being a string.

---

## Flagged Only (out of scope — no fix applied)

| # | Issue | Risk | Recommendation |
|---|---|---|---|
| F01 | No `AbortSignal` timeout on `fetch` in `postWithRetry` | Low — Chrome MV3 has its own service worker timeouts | Consider adding `signal: AbortSignal.timeout(10000)` in Sprint 08 |
| F02 | `ON CONFLICT` missing on session INSERT | Low — ID collisions unlikely | Add upsert if retry-after-partial-success becomes a pattern |
| F03 | `sprint ?? ''` coercion in API responses | Medium — conflates undefined with empty string | Dashboard contract review needed before changing |
| F04 | `toSummary` doesn't include `description` | Low — summaries intentionally lean | Add if dashboard session list needs description preview |

---

## Verification Evidence

### Round-trip test (live, 2026-03-03)

```
POST https://vigil-two.vercel.app/api/session
  Body: { id: "qa-verify-sprint-001", sprint: "07", description: "QA verification" ... }
  Response: 201 { sessionId: "qa-verify-sprint-001", bugsWritten: 0 }

GET https://vigil-two.vercel.app/api/sessions/qa-verify-sprint-001
  Response: { session: { id: "qa-verify-sprint-001", sprint: "07", description: "QA verification" ... } }
```

Sprint and description round-trip confirmed.

### Test suite

```
vitest:     266 pass / 0 fail (23 test files)
tsc:        clean (0 errors)
build:      success (3.29s)
```

### Neon migration

```
[migrate] Running schema against Neon...
[migrate] Schema applied successfully.
```

---

## Decision Log Entries (proposed)

| ID | Decision | Rationale | Owner |
|---|---|---|---|
| D030 | Sprint and description stored as first-class Neon columns (not embedded in JSON) | Enables SQL WHERE filtering, avoids full-table scan + JS filter | `[DEV:server]` |
| D031 | `postWithRetry` applies exponential backoff on both network errors AND HTTP errors | Prevents hammering server on 500s; consistent retry behavior | `[DEV:server]` |

---

*Review completed: 2026-03-03 | Author: `[DEV:server]` | Awaiting: `[CTO]` sign-off*

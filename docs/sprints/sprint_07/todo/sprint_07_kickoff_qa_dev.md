# Sprint 07 — QA-DEV Team Kickoff

**Team:** QA-DEV (new team)
**Roles:** `[DEV:server]` + `[QA]`
**Created:** 2026-03-03 by [CPTO]
**Sprint:** 07 | **Phase:** FAT Round 3 (Founder Acceptance Testing)
**Report to:** [CPTO] — provide a report when done. Ask questions anytime.

---

## Project Gist

**Vigil** is SynaptixLabs' Bug Discovery & Resolution Platform. It's a Chrome Extension (MV3) that lets a user capture browser sessions — recordings, screenshots, bugs, features — and POST them to a backend server that stores them for analysis and eventual automated resolution.

### Architecture (one paragraph)

The **vigil-ext** Chrome Extension captures sessions locally (IndexedDB via Dexie.js, rrweb for recordings, Shadow DOM UI). When a session ends, the extension POSTs the full `VIGILSession` JSON to **vigil-server** — a Node.js Express backend. In Sprint 07, we added two deployment modes: **local** (`localhost:7474` with Neon or filesystem storage) and **cloud** (Vercel serverless at `vigil-two.vercel.app` with Neon PostgreSQL). There's also a **React dashboard** served by vigil-server for bug/feature/session management. All LLM/AI features are deferred to Sprint 08.

### Data flow you care about

```
User ends session in Chrome Extension
    |
    v
Extension background/session-manager.ts
    → loadServerUrl() reads vigil.config.json
    → Current config: serverUrl = "https://vigil-two.vercel.app"
    → postWithRetry(session, attempts=3) fires
    |
    v
POST https://vigil-two.vercel.app/api/session
    → Vercel serverless function (api/index.ts)
    → Express session.ts route handler
    → VIGILSessionSchema Zod validation
    → NeonStorage.writeSessionJson() → INSERT INTO sessions (...)
    → NeonStorage.writeBug() per bug  → INSERT INTO bugs (...)
    → NeonStorage.writeFeature() per feature
    → 201 { sessionId, bugsWritten, featuresWritten }
```

---

## Current State of Sprint 07

### What's done (all green)

| ID | Deliverable | Status |
|---|---|---|
| S07-16 | Project-oriented session model | DONE |
| S07-12 | VIGILSession persistence (chrome.storage.local) | DONE |
| S07-18 | Ghost session recovery | DONE |
| S07-19 | Manifest shortcut fix | DONE |
| S07-11 | Shared types package (`@synaptix/vigil-shared`) | DONE |
| S07-16b | Session read API (GET /api/sessions) | DONE |
| S07-17a | Dashboard overhaul Phase A | DONE |
| S07-17b | Dashboard overhaul Phase B | DONE |
| S07-13 | Dashboard component tests (88 tests) | DONE |
| S07-15 | Neon PostgreSQL migration | DONE |
| S07-14 | Vercel deployment | DONE |
| S07-22 | HTTP route integration tests (44 tests) | DONE |

**Test baseline:** 354 tests (266 root vitest + 88 dashboard vitest), 37/38 E2E.

### What's happening right now

FAT Round 3 — Founder (Avi) manual acceptance testing. During this testing we discovered **3 bugs** that need to be fixed and verified. That's your job.

### What's live

- **Vercel:** `https://vigil-two.vercel.app` — `GET /health` returns `{"status":"ok","storage":"neon"}`
- **Neon DB:** PostgreSQL via `@neondatabase/serverless` — `DATABASE_URL` in `.env` and Vercel env vars
- **Extension:** Latest build in `dist/`, POSTs directly to Vercel URL

---

## Your Mission: Fix 3 Bugs Found During FAT

These bugs were discovered during CPTO design review of the session POST flow on 2026-03-03. The session IS being stored in Neon (confirmed via `GET /api/sessions`), but there are real diagnostic and data-loss issues.

### BUG-A (P1): Silent error swallowing in `postWithRetry`

**File:** `src/background/session-manager.ts` — line 362

**Problem:** The `catch` block in `postWithRetry` has NO logging. When the POST fails (network error, timeout, Vercel cold start), developers see nothing in the console. The only post-STOP log is `[Vigil] Vigil session ended + POSTed on STOP_RECORDING` which fires from `message-handler.ts:131` — this fires regardless of whether the POST succeeded or failed, because it logs after `await endSession()` which never throws (postWithRetry swallows errors).

**Current code (line 347-365):**
```typescript
for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${serverUrl}/api/session`, { ... });
      if (res.ok) {
        console.log(`[Vigil] POST success → session ${session.id} synced to ${serverUrl}`);
        // ...
        return;
      }
      const errBody = await res.text().catch(() => '');
      console.error(`[Vigil] POST /api/session failed (${res.status}):`, errBody);
    } catch {
      await sleep(1000 * (i + 1));  // <-- SILENT. No console output.
    }
  }
  // After all retries fail — also SILENT. Just sets pendingSync.
```

**Fix required:**
1. Add `console.warn('[Vigil] POST /api/session network error (attempt X/3):', error)` to the catch block
2. After all retries exhausted (line 366-370), add `console.error('[Vigil] POST failed after 3 attempts — session marked pendingSync:', session.id)`

**Acceptance criteria:**
- Network failure during POST shows a warning per retry in DevTools console
- Total failure after 3 retries shows an error with the session ID
- Existing success/error logging on HTTP responses (lines 355, 361) is unchanged

---

### BUG-B (P2): `sprint` + `description` columns missing from Neon schema

**Files:**
- `packages/server/src/db/schema.sql` — `sessions` table (lines 53-65)
- `packages/server/src/storage/neon.ts` — `writeSessionJson` (lines 217-231)
- `packages/server/src/storage/neon.ts` — `listSessions` (line 291)
- `packages/server/src/storage/neon.ts` — `getSession` (lines 319-332)

**Problem:** The `VIGILSession` schema (in `packages/shared/src/schemas.ts`) has `sprint: z.string().optional()` and `description: z.string().optional()` fields. The extension sends these fields. But:

1. The `sessions` table in `schema.sql` has NO `sprint` or `description` columns
2. `writeSessionJson()` INSERT doesn't include `sprint` or `description`
3. `listSessions()` hardcodes `sprint: undefined` when reading back (line 291)
4. `getSession()` doesn't read `sprint` or `description` either

**Result:** Every session stored in Neon loses its sprint and description. The API returns `sprint: ""` for all sessions. Confirmed live:
```
GET https://vigil-two.vercel.app/api/sessions
→ session vigil-SESSION-20260303-003 shows sprint: "" despite being created with sprint "07"
```

**Fix required:**
1. Add columns to schema.sql: `sprint TEXT` and `description TEXT` on the `sessions` table
2. Run migration against Neon (ALTER TABLE or re-run migrate.ts)
3. Update `writeSessionJson()` INSERT to include `sprint` and `description` (parameterized — $11, $12)
4. Update `listSessions()` and `getSession()` SELECT + object construction to read `sprint` and `description` from the row
5. Verify round-trip: POST a session with sprint → GET it back → sprint is preserved

**Schema change (add to schema.sql):**
```sql
-- In CREATE TABLE sessions, add after 'features':
--   sprint TEXT,
--   description TEXT,
-- Or if table exists, ALTER TABLE:
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sprint TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT;
```

**Acceptance criteria:**
- A session POSTed with `sprint: "07"` and `description: "test"` is stored with those values
- `GET /api/sessions` returns the correct sprint and description
- `GET /api/sessions/:id` returns the correct sprint and description
- Existing sessions (without sprint/description) still work (NULL is fine)

---

### BUG-C (P3): No summary log after `postWithRetry` total failure

**File:** `src/background/session-manager.ts` — lines 366-371

**Problem:** After all 3 retries fail, the code sets `pendingSync = true` and calls `notifyTab(SESSION_SYNC_FAILED)` but logs nothing. A developer looking at the console gets zero indication that session sync failed completely.

**Current code:**
```typescript
  // All retries failed — mark pending
  if (vigilState.session) {
    vigilState.session.pendingSync = true;
  }
  notifyTab(vigilState.tabId, 'SESSION_SYNC_FAILED');
```

**Fix required:**
Add a `console.error` before the pendingSync assignment:
```typescript
console.error(`[Vigil] POST /api/session failed after ${attempts} attempts — session ${session.id} marked pendingSync`);
```

**Acceptance criteria:**
- When all retries fail, a clear error appears in the console with the session ID
- The error makes it obvious that the session was NOT synced to the server

---

## Key Files Map

| File | What it does | Relevant to |
|---|---|---|
| `src/background/session-manager.ts` | Session lifecycle + POST logic + vigil session manager | BUG-A, BUG-C |
| `src/background/message-handler.ts` | Routes Chrome messages to handlers | Context (STOP_RECORDING flow) |
| `packages/server/src/db/schema.sql` | Neon PostgreSQL table definitions | BUG-B |
| `packages/server/src/storage/neon.ts` | Neon storage provider (INSERT/SELECT) | BUG-B |
| `packages/server/src/routes/session.ts` | POST /api/session route handler | Context (Zod validation + storage) |
| `packages/shared/src/schemas.ts` | Zod schemas (source of truth for types) | Context (VIGILSessionSchema) |
| `vigil.config.json` | Extension config (serverUrl, sprint, etc.) | Context (POST target URL) |
| `packages/server/src/db/migrate.ts` | Runs schema.sql against Neon | BUG-B (migration) |

---

## Environment Setup

```powershell
# Repo
cd C:\Synaptix-Labs\projects\vigil

# Install (if needed)
npm install

# Local server (connects to same Neon DB as Vercel)
npm run dev:server
# → http://localhost:7474 — should show storage: neon

# Build extension
npm run build
# → dist/ — load unpacked in Chrome

# Run tests
npx vitest run          # 354 tests
npx tsc --noEmit        # Type check

# Neon migration (after schema changes)
npx tsx packages/server/src/db/migrate.ts
```

**Vercel endpoints (live, read-only for verification):**
- `https://vigil-two.vercel.app/health`
- `https://vigil-two.vercel.app/api/sessions`
- `https://vigil-two.vercel.app/api/bugs?sprint=07`

**Neon credentials:** In `.env` at project root (`DATABASE_URL` and `DATABASE_URL_UNPOOLED`). Same creds used by Vercel.

---

## Deliverables & Report Format

### What you must deliver

| # | Bug | Owner | Gate |
|---|---|---|---|
| 1 | BUG-A: Add error logging to postWithRetry catch + total failure | `[DEV:server]` | Console shows warnings on failure |
| 2 | BUG-B: Add sprint + description columns, fix INSERT + SELECT | `[DEV:server]` | Round-trip verified via API |
| 3 | BUG-C: Add summary log after all retries exhausted | `[DEV:server]` | Console shows error on total failure |
| 4 | **Verification:** Run full test suite, confirm no regressions | `[QA]` | 354+ vitest green, tsc clean, build passes |
| 5 | **Verification:** POST a test session with sprint + description, GET it back | `[QA]` | Data round-trips correctly |
| 6 | **Verification:** Vercel redeploy + cloud smoke test | `[QA]` | vigil-two.vercel.app reflects fixes |

### Report format (return to CPTO)

```markdown
## QA-DEV Team Report — Sprint 07 BUG-A/B/C

### Summary
[1-2 sentences: what was done, outcome]

### BUG-A: postWithRetry error logging
- Status: FIXED / BLOCKED / PARTIAL
- Files changed: [list]
- Test evidence: [console output showing logging works]

### BUG-B: sprint + description in Neon
- Status: FIXED / BLOCKED / PARTIAL
- Files changed: [list]
- Migration: [ran / not needed / failed — detail]
- Round-trip test: [POST with sprint=07 → GET → sprint=07 confirmed]

### BUG-C: total failure summary log
- Status: FIXED / BLOCKED / PARTIAL
- Files changed: [list]
- Test evidence: [console output]

### Test Suite
- vitest: [count] pass / [count] fail
- tsc --noEmit: clean / [errors]
- npm run build: success / [errors]

### Vercel
- Redeployed: yes / no
- Cloud smoke test: [health, sessions, bugs endpoints verified]

### Questions / Blockers
[anything that came up]
```

---

## Hard Rules (non-negotiable)

1. **No changes to `VIGILSessionSchema`** — the Zod schema in `packages/shared/` is the source of truth. You're aligning the DB to it, not the other way around.
2. **No changes to `POST /api/session` route logic** — the route handler is correct. You're fixing storage and logging only.
3. **Run `npx tsc --noEmit` before declaring done** — TypeScript must be clean.
4. **Run `npx vitest run` before declaring done** — all 354+ tests must pass.
5. **Do NOT push to main without CPTO review** — work on a branch if making commits.
6. **Ask questions if anything is unclear** — better to ask than to guess. Post questions in your report or flag to CPTO immediately.

---

## Questions You Might Have (FAQ)

**Q: Do I need to redeploy to Vercel after fixing BUG-B?**
A: Yes. The Neon schema change (ALTER TABLE) runs against the live DB directly. But the `neon.ts` code changes need to be deployed to Vercel for the cloud API to use the new INSERT/SELECT. Redeploy via `npx vercel --prod` from repo root, or push to main (if approved).

**Q: Will the ALTER TABLE break existing sessions?**
A: No. `ADD COLUMN IF NOT EXISTS ... TEXT` adds nullable columns. Existing rows get NULL, which is fine — the schema says `sprint: z.string().optional()`.

**Q: Can I test the POST from the extension?**
A: Yes. Build the extension (`npm run build`), load it in Chrome, create a session on any page, end it, then check `https://vigil-two.vercel.app/api/sessions` for the new session. Or use curl:
```bash
curl -X POST https://vigil-two.vercel.app/api/session \
  -H "Content-Type: application/json" \
  -d '{"id":"test-qa-001","name":"QA test","projectId":"test","sprint":"07","description":"QA verification","startedAt":1709500000000,"clock":1000,"recordings":[],"snapshots":[],"bugs":[],"features":[]}'
```

**Q: Where is the Neon migration script?**
A: `packages/server/src/db/migrate.ts`. It reads `schema.sql` and runs it against the `DATABASE_URL` from `.env`. For ALTER TABLE, you can either add it to `schema.sql` (with `IF NOT EXISTS`) or run the ALTER directly via the migrate script.

---

*Kickoff prepared: 2026-03-03 | Owner: [CPTO] | Team: QA-DEV | Sprint: 07*

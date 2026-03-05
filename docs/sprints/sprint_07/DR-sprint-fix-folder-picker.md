# Design Review — Sprint Override Fix + Client-Side Folder Picker

**Sprint:** 07 | **Phase:** Phase 1 UX + Bug Fix
**Author:** `[DEV:app]` | **Reviewer:** `[CTO]`
**Date:** 2026-03-05
**Scope:** Server sprint override bug, sprint format normalization, session sprint persistence, File System Access API folder picker
**Trigger:** Cross-project recording assigned bugs to Vigil's own sprint instead of target project's sprint; new-session UX required native folder browsing

---

## Verdict: **APPROVED** | Grade: **A-**

Three related sprint-handling bugs resolved (data-correctness fix, format normalization, session persistence) plus a new client-side folder picker feature using the File System Access API. The sprint fix is a single-line change with high correctness impact. The folder picker introduces clean abstractions with proper feature detection and graceful degradation. Dexie v3 migration is safe and additive. No regressions.

---

## Problem Statement

**Bug 1 — Server Sprint Override (P1)**
When recording a QA session on a target project (e.g., Papyrus sprint 10), the server's `POST /api/session` handler always used `config.sprintCurrent` from Vigil's own `vigil.config.json` (line 21 of `session.ts`). The session payload's `sprint` field was validated by Zod but ignored at write time. Result: bugs and features filed under Vigil's sprint 07 regardless of which project was being tested. This is a data-correctness bug — misfiled bugs land in the wrong sprint folder and are invisible to the correct sprint's bug review.

**Bug 2 — Sprint Format Inconsistency (P2)**
The sprint dropdown in the extension UI sent the full directory name (`"sprint_10"`) while `config.sprintCurrent` stores the bare number (`"07"`). Both values reached the server and were written as-is, producing inconsistent sprint identifiers in Neon DB entries and filesystem paths. Downstream queries filtering by sprint could miss records depending on which format was used.

**Bug 3 — Session Sprint Not Persisted (P2)**
The `Session` interface in IndexedDB had no `sprint` field. `createSession()` did not accept or store sprint. The `RESYNC_SESSION` handler (which reconstructs a `VIGILSession` from IndexedDB for retry POST) passed `undefined` for sprint, losing the user's selection on resync.

**Feature — Client-Side Folder Picker (S07-16)**
Users needed to select a target project folder during session creation. The previous approach relied on typed paths sent to the server for validation. The new approach uses the File System Access API (`showDirectoryPicker()`) to let users browse natively, with client-side sprint detection and root marker validation — no server round-trip required for folder selection.

---

## Solution Design

### Sprint Fix Chain

The three sprint bugs form a dependency chain — fixing one without the others would leave inconsistencies:

1. **Server respects session sprint:** `session.ts` line 23 changed from `config.sprintCurrent` to `normalizeSprint(session.sprint ?? config.sprintCurrent)`. The session payload is the source of truth; server config is the fallback only when sprint is absent.

2. **Format normalization:** `normalizeSprint()` added to `@synaptix/vigil-shared` — a one-liner (`sprint.replace(/^sprint_/, '')`) that strips the `sprint_` prefix. Imported by both server routes and extension types. Applied at the server boundary so all downstream writes use bare format (`"10"`, not `"sprint_10"`).

3. **Client-side consistency:** Dropdown `<option>` values in both `new-session.tsx` and `NewSession.tsx` changed from full directory names to bare IDs. The `/api/sprints/project` endpoint's `current` field now returns bare ID (line 49 of `sprints.ts`).

4. **Session persistence:** `sprint?: string` added to the `Session` interface. `createSession()` in `session-manager.ts` accepts `sprint` parameter. `RESYNC_SESSION` handler reads `session.sprint` from IndexedDB when reconstructing the `VIGILSession` for retry POST.

### File System Access API Folder Picker

**Why File System Access API over typed paths:**
- No server round-trip for folder validation — the browser reads the filesystem directly via the handle
- `FileSystemDirectoryHandle` can be persisted in IndexedDB (via Dexie structured clone) for session-to-session reuse
- Sprint detection runs entirely client-side by iterating `docs/sprints/` entries
- Root marker detection (`.git`, `package.json`, etc.) provides instant visual feedback without server involvement
- The handle grants scoped access — no need to pass absolute filesystem paths through the extension messaging layer

**Why split popup/tab approach:**
`showDirectoryPicker()` works reliably in full browser tabs but NOT in Chrome extension popups (the popup closes on focus loss when the OS picker opens, killing the promise). The popup form provides a "Open in tab for folder picker" link that opens `new-session.html` as a standalone tab where the Browse button works correctly. This is documented in the `directory-handle.ts` header comment.

**Why client-side sprint detection:**
Decision S07-D020 states sprint auto-detect is a convenience, not a gate. Client-side detection via the directory handle means:
- Works offline (no vigil-server dependency)
- Instant feedback as soon as the folder is selected
- Users see green chips for root markers and yellow warnings if none found
- Falls back gracefully if `docs/sprints/` doesn't exist (returns empty array)

---

## Changes

### Files Modified

| File | What Changed |
|---|---|
| `packages/server/src/routes/session.ts` | Sprint source: `config.sprintCurrent` replaced with `normalizeSprint(session.sprint ?? config.sprintCurrent)` |
| `packages/shared/src/schemas.ts` | Added `normalizeSprint()` utility function (line 188) |
| `packages/shared/src/index.ts` | Export `normalizeSprint` from shared package |
| `src/shared/types.ts` | Re-export `normalizeSprint`; added `sprint?: string` to `Session` interface |
| `packages/server/src/routes/sprints.ts` | `/api/sprints/project` returns `current` as bare ID (stripped `sprint_` prefix) |
| `src/new-session/new-session.tsx` | Browse button, client-side sprint detection, root marker chips UI |
| `src/popup/pages/NewSession.tsx` | Fixed dropdown `<option>` values to bare IDs; added "Open in tab" link |
| `src/background/session-manager.ts` | `createSession()` accepts `sprint` param, stores on session |
| `src/background/message-handler.ts` | `START_SESSION` passes sprint; `RESYNC_SESSION` reads `session.sprint` from IndexedDB |
| `src/core/db.ts` | Dexie v3 migration for `projectHandles` table; CRUD helpers for handle persistence |

### Files Created

| File | Purpose |
|---|---|
| `src/shared/directory-handle.ts` | File System Access API utilities: `pickProjectDirectory()`, `detectSprints()`, `detectRootMarkers()`, `createVigilDir()`, `isDirectoryPickerAvailable()` |
| `src/shared/file-system-access.d.ts` | TypeScript declarations for `showDirectoryPicker()` and `FileSystemDirectoryHandle` iteration |

---

## Architectural Decisions

| ID | Decision | Rationale |
|---|---|---|
| DR-01 | `normalizeSprint()` lives in `@synaptix/vigil-shared`, not in server or extension | Both layers need it — shared package is the canonical location for cross-boundary utilities |
| DR-02 | Server fallback chain: `session.sprint ?? config.sprintCurrent` | Extension is the authority on which project/sprint is being tested. Server config is only a fallback for legacy sessions that predate the sprint field |
| DR-03 | File System Access API over server-validated paths | Eliminates server round-trip, enables IndexedDB handle persistence, provides scoped filesystem access without passing raw paths through messaging |
| DR-04 | Popup links to standalone tab for Browse | `showDirectoryPicker()` fails in extension popups due to focus-loss. Tab approach is the documented workaround. Popup remains functional for typed-path workflows |
| DR-05 | Dexie v3 migration (additive) for `projectHandles` | New table, no schema changes to existing tables. Dexie handles version upgrades automatically. Existing v1/v2 data untouched |
| DR-06 | `createVigilDir()` is idempotent and non-fatal | Checks for existing `project.json` before writing. Catches and warns on failure (e.g., permission denied). Never blocks session creation |
| DR-07 | Root markers are informational, not gatekeeping | Per S07-D020: users may use Vigil on any folder. Yellow warning when no markers found, but no hard error |

---

## Verification

### Build Gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | **PASS** — clean, 0 errors |
| `npm run build` | **PASS** — extension builds successfully |
| `npm run build:server` | **PASS** — server builds successfully |

### Functional Verification

- **Sprint override fix:** POST with `session.sprint: "10"` writes bugs to `sprint_10/` folder (not `sprint_07/`)
- **Normalization:** Dropdown value `"sprint_10"` normalized to `"10"` before storage
- **RESYNC:** Reconstructed `VIGILSession` from IndexedDB carries `sprint` field through retry POST
- **Folder picker:** Browse opens OS picker, returns folder name + detected sprints + root markers
- **Handle persistence:** Selected handle survives browser restart via Dexie `projectHandles` table
- **Popup fallback:** "Open in tab" link correctly opens `new-session.html` with full Browse support

---

## Edge Cases

| Scenario | Handling |
|---|---|
| Session payload has no `sprint` field (legacy extension) | Falls back to `config.sprintCurrent` — backward compatible |
| Sprint value is `"sprint_10"` (full name) | `normalizeSprint()` strips prefix to `"10"` |
| Sprint value is already `"10"` (bare number) | `normalizeSprint()` is a no-op — regex doesn't match |
| User cancels OS folder picker | `showDirectoryPicker()` throws `AbortError` — caught, no state change |
| Selected folder has no `docs/sprints/` | `detectSprints()` returns empty array — dropdown shows no options, manual entry available |
| Selected folder has no root markers | Yellow warning displayed, but session creation not blocked (S07-D020) |
| `.vigil/project.json` already exists | `createVigilDir()` checks file size > 0, skips write — idempotent |
| `showDirectoryPicker()` unavailable (non-Chrome, extension popup) | `isDirectoryPickerAvailable()` returns false — Browse button hidden, typed-path fallback shown |
| Dexie upgrade from v2 to v3 | Additive migration — only adds `projectHandles` table, existing tables and data untouched |
| Stored handle permission revoked by browser | `FileSystemDirectoryHandle` methods will throw — caller must handle gracefully |

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| File System Access API is Chrome-only (86+) | Low | Vigil is a Chrome extension — target browser is guaranteed. Feature detection gate (`isDirectoryPickerAvailable()`) prevents errors on unsupported contexts |
| Browser may revoke stored handle permissions | Low | Handles are a convenience for re-selection, not a hard dependency. User can re-browse. Permission prompt will surface automatically |
| `normalizeSprint()` only strips `sprint_` prefix | Low | This is the only format in use. If a new format appears (e.g., `s07`), the regex would need updating — but that would be a deliberate schema change |
| Dexie v3 migration on first load after update | Low | Dexie migrations are atomic and well-tested. No data transformation — purely additive table creation |
| Popup-to-tab handoff loses form state | Medium | User must re-enter session name/description in the tab form. Acceptable tradeoff — the popup is the quick-start path, the tab is the full-featured path. Future improvement: pass form state via URL params or `chrome.storage.session` |

---

## Flagged (out of scope)

| # | Issue | Risk | Recommendation |
|---|---|---|---|
| F01 | Stored `FileSystemDirectoryHandle` has no TTL or cleanup | Low | Handles accumulate in IndexedDB indefinitely. Add a `listProjectHandles()` management UI or 90-day TTL in a future sprint |
| F02 | No E2E test for folder picker flow | Medium | File System Access API cannot be automated in Playwright without mocking `showDirectoryPicker`. Add integration test with mock handle in Sprint 08 |
| F03 | `createVigilDir()` writes `project.json` but nothing reads it yet | Low | Placeholder for future project metadata (e.g., last sprint, config overrides). Harmless until consumed |

---

*Review completed: 2026-03-05 | Author: `[DEV:app]` | Reviewer: `[CTO]`*

# DR — [DEV:server] S07-11: Shared Types Package

**Date:** 2026-02-27
**Author:** [DEV:server]
**Reviewer:** Self (Good/Bad/Ugly design review)
**Scope:** S07-11 — Create `@synaptix/vigil-shared` package as single source of truth for Zod schemas
**Sprint:** 07, Phase 2 — Backend Foundation
**Priority:** P1 | **Budget:** ~2V | **Actual:** ~2V
**Resolves:** Sprint 06 UGLY U03 (duplicate type definitions)

---

## Executive Summary

Created `packages/shared/` (`@synaptix/vigil-shared`) as the single source of truth for all Zod schemas, inferred types, and shared constants. All three consumers (extension, server, dashboard) now import from the shared package. A Good/Bad/Ugly design review identified 4 BAD items — all fixed before this report was written. 28 new dedicated unit tests added. Zero type drift, zero regressions.

---

## Architecture

```
packages/shared/src/schemas.ts      <-- Single source of truth (151 LOC)
packages/shared/src/index.ts        <-- Barrel re-export

Resolution strategy:
  Extension   →  Vite alias to source     (vite.config.ts + tsconfig paths)
  Dashboard   →  Vite alias to source     (vite.config.ts + tsconfig paths)
  Server      →  file: dependency symlink (NodeNext → compiled dist/)
  Tests       →  Vitest alias to source   (vitest.config.ts)
```

### Why hybrid resolution?

- **Server** uses NodeNext module resolution which requires compiled `.js` + `.d.ts`. The `file:../shared` dependency creates a symlink in `node_modules/@synaptix/vigil-shared` → `packages/shared/dist/`.
- **Extension + Dashboard** use Vite which can resolve TypeScript source directly. Aliases point to `packages/shared/src/` for instant HMR without a build step.
- **vitest.config.ts** mirrors the Vite alias so tests resolve the same way.

---

## What Was Built

### New Files

| File | LOC | Purpose |
|---|---|---|
| `packages/shared/package.json` | 24 | Package definition, ESM exports, `zod` dependency |
| `packages/shared/tsconfig.json` | 19 | NodeNext, composite, declaration output to `dist/` |
| `packages/shared/src/schemas.ts` | 151 | All Zod schemas, inferred types, interfaces, constants |
| `packages/shared/src/index.ts` | 38 | Barrel re-export |
| `tests/unit/shared/schemas.test.ts` | 236 | 28 dedicated unit tests |

**Total new code:** 468 LOC (232 source + 236 tests)

### Modified Files

| File | Change |
|---|---|
| `package.json` (root) | Added `build:shared` script; chained shared build into `dev:server` and `build:server` |
| `tsconfig.json` (root) | Added `paths` mapping for `@synaptix/vigil-shared` |
| `vite.config.ts` (root) | Added resolve alias for `@synaptix/vigil-shared` → shared source |
| `vitest.config.ts` | Added resolve alias for `@synaptix/vigil-shared` → shared source |
| `src/shared/types.ts` | Converted to barrel re-export from shared + kept extension-only types |
| `packages/server/package.json` | Added `"@synaptix/vigil-shared": "file:../shared"` dependency |
| `packages/server/src/types.ts` | Converted to barrel re-export from shared (backward compat) |
| `packages/server/src/routes/session.ts` | Import `VIGILSessionSchema` from `@synaptix/vigil-shared` |
| `packages/server/src/routes/bugs.ts` | Import `BugUpdateSchema` from `@synaptix/vigil-shared` |
| `packages/server/src/mcp/tools.ts` | Import `BugUpdateSchema` from `@synaptix/vigil-shared` |
| `packages/server/src/filesystem/reader.ts` | Import types from `@synaptix/vigil-shared` + added URL parsing (B03 fix) |
| `packages/server/src/filesystem/writer.ts` | Import types + constants from `@synaptix/vigil-shared` |
| `packages/dashboard/vite.config.ts` | Added resolve alias for `@synaptix/vigil-shared` |
| `packages/dashboard/tsconfig.json` | Added `baseUrl` + `paths` for `@synaptix/vigil-shared` |
| `packages/dashboard/src/types.ts` | Added re-exports from shared; fixed mid-file import (B01) |

---

## Standard Checks

- [x] TypeScript strict — `tsc --noEmit` clean (0 errors)
- [x] Shared package builds — `npm run build:shared` succeeds
- [x] Server chain builds — `npm run build:server` (shared → server) succeeds
- [x] Extension build — `npm run build` succeeds
- [x] No secrets in source or config
- [x] No new dependencies — `zod` already existed in server; shared reuses it
- [x] Git hygiene — `dist/` and `node_modules/` excluded by root `.gitignore`
- [x] All existing tests pass — 201/201 (22 test files)
- [x] New tests pass — 28/28 in `tests/unit/shared/schemas.test.ts`
- [x] Backward compatibility — all 35+ existing import sites unchanged (barrel re-export pattern)

---

## GOOD (keep)

| # | Finding |
|---|---|
| G01 | **Single source of truth achieved.** All 3 consumers (ext, server, dashboard) import from `@synaptix/vigil-shared`. Sprint 06 U03 is resolved. |
| G02 | **Barrel re-export pattern.** `src/shared/types.ts` and `packages/server/src/types.ts` became thin re-export barrels. All 35+ existing import sites continue working with zero changes. |
| G03 | **Hybrid resolution strategy.** Build-based for server (NodeNext + symlink to compiled dist), Vite aliases for ext/dashboard (source). Each consumer uses the resolution approach native to its toolchain. |
| G04 | **Schema drift corrected.** `RrwebChunkSchema` stripped spurious `id` and `sessionId` fields that server had but extension never sends. Resolves Sprint 06 DR finding. |
| G05 | **Declaration merging pattern.** `export const BugPriority = BugPrioritySchema.enum` + `export type BugPriority = z.infer<...>` allows both value access (`BugPriority.P0`) and type usage (`priority: BugPriority`) from a single import. |
| G06 | **TEST_STATUS unicode escapes.** `\u2B1C`, `\uD83D\uDFE2`, `\uD83D\uDD34` compile correctly across all targets. Verified by tsc output and test assertions. |
| G07 | **Git hygiene.** Root `.gitignore` covers `dist/` and `node_modules/` at all depths. Only source files tracked in `packages/shared/`. |

---

## BAD (all fixed)

### B01 — Dashboard mid-file import
- **Severity:** P3
- **Location:** `packages/dashboard/src/types.ts:56`
- **Problem:** `import type { RrwebChunk as SharedRrwebChunk }` was placed mid-file instead of at top with other imports.
- **Fix:** Moved import to line 2, above the re-exports.

### B02 — No dedicated unit tests for shared package
- **Severity:** P2
- **Location:** Missing `tests/unit/shared/schemas.test.ts`
- **Problem:** Schemas only tested indirectly through `tests/unit/server/types.test.ts` which imports from the server barrel. No direct coverage of the shared source.
- **Fix:** Added `tests/unit/shared/schemas.test.ts` — 28 tests covering:
  - All 4 enum schemas (accept/reject/enum-like access)
  - `BugSchema` (valid, optional fields, missing required, wrong type literal)
  - `FeatureSchema` (valid, invalid featureType)
  - `RrwebChunkSchema` (minimal chunk, drift guard — `id` field stripped)
  - `VIGILSessionSchema` (minimal, optional sprint/description, pendingSync, missing required)
  - `BugUpdateSchema` (partial updates, empty object, invalid status)
  - `TEST_STATUS` (export check, unicode correctness)

### B03 — BugFile.url written but never parsed
- **Severity:** P2
- **Location:** `packages/server/src/filesystem/writer.ts:44-45` writes `## URL\n${bug.url}`, but `reader.ts:parseBugFile()` had no regex for it.
- **Problem:** `BugFile.url` was always `undefined` when reading back bugs from the filesystem, despite the data being present in the markdown file.
- **Fix:** Added `urlMatch` regex to `parseBugFile()` and included `url: urlMatch?.[1]?.trim()` in the returned object.

### B04 — dev:server crashes if shared not built
- **Severity:** P2
- **Location:** `package.json` `dev:server` script
- **Problem:** Server resolves `@synaptix/vigil-shared` via symlink to `dist/index.js`. If `packages/shared/dist/` doesn't exist (fresh clone, clean), `dev:server` crashes with MODULE_NOT_FOUND.
- **Fix:** Changed `dev:server` script to chain shared build first: `cd packages/shared && tsc && cd ../server && npx nodemon --exec tsx src/index.ts`.

---

## UGLY (systemic / deferred)

None identified for this scope. The architecture is clean.

**Note:** Pre-existing issues from S07-15 (Neon migration) work-in-progress exist in the server codebase (`db/client.ts`, `storage/neon.ts` TS errors; MCP test initialization). These pre-date S07-11 and are tracked under S07-15's scope.

---

## Summary

| Category | Count |
|---|---|
| GOOD | 7 |
| BAD | 4 (0x P0, 0x P1, 2x P2, 2x P3) — **all fixed** |
| UGLY | 0 |

---

## Quality Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm run build:shared` | PASS |
| `npm run build:server` | PASS (shared → server chain) |
| `npx vitest run` | PASS — 201/201 (22 test files) |
| New unit tests | +28 (schemas.test.ts) |
| Backward compatibility | All existing server types tests pass (5/5) through barrel re-export |
| Schema parity | Zero drift between shared, server, and extension |

---

## Overall Grade: A

Clean architecture with single source of truth established. Hybrid resolution strategy is correct for the toolchain constraints. All consumers wired up with backward-compatible barrel re-exports. RrwebChunk drift from Sprint 06 corrected. All 4 BAD items found and fixed during the review. 28 new dedicated tests provide direct coverage of the shared schema surface.

S07-11 is complete. Ready for sign-off.

---

## Sprint 06 Deferred Items Addressed

| S06 ID | Description | Status |
|---|---|---|
| U03 | Duplicate type definitions (server vs extension) | **RESOLVED** — single shared package |
| B03 (reader) | BugFile.url not parsed | **RESOLVED** — added URL regex to parseBugFile() |

---

## Next Assignment

S07-15: Neon PostgreSQL migration (~4V, Phase 2 Week 2). Awaiting CPTO go.

---

*Design Review Report | [DEV:server] | 2026-02-27 | Sprint 07 Phase 2*

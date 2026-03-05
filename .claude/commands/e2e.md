# /project:e2e — Vigil E2E Test Suite

Run the Playwright E2E suite for Vigil. Covers extension flows + vigil-server integration.

## Prerequisites

```bash
# 1. Build the extension
npm run build                    # → dist/

# 2. Start vigil-server
npm run dev:server               # port 7474

# 3. Start QA target app
cd tests/fixtures/target-app && npm start   # port 3847

# 4. Verify server health
curl http://localhost:7474/health           # → { status: "ok" }
```

## Run Commands

```bash
# Full E2E suite
npx playwright test

# Regression suite only (fastest gate)
npx playwright test tests/e2e/regression/

# Specific spec
npx playwright test tests/e2e/session-flow.spec.ts

# Debug UI
npx playwright test --ui

# With traces on failure
npx playwright test --trace on-first-retry
```

## Extension Loading (Playwright)

Vigil E2E tests load the built extension via `chromium.launchPersistentContext()`:
```typescript
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [`--load-extension=${path.resolve('dist')}`, `--disable-extensions-except=${path.resolve('dist')}`]
})
```
The built `dist/` must exist before running. Always run `npm run build` first.

## Critical Checks Per Run

```
BEFORE RUNNING:
  ✅ dist/ exists and is fresh (npm run build)
  ✅ vigil-server running: GET localhost:7474/health → 200
  ✅ Target app running: GET localhost:3847 → 200

AFTER RUNNING:
  ✅ All regression specs green: tests/e2e/regression/
  ✅ No console errors in extension pages
  ✅ vigil-server received POSTs (check server logs)
```

## Output Format

```
## E2E Run — Vigil — [DATE]

Extension: ✅ Loaded from dist/
vigil-server: ✅ Healthy at localhost:7474
Target app: ✅ Running at localhost:3847

### Regression Suite
tests/e2e/regression/BUG-001.spec.ts → ✅ PASS
tests/e2e/regression/BUG-002.spec.ts → ✅ PASS

### New Specs (Sprint 06)
Q601 session-clock-independent → ✅ PASS
Q602 space-toggle-recording    → ❌ FAIL — [file:line:reason]

### Summary
Passed: X/Y | Failed: Z
Regressions: 0 ← must always be 0

### Gate
✅ PASS — safe to proceed | ❌ BLOCKED — regressions must be fixed first
```

## E2E Testing Protocols (non-negotiable)

See `docs/04_TESTING.md` § "Cross-Project E2E Protocols". Key rules:

1. **Diagnostic-First** — For layout/CSS bugs, measure actual element dimensions before fixing. Use `browser_evaluate` or DevTools.
2. **Multi-Viewport** — Layout E2E tests must verify at multiple viewport widths. One width is a false safety net.
3. **No Fixed-Pixel Constraints** — Use `min()`/`max()` with percentages, not `max-width: Xpx` alone.
4. **Interactive + Scripted** — Use MCP for diagnosis, Playwright scripts for regression.

## Rules

- NEVER skip regression suite — it is the mandatory first gate
- If `dist/` is stale → rebuild before running, do not test stale builds
- If vigil-server is down → E2E is blocked, report as failure (do not skip)
- Screenshots saved to `tests/screenshots/e2e_[timestamp]/`
- Any regression failure → P0, blocks sprint closure

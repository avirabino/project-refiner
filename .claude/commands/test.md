# /project:test — Vigil Full Test Suite

Run the complete Vigil test suite in the correct order with all prerequisites.

## Prerequisites

```bash
# 1. Build the extension first (E2E requires built dist/)
npm run build

# 2. Start vigil-server (required for integration + E2E)
npm run dev:server     # port 7474 — leave running in separate terminal

# 3. Start QA target app (required for E2E)
cd tests/fixtures/target-app && npm start   # port 3847

# 4. Verify before running
curl http://localhost:7474/health   # must return { status: "ok" }
```

## Run Commands

```bash
# --- Unit + integration (no server required) ---
npx vitest run                        # all unit + integration specs

# --- Type check ---
npx tsc --noEmit                      # must be clean before any "done" declaration

# --- Lint ---
npx eslint .                          # errors block, warnings OK

# --- E2E (requires: dist/ + vigil-server + target app) ---
npx playwright test                   # full suite
npx playwright test tests/e2e/regression/   # regression gate only (fastest)
npx playwright test --ui              # debug UI

# --- Full suite shortcut ---
npm run test:all
```

## Output Format

```
## Test Run — Vigil — [DATE]

### Pre-flight
dist/ exists:             ✅ / ❌ (run npm run build)
vigil-server healthy:     ✅ localhost:7474 / ❌ not running (E2E blocked)
QA target app running:    ✅ localhost:3847 / ❌ not running (E2E blocked)

### Unit + Integration (Vitest)
Result: ✅ XX passed / ❌ XX failed
[failures: file:line:reason]

### TypeScript
Result: ✅ clean / ❌ [errors]

### Lint
Result: ✅ clean / ❌ [errors]

### Regression Suite (Playwright)
npx playwright test tests/e2e/regression/
Result: ✅ XX passed / ❌ XX failed
[failures: spec:line:reason]

### Full E2E Suite (Playwright)
Result: ✅ XX passed / ❌ XX failed

### Overall Gate
PASS — all layers green, safe to mark done
FAIL — fix failures before declaring done (list below)
```

## Rules

- NEVER skip the regression suite — it is the mandatory first E2E gate
- NEVER run E2E against stale `dist/` — always rebuild first if source changed
- If vigil-server is not running → report as gate failure, do not skip E2E
- If target app is not running → report as gate failure, do not skip E2E
- Any regression failure → P0, blocks sprint closure
- Save screenshots to `tests/screenshots/e2e_[timestamp]/` on failure
- Full test suite must be green before any merge to main or sprint closure

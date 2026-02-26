# /project:regression — Vigil Pre-Merge Regression Gate

Run before any merge to main, "done" declaration, or sprint closure.

## Steps

1. **Confirm branch** — not on `main`. Autonomous agents must be on `vigil/fixes/sprint-XX`
2. **Verify vigil-server** — `curl http://localhost:7474/health` → 200 (required for E2E)
3. **Run regression suite first:**
   ```bash
   npx playwright test tests/e2e/regression/
   ```
   Any failure → **BLOCKED**. Do not proceed.
4. **Run full test suite:**
   ```bash
   npx vitest run          # unit + integration
   npx playwright test     # full E2E
   ```
5. **Static checks:**
   ```bash
   npx tsc --noEmit        # TypeScript — must be clean
   npx eslint .            # Lint — errors block, warnings OK
   ```
6. **Security scan:**
   ```bash
   git grep -i "api_key\|secret\|password\|token" -- "*.ts" "*.tsx" "*.js" "*.json"
   git status              # confirm no .env or .vigil/ files staged
   ```
7. **Check docs:** if architecture or commands changed → confirm `CLAUDE.md`, `docs/03_MODULES.md`, and relevant module `AGENTS.md` are updated

## Gate Checklist

```
### Pre-flight
[ ] Not on main branch
[ ] vigil-server running: GET localhost:7474/health → 200
[ ] dist/ is fresh (npm run build run after latest changes)

### Regression Suite (mandatory first gate)
[ ] npx playwright test tests/e2e/regression/ → ALL PASS
    (any failure = BLOCKED, do not proceed)

### Full Test Suite
[ ] npx vitest run → all pass
[ ] npx playwright test → all pass (no regressions)

### Static Analysis
[ ] npx tsc --noEmit → CLEAN
[ ] npx eslint . → CLEAN (no errors)

### Security
[ ] No hardcoded secrets (api_key, secret, password, token)
[ ] No .env files staged
[ ] No .vigil/ runtime data staged (must be in .gitignore)

### Documentation
[ ] CLAUDE.md current (sprint number, commands)
[ ] docs/03_MODULES.md current (no new capability undocumented)
[ ] Module AGENTS.md current if module behavior changed

### Gate
[ ] PASS — safe to commit/merge
[ ] FAIL — list every failing item with file + line
```

## Output

State **PASS** or **FAIL** at the top of your response.
On FAIL: list every failing item with file + line number + why it blocks.
On PASS: print the full checklist with ✅ marks.

## Rules

- Regression suite failure = BLOCKED. No exceptions.
- TypeScript errors = BLOCKED. Warnings = OK.
- Security scan hit = BLOCKED. Investigate before proceeding.
- Do NOT push to `main` — ever. This gate is for feature/sprint branches only.

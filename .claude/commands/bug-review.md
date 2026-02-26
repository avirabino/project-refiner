# /project:bug-review — Sprint Closure Gate

Run the full QA gate before closing the current sprint.

## Usage

```
/project:bug-review                  # Full gate for current sprint
/project:bug-review --report         # Generate LLM health report (Sprint 07+)
```

## Steps

1. **Read config** — `vigil.config.json:sprintCurrent`
2. **List open bugs** — `vigil_list_bugs(sprint=current, status=open)`
3. **Severity gate:**
   - Any **P0 or P1** still open → **BLOCKED**. Sprint cannot close. List blockers.
4. **List open features** — `vigil_list_features(sprint=current, status=open)`
   - Any **F0** still open → **BLOCKED**
5. **Regression suite** — Run `npx playwright test tests/e2e/regression/`
   - Any failure → **BLOCKED**. Report which tests failed.
6. **Test decisions** — For each closed bug where `keep_test` is unset:
   - Ask: "Keep `BUG-XXX.spec.ts` as permanent guard? (yes/no/archive)"
   - Archive → move to `tests/e2e/regression/ARCHIVE/`
7. **Summary report:**

```
## Sprint XX — Bug Review Gate

Bugs fixed:    N
Bugs deferred: N (list)
Bugs blocked:  N P0/P1 (list — SPRINT BLOCKED if any)

Features implemented: N
Features deferred:    N

Regression suite: ✅ N passed | ❌ N failed
Tests kept permanent: N
Tests archived:       N

Gate: ✅ SPRINT READY TO CLOSE | ❌ BLOCKED
Blockers (if any):
  - BUG-XXX: [reason]
```

## Rules

- Sprint CANNOT close with any open P0 or P1 bugs
- Sprint CANNOT close with any regression test failures
- Deferred bugs must be moved to `BUGS/open/` in sprint_XX+1 (not deleted)
- `--report` flag reserved for Sprint 07+ (requires AGENTS LLM integration)

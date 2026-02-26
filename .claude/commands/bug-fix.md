# /project:bug-fix — Red→Green Resolution Loop

Run the full TDD resolution loop for one or more bugs.

## Usage

```
/project:bug-fix BUG-XXX          # Single bug
/project:bug-fix --all             # All open bugs in current sprint
/project:bug-fix --severity P0,P1  # Filter by severity
```

## Steps (per bug)

1. **Load** — `vigil_get_bug(id)` → read full context (title, steps, screenshot, session)
2. **Locate** — Find the relevant code. Analyse root cause. State hypothesis.
3. **Regression test** — Write `tests/e2e/regression/BUG-XXX.spec.ts`
4. **Confirm RED** — Run test. If cannot get RED, report why and stop (flag as `needs-info`).
5. **Fix** — Implement the fix. Max iterations = `vigil.config.json:maxFixIterations` (default 3).
6. **Confirm GREEN** — Run full regression suite. All must pass.
7. **Close** — `vigil_close_bug(id, resolution, keep_test)`
8. **Commit** — `git commit -m "fix(BUG-XXX): [short description]"`

## Escalation Rules

| Outcome | Action |
|---|---|
| GREEN ✅ | Close bug, commit, report |
| Cannot reproduce | Set status = `needs-info`, add comment with what's missing |
| Max iterations reached | Set status = `escalated`, write failure summary, notify Avi |
| New bug discovered | Log as new BUG-YYY, do NOT expand current fix scope |

## Output Format

```
## BUG-XXX — [title]

Root cause: [your analysis]
Fix: [what changed, file:line]
Test: tests/e2e/regression/BUG-XXX.spec.ts → 🟢 GREEN
Commit: fix(BUG-XXX): [description]
Keep regression test: yes | no (reason)
```

## Rules

- NEVER expand scope of a fix beyond the reported bug
- NEVER push to main — commit to current branch
- NEVER mark GREEN on unit tests alone — E2E regression must pass
- Always run full regression suite after fix (not just the new test)

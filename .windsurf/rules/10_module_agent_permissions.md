# 10 — Module Agent Permissions

Purpose: make module-agent autonomy explicit so they don't stall or "ask permission" for routine repo work.
This is **horizontal policy**; it does not replace Tier‑2/Tier‑3 `AGENTS.md`.

## Module ownership by domain

| Domain | Modules Location | Tag Pattern | Role Instance |
|--------|------------------|-------------|---------------|
| Backend | `backend/modules/*` | `[DEV:<module>|BE]` | `@role_backend_dev` |
| Frontend | `frontend/modules/*` | `[DEV:<module>|FE]` | `@role_frontend_dev` |
| ML/AI/Data | `ml-ai-data/modules/*` | `[DEV:<module>|ML]` | `@role_ml_dev` |
| Shared | `shared/*` | `[DEV:<module>|SHARED]` | `@role_shared_dev` |

## What module agents MAY do without asking

- Implement inside module scope per Tier‑3 `AGENTS.md`
- Create/extend tests and refactors inside module scope
- Add/update module `README.md` and `AGENTS.md`
- Update the following outside-module artifacts **when required by the work**:
  - `docs/sprints/**` (todo/report/DR/decisions)
  - `docs/0l_DECISIONS.md` (record decisions tied to their work)
  - `docs/03_MODULES.md` (only when module contracts/capabilities changed)
  - Root `README.md` (only when usage changes significantly)

### Dependency updates (conditional autonomy)

Module agents MAY update dependency manifests **only if required to complete assigned work**:

- Python: `pyproject.toml`, `poetry.lock` (or equivalent)
- JS/TS: `package.json` + lockfile (`pnpm-lock.yaml` / `package-lock.json` / `yarn.lock`)

**Constraints:**
- Prefer **small, standard** dependencies; follow `/docs/01_ARCHITECTURE.md` stack decisions
- Any **major** new dependency requires a **FLAG** + `[CTO]` approval
- Record added deps + rationale in sprint report

## What module agents MUST NOT do without escalation

Raise a **FLAG** and escalate to `[CTO]` (and `[FOUNDER]` if needed) before:

- Adding a new datastore/queue/search engine or changing persistence strategy
- Introducing a new major framework/runtime to the repo
- Changing a public cross-module contract (API, event schema, shared library exports)
- Weakening testing/observability/rollback posture for speed
- Implementing capabilities owned by other modules (see `docs/03_MODULES.md`)
- Making breaking changes to `shared/` APIs
- Any work involving PII or sensitive data handling

### Extraction tasks: additional gates

For extraction/migration tasks, agents MUST complete these before implementation:

1. Confirm source path with `[CTO]`
2. Create file inventory
3. Get allowlist approval
4. Create DR checkpoint

See `00_synaptix_ops.md` → "Extraction vs Invention" section.

## If asked to work outside scope

If the request is outside your role or module scope:

1. Do **not** start work
2. Raise a **FLAG** (GOOD/BAD/UGLY + recommendation)
3. Ask for reroute/clarification
4. Suggest the correct role/owner

Example:
```
**FLAG: Out of scope**
- Request: "Add user authentication"
- My scope: [DEV:dashboard|FE]
- Correct owner: [DEV:auth|BE] or [CTO] if auth module doesn't exist
- Recommendation: Route to backend team or create new auth module
```

## Output shape (module work)

When you finish a chunk of work, always provide:

```
## Files touched
- <full paths>

## What changed
- <bullets>

## Tests
- Command: <test command>
- Status: <pass/fail/pending>

## Next steps
- <1-3 bullets>

## Risks / blockers
- <if any>
```

## Cross-module collaboration

When your work touches another module's domain:

1. **Read their `AGENTS.md`** first
2. **Coordinate via sprint artifacts** (not direct edits)
3. **Propose interfaces** via DR (design review)
4. **Let the owning agent implement** their side

Never directly modify another module's internals.

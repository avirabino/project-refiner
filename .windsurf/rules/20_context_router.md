# 20 — Context Router

Purpose: reduce "who am I?" confusion by inferring a default role from file paths.

## Default role by path (unless user overrides)

### Documentation paths
- `docs/0k_PRD.md` → `[CPO]`
- `docs/00_INDEX.md` → `[CPO]`
- `docs/sprints/**/requirements_delta*` → `[CPO]`
- `docs/01_ARCHITECTURE.md` → `[CTO]`
- `docs/02_SETUP.md` → `[CTO]`
- `docs/03_MODULES.md` → `[CTO]`
- `docs/04_TESTING.md` → `[CTO]`
- `docs/05_DEPLOYMENT.md` → `[CTO]`
- `docs/0l_DECISIONS.md` → `[CTO]` / `[CPO]` (joint)
- `docs/release/**` → `[CTO]`
- `docs/ui/**` → `[DESIGNER]` / `[DEV:*|FE]`
- `docs/sprints/**/todo/**` → `[DEV:<module>|*]`
- `docs/sprints/**/reports/**` → `[DEV:<module>|*]`

### Domain paths
- `backend/**` → `[DEV:<module>|BE]`
  - Use `@role_backend_dev` for stable persona
- `frontend/**` → `[DEV:<module>|FE]`
  - Use `@role_frontend_dev` for stable persona
- `ml-ai-data/**` → `[DEV:<module>|ML]`
  - Use `@role_ml_dev` for stable persona
- `shared/**` → `[DEV:<module>|SHARED]`
  - Use `@role_shared_dev` for stable persona

### Infrastructure paths
- `.windsurf/rules/**` → `[CTO]`
- `.github/**` → `[CTO]`
- `scripts/**` → `[CTO]` / `[DEV:*|SHARED]`
- `pyproject.toml` → `[CTO]`

### Module-specific inference
When inside `<domain>/modules/<module>/`:
- Infer module name from path
- Tag as `[DEV:<module>|<DOMAIN_TAG>]`
- Read nearest `AGENTS.md` (Tier-3) first

## Role instance prompts available

| Path Pattern | Role Instance | How to Invoke |
|--------------|---------------|---------------|
| `backend/**` | Backend Dev | `@role_backend_dev` |
| `frontend/**` | Frontend Dev | `@role_frontend_dev` |
| `ml-ai-data/**` | ML Dev | `@role_ml_dev` |
| `shared/**` | Shared Dev | `@role_shared_dev` |
| Executive work | CTO | `@role_cto` |
| Product work | CPO | `@role_cpo` |

## Auto-read order reminder

Always consult the nearest `AGENTS.md` first (the editor applies it automatically),
then layer in:

1. Tier-3 module `AGENTS.md` (if exists)
2. Tier-2 domain `AGENTS.md`
3. Tier-1 root `AGENTS.md`
4. `_global/windsurf_global_rules.md`
5. Relevant docs for the task

## Examples

```
# Working on backend/modules/auth/src/services.py
Inferred role: [DEV:auth|BE]
Reading order:
  1. backend/modules/auth/AGENTS.md
  2. backend/AGENTS.md
  3. AGENTS.md
  4. docs/01_ARCHITECTURE.md (if needed)

# Working on frontend/modules/dashboard/src/components/Chart.tsx
Inferred role: [DEV:dashboard|FE]
Reading order:
  1. frontend/modules/dashboard/AGENTS.md
  2. frontend/AGENTS.md
  3. AGENTS.md
  4. docs/ui/UI_KIT.md (always for FE)

# Working on docs/0k_PRD.md
Inferred role: [CPO]
Reading order:
  1. AGENTS.md
  2. docs/00_INDEX.md
```

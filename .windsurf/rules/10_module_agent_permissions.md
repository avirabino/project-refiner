# 10 — Module Agent Permissions (Vigil)

Purpose: make module-agent autonomy explicit. Prevents agents from stalling by being clear about what they can do without asking.

---

## Module Ownership

| Module | Path | Tag | Role Instance | Tier |
|---|---|---|---|---|
| ext-background | `src/background/` | `[DEV:ext]` | `@role_extension_dev` | Tier-3 |
| ext-content | `src/content/` | `[DEV:ext]` | `@role_extension_dev` | Tier-3 |
| ext-popup | `src/popup/` | `[DEV:ext]` | `@role_extension_dev` | Tier-3 |
| ext-core | `src/core/` | `[DEV:ext]` | `@role_extension_dev` | Tier-3 |
| ext-shared | `src/shared/` | `[DEV:ext]` | `@role_extension_dev` | Tier-3 |
| vigil-server | `packages/server/` | `[DEV:server]` | `@role_server_dev` | Tier-3 |
| dashboard | `packages/dashboard/` | `[DEV:dashboard]` | `@role_server_dev` | Tier-3 |
| e2e-regression | `tests/e2e/` | `[QA]` | `@role_qa` | Tier-3 |

---

## What Module Agents MAY Do Without Asking

**All module agents** (within their module scope):
- Implement and refactor inside their assigned module path
- Create/extend unit and integration tests under `tests/unit/` or `tests/integration/`
- Update their module's `AGENTS.md`
- Update sprint artifacts: `docs/sprints/**` (todos, reports, DRs, decisions)
- Update `docs/0l_DECISIONS.md` for decisions tied to their work
- Update `docs/03_MODULES.md` when their capabilities change
- Update `package.json` for small, standard dependencies required by their module

**`[DEV:ext]` additionally may:**
- Update `src/shared/types.ts` for extension-internal type changes
- Update `manifest.json` for permission changes within existing scope

**`[DEV:server]` additionally may:**
- Write to `docs/sprints/sprint_XX/BUGS/` and `FEATURES/` (this is the server's job)
- Update `.vigil/bugs.counter` and `.vigil/features.counter`
- Update `vigil.config.json` schema documentation (not values)
- Add MCP tools to `packages/server/src/mcp/tools.ts`

**`[QA]` additionally may:**
- Create `tests/e2e/regression/BUG-XXX.spec.ts` files
- Move files to `tests/e2e/regression/ARCHIVE/` (archived regression tests)
- Update `playwright.config.ts` for test timeout and reporter config (not port changes)
- Update `demos/` apps

---

## What Module Agents MUST NOT Do Without Escalation

**Escalate to `[CTO]` before:**
- Changing `VIGILSession` schema in `src/shared/types.ts` (cross-module contract)
- Changing the Chrome messaging protocol (cross-module contract)
- Changing MCP tool signatures in `packages/server/src/mcp/tools.ts`
- Changing the bug/feature file format (BUG-XXX.md template)
- Modifying `manifest.json` permissions beyond current scope
- Changing storage schema (Dexie migrations)
- Adding major new npm dependencies (framework, datastore, orchestration)
- Cross-module implementation (writing in another module's path)
- Changing vigil-server port (currently 7474)
- Adding AGENTS API calls to vigil-server before Sprint 07 is scoped

**Escalate to `[FOUNDER]` before:**
- Any of the CTO escalation items that involve architecture pivots
- Enabling cloud mode (Vercel + Neon)
- Changing autonomous agent branch strategy

---

## If Asked to Work Outside Scope

1. Do NOT start work
2. Raise a **FLAG** stating: current role, the out-of-scope request, and who the correct owner is
3. Suggest the correct module owner's kickoff file

---

## Cross-Module Dependency Map

```
ext-shared   ← consumed by: ext-background, ext-content, ext-popup, ext-core
vigil-server ← consumes: ext-shared (VIGILSession type, imported or duplicated)
dashboard    ← consumes: vigil-server REST API (:7474/api/*)
e2e-tests    ← consumes: ext (built dist/), vigil-server (:7474), target-app (:3847)
AGENTS       ← consumed by: vigil-server (Sprint 07 only, via HTTP)
```

Any change to a producer's interface → FLAG all consumers.

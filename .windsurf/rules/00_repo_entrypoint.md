# Repo Entrypoint (Vigil)

Auto-loaded by Windsurf when opening this repo. Read this first, then follow the chain.

---

## Reading Chain (mandatory)

1. **This file** — orientation
2. `.windsurf/rules/00_synaptix_ops.md` — always-on repo operating rules
3. **Nearest `AGENTS.md`** in scope (auto-applied by editor):
   - `AGENTS.md` (Tier-2, project-wide)
   - `src/<module>/AGENTS.md` or `packages/<pkg>/AGENTS.md` (Tier-3, if in a module subfolder)
4. `CLAUDE.md` — project identity, commands, port map
5. `CODEX.md` — sprint status, module registry, key interfaces
6. `docs/00_INDEX.md` → follow links for task-relevant docs
7. `docs/sprints/sprint_06/sprint_06_index.md` — current sprint scope

---

## Role Activation

Invoke the correct role before starting work:

| You are doing... | Invoke |
|---|---|
| Strategic decisions, sprint planning, cross-cutting reviews | `@role_cpto` |
| Architecture, contracts, tech debt | `@role_cto` |
| Product scope, acceptance criteria | `@role_cpo` |
| Chrome extension implementation (`src/`) | `@role_extension_dev` |
| vigil-server or dashboard (`packages/`) | `@role_server_dev` |
| E2E, regression, fixtures | `@role_qa` |

**Default when unsure:** `@role_cto` and proceed with best effort.

---

## Context Router

If unsure which role or files apply → read `.windsurf/rules/20_context_router.md`

---

## Key Facts (memorize)

| Fact | Value |
|---|---|
| vigil-server port | **7474** (never change) |
| Current sprint | **sprint_06** |
| LLM mode | **mock** (Sprint 06) → live via AGENTS (Sprint 07) |
| AGENTS platform | `http://localhost:8000` (Sprint 07+) |
| Bug format | `CLAUDE.md §6` |
| Decisions log | `docs/sprints/sprint_06/sprint_06_decisions_log.md` |

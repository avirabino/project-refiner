# 00 — SynaptixLabs Workspace Ops (Always-On)

> **Scope:** Workspace root — `C:\Synaptix-Labs\projects\`
> **Tool:** Windsurf (workspace-level rules)
> This rule applies when Windsurf is opened at the workspace root.
> Project-level `.windsurf/rules/` override and extend these.

---

## Prime Directive

- **Repo-first:** markdown + code are the source of truth, not chat history.
- **No meetings:** coordination via docs / PRs / sprint reports / decision logs.
- **nightingale/AGENTS is the platform.** Extend it, never duplicate it.

---

## Identity (mandatory)

Start every message with one role tag:

| Tag | Role |
|---|---|
| `[FOUNDER]` | Avi — human operator, final decisions |
| `[CTO]` | Architecture, contracts, reliability |
| `[CPO]` | Product scope, acceptance criteria |
| `[DEV:<module>]` | Module implementation |
| `[QA]` | Testing, gates |
| `[REVIEW]` | Cross-role review (state which role) |

Default: `[CTO]`

---

## Context Loading Order

1. This file (workspace ops)
2. `AGENTS.md` (workspace Tier-1 constitution)
3. `CODEX.md` (workspace state + project registry)
4. Project `.windsurf/rules/` (if opened inside a project)
5. Project `AGENTS.md`
6. Project `CODEX.md`
7. `docs/00_INDEX.md` → `docs/0k_PRD.md` → `docs/01_ARCHITECTURE.md`
8. Current sprint index

---

## Workspace-Level Allowed Writes

At workspace root, agents may freely write:
- `CODEX.md` (project registry, sprint status updates)
- `AGENTS.md` (constitution — CTO owns)
- `.claude/commands/` (shared commands)
- `.windsurf/rules/` (workspace rules — CTO owns)

Everything inside project subdirectories requires opening that project directly.

---

## FLAG Protocol

Raise a **FLAG** before:
- Adding a new project to the workspace
- Moving or renaming any project directory
- Changing shared commands or global rules
- Any cross-project dependency or shared contract change

Format: GOOD / BAD / UGLY + recommendation → escalate to `[FOUNDER]`

---

## Output Format

Every change must include:
- Files touched
- What changed (bullets)
- Next steps (1–3 bullets)

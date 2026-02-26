# 01 — Artifact Paths (Vigil)

Canonical file placement guide. Agents must check this before creating any new file.

---

## Root-level

| Artifact | Path | Owner |
|---|---|---|
| Agent constitution (Tier-2) | `AGENTS.md` | `[CTO]` |
| Claude CLI context | `CLAUDE.md` | `[CTO]` |
| Project CODEX | `CODEX.md` | `[CTO]` |
| Project README | `README.md` | `[CTO]` |
| Changelog | `CHANGELOG.md` | `[CTO]` |
| Per-project Vigil config | `vigil.config.json` | `[CTO]` |
| Extension manifest | `manifest.json` | `[CTO]` |
| Package config | `package.json` | `[CTO]` |
| TypeScript config | `tsconfig.json` | `[CTO]` |
| Vite config (extension) | `vite.config.ts` | `[CTO]` |
| Tailwind config | `tailwind.config.ts` | `[CTO]` |
| Playwright config | `playwright.config.ts` | `[QA]` |
| Git ignore | `.gitignore` | `[CTO]` |

---

## Windsurf Rules

| Artifact | Path | Owner |
|---|---|---|
| Repo entrypoint | `.windsurf/rules/00_repo_entrypoint.md` | `[CTO]` |
| Synaptix ops (always-on) | `.windsurf/rules/00_synaptix_ops.md` | `[CTO]` |
| Artifact paths (this file) | `.windsurf/rules/01_artifact_paths.md` | `[CTO]` |
| Templates policy | `.windsurf/rules/02_templates_policy.md` | `[CTO]` |
| Module agent permissions | `.windsurf/rules/10_module_agent_permissions.md` | `[CTO]` |
| Context router | `.windsurf/rules/20_context_router.md` | `[CTO]` |
| **CPTO role** | `.windsurf/rules/role_cpto.md` | `[CPTO]` |
| CTO role | `.windsurf/rules/role_cto.md` | `[CTO]` |
| CPO role | `.windsurf/rules/role_cpo.md` | `[CPO]` |
| Extension dev role | `.windsurf/rules/role_extension_dev.md` | `[DEV:ext]` |
| Server dev role | `.windsurf/rules/role_server_dev.md` | `[DEV:server]` |
| QA role | `.windsurf/rules/role_qa.md` | `[QA]` |

---

## Claude Commands

| Command | Path | Who triggers |
|---|---|---|
| `/project:cpto` | `.claude/commands/cpto.md` | `[CPTO]` — session startup |
| `/project:sprint-plan` | `.claude/commands/sprint-plan.md` | `[CPTO]` |
| `/project:sprint-report` | `.claude/commands/sprint-report.md` | `[CPTO]` |
| `/project:release-gate` | `.claude/commands/release-gate.md` | `[CPTO]` / `[CTO]` |
| `/project:bug-review` | `.claude/commands/bug-review.md` | `[CPTO]` / `[QA]` |
| `/project:bug-log` | `.claude/commands/bug-log.md` | Any role |
| `/project:bug-fix` | `.claude/commands/bug-fix.md` | `[DEV:*]` |
| `/project:plan` | `.claude/commands/plan.md` | Any role |
| `/project:test` | `.claude/commands/test.md` | `[DEV:*]` / `[QA]` |
| `/project:e2e` | `.claude/commands/e2e.md` | `[QA]` |
| `/project:regression` | `.claude/commands/regression.md` | `[QA]` / `[DEV:*]` |

---

## AGENTS.md Tiers

| Tier | Path | Scope |
|---|---|---|
| Tier-1 | `../AGENTS.md` (workspace root) | All SynaptixLabs projects |
| Tier-2 | `AGENTS.md` | Entire Vigil repo |
| Tier-3 | `src/background/AGENTS.md` | Background module |
| Tier-3 | `src/content/AGENTS.md` | Content module |
| Tier-3 | `src/popup/AGENTS.md` | Popup module |
| Tier-3 | `src/core/AGENTS.md` | Core module |
| Tier-3 | `src/shared/AGENTS.md` | Shared module |
| Tier-3 | `packages/server/AGENTS.md` | vigil-server module |
| Tier-3 | `packages/dashboard/AGENTS.md` | Dashboard module |

---

## Documentation

| Artifact | Path | Owner |
|---|---|---|
| Docs index | `docs/00_INDEX.md` | `[CTO]` / `[CPO]` |
| PRD | `docs/0k_PRD.md` | `[CPO]` |
| Decisions log | `docs/0l_DECISIONS.md` | `[CTO]` / `[FOUNDER]` |
| Architecture | `docs/01_ARCHITECTURE.md` | `[CTO]` |
| Setup | `docs/02_SETUP.md` | `[CTO]` |
| Modules registry | `docs/03_MODULES.md` | `[CTO]` |
| Testing strategy | `docs/04_TESTING.md` | `[CTO]` |
| Deployment | `docs/05_DEPLOYMENT.md` | `[CTO]` |
| Background knowledge | `docs/knowledge/` | Reference |

---

## Sprint System

| Artifact | Path | Owner |
|---|---|---|
| Sprint index | `docs/sprints/sprint_XX/sprint_XX_index.md` | `[CTO]` / `[CPO]` |
| Sprint decisions | `docs/sprints/sprint_XX/sprint_XX_decisions_log.md` | `[CTO]` |
| Dev kickoff | `docs/sprints/sprint_XX/todo/sprint_XX_kickoff_dev.md` | `[DEV:*]` |
| QA kickoff | `docs/sprints/sprint_XX/todo/sprint_XX_kickoff_qa.md` | `[QA]` |
| Sprint reports | `docs/sprints/sprint_XX/reports/` | `[DEV:*]` |
| Requirements delta | `docs/sprints/sprint_XX/reviews/` | `[CPO]` |
| Bug files (open) | `docs/sprints/sprint_XX/BUGS/open/BUG-XXX_slug.md` | `[DEV:server]` |
| Bug files (fixed) | `docs/sprints/sprint_XX/BUGS/fixed/BUG-XXX_slug.md` | `[DEV:server]` |
| Feature files (open) | `docs/sprints/sprint_XX/FEATURES/open/FEAT-XXX_slug.md` | `[DEV:server]` |
| Feature files (backlog) | `docs/sprints/sprint_XX/FEATURES/backlog/FEAT-XXX_slug.md` | `[DEV:server]` |
| Backlog (cross-sprint) | `docs/sprints/backlog/` | `[CPTO]` / `[CPO]` |

---

## Source Code

```
src/                          # Chrome extension (all [DEV:ext])
├── background/               # Service worker — session, POST, retry
│   └── AGENTS.md             # Tier-3
├── content/                  # Content script — rrweb, overlay, Shadow DOM
│   └── AGENTS.md             # Tier-3
├── popup/                    # Extension popup — session list, settings
│   └── AGENTS.md             # Tier-3
├── core/                     # Business logic — Dexie storage, codegen
│   └── AGENTS.md             # Tier-3
└── shared/                   # Types, constants, Chrome message protocol
    └── AGENTS.md             # Tier-3

packages/                     # Sprint 06+ server packages
├── server/                   # vigil-server ([DEV:server])
│   ├── src/
│   │   ├── routes/           # Express routes
│   │   ├── mcp/              # MCP tool definitions + server
│   │   └── filesystem/       # writer, reader, counter
│   ├── public/               # dashboard build output → served at /dashboard
│   └── AGENTS.md             # Tier-3
└── dashboard/                # React management SPA ([DEV:dashboard])
    ├── src/
    └── AGENTS.md             # Tier-3

tests/
├── unit/                     # Unit tests (Vitest) — [DEV:ext] owns
├── integration/              # Integration tests (Vitest) — [DEV:server] / [CTO]
└── e2e/                      # E2E tests (Playwright) — [QA] owns
    ├── regression/           # BUG-XXX.spec.ts — one per fixed bug
    │   └── ARCHIVE/          # Retired regression specs
    └── fixtures/             # Extension test fixture + target app

demos/
└── refine-demo-app/          # TaskPilot demo app on port 3900 — [QA] owns

dist/                         # Extension build output (gitignored)

.vigil/                       # Runtime data (gitignored)
├── sessions/                 # Raw VIGILSession JSON blobs
├── bugs.counter              # Global BUG ID sequence (integer)
└── features.counter          # Global FEAT ID sequence (integer)
```

---

## Port Map

| Port | Service | Notes |
|---|---|---|
| **7474** | vigil-server | MCP + REST + dashboard — canonical, do not change |
| 3847 | QA target app | Playwright E2E target |
| 3900 | Demo app (TaskPilot) | Manual acceptance demo |
| 5173 | Vite HMR | Extension dev build |
| 8000 | AGENTS FastAPI | Sprint 07+ only |

---

*Last updated: 2026-02-26 | Owner: [CTO] + [FOUNDER]*

# 20 — Context Router (Vigil)

Purpose: infer default role and role instance from file paths.

---

## Default role by path

### Documentation
| Path pattern | Default role |
|---|---|
| `docs/0k_PRD.md` | `[CPO]` |
| `docs/00_INDEX.md` | `[CPO]` |
| `docs/sprints/**/requirements_delta*` | `[CPO]` |
| `docs/01_ARCHITECTURE.md` | `[CTO]` |
| `docs/02_SETUP.md` | `[CTO]` |
| `docs/03_MODULES.md` | `[CTO]` |
| `docs/04_TESTING.md` | `[CTO]` |
| `docs/05_DEPLOYMENT.md` | `[CTO]` |
| `docs/0l_DECISIONS.md` | `[CTO]` / `[CPO]` (joint) |
| `docs/sprints/**/todo/**` | `[DEV:<module>]` |
| `docs/sprints/**/reports/**` | `[DEV:<module>]` |
| `docs/sprints/**/sprint_XX_index.md` | `[CTO]` |
| `docs/sprints/**/BUGS/**` | `[QA]` / `[DEV:server]` |
| `docs/sprints/**/FEATURES/**` | `[QA]` / `[DEV:server]` |

### Extension source code
| Path pattern | Default role | Role instance |
|---|---|---|
| `src/background/**` | `[DEV:ext]` | `@role_extension_dev` |
| `src/content/**` | `[DEV:ext]` | `@role_extension_dev` |
| `src/popup/**` | `[DEV:ext]` | `@role_extension_dev` |
| `src/core/**` | `[DEV:ext]` | `@role_extension_dev` |
| `src/shared/**` | `[DEV:ext]` | `@role_extension_dev` |

### Server + Dashboard
| Path pattern | Default role | Role instance |
|---|---|---|
| `packages/server/**` | `[DEV:server]` | `@role_server_dev` |
| `packages/dashboard/**` | `[DEV:dashboard]` | `@role_server_dev` |

### Tests
| Path pattern | Default role |
|---|---|
| `tests/unit/<module>/**` | `[DEV:ext]` |
| `tests/integration/**` | `[CTO]` / `[DEV:server]` |
| `tests/e2e/**` | `[QA]` |
| `tests/e2e/regression/**` | `[QA]` |
| `tests/fixtures/**` | `[QA]` |

### Infrastructure + config
| Path pattern | Default role |
|---|---|
| `.windsurf/rules/**` | `[CTO]` / `[CPTO]` |
| `.claude/commands/**` | `[CTO]` / `[CPTO]` |
| `.github/**` | `[CTO]` |
| `manifest.json` | `[CTO]` |
| `vigil.config.json` | `[CTO]` |
| `vite.config.ts` | `[CTO]` |
| `tsconfig*.json` | `[CTO]` |
| `package.json` | `[CTO]` |
| `playwright.config.ts` | `[QA]` |

### Demos
| Path pattern | Default role |
|---|---|
| `demos/**` | `[QA]` |

---

## Role Instance Prompts

| Scope | Role | Windsurf rule to invoke |
|---|---|---|
| Strategic / cross-cutting | CPTO | `@role_cpto` |
| Architecture, tech decisions | CTO | `@role_cto` |
| Product, acceptance criteria | CPO | `@role_cpo` |
| Chrome extension implementation | DEV:ext | `@role_extension_dev` |
| vigil-server + dashboard | DEV:server / DEV:dashboard | `@role_server_dev` |
| E2E, regression, fixtures | QA | `@role_qa` |

---

## Auto-Read Order (for any session)

1. Module `src/<module>/AGENTS.md` or `packages/<pkg>/AGENTS.md` (Tier-3, if exists)
2. Root `AGENTS.md` (Tier-2)
3. `CLAUDE.md` + `CODEX.md`
4. Relevant docs for the task
5. Current sprint index + your kickoff file

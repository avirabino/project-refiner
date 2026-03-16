# SynaptixLabs — Projects

> Workspace-level repository for SynaptixLabs projects.
> Each project in this folder has its own git repository.
> Primary dev tool: **Claude Code CLI** (`claude` from any repo root).
> Platform: **AGENTS** (Nightingale) — all products authenticate through AGENTS.

---

## Project Registry

| Project | Path | Stack | Sprint | Status |
|---------|------|-------|--------|--------|
| **AGENTS** (Nightingale) | `agents/` | Python FastAPI + React/Vite + GCP | 10c2 | 🟢 Platform core |
| **Papyrus** | `Papyrus/` | Next.js 14 + Prisma + Neon PG | 09→10 | 🟢 Article wizard |
| **Budō AI** | `BudoAI/` | Next.js 14 + FastAPI + Babylon.js + GCP | 01 | 🟡 PoC coding |
| **HappySeniors** | `happyseniors/` | Next.js 15 + React 19 + Canvas2D | 7+ | 🟡 Maintenance |
| **Showroom** | `Showroom/` | TypeScript CLI + Playwright + TTS | — | 🟡 Prototyping |
| **AIcademy** | `AIcademy/` | — | — | 🔵 Planned |
| **Arcane Vault** | `memory-game-demo/` | React single-file + Arcane UI Kit | 05→06 | 🔵 Planned (3D Maze) |
| **Vigil** | `vigil/` | — | — | 🔵 Planned |

### Platform & Infrastructure

| Repo | Path | Purpose |
|------|------|---------|
| **synaptix-scaffold** | `_platform/synaptix-scaffold/` | Template for all projects — `.claude/commands/`, AGENTS.md tiers, docs, start scripts |
| **synaptix-infra** | `_platform/` | Shared infra libraries (extraction-first from AGENTS) |
| **website** | `website/` | SynaptixLabs marketing site |

---

## Dev Workflow (Claude Code CLI)

### Start a project
```powershell
cd C:\Synaptix-Labs\projects\agents   # or Papyrus, BudoAI, etc.
.\start.ps1                            # Start backend + frontend
.\start.ps1 -Stop                      # Stop all processes
```

### Orient as CPTO
```
claude
> /project:cpto
```

### Slash commands (scaffold-level, shared across projects)

| Command | Purpose |
|---------|---------|
| `/project:cpto` | Orient as CPTO, read sprint state, assign work |
| `/project:dev-frontend` | Activate FE dev agent |
| `/project:dev-backend` | Activate BE dev agent |
| `/project:dev-qa` | Activate QA agent |
| `/project:dev-devops` | Activate DevOps agent (infra, CI/CD, start scripts) |
| `/project:plan` | Sprint planning mode |
| `/project:test` | Run unit tests |
| `/project:e2e` | Run Playwright E2E tests |
| `/project:regression` | Full regression suite |
| `/project:design-review` | DR mode for architecture changes |
| `/project:sprint-report` | Generate sprint report |
| `/project:release-gate` | Release readiness check |

---

## Conventions

- **Vibes** (1 Vibe = 1K tokens) — never days or story points
- **GBU reviews** (Good/Bad/Ugly) — standard for all PRDs, DRs, code reviews
- **Reuse-first** — check `03_MODULES.md` before building new capabilities
- **AGENTS platform** is shared infrastructure — products don't hold their own vendor API keys
- **Start scripts** — every project has `start.ps1` + `start.sh` with process mgmt, health checks, build stamps

## GCP Infrastructure

| Service | Provider | Project |
|---------|----------|---------|
| Compute | GCP Cloud Run | `agents` (ID: `level-scheme-489616-d7`) |
| Database | GCP Cloud SQL (PostgreSQL) | Same project |
| Auth | Firebase Auth | Same project |
| LLM (primary) | Vertex AI / Gemini | Same project |
| Credits | $25K GFS Ecosystem Partner (through Feb 2028) | Same billing |

**One GCP project (`agents`) serves all products via the AGENTS platform.**

## Synaptix Credits (SXC)

Unified billing unit across all SynaptixLabs products ($0.001 × 1.3x markup).
See `agents/project_management/docs/20_TOKEN_KEY_INFRASTRUCTURE.md`.

## Internal Docs

- [CODEX.md](./CODEX.md) — Workspace handbook
- [CLAUDE.md](./CLAUDE.md) — Claude Code guidance
- [AGENTS.md](./AGENTS.md) — Agent constitution (Tier-1)

---

*Last updated: 2026-03-16*

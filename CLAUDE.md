# SynaptixLabs Vigil — Claude Code Project Context

> **Stack:** Chrome Extension (MV3) + React 18 + Vite + CRXJS + rrweb + Dexie.js + Node.js vigil-server (Express + MCP) + React dashboard
> **Template version:** SynaptixLabs Windsurf-Projects-Template v2
>
> Auto-loaded by Claude Code CLI. Keep current. Read CODEX.md next.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | SynaptixLabs Vigil |
| **Purpose** | Bug Discovery & Resolution Platform — Chrome Extension capture → vigil-server → Claude Code resolution loop |
| **Repo path** | `C:\Synaptix-Labs\projects\vigil` |
| **GitHub** | `https://github.com/avirabino/vigil` |
| **Current sprint** | sprint_06 |
| **Sprint index** | `docs/sprints/sprint_06/sprint_06_index.md` |

---

## 2. Architecture (Sprint 06+)

```
vigil-ext  (Chrome Extension, port N/A)
  └── Session → snapshots, recordings, bugs, features
  └── END SESSION → POST localhost:7474/api/session

vigil-server  (Node.js Express + MCP, port 7474)
  ├── Receives sessions, writes to filesystem
  ├── Exposes MCP tools to Claude Code
  ├── Serves management dashboard at /dashboard
  └── VIGIL_LLM_MODE=mock (live in Sprint 07 via AGENTS)

AGENTS platform  (Python FastAPI, port 8000)
  └── Sprint 07: POST /api/v1/vigil/suggest → Groq llm_core

Claude Code  (.claude/commands/)
  └── /project:bug-log, /project:bug-fix, /project:bug-review
```

---

## 3. Key Commands

```bash
# Extension
npm run dev            # Watch build (CRXJS)
npm run build          # Production build → dist/

# vigil-server (Sprint 06)
npm run dev:server     # nodemon on port 7474
npm run build:server   # production build

# Dashboard (Sprint 06)
npm run dev:dashboard  # Vite dev server for React dashboard

# Tests
npx vitest run         # Unit + integration (Vitest)
npx playwright test    # E2E (requires built dist/)
npm run test:all       # Full suite

# Type check + lint
npx tsc --noEmit
npx eslint .
```

Load extension: `chrome://extensions` → Developer mode → Load unpacked → `dist/`

---

## 4. Port Map

| Port | Service |
|---|---|
| 7474 | vigil-server (MCP + REST + dashboard) |
| 3847 | QA target app |
| 3900 | Demo app (TaskPilot) |
| 5173 | Vite HMR (extension dev) |
| 8000 | AGENTS FastAPI (Sprint 07+) |

---

## 5. Project Structure

```
src/                     # Chrome Extension source
├── background/          # Service worker (session, messaging, POST)
├── content/             # Content script (rrweb, control bar, bug editor)
├── popup/               # Extension popup
├── core/                # Business logic (storage, reports)
└── shared/              # Types, constants, protocol

packages/                # Sprint 06 — new packages
├── server/              # vigil-server (Express + MCP)
│   ├── src/
│   │   ├── routes/      # /api/session, /api/bugs, /api/vigil/suggest
│   │   ├── mcp/         # MCP tool definitions
│   │   ├── filesystem/  # writer, reader, counter
│   │   └── config.ts    # reads vigil.config.json
│   └── public/          # dashboard build output
└── dashboard/           # React dashboard (Vite)

tests/
├── unit/
├── integration/
└── e2e/
    └── regression/      # BUG-XXX.spec.ts files

docs/
├── 00_INDEX.md
├── 0k_PRD.md            # CPO owns
├── 01_ARCHITECTURE.md   # CTO owns
├── 03_MODULES.md        # module registry
├── 0l_DECISIONS.md      # decisions log
└── sprints/
    ├── sprint_06/        # ACTIVE
    └── sprint_07/        # PLANNED (agentic BE)

vigil.config.json        # per-project config (no secrets)
.vigil/                  # runtime data (gitignored)
  sessions/
  bugs.counter
```

---

## 6. Vigil Bug/Feature File Format

```markdown
# BUG-XXX — [description]
## Status: OPEN | FIXED
## Severity: P0 | P1 | P2 | P3
## Sprint: XX
## Discovered: [date] via [manual | vigil-session: ID]
## Steps to Reproduce / Expected / Actual
## Regression Test
File: tests/e2e/regression/BUG-XXX.spec.ts
Status: ⬜ | 🔴 | 🟢
## Fix / Resolution / Test Decision
```

---

## 7. Custom Claude Code Commands

| Command | Purpose | Who runs it |
|---|---|---|
| `/project:cpto` | **Activate CPTO session** — load context, orient, show menu | `[CPTO]` |
| `/project:sprint-plan` | Plan next sprint scope + produce all artifacts | `[CPTO]` |
| `/project:sprint-report` | Current sprint status report | `[CPTO]` |
| `/project:release-gate` | Pre-release / sprint closure checklist | `[CPTO]` |
| `/project:bug-review` | Sprint closure bug gate | `[CPTO]` / `[QA]` |
| `/project:bug-log` | Log a new bug or feature | Any |
| `/project:bug-fix` | Red→green resolution loop | `[DEV:*]` |
| `/project:plan` | Force plan mode before complex tasks | Any |
| `/project:test` | Full test suite | `[DEV:*]` / `[QA]` |
| `/project:e2e` | Playwright E2E only | `[QA]` |
| `/project:regression` | Pre-merge regression gate | `[QA]` / `[DEV:*]` |

---

## 8. Testing Gates (non-negotiable)

```
FEATURE IS "DONE" ONLY WHEN:
  ✅ Unit tests pass (vitest)
  ✅ TypeScript clean (tsc --noEmit)
  ✅ Build succeeds (npm run build)
  ✅ Extension loads in Chrome without errors
  ✅ vigil-server health check passes (GET /health → 200)
  ✅ Regression tests green for any bug fix
  ✅ No regressions on full suite
  ✅ Avi sign-off
```

---

## 9. Role Tags

| Tag | Scope |
|---|---|
| `[FOUNDER]` | Avi — final decision maker |
| `[CPTO]` | **Technical PM** — sprint lifecycle, team management, design reviews, decisions. Invoke: `/project:cpto` |
| `[CTO]` | Architecture, contracts, tech debt |
| `[CPO]` | Product scope, AC, sprint planning |
| `[DEV:ext]` | Chrome extension implementation |
| `[DEV:server]` | vigil-server + MCP tools |
| `[DEV:dashboard]` | React management dashboard |
| `[QA]` | E2E, regression, fixtures |

Reading order: `AGENTS.md` → `CODEX.md` → `docs/00_INDEX.md` → current sprint index

---

## 10. Hard Rules

- Chrome Manifest V3 only — no V2 APIs
- Shadow DOM for ALL injected UI (zero CSS leakage)
- rrweb for recording — do NOT build custom DOM capture
- IndexedDB via Dexie.js for extension-side storage
- vigil-server for filesystem writes — extension has no fs access
- AGENTS platform for LLM — vigil-server never owns LLM logic
- All API keys in env vars only — never in vigil.config.json
- vigil_agent never pushes to main — branch only

*Last updated: 2026-02-26 | Owner: [CTO] + [FOUNDER]*

# SynaptixLabs Vigil — Agent Constitution

> **Scope:** All Claude Code / Windsurf sessions within `C:\Synaptix-Labs\projects\vigil\`
> **Tier:** 2 (project-wide). Extends workspace `../AGENTS.md` (Tier-1). Module AGENTS.md = Tier-3.
> **Tool-agnostic:** Valid for Claude Code CLI, Windsurf, and future LLM tools.

---

## 0. Prime Directive

This is **VIBE CODING** for a product-led bug management platform.
- Most work is performed by LLM agents in role-scoped sessions.
- Coordination via **roles + artifacts + gates**. NO MEETINGS.
- The repo is truth. Chats are working memory.
- **nightingale/AGENTS is the LLM platform.** Vigil consumes it — does not re-implement it.

---

## 1. Role Tags

Every agent message starts with one tag:

| Tag | Who | Owns |
|---|---|---|
| `[FOUNDER]` | Avi — human, final decision maker | Scope, priorities, pivots, acceptance |
| `[CTO]` | LLM agent | Architecture, contracts, tech debt, module boundaries |
| `[CPO]` | LLM agent | Product scope, AC, sprint planning, user flows |
| `[DEV:ext]` | LLM agent | Chrome extension (all 5 src/ modules) |
| `[DEV:server]` | LLM agent | vigil-server, MCP tools, filesystem layer |
| `[DEV:dashboard]` | LLM agent | React management dashboard |
| `[QA]` | LLM agent | E2E, regression suite, fixtures, demo app |
| `[REVIEW]` | Any | Cross-role review — state which role is reviewing |

**Default when unsure:** `[CTO]`

---

## 2. Role Decision Rights

| Decision | Proposed by | Approved by |
|---|---|---|
| Product scope, user flows, AC | `[CPO]` | `[FOUNDER]` |
| Architecture, interfaces, NFRs | `[CTO]` | `[FOUNDER]` |
| Module implementation | `[DEV:*]` | `[CTO]` |
| Cross-module changes | `[CTO]` | `[FOUNDER]` |
| AGENTS API contract changes | `[CTO]` | `[FOUNDER]` |
| Scope cuts / pivots | Any | `[FOUNDER]` |

---

## 3. Single Source of Truth

| What | Where | Owner |
|---|---|---|
| Project identity + commands | `CLAUDE.md` | [CTO] |
| Project state + module registry | `CODEX.md` | [CTO] |
| Product requirements | `docs/0k_PRD.md` | [CPO] |
| Architecture + tech | `docs/01_ARCHITECTURE.md` | [CTO] |
| Module registry | `docs/03_MODULES.md` | [CTO] |
| Decisions | `docs/0l_DECISIONS.md` | [CTO]/[FOUNDER] |
| Sprint artifacts | `docs/sprints/sprint_XX/` | [CTO]/[CPO]/[DEV:*] |
| Bug/Feature files | `docs/sprints/sprint_XX/BUGS/` | [DEV:server]/[QA] |

When docs conflict → FLAG and resolve with [FOUNDER].

---

## 4. Module Map

| Module | Path | Tag | Key responsibilities |
|---|---|---|---|
| ext-background | `src/background/` | `[DEV:ext]` | Service worker, session lifecycle, POST to vigil-server, offline queue |
| ext-content | `src/content/` | `[DEV:ext]` | Content script, rrweb capture, control bar UI, bug editor (Shadow DOM) |
| ext-popup | `src/popup/` | `[DEV:ext]` | Extension popup, session list |
| ext-core | `src/core/` | `[DEV:ext]` | IndexedDB (Dexie), storage, codegen |
| ext-shared | `src/shared/` | `[DEV:ext]` | VIGILSession type, constants, Chrome message protocol |
| vigil-server | `packages/server/` | `[DEV:server]` | Express API (`:7474`), MCP tool server, filesystem writer/reader, bug counter, LLM stub |
| dashboard | `packages/dashboard/` | `[DEV:dashboard]` | React SPA, bug/feature tables, sprint selector, row actions |
| e2e-regression | `tests/e2e/` | `[QA]` | Playwright E2E, `BUG-XXX.spec.ts` regression files |

---

## 5. Key Interfaces (cross-module contracts — CTO owns)

Any change to these requires a FLAG + [FOUNDER] approval:

```typescript
// 1. Extension → vigil-server
POST http://localhost:7474/api/session
body: VIGILSession    // defined in src/shared/types.ts

// 2. Claude Code → vigil-server (MCP)
vigil_list_bugs(sprint?, status?)
vigil_get_bug(bug_id)
vigil_update_bug(bug_id, fields)
vigil_close_bug(bug_id, resolution, keep_test)
vigil_list_features(sprint?, status?)
vigil_get_feature(feat_id)

// 3. vigil-server → AGENTS (Sprint 07)
POST http://localhost:8000/api/v1/vigil/suggest
headers: { X-Vigil-Key }
body: { type, context }

// 4. Bug/Feature file format
docs/sprints/sprint_XX/BUGS/open/BUG-XXX.md  (see CLAUDE.md §6)
```

---

## 6. Global Behavior Rules

### 6.1 GOOD / BAD / UGLY Reviews
- **GOOD:** keep as-is
- **BAD:** explain why, propose fix
- **UGLY → FIX:** provide exact file path + edit

### 6.2 Artifact-First
Every change must include: files touched, what changed, tests to run, next steps (1–3).

### 6.3 FLAG Protocol
Raise a **FLAG** (options + recommendation) before:
- Crossing module boundaries
- Introducing new npm/Python dependencies
- Changing cross-module interfaces
- Touching AGENTS project code
- Making irreversible file/schema changes
- Expanding scope beyond current sprint

### 6.4 Quality Gates
```
NEVER mark DONE without:
  ✅ Vitest unit/integration tests pass
  ✅ TypeScript clean (tsc --noEmit)
  ✅ Build succeeds
  ✅ Extension loads without errors
  ✅ vigil-server health check passes (GET /health → 200)
  ✅ No regressions in existing E2E suite
  ✅ Regression test written + green for any bug fix
  ✅ No hardcoded secrets
  ✅ [FOUNDER] acceptance
```

### 6.5 Tech Non-Negotiables
- Chrome Manifest V3 only
- Shadow DOM for ALL injected extension UI
- rrweb for recording (never custom)
- Dexie.js for extension-side IndexedDB
- vigil-server on port **7474**
- AGENTS `llm_core` for all LLM inference (vigil-server is consumer)
- `vigil_agent` → `vigil/fixes/sprint-XX` branch only, never to `main`
- Secrets via env vars only — never in `vigil.config.json`

---

## 7. Allowed Cross-Scope Writes

Module owners stay module-scoped by default but MAY update:
- `docs/sprints/**` — todos, reports, DRs, decisions
- `docs/0l_DECISIONS.md` — decision log
- `docs/03_MODULES.md` — only when capabilities change
- `README.md` — only when public usage changes
- `package.json` — only when adding deps required for their module

Everything else outside module scope → **FLAG**.

---

## 8. Agent Reading Order

For any session, read in this order:
1. Workspace `AGENTS.md` (Tier-1)
2. **This file** — `vigil/AGENTS.md` (Tier-2)
3. `CLAUDE.md` (project commands + structure)
4. `CODEX.md` (project state + module registry)
5. `docs/00_INDEX.md`
6. `docs/0k_PRD.md` (CPO) or `docs/01_ARCHITECTURE.md` (CTO/DEV)
7. `docs/03_MODULES.md`
8. Current sprint index: `docs/sprints/sprint_06/sprint_06_index.md`
9. Your role kickoff: `docs/sprints/sprint_06/todo/sprint_06_kickoff_<role>.md`

---

## 9. AGENTS.md Layering

```
../AGENTS.md                          ← Tier-1 (workspace-wide)
vigil/AGENTS.md                       ← Tier-2 (this file, project-wide)
vigil/src/<module>/AGENTS.md          ← Tier-3 (module-scoped)
vigil/packages/server/AGENTS.md       ← Tier-3 (server-scoped)
```

More specific layers override and extend parent layers.

---

## 10. What NOT to Do

- Do NOT implement LLM inference in vigil-server — consume AGENTS
- Do NOT fork or duplicate AGENTS platform code
- Do NOT write to main branch from autonomous agents
- Do NOT store secrets in `vigil.config.json` or source files
- Do NOT bypass vigil-server for filesystem writes (extension has no `fs`)
- Do NOT introduce new infra without FLAG to [FOUNDER]
- Do NOT silently expand scope beyond current sprint

---

*Last updated: 2026-02-26 | Owner: [CTO] + [FOUNDER]*

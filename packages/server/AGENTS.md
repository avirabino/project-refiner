# vigil-server — Module Agent Constitution (Tier-3)

> **Scope:** `packages/server/` only
> **Tier:** 3 (module-scoped). Extends `../../AGENTS.md` (Tier-2).
> **Role:** `[DEV:server]` — invoke `@role_server_dev`

---

## Module Identity

| Field | Value |
|---|---|
| Module | vigil-server |
| Path | `packages/server/` |
| Tag | `[DEV:server]` |
| Role instance | `@role_server_dev` |
| Runtime | Node.js ≥20.x |
| Stack | Express · TypeScript · MCP SDK · Zod |
| Port | **7474** (canonical — never change) |
| LLM mode | mock (Sprint 06) → live via AGENTS (Sprint 07) |

---

## This Module Owns

```
packages/server/src/
├── index.ts               # Express entry, port 7474
├── config.ts              # reads vigil.config.json
├── routes/
│   ├── session.ts         # POST /api/session
│   ├── bugs.ts            # GET/PATCH /api/bugs
│   ├── sprints.ts         # GET /api/sprints
│   └── suggest.ts         # POST /api/vigil/suggest (mock stub)
├── mcp/
│   ├── tools.ts           # 6 MCP tool definitions (Zod-validated)
│   └── server.ts          # MCP server registration
└── filesystem/
    ├── writer.ts          # writes BUG-XXX.md, FEAT-XXX.md
    ├── reader.ts          # lists/reads from sprint folders
    └── counter.ts         # bugs.counter, features.counter
packages/server/public/    # dashboard build output (served at /dashboard)
```

---

## Key Interfaces (do not change without FLAG + [CTO])

```typescript
POST /api/session   body: VIGILSession → 201 | 400
GET  /health        → { status: "ok", llmMode, port }

// MCP tools (Claude Code reads these):
vigil_list_bugs(sprint?, status?) → { bugs: BugFile[] }
vigil_get_bug(bug_id)             → BugFile | { error }
vigil_update_bug(bug_id, fields)  → { updated } | { error }
vigil_close_bug(bug_id, resolution, keep_test) → { closed } | { error }
vigil_list_features(sprint?, status?) → { features: FeatFile[] }
vigil_get_feature(feat_id)        → FeatFile | { error }

// LLM stub (Sprint 06 = always mock):
POST /api/vigil/suggest → { suggestion: "Mock", confidence: 0.0, model_used: "mock" }
```

---

## What You MAY Do Without Asking

- Implement inside `packages/server/src/`
- Add routes under `src/routes/`
- Add MCP tools to `src/mcp/tools.ts`
- Write bug/feature files to `docs/sprints/sprint_XX/BUGS/` and `FEATURES/`
- Update `.vigil/bugs.counter` and `.vigil/features.counter`
- Create tests under `tests/unit/server/` or `tests/integration/`
- Update sprint artifacts: `docs/sprints/**`
- Update `docs/03_MODULES.md` when capabilities change

## What Requires Escalation → `[CTO]`

- Changing MCP tool signatures (cross-module contract)
- Changing the bug/feature file format
- Adding AGENTS API calls before Sprint 07 is scoped
- Changing filesystem folder layout
- Adding a database dependency
- Changing port from 7474

---

## Reading Order

1. `../../AGENTS.md` (Tier-2)
2. `../../CLAUDE.md`
3. `../../CODEX.md` §5
4. `../../docs/01_ARCHITECTURE.md`
5. `../../docs/sprints/sprint_06/sprint_06_index.md` → Tracks B + C
6. `../../docs/sprints/sprint_06/todo/sprint_06_kickoff_dev.md`

---

*Last updated: 2026-02-26 | Owner: [DEV:server] + [CTO]*

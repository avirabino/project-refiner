# Vigil — Project CODEX

> **Audience:** Dev team + AI agents (internal)
> **Level:** Project — Bug Discovery & Resolution Platform
> **Reading order:** After workspace CODEX.md. Before docs/00_INDEX.md.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | SynaptixLabs Vigil |
| **Purpose** | Chrome Extension captures bugs/sessions → vigil-server writes to filesystem → Claude Code resolves via MCP |
| **Repo path** | `C:\Synaptix-Labs\projects\vigil` |
| **GitHub** | `https://github.com/avirabino/vigil` |
| **Stack** | Chrome Ext (MV3) · React 18 · Vite · CRXJS · rrweb · Dexie.js · Node.js + Express (server) · MCP SDK · React (dashboard) |
| **LLM platform** | AGENTS project (`localhost:8000`) — Sprint 07+ |
| **Deploy** | Unpacked extension + vigil-server (local) + Vercel (cloud, Sprint 07) |
| **Version** | 2.0.0 (Sprint 06 target) |

---

## 2. Sprint Status

| Sprint | Status | Goal |
|---|---|---|
| sprint_00–05 | ✅ Closed | Scaffold → session model → reporter → CI |
| **sprint_06** | 🟢 ACTIVE | vigil-server + MCP + session refactor + dashboard + resolution commands |
| sprint_07 | 📐 Planned | Agentic BE — AGENTS LLM integration + vigil_agent |

---

## 3. Port Map

| Port | Service | Notes |
|---|---|---|
| **7474** | vigil-server | MCP + REST + dashboard |
| 3847 | QA target app | Playwright E2E target |
| 3900 | Demo app (TaskPilot) | Manual acceptance demo |
| 5173 | Vite HMR | Extension dev |
| 8000 | AGENTS FastAPI | Sprint 07+ only |

---

## 4. Module Registry (check before building)

| Module | Path | Tag | Owns |
|---|---|---|---|
| Extension background | `src/background/` | `[DEV:ext]` | Service worker, session lifecycle, POST to server |
| Extension content | `src/content/` | `[DEV:ext]` | rrweb, control bar, bug editor, Shadow DOM |
| Extension popup | `src/popup/` | `[DEV:ext]` | Popup UI, session list |
| Extension core | `src/core/` | `[DEV:ext]` | IndexedDB (Dexie), storage, codegen |
| Extension shared | `src/shared/` | `[DEV:ext]` | Types, constants, message protocol |
| vigil-server | `packages/server/` | `[DEV:server]` | Express API, MCP tools, filesystem writer/reader |
| Dashboard | `packages/dashboard/` | `[DEV:dashboard]` | React SPA, bug/feature lists, sprint selector |
| E2E + regression | `tests/e2e/` | `[QA]` | Playwright tests, regression suite |

---

## 5. Key Interfaces (do not break without FLAG)

```typescript
// Session payload: extension → vigil-server
POST /api/session  body: VIGILSession

// MCP tools: Claude Code → vigil-server
vigil_list_bugs(sprint?, status?)
vigil_get_bug(bug_id)
vigil_update_bug(bug_id, fields)
vigil_close_bug(bug_id, resolution, keep_test)
vigil_list_features(sprint?, status?)
vigil_get_feature(feat_id)

// LLM bridge: vigil-server → AGENTS (Sprint 07)
POST /api/v1/vigil/suggest  body: { type, context }
```

---

## 6. Commands

```bash
# Extension
npm run dev            # Watch build
npm run build          # Production → dist/

# Server (Sprint 06)
npm run dev:server     # Port 7474 (nodemon)
npm run build:server

# Dashboard
npm run dev:dashboard

# Tests
npx vitest run         # Unit + integration
npx playwright test    # E2E
npm run test:all       # Full suite

# Checks
npx tsc --noEmit
npx eslint .
```

---

## 7. vigil.config.json

Per-project config (committed, no secrets):

```json
{
  "projectId": "my-project",
  "sprintCurrent": "06",
  "serverPort": 7474,
  "maxFixIterations": 3,
  "llmMode": "mock",
  "agentsApiUrl": "http://localhost:8000"
}
```

API keys via env vars only: `VIGIL_AGENTS_API_KEY`.

---

## 8. Architecture Non-Negotiables

- Chrome Manifest V3 only
- Shadow DOM for ALL injected extension UI
- rrweb for recording (not custom)
- Dexie.js for extension IndexedDB
- vigil-server owns filesystem writes (extension has no `fs` access)
- AGENTS `llm_core` owns all LLM inference (vigil-server is consumer only)
- `vigil_agent` commits to `vigil/fixes/sprint-XX` branch only — never to `main`
- All secrets via env vars

---

## 9. Decisions Log

`docs/0l_DECISIONS.md` — CTO + FOUNDER own.

Key decisions (Sprint 06):
- S06-D001: vigil-server on port 7474
- S06-D002: Session = container, recording = opt-in
- S06-D003: Git-native filesystem storage (no DB in Sprint 06)
- S06-D005: `VIGIL_LLM_MODE=mock` in Sprint 06

See full log: `docs/sprints/sprint_06/sprint_06_decisions_log.md`

---

*Last updated: 2026-02-26 | Owner: [CTO] + [FOUNDER]*

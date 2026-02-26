# SynaptixLabs Vigil — Architecture

> **System Design & Technical Architecture**
> **Owner:** `[CTO]`
> **Last updated:** 2026-02-26 — Sprint 06 pivot (extension + server + AGENTS)

---

## Architecture Style

- [x] Chrome Extension (Manifest V3) — capture layer
- [x] vigil-server (Node.js + Express + MCP) — storage + resolution bridge
- [x] React dashboard SPA — management UI
- [x] AGENTS platform (Python FastAPI) — LLM backend (Sprint 07+)
- [ ] ~~No server component~~ — changed at Sprint 06

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Chrome Extension: vigil-ext                                        │
│                                                                     │
│  ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐   │
│  │  Popup UI    │    │  Content Script  │    │  Background SW   │   │
│  │  (React)     │◄──►│  (per tab)       │◄──►│  (Service Worker)│   │
│  │              │    │                  │    │                  │   │
│  │ • Sessions   │    │ • rrweb inject   │    │ • Session state  │   │
│  │ • New session│    │ • Control bar    │    │ • Message router │   │
│  │ • Settings   │    │   (Shadow DOM)   │    │ • Screenshot API │   │
│  │              │    │ • Bug editor     │    │ • IndexedDB      │   │
│  │              │    │   (Shadow DOM)   │    │   (Dexie.js)     │   │
│  └──────────────┘    └─────────────────┘    └────────┬─────────┘   │
│                                                       │             │
│                              END SESSION              │             │
│                              POST /api/session        │             │
└──────────────────────────────────────────────────────┼─────────────┘
                                                        │
                               3x retry + offline queue │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  vigil-server  (Node.js + Express + MCP SDK)  — port 7474          │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐   │
│  │  REST API    │    │  MCP Server  │    │  Filesystem Writer │   │
│  │              │    │              │    │                    │   │
│  │ POST /session│    │ vigil_list_  │    │ docs/sprints/      │   │
│  │ GET  /bugs   │    │   bugs       │    │   sprint_XX/BUGS/  │   │
│  │ PATCH /bugs  │    │ vigil_get_   │    │   sprint_XX/FEAT/  │   │
│  │ POST /suggest│    │   bug        │    │ .vigil/sessions/   │   │
│  │              │    │ vigil_close_ │    │ .vigil/bugs.counter│   │
│  │              │    │   bug        │    │                    │   │
│  │              │    │ + 3 more     │    │                    │   │
│  └──────────────┘    └──────────────┘    └────────────────────┘   │
│                                                                     │
│  GET /dashboard → serves React SPA (packages/dashboard/)           │
│  GET /health    → 200 { status: "ok", llmMode: "mock" }            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │                        ▲
            MCP tools      │                        │ Claude Code reads
            (Sprint 07:    │                  .claude/commands/
             /api/suggest) │                  /project:bug-fix
                           ▼                  /project:bug-log
┌───────────────────────────────────┐         /project:bug-review
│  AGENTS platform  (Sprint 07+)    │
│  Python FastAPI — port 8000       │
│                                   │
│  POST /api/v1/vigil/suggest       │
│  → llm_core (Groq / Claude)       │
│  → resource_manager (cost track)  │
└───────────────────────────────────┘
```

---

## Tech Stack

### Chrome Extension
| Component | Technology | Version |
|---|---|---|
| Platform | Chrome Manifest V3 | Latest |
| Build | Vite + CRXJS | Vite ^5.4, CRXJS 2.0.0-beta |
| Language | TypeScript | 5.x |
| UI Framework | React 18 | ^18.3 |
| Styling | Tailwind CSS | ^3.4 |
| DOM Recording | rrweb | ^2.x |
| Local Storage | Dexie.js (IndexedDB) | ^4.x |

### vigil-server (Sprint 06 — new)
| Component | Technology |
|---|---|
| Runtime | Node.js ≥20.x |
| Framework | Express + TypeScript |
| MCP | @modelcontextprotocol/sdk |
| Validation | Zod |
| Storage | Filesystem (Git-native markdown) |
| Dashboard | React + Vite (built → server/public/) |
| Port | **7474** (canonical) |

### AGENTS Platform (Sprint 07+)
| Component | Technology |
|---|---|
| Runtime | Python 3.12 + FastAPI |
| LLM | Groq (llama-3.1-8b-instant) via llm_core |
| Cost tracking | resource_manager (project_id="vigil") |

---

## Extension Architecture (Manifest V3)

### Background Service Worker (`src/background/`)
- **Responsibilities:** Session lifecycle, message routing, screenshot capture, IndexedDB via Dexie, POST to vigil-server with 3x retry, IndexedDB offline queue
- **Keep-alive:** `chrome.alarms.create()` at 25s intervals during active recording
- **Sprint 06 addition:** `endSessionAndSync()` → POST to `:7474/api/session`, marks `pendingSync: true` on failure

### Content Script (`src/content/`)
- **Responsibilities:** rrweb injection, control bar UI (Shadow DOM), bug editor (Shadow DOM), action extraction, SPACE shortcut handler
- **Shadow DOM isolation:** All overlay UI — zero CSS leakage into target app
- **Sprint 06 addition:** `Ctrl+Shift+B` handler → screenshot + open bug editor pre-filled

### Popup (`src/popup/`)
- Session CRUD, start/stop recording, view session list

---

## Session Model (Sprint 06)

```typescript
// src/shared/types.ts — canonical

interface VIGILSession {
  id: string;               // format: vigil-SESSION-YYYYMMDD-NNN
  name: string;
  projectId: string;
  startedAt: number;        // epoch ms
  endedAt?: number;
  clock: number;            // ms elapsed since startedAt (always running)
  recordings: VIGILRecording[];
  snapshots: VIGILSnapshot[];
  bugs: Bug[];
  features: Feature[];
  pendingSync?: boolean;    // true if POST to vigil-server failed
}

interface VIGILRecording {
  id: string;
  startedAt: number;
  endedAt?: number;
  rrwebChunks: RrwebChunk[];
  mouseTracking: boolean;
}

interface VIGILSnapshot {
  id: string;
  capturedAt: number;       // session clock ms
  screenshotDataUrl: string;
  url: string;
  triggeredBy: 'manual' | 'bug-editor' | 'auto';
}
```

**Key behavior:**
- Session clock starts on NEW SESSION, always running until END SESSION
- Recording is opt-in (SPACE or play button) — does NOT define session boundaries
- Snapshots always available regardless of recording state

---

## vigil-server Module Layout

```
packages/server/
├── src/
│   ├── index.ts              # Express app entry, port 7474
│   ├── config.ts             # reads vigil.config.json
│   ├── routes/
│   │   ├── session.ts        # POST /api/session
│   │   ├── bugs.ts           # GET /api/bugs, PATCH /api/bugs/:id
│   │   ├── sprints.ts        # GET /api/sprints (folder list)
│   │   └── suggest.ts        # POST /api/vigil/suggest (mock/live)
│   ├── mcp/
│   │   ├── tools.ts          # 6 MCP tool definitions (Zod-validated)
│   │   └── server.ts         # MCP server registration
│   └── filesystem/
│       ├── writer.ts         # writes BUG-XXX.md, FEAT-XXX.md
│       ├── reader.ts         # lists/reads from sprint folders
│       └── counter.ts        # bugs.counter, features.counter
└── public/                   # dashboard build output (Vite)

packages/dashboard/
├── src/
│   ├── App.tsx
│   ├── views/
│   │   ├── BugList.tsx       # sprint selector + bug table
│   │   └── FeatureList.tsx
│   └── components/
│       └── ...               # all elements need data-testid
└── dist/ → packages/server/public/
```

---

## MCP Tools Contract (cross-module — do not change without FLAG)

```typescript
vigil_list_bugs(sprint?: string, status?: 'open' | 'fixed')
  → { bugs: BugFile[] }

vigil_get_bug(bug_id: string)
  → BugFile | { error: string }

vigil_update_bug(bug_id: string, fields: Partial<BugFields>)
  → { updated: true } | { error: string }

vigil_close_bug(bug_id: string, resolution: string, keep_test: boolean)
  → { closed: true, moved_to: string } | { error: string }

vigil_list_features(sprint?: string, status?: 'open' | 'backlog')
  → { features: FeatFile[] }

vigil_get_feature(feat_id: string)
  → FeatFile | { error: string }
```

---

## Filesystem Storage Layout

```
<project>/                        # User's project root
  vigil.config.json               # Committed: projectId, sprint, port, llmMode
  .vigil/                         # Gitignored runtime data
    sessions/                     # Raw VIGILSession JSON blobs
    bugs.counter                  # Integer: global BUG ID sequence
    features.counter              # Integer: global FEAT ID sequence
  docs/sprints/
    sprint_XX/
      BUGS/
        open/   BUG-XXX_slug.md
        fixed/  BUG-XXX_slug.md
      FEATURES/
        open/   FEAT-XXX_slug.md
        backlog/ FEAT-XXX_slug.md
  tests/e2e/
    regression/
      BUG-XXX.spec.ts             # One file per fixed bug
      ARCHIVE/                    # Retired regression specs
```

---

## LLM Integration Architecture (Sprint 07 — stub in Sprint 06)

```
vigil-server/src/routes/suggest.ts
  VIGIL_LLM_MODE=mock  → return hardcoded mock response
  VIGIL_LLM_MODE=live  → POST to AGENTS /api/v1/vigil/suggest

AGENTS project (external, port 8000):
  POST /api/v1/vigil/suggest
  Body: { type: "bug_title" | "steps" | "severity" | "similarity", context: {...} }
  Auth: X-Vigil-Key header
  Returns: { suggestion: string, confidence: float, model_used: string, tokens_used: int }
```

**Principle:** vigil-server NEVER owns LLM inference. It is a consumer of AGENTS `llm_core`.

---

## Data Flow

### Session Capture → vigil-server
```
User clicks in target app
  └── Content Script: rrweb + action-extractor → VIGILSession.recordings[]
  └── Ctrl+Shift+B → screenshot → VIGILSession.snapshots[] + bug editor open
  └── SPACE (outside input) → toggle recording

User clicks END SESSION
  └── Background: stopSession() → POST :7474/api/session
  └── vigil-server: validate (Zod) → write BUG-XXX.md + FEAT-XXX.md → 201
  └── On server unreachable: 3x retry → mark pendingSync: true in IndexedDB
```

### Claude Code Resolution Loop
```
/project:bug-fix BUG-XXX
  └── vigil_get_bug("BUG-XXX")          ← MCP → vigil-server → reads BUG-XXX.md
  └── Analyse root cause
  └── Write tests/e2e/regression/BUG-XXX.spec.ts → run → confirm RED
  └── Implement fix (max 3 iterations)
  └── Run test → confirm GREEN
  └── vigil_close_bug("BUG-XXX", resolution, keep_test)
  └── git commit -m "fix(BUG-XXX): description"
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Storage (Sprint 06) | Git-native filesystem markdown | Debuggable, diffable, no infra dependency |
| Server port | **7474** | Avoids conflict with Vite (5173), FastAPI (8000), dev servers (3000, 33847) |
| Session model | Session = container, recording = opt-in | Reduces friction; snapshot/bug always available |
| LLM mode | mock (Sprint 06) → live via AGENTS (Sprint 07) | Clean seam, Sprint 06 ships without AGENTS |
| Dashboard | React SPA served by vigil-server | No separate deploy; localhost only |
| MCP transport | HTTP (vigil-server exposes MCP endpoint) | Claude Code connects via standard MCP config |
| Chrome keep-alive | chrome.alarms (25s) | Prevents Manifest V3 idle shutdown during active recording |
| Selector strategy | data-testid → aria-label → role → text → css | Priority cascade for Playwright export stability |

---

## Security Considerations

- [x] No external network requests from extension — fully offline
- [x] Password masking — rrweb masks `input[type=password]` by default
- [x] Shadow DOM isolation — overlay cannot leak into target app
- [x] Minimal manifest permissions
- [x] vigil-server API keys via env vars only — never in `vigil.config.json`
- [x] Autonomous agent commits to branch only, never to `main`
- [ ] AGENTS API auth — `X-Vigil-Key` shared secret (Sprint 07, via env var)

---

## Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Extension core/, shared/, vigil-server filesystem/, counter/, config |
| Integration | Vitest | Storage layer, session lifecycle, MCP tool round-trips |
| E2E | Playwright | Full extension flows + vigil-server integration |
| Regression | Playwright | `tests/e2e/regression/BUG-XXX.spec.ts` — one per fixed bug |

Coverage targets: ≥80% business logic, ≥60% infra.

---

*Last updated: 2026-02-26 (Sprint 06 pivot) | Owner: [CTO] + [FOUNDER]*

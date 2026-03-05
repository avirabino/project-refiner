# SynaptixLabs Vigil — Bug Discovery & Resolution Platform

> Chrome Extension + Express Server + React Dashboard + MCP for AI-native bug management — v2.0.0

---

## What is Vigil?

Vigil is a 3-tier bug discovery and resolution platform that closes the loop between human QA testing and AI-driven fixes.

```
Chrome Extension  →  vigil-server (Express + MCP)  →  Dashboard (React)
  captures bugs        stores in PostgreSQL            manage projects,
  records sessions     exposes MCP tools               view sessions,
  logs features        serves dashboard                track bugs
```

**How it works:**

1. **Create a project** in the dashboard (name, current sprint, URL)
2. **Start a session** from the Chrome extension — select a project, name the session, hit record
3. **Capture bugs and features** inline while testing — Vigil records DOM interactions via rrweb
4. **End the session** — the extension POSTs the full session (recordings, bugs, features, screenshots) to vigil-server
5. **Review in the dashboard** — browse sessions, replay recordings, manage bugs by sprint
6. **AI resolution** — Claude Code uses MCP tools to read bugs, apply fixes, and close them

**Key capabilities:**

- Record DOM interactions via rrweb across page navigations
- Capture screenshots and log bugs/features inline during testing
- Visual annotation overlay (pins, highlights, comments) on the page during sessions
- Visual replay via rrweb-player in the dashboard
- Project management with sprint tracking (dashboard-first workflow)
- REST API for sessions, bugs, features, and projects
- MCP server exposing tools to Claude Code for automated bug resolution
- Playwright regression test export

## Stack

| Layer | Technology |
|-------|-----------|
| **Extension** | Chrome Manifest V3, Vite + CRXJS, React 18, Tailwind CSS, rrweb, IndexedDB (Dexie.js) |
| **Server** | Node.js ≥20, Express, Neon PostgreSQL (`@neondatabase/serverless`), MCP SDK, Zod |
| **Dashboard** | React 18, Vite, Tailwind CSS, rrweb-player |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20.11.0
- **Chrome** browser
- **Neon PostgreSQL** account ([neon.tech](https://neon.tech)) — free tier works

### 1. Install

```bash
git clone https://github.com/SynaptixLabs/vigil.git
cd vigil
npm install
```

### 2. Configure Environment

Create a `.env` file in `packages/server/`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

Get your connection string from [Neon Console](https://console.neon.tech).

### 3. Build & Start

```bash
# Build shared types (required first)
npm run build:shared

# Build Chrome extension → dist/
npm run build

# Build dashboard → packages/server/public/
npm run build:dashboard

# Start server (runs migration on first start)
npm run dev:server
# Server starts at http://localhost:7474
# Dashboard at http://localhost:7474/dashboard
```

### 4. Load the Extension

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

### 5. Create a Project & Start Recording

1. Open the dashboard at **http://localhost:7474/dashboard**
2. Go to the **Projects** tab → create a new project (set name, sprint, URL)
3. Click the Vigil extension icon in Chrome → **New Session**
4. Select your project from the dropdown, click **▶ Start Session**
5. Navigate your app — a floating control bar appears at the bottom
6. Use the control bar or keyboard shortcuts to capture bugs, screenshots, and features
7. Click **End Session** — data syncs to the server automatically
8. View the session in the dashboard

---

## Development

Run these in separate terminals for watch mode:

```bash
# Terminal 1: Extension (Vite + CRXJS watch build)
npm run dev

# Terminal 2: Server (nodemon + tsx, port 7474)
npm run dev:server

# Terminal 3: Dashboard (Vite dev server)
npm run dev:dashboard
```

Reload the extension at `chrome://extensions` after each extension build.

### Port Map

| Port | Service |
|------|---------|
| 7474 | vigil-server (REST API + MCP + Dashboard) |
| 5173 | Vite HMR (extension dev) |
| 3900 | Demo app (TaskPilot) |
| 3847 | QA target app (E2E tests) |

### Demo App

```bash
cd demos/refine-demo-app
npm install
npm run dev
# TaskPilot opens at http://localhost:3900
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+R` | Toggle recording (pause / resume) |
| `Ctrl+Shift+S` | Capture screenshot |
| `Ctrl+Shift+B` | Open inline bug/feature editor |

---

## Project Structure

```
vigil/
├── src/                        # Chrome Extension source
│   ├── background/             # Service worker (session lifecycle, messaging)
│   ├── content/                # Content script (rrweb, control bar, bug editor)
│   ├── popup/                  # Extension popup (session list, new session form)
│   ├── core/                   # Business logic (IndexedDB, reports, codegen)
│   └── shared/                 # Types, constants, utilities
├── packages/
│   ├── server/                 # vigil-server (Express + MCP)
│   │   ├── src/routes/         # REST endpoints (sessions, bugs, projects)
│   │   ├── src/mcp/            # MCP tool definitions for Claude Code
│   │   ├── src/storage/        # Neon + filesystem storage providers
│   │   └── src/db/             # Schema, migrations, seed
│   ├── dashboard/              # React management dashboard
│   │   └── src/views/          # ProjectList, SessionList, BugList, FeatureList
│   └── shared/                 # Shared types + Zod schemas
├── tests/
│   ├── unit/                   # Unit tests (Vitest)
│   ├── integration/            # Integration tests (Vitest)
│   └── e2e/                    # E2E + regression tests (Playwright)
├── demos/
│   └── refine-demo-app/        # TaskPilot — manual QA demo app
├── docs/                       # Architecture, sprint artifacts
├── dist/                       # Extension build output
└── vigil.config.json           # Project configuration (no secrets)
```

---

## Configuration

### `vigil.config.json`

Committed to Git. No secrets.

| Field | Description | Default |
|-------|-------------|---------|
| `projectId` | Default project identifier | `"my-project"` |
| `sprintCurrent` | Active sprint number | `"07"` |
| `serverPort` | vigil-server port | `7474` |
| `serverUrl` | Production server URL | — |
| `llmMode` | LLM mode (`"mock"` or `"live"`) | `"mock"` |
| `agentsApiUrl` | AGENTS platform URL | `"http://localhost:8000"` |
| `maxFixIterations` | Max AI fix attempts per bug | `3` |

### Environment Variables

Set in `packages/server/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL pooled connection string |
| `DATABASE_URL_UNPOOLED` | No | Direct connection for migrations |

---

## API Endpoints

All endpoints are served by vigil-server at `http://localhost:7474`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Server health check |
| `POST` | `/api/session` | Receive a completed session from extension |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/sessions/:id` | Get session detail |
| `DELETE` | `/api/sessions/:id` | Delete a session |
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `PATCH` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |
| `GET` | `/api/bugs` | List bugs (by sprint) |
| `PATCH` | `/api/bugs/:id` | Update a bug |
| `GET` | `/api/features` | List features (by sprint) |
| `GET` | `/api/sprints` | List available sprints |

---

## MCP Integration

vigil-server exposes MCP tools that Claude Code can use to read, fix, and close bugs:

- `vigil_list_bugs` — List open bugs for a sprint
- `vigil_get_bug` — Read bug details and reproduction steps
- `vigil_close_bug` — Mark a bug as fixed with resolution notes
- `vigil_suggest_fix` — Get AI-generated fix suggestions

Connect via Claude Code's MCP configuration pointing to `http://localhost:7474/mcp`.

---

## Testing

```bash
# Unit + integration tests
npm run test

# E2E tests (requires built dist/ + target app)
npm run test:e2e

# Full suite
npm run test:all

# Type check
npx tsc --noEmit
```

---

## Sprint Status

| Sprint | Focus | Status |
|--------|-------|--------|
| Sprint 00 | Repo setup, scaffold, hello-world extension | ✅ Done |
| Sprint 01 | P0 MVP: Session recording, control bar, screenshots, bug editor | ✅ Done |
| Sprint 02 | Reports, replay, Playwright export, ZIP, shortcuts | ✅ Done |
| Sprint 03 | P2 features, project folder, bug/feature workflow | ✅ Done |
| Sprint 04 | AI workflows, project dashboard, compression | ✅ Done |
| Sprint 05 | Full design review, bug fixes, codebase hardening | ✅ Done |
| Sprint 06 | vigil-server (Express + MCP), React dashboard, Neon PostgreSQL | ✅ Done |
| Sprint 07 | Dashboard-first projects, annotation overlay, agentic backend | 🟢 Active |

---

## Distribution

**Unpacked extension only** — no Chrome Web Store submission. Share via repo `dist/` folder. Team members load via `chrome://extensions` → "Load unpacked".

The server can be self-hosted or deployed to Vercel (serverless).

## Documentation

Start here: [`docs/00_INDEX.md`](docs/00_INDEX.md)

---

*SynaptixLabs — 2026*

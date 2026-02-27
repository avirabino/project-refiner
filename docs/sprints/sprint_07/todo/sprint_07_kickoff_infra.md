# Sprint 07 — Infrastructure Kickoff

You are `[INFRA]` on **SynaptixLabs Vigil** — Sprint 07, Track F.

**Repo:** `C:\Synaptix-Labs\projects\vigil`
**Sprint index:** `docs/sprints/sprint_07/sprint_07_index.md`
**Phase:** 2 (S07-15 can start parallel in Week 2; S07-14 follows after S07-15)

---

## Your Mission

Deploy Vigil to the cloud. Replace filesystem-as-DB with managed Postgres. Make vigil-server and dashboard accessible via public URL.

**Deliverables:**
- S07-15: Neon PostgreSQL migration (~4V) — 🟠 P1
- S07-14: Vercel deployment (~2V) — 🟡 P2

**Total: ~6V**

> S07-15 (Neon) must ship BEFORE S07-14 (Vercel) — serverless functions need DB, not filesystem.

---

## S07-15 — Neon PostgreSQL Migration (~4V)

### Prerequisites
- Neon account created at https://neon.tech
- Project created: `synaptix-vigil`
- Connection string available as `DATABASE_URL`

### Schema Design

**Location:** `packages/server/src/db/` (new directory)

```sql
-- bugs table
CREATE TABLE bugs (
  id TEXT PRIMARY KEY,          -- e.g. "BUG-042"
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'P2',  -- P0/P1/P2/P3
  status TEXT NOT NULL DEFAULT 'OPEN',  -- OPEN/RESOLVED/FIXED
  type TEXT NOT NULL DEFAULT 'bug',
  sprint TEXT NOT NULL,
  session_id TEXT,
  url TEXT,
  element_selector TEXT,
  screenshot_id TEXT,
  discovered_date TIMESTAMPTZ DEFAULT NOW(),
  resolved_date TIMESTAMPTZ,
  resolution TEXT,
  regression_test_file TEXT,
  regression_test_status TEXT DEFAULT 'none',  -- none/red/green/skipped
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- features table
CREATE TABLE features (
  id TEXT PRIMARY KEY,          -- e.g. "FEAT-015"
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'P2',
  status TEXT NOT NULL DEFAULT 'OPEN',
  type TEXT NOT NULL DEFAULT 'feature',
  sprint TEXT NOT NULL,
  session_id TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sessions table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project TEXT,
  sprint TEXT,
  description TEXT,
  url TEXT,
  tab_id INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  snapshot_count INTEGER DEFAULT 0,
  bug_count INTEGER DEFAULT 0,
  feature_count INTEGER DEFAULT 0,
  recording_data JSONB,        -- rrweb events (compressed)
  metadata JSONB
);

-- sprints table
CREATE TABLE sprints (
  id TEXT PRIMARY KEY,          -- e.g. "sprint_07"
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- counters (replaces bugs.counter / features.counter files)
CREATE SEQUENCE bug_counter START 1;
CREATE SEQUENCE feature_counter START 1;
```

### Driver

Use `@neondatabase/serverless` — works in both local Node.js and Vercel Edge:

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Example query
const bugs = await sql`SELECT * FROM bugs WHERE sprint = ${sprint} AND status = 'OPEN'`;
```

### Migration Path

1. Create `packages/server/src/db/schema.sql` — DDL statements above
2. Create `packages/server/src/db/client.ts` — connection factory
3. Create `packages/server/src/db/queries.ts` — typed query functions (replace reader.ts/writer.ts)
4. Update routes to use DB queries instead of filesystem reader/writer
5. Update MCP tools to use DB queries
6. Create `packages/server/src/db/seed.ts` — import existing `.vigil/` markdown → Neon

### Counters → Sequences

Current counter files (`.vigil/bugs.counter`, `.vigil/features.counter`) have a race condition (U01). Postgres sequences are atomic:

```typescript
// Old: read file → increment → write file (race condition!)
// New: atomic
const [{ nextval }] = await sql`SELECT nextval('bug_counter')`;
const bugId = `BUG-${String(nextval).padStart(3, '0')}`;
```

### Local Development

**Option A (recommended):** Use Neon branching — each dev gets an isolated DB branch
**Option B:** Local PostgreSQL via Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16`

**Config:** `DATABASE_URL` env var. Never in `vigil.config.json`.

### Fallback Strategy (D016)

If `DATABASE_URL` is not set or Neon is unreachable:
- **Local dev:** Fall back to filesystem reader/writer (existing Sprint 06 code)
- **Production (Vercel):** Return 503 with clear error — no filesystem fallback in serverless

---

## S07-14 — Vercel Deployment (~2V)

### Prerequisites
- S07-15 (Neon) complete — serverless functions cannot use filesystem
- Vercel account + project created

### Configuration

**File:** `vercel.json` (new, project root)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "packages/server/src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "packages/server/src/index.ts" },
    { "src": "/dashboard/(.*)", "dest": "packages/server/public/$1" },
    { "src": "/dashboard", "dest": "packages/server/public/index.html" },
    { "src": "/health", "dest": "packages/server/src/index.ts" }
  ]
}
```

### Environment Variables (Vercel Project Settings)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `VIGIL_AGENTS_API_KEY` | Shared secret for AGENTS API |
| `NODE_ENV` | `production` |

### Deployment Verification

```bash
# After deploy:
curl https://vigil.vercel.app/health
# Expected: { "status": "ok", "version": "2.1.0", "llmMode": "live" }

curl https://vigil.vercel.app/api/sprints
# Expected: { "sprints": [...], "current": "sprint_07" }

# Dashboard loads:
open https://vigil.vercel.app/dashboard
```

---

## Quality Gates

```
✅ Neon connection established from local dev
✅ All CRUD operations work: create/read/update bugs, features, sessions
✅ Counter sequences produce unique, incrementing IDs
✅ Seed script imports existing .vigil/ data successfully
✅ MCP tools work against DB (not filesystem)
✅ Vercel deploy succeeds, health check returns 200
✅ Dashboard loads on Vercel URL
✅ No regressions on existing vitest suite
```

---

*Generated: 2026-02-27 | Sprint 07 Phase 2 | Owner: CPTO*

# Sprint 06 — DEV Kickoff

You are `[DEV]` on **SynaptixLabs Vigil** — Sprint 06.

**Repo:** `C:\Synaptix-Labs\projects\vigil`  
**Sprint index:** `docs/sprints/sprint_06/sprint_06_index.md`  
**Decisions log:** `docs/sprints/sprint_06/sprint_06_decisions_log.md`  
**Todo:** `docs/sprints/sprint_06/todo/sprint_06_team_dev_todo.md`

---

## Your Mission

Ship the Vigil core platform in two parallel tracks:

**Track A — Extension refactor** (S06-01 to S06-04)  
**Track B — vigil-server** (S06-05 to S06-09)  
**Track C — Dashboard** (S06-10 to S06-11)  
**Track D — Claude Code commands** (S06-12 to S06-14)

Work Track A first (it defines the session payload schema that Track B consumes).

---

## Environment

```powershell
cd C:\Synaptix-Labs\projects\vigil

# Extension (existing)
npm run dev       # Vite dev build, watch mode
npm run build     # Production build

# vigil-server (new — create this)
npm run dev:server   # nodemon + ts-node on port 7474

# Dashboard (new — bundled with server)
npm run dev:dashboard
```

Port `7474` is canonical for vigil-server. Do not use 3000 or 8000.

---

## Track A — Extension Refactor

### S06-01 — Session Model

**File to update:** `src/shared/types.ts`

New session shape (additive — preserve existing Bug/Feature/Action/Screenshot types):

```typescript
export interface VIGILSession {
  id: string;                    // format: vigil-SESSION-YYYYMMDD-NNN
  name: string;
  projectId: string;
  startedAt: number;
  endedAt?: number;
  clock: number;                 // ms elapsed since startedAt (always running)
  recordings: VIGILRecording[];
  snapshots: VIGILSnapshot[];
  bugs: Bug[];
  features: Feature[];
  pendingSync?: boolean;         // true if POST to server failed
}

export interface VIGILRecording {
  id: string;
  startedAt: number;
  endedAt?: number;
  rrwebChunks: RrwebChunk[];
  mouseTracking: boolean;
}

export interface VIGILSnapshot {
  id: string;
  capturedAt: number;            // session clock ms
  screenshotDataUrl: string;
  url: string;
  triggeredBy: 'manual' | 'bug-editor' | 'auto';
}
```

**Key behavior changes in `session-manager.ts`:**
- `createSession()` → starts clock, does NOT start recording
- `startRecording()` → creates new `VIGILRecording` inside active session
- `stopRecording()` → closes current recording, session continues
- `endSession()` → stops clock, stops any active recording, triggers POST

---

### S06-02 — Snapshot + Bug Editor Combo

**File:** `src/background/shortcuts.ts`

`Ctrl+Shift+B` flow:
1. Capture screenshot via `chrome.tabs.captureVisibleTab`
2. Create `VIGILSnapshot` with `triggeredBy: 'bug-editor'`
3. Store snapshot in current session
4. Send message to content script: `OPEN_BUG_EDITOR` with `{ snapshotId }`
5. Bug editor mounts with screenshot preview + URL pre-filled

---

### S06-03 — SPACE Shortcut

**File:** `src/content/content-script.ts`

```typescript
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  const active = document.activeElement;
  const tag = active?.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag!) || 
      (active as HTMLElement)?.isContentEditable) return;
  e.preventDefault();
  chrome.runtime.sendMessage({ type: 'TOGGLE_RECORDING' });
});
```

`TOGGLE_RECORDING` handler in `message-handler.ts`:
- If recording active → `stopRecording()`
- If no recording active → `startRecording()`

---

### S06-04 — END SESSION POST

**File:** `src/background/session-manager.ts`

```typescript
async function endSessionAndSync(sessionId: string): Promise<void> {
  const session = await stopSession(sessionId);
  await postWithRetry(session);
}

async function postWithRetry(session: VIGILSession, attempts = 3): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch('http://localhost:7474/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      if (res.ok) { notifyTab('SESSION_SYNCED'); return; }
    } catch {
      await sleep(1000 * (i + 1));
    }
  }
  // All retries failed — mark pending
  await db.sessions.update(session.id, { pendingSync: true });
  notifyTab('SESSION_SYNC_FAILED');
}
```

---

## Track B — vigil-server

### S06-05 — Scaffold

Create `packages/server/` directory with:

```
packages/server/
  src/
    index.ts          ← Express app, port 7474
    routes/
      session.ts      ← POST /api/session
      bugs.ts         ← GET /api/bugs, PATCH /api/bugs/:id
      suggest.ts      ← POST /api/vigil/suggest (mock)
    mcp/
      tools.ts        ← MCP tool definitions
      server.ts       ← MCP server registration
    filesystem/
      writer.ts       ← writes BUG-XXX.md, FEAT-XXX.md
      counter.ts      ← reads/increments bugs.counter
      reader.ts       ← lists bugs/features from sprint folders
    config.ts         ← reads vigil.config.json
  public/             ← dashboard build output (Vite)
  package.json
  tsconfig.json
```

**Health check:**
```
GET /health → 200 { status: "ok", version: "2.0.0", llmMode: "mock" }
```

---

### S06-06 — Session Receiver

**File:** `packages/server/src/routes/session.ts`

On `POST /api/session`:
1. Validate session schema (zod)
2. Write raw session JSON to `.vigil/sessions/{session.id}.json`
3. For each `session.bugs[]` → `writer.writeBug(bug, sprint)`
4. For each `session.features[]` → `writer.writeFeature(feat, sprint)`
5. Return `201 { bugsWritten: N, featuresWritten: N }`

Sprint is determined from `vigil.config.json:sprintCurrent`.

---

### S06-07 — MCP Tools

**File:** `packages/server/src/mcp/tools.ts`

Register with MCP SDK:

```typescript
server.tool('vigil_list_bugs', { sprint: z.string().optional(), status: z.enum(['open','fixed']).optional() }, 
  async ({ sprint, status }) => reader.listBugs(sprint, status));

server.tool('vigil_get_bug', { bug_id: z.string() },
  async ({ bug_id }) => reader.getBug(bug_id));

server.tool('vigil_update_bug', { bug_id: z.string(), fields: BugUpdateSchema },
  async ({ bug_id, fields }) => writer.updateBug(bug_id, fields));

server.tool('vigil_close_bug', { bug_id: z.string(), resolution: z.string(), keep_test: z.boolean() },
  async ({ bug_id, resolution, keep_test }) => writer.closeBug(bug_id, resolution, keep_test));

server.tool('vigil_list_features', { sprint: z.string().optional(), status: z.string().optional() },
  async ({ sprint, status }) => reader.listFeatures(sprint, status));

server.tool('vigil_get_feature', { feat_id: z.string() },
  async ({ feat_id }) => reader.getFeature(feat_id));
```

---

### S06-08 — Bug Counter

**File:** `packages/server/src/filesystem/counter.ts`

```typescript
// .vigil/bugs.counter format: single integer on one line
export async function nextBugId(): Promise<string> {
  const current = parseInt(await fs.readFile(COUNTER_PATH, 'utf8') || '0');
  const next = current + 1;
  await fs.writeFile(COUNTER_PATH, String(next));
  return `BUG-${String(next).padStart(3, '0')}`;
}

export async function nextFeatId(): Promise<string> { /* same, FEAT- prefix */ }
```

---

### S06-09 — LLM Stub

**File:** `packages/server/src/routes/suggest.ts`

```typescript
app.post('/api/vigil/suggest', async (req, res) => {
  if (config.llmMode === 'mock') {
    return res.json({
      suggestion: 'Mock suggestion — LLM not connected (Sprint 07)',
      confidence: 0.0,
      model_used: 'mock'
    });
  }
  // Sprint 07: forward to AGENTS
});
```

---

## Track C — Dashboard (S06-10 to S06-11)

**Location:** `packages/dashboard/` (Vite + React, builds to `packages/server/public/`)

Views:
- Sprint selector (reads sprint folders via `GET /api/sprints`)
- Bug list table: ID | Title | Severity | Status | Assigned
- Feature list table: ID | Title | Priority | Status
- Row actions: change severity, change status, move to backlog

Keep it functional, not beautiful. Sprint 08 handles polish.

---

## Track D — Claude Code Commands (S06-12 to S06-14)

**Location:** `.claude/commands/`

### `bug-log.md`
```markdown
---
description: Log a new bug or feature to the current sprint
---
Ask for: title, description, current URL, severity (P0/P1/P2/P3), type (bug/feature).
Use vigil_list_bugs to check for duplicates first.
Write BUG-XXX.md or FEAT-XXX.md to docs/sprints/sprint_[current]/BUGS/open/ or FEATURES/open/.
Confirm with: "Logged as BUG-XXX — [title]"
```

### `bug-fix.md`
```markdown
---
description: Run red→green resolution loop for a bug (or --all open bugs)
---
For each target bug:
1. vigil_get_bug(id) — read full context
2. Locate relevant code. Analyse root cause.
3. Write regression test to tests/e2e/regression/BUG-XXX.spec.ts
4. Run test — confirm RED. If cannot make RED, report why and stop.
5. Implement fix. Max iterations: read from vigil.config.json maxFixIterations (default 3).
6. Run test — confirm GREEN.
7. vigil_close_bug(id, resolution, keep_test)
8. git commit -m "fix(BUG-XXX): [description]"
Report: fixed | could-not-reproduce | max-iterations-reached
```

### `bug-review.md`
```markdown
---
description: Sprint closure gate — review all bugs and regression suite
---
1. vigil_list_bugs(sprint=current, status=open)
2. Flag any P0 or P1 still open → BLOCK sprint close if any exist
3. For each closed bug: confirm keep_test decision (ask if not set)
4. Run full regression suite: npx playwright test tests/e2e/regression/
5. Report: N fixed, N deferred, N tests kept, N tests archived
6. Output: SPRINT READY TO CLOSE or BLOCKED (list reasons)
```

---

## Acceptance Gates

Before marking Sprint 06 done, all of these must pass:

- [ ] `GET http://localhost:7474/health` returns 200
- [ ] POST a test session → BUG-001.md appears in correct sprint folder
- [ ] `vigil_list_bugs` MCP tool returns results readable by Claude Code
- [ ] Dashboard loads at `localhost:7474/dashboard`
- [ ] SPACE toggles recording state when cursor not in input field
- [ ] `Ctrl+Shift+B` opens bug editor with screenshot pre-attached
- [ ] END SESSION retries 3x then marks `pendingSync: true` if server down
- [ ] `/project:bug-fix BUG-001` runs loop, closes bug, commits
- [ ] All pre-existing E2E tests pass (no regression from session model change)

---

*Kickoff generated: 2026-02-26 | Sprint 06 | Role: DEV*

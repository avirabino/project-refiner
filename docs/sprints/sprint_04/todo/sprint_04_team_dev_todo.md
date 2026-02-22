# Sprint 04 — DEV Team Todo

**Owner:** `[DEV]`  
**Sprint:** Sprint 04  
**Budget:** ~20V  
**Prerequisite:** Sprint 03 Phase 2 complete (R025 `publish.ts` + `outputPath` shipped)

---

## Phase 1 — Windsurf Workflows (~8V)

### S04-01 — `/refine-record` Windsurf Workflow (~6V)

**File:** `.windsurf/workflows/refine-record.md`

- [ ] Create workflow file with YAML frontmatter (`description: Record an AI acceptance testing session`)
- [ ] Step 1: Read `refine.project.json` from current workspace root; if absent, prompt for `name` + `baseUrl` + `outputPath`
- [ ] Step 2: Generate session ID using `ats-YYYY-MM-DD-NNN` format (read existing sessions dir to get next NNN)
- [ ] Step 3: Launch Playwright with `headless: false` against `project.baseUrl`
- [ ] Step 4: Navigate app — Cascade explores flows, logs bugs/features in a local array as JSON
- [ ] Step 5: On completion, build `Session` + `Bug[]` + `Feature[]` objects with `source: 'ai'`
- [ ] Step 6: Write artifacts via Node.js `fs.writeFileSync` (no `chrome.downloads` needed):
  - `<outputPath>/<project>/sessions/<id>/report.md`
  - `<outputPath>/<project>/sessions/<id>/report.json`
  - `<outputPath>/<project>/sessions/<id>/regression.spec.ts`
- [ ] Step 7: Regenerate `<outputPath>/<project>/index.html` (calls shared dashboard generator logic)
- [ ] Use existing `report-generator.ts` output format — import as CommonJS if needed, or duplicate minimal logic in the workflow script

**Note:** The workflow is a `.md` file with Markdown instructions + inline code blocks. Cascade executes the steps using its tool calls (puppeteer/playwright MCP, write_to_file, etc.).

---

### S04-02 — `/refine-review` Windsurf Workflow (~2V)

**File:** `.windsurf/workflows/refine-review.md`

- [ ] Create workflow file with YAML frontmatter (`description: Load latest Refine session(s) into agent context`)
- [ ] Step 1: Locate `refine.project.json` in workspace (or accept `projectPath` parameter)
- [ ] Step 2: List `sessions/` subdirectories sorted by date desc
- [ ] Step 3: Read `report.md` from latest N sessions (default N=1)
- [ ] Step 4: Output summary to agent context with role-appropriate prompts:
  - If caller is `[CPO]`: list bugs by priority, suggest sprint backlog updates
  - If caller is `[QA]`: list failing assertions, suggest `regression.spec.ts` extensions
  - If caller is `[DEV]`: list bugs with URLs + selectors, suggest fix approach
  - If caller is `[CTO]`: list architecture concerns from session metadata

---

## Phase 2 — Project Infrastructure (~7V)

### S04-03 — `refine.project.json` schema + init (~2V)

- [ ] `src/shared/types.ts`: add `RefineProjectConfig` interface:
  ```ts
  interface RefineProjectConfig {
    name: string;
    displayName: string;
    baseUrl: string;
    outputPath: string;
    description?: string;
    created: string;
    version: string;
  }
  ```
- [ ] `src/popup/pages/ProjectSettings.tsx`: "Export Project Config" button → generates and downloads `refine.project.json` to `<outputPath>/<project>/`
- [ ] `src/core/publish.ts`: on first publish to a project folder, also download `refine.project.json` if `!fs.existsSync(configPath)`
- [ ] `src/popup/pages/ProjectSettings.tsx`: validation — show warning badge if `outputPath` is not configured
- [ ] Unit test: `RefineProjectConfig` round-trips through JSON serialize/parse

---

### S04-04 — Project Dashboard (`index.html` generator) (~5V)

- [ ] `src/core/dashboard-generator.ts` (new module): `generateProjectDashboard(sessions: Session[], bugs: Bug[][]): string`
  - Returns a self-contained HTML string (vanilla JS + inline CSS, no build step)
  - Sessions table: date | name | source (manual/AI badge) | bugs | features | duration | links
  - Click row → expands inline `report.md` content (fetched via `fetch('./sessions/<id>/report.md')`)
  - Filter bar: source (all/manual/AI), min bugs count
  - "Open in Editor" link per session: `vscode://file/<outputPath>/<project>/sessions/<id>/regression.spec.ts`
- [ ] `src/core/publish.ts`: after writing session artifacts, call `generateProjectDashboard` and download updated `index.html` to `<outputPath>/<project>/`
- [ ] `src/popup/pages/ProjectSettings.tsx`: "Refresh Dashboard" button → triggers dashboard regeneration for all sessions in the project
- [ ] Unit test: `generateProjectDashboard` with 2 sessions produces valid HTML containing both session names

---

## Phase 3 — Extension Fixes (~5V)

### S04-05 — R015: Silence Compression Daemon (~4V)

- [ ] `src/background/service-worker.ts`: register `chrome.alarms.create('refine-prune-chunks', { periodInMinutes: 60 })` on extension install
- [ ] `src/background/service-worker.ts`: `chrome.alarms.onAlarm` handler for `'refine-prune-chunks'`:
  - Query all sessions with `status === COMPLETED` and `completedAt < Date.now() - 7 * 86400_000`
  - For each: fetch `RecordingChunk[]`, compress `events` with `CompressionStream('gzip')`, update chunk with `{ compressed: true, data: base64 }`
- [ ] `src/core/replay-bundler.ts`: before building replay HTML, check `chunk.compressed` — if true, decompress with `DecompressionStream('gzip')` before use
- [ ] `src/core/db.ts`: add `compressed?: boolean` + `data?: string` fields to `RecordingChunk` type
- [ ] Unit test: `compressEvents(events)` → `decompressEvents(compressed)` produces identical output
- [ ] E2E: record session, wait for compression alarm (mock alarm), replay still works

---

### S04-06 — `refine-reporter` Playwright Plugin Stub (~1V)

**File:** `src/reporter/refine-reporter.ts`

- [ ] Implement minimal Playwright `Reporter` interface:
  ```ts
  export class RefineReporter implements Reporter {
    onBegin(config, suite): void
    onTestEnd(test, result): void
    onEnd(result): Promise<void>
  }
  ```
- [ ] `onEnd`: write stub `report.json` to `process.env.REFINE_OUTPUT_PATH ?? './refine-output'`
- [ ] Export as `default` for `playwright.config.ts` `reporter` field
- [ ] Add `README` section: "CI Integration (Sprint 04+)" explaining future direction
- [ ] Unit test: `onEnd` creates output file at configured path

---

## Acceptance Gates

- [ ] `/refine-record` workflow produces valid artifacts readable by `/refine-review`
- [ ] `regression.spec.ts` from AI session passes `tsc --noEmit` check
- [ ] Project dashboard renders in Chrome with ≥1 session
- [ ] Compression round-trip: `compress(decompress(events)) === events`
- [ ] All prior unit + E2E tests still green

---

*Created: 2026-02-22 | `[DEV]`*

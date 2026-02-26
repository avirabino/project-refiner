# Sprint 07 — Index

**Goal:** Wire the AGENTS platform as Vigil's LLM backend. Ship bug auto-complete, returning bug detection, and the autonomous `vigil_agent` resolution loop.

**Depends on:** Sprint 06 complete (vigil-server running, MCP tools live, `/api/vigil/suggest` stub present)  
**Version target:** `2.1.0`  
**Budget:** ~28V  
**Prerequisite:** AGENTS project running locally (`http://localhost:8000`)

---

## Context

Sprint 07 flips `VIGIL_LLM_MODE` from `mock` → `live` and wires the full agentic BE stack.

The architecture principle: **Vigil never owns LLM logic.** All inference runs through AGENTS `llm_core`. Vigil's vigil-server is a thin consumer.

```
vigil-ext  →  vigil-server (:7474)
                  → AGENTS FastAPI (:8000)
                       → llm_core (Groq / Claude / fallback)
                       → resource_manager (token accounting)
                       → returns structured suggestion
```

---

## Scope

| ID | Track | Deliverable | Cost |
|---|---|---|---|
| S07-01 | AGENTS | Add `/api/v1/vigil/suggest` endpoint to AGENTS project | ~4V |
| S07-02 | AGENTS | `llm_core` prompt templates for bug auto-complete + similarity | ~3V |
| S07-03 | AGENTS | `resource_manager` Vigil usage tracking (project_id=vigil) | ~2V |
| S07-04 | SERVER | Flip `VIGIL_LLM_MODE=live`, wire vigil-server → AGENTS API | ~2V |
| S07-05 | SERVER | Returning bug detection: semantic similarity on new bug receipt | ~3V |
| S07-06 | EXT | Bug auto-complete in editor (title + steps pre-fill from LLM) | ~3V |
| S07-07 | SERVER | Severity auto-suggest (confidence score shown, user overrides) | ~2V |
| S07-08 | AGENT | `vigil_agent` — autonomous resolution loop via Claude Code MCP | ~5V |
| S07-09 | AGENT | Sprint health report (LLM-generated summary of open bugs + risk) | ~2V |
| S07-10 | QA | Integration tests: ext → server → AGENTS round-trip | ~2V |

**Total: ~28V**

---

## Track Details

### S07-01 — AGENTS `/api/v1/vigil/suggest` Endpoint

**Location:** `backend/app/api/routes/vigil.py` (new file in AGENTS project)  
**Auth:** `X-Vigil-Key` header matches `VIGIL_AGENTS_API_KEY` env var

```python
POST /api/v1/vigil/suggest
Body:
{
  "type": "bug_title" | "steps" | "severity" | "similarity",
  "context": {
    "url": str,
    "session_clock_ms": int,
    "recent_actions": [...],   # last N actions from session
    "screenshot_b64": str,     # optional
    "existing_bugs": [...]     # for similarity check
  }
}
Response:
{
  "suggestion": str,
  "confidence": float,
  "model_used": str,
  "tokens_used": int
}
```

Uses `llm_core` model selection (Groq `llama-3.1-8b-instant` as default for latency).

---

### S07-02 — Prompt Templates

Stored in `backend/modules/llm_core/prompts/vigil/`:
- `bug_title.jinja2` — given URL + recent actions → suggest concise bug title
- `steps_to_reproduce.jinja2` — given action log → generate numbered steps
- `severity.jinja2` — given bug title + context → suggest P0/P1/P2/P3 with reasoning
- `similarity.jinja2` — given new bug + existing fixed bugs → flag potential returning bug

---

### S07-03 — resource_manager Tracking

All Vigil LLM calls tagged: `project_id="vigil"`, `feature="suggest"`.  
Enables per-project cost visibility in AGENTS dashboard.  
No new code in vigil-server — AGENTS handles it internally.

---

### S07-04 — vigil-server Live Mode

```typescript
// vigil.config.json
{ "llmMode": "live", "agentsApiUrl": "http://localhost:8000" }

// vigil-server/src/llm-client.ts
async function suggest(type, context) {
  if (config.llmMode === 'mock') return MOCK_RESPONSE;
  return await fetch(`${config.agentsApiUrl}/api/v1/vigil/suggest`, {
    method: 'POST',
    headers: { 'X-Vigil-Key': process.env.VIGIL_AGENTS_API_KEY },
    body: JSON.stringify({ type, context })
  }).then(r => r.json());
}
```

---

### S07-05 — Returning Bug Detection

**Trigger:** On receipt of any new bug (from ext POST or manual `bug-log`).  
**Flow:**
1. Load all `fixed/` bug files from all sprints
2. Call `/api/v1/vigil/suggest` with `type: "similarity"`
3. If confidence > 0.8 → auto-escalate severity by one level + add `## Returning Bug` block with link to original
4. If archived regression test exists for original bug → auto-queue it

---

### S07-06 — Bug Auto-Complete in Extension

**Trigger:** User opens bug editor (via `Ctrl+Shift+B` combo).  
**Flow:**
1. Extension sends session context to vigil-server `/api/suggest` (local hop)
2. vigil-server forwards to AGENTS
3. Response pre-fills title + steps fields (greyed placeholder text)
4. User can edit or accept before saving

**UX rule:** Auto-complete is always overridable. Never block save on LLM failure.

---

### S07-07 — Severity Auto-Suggest

Small confidence indicator next to severity dropdown in bug editor:
- `P1 (85% confidence)` — user sees suggestion, clicks to accept or overrides
- If LLM unavailable: dropdown shows normally, no indicator

---

### S07-08 — `vigil_agent` Autonomous Loop

A Claude Code slash command that runs the full resolution queue autonomously:

```
/project:vigil-agent [--sprint XX] [--severity P0,P1]

For each open bug (filtered by sprint/severity):
  1. vigil_get_bug(id)
  2. LLM analysis: classify as reproducible | needs-info | code-defect | UX-issue
  3. If reproducible:
     a. Write regression test → run → confirm RED
     b. Implement fix (max iterations from config)
     c. Run test → confirm GREEN
     d. vigil_close_bug(id, resolution, keep_test)
     e. Git commit
  4. If needs-info: set status = BLOCKED, comment with what's missing
  5. If can't reproduce after 2 attempts: escalate to Avi via report

Reports at end: N fixed, N blocked, N escalated, total time, tests added
```

**Max autonomy guardrail:** Agent never deletes files, never pushes to main directly. All commits to a `vigil/fixes/sprint-XX` branch. Avi merges.

---

### S07-09 — Sprint Health Report

```
/project:bug-review --report

Generates:
  - Open bugs by severity (P0: N, P1: N, P2: N, P3: N)
  - Fixed this sprint: N
  - Returning bugs flagged: N
  - Regression tests added: N, archived: N
  - Sprint closure recommendation: READY | BLOCKED (reasons)
  - LLM-generated risk summary (via AGENTS)
```

---

## Definition of Done

- [ ] `POST /api/v1/vigil/suggest` returns real LLM response in AGENTS project
- [ ] vigil-server `VIGIL_LLM_MODE=live` routes to AGENTS correctly
- [ ] Bug editor pre-fills title + steps from LLM (with fallback if LLM down)
- [ ] Returning bug correctly detected and escalated on known fixed bug re-entry
- [ ] Severity suggestion shown with confidence score
- [ ] `vigil_agent` runs full red→green loop on queue of bugs autonomously
- [ ] All fixes committed to `vigil/fixes/sprint-XX` branch (not main)
- [ ] Sprint health report generated and readable
- [ ] Integration tests: ext POST → server → AGENTS → suggestion round-trip passes
- [ ] `resource_manager` shows Vigil LLM usage tagged correctly in AGENTS

---

## Key Constraints

- `vigil_agent` **never pushes to main** — branch only, Avi merges
- LLM auto-complete is **always optional** — UI must work if AGENTS is offline
- All AGENTS API keys via env vars only — never in `vigil.config.json`
- Severity suggestion is **advisory** — user always has final say

---

*Sprint 07 planned: 2026-02-26 | Depends on Sprint 06 | Owner: CPTO*

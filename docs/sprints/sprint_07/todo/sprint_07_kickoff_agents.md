# Sprint 07 — AGENTS Integration Kickoff

You are `[DEV:agents]` on **SynaptixLabs Vigil** — Sprint 07, Track A.

**Repo:** `C:\Synaptix-Labs\projects\nightingale` (NOT vigil — this is cross-project work)
**Sprint index:** `C:\Synaptix-Labs\projects\vigil\docs\sprints\sprint_07\sprint_07_index.md`
**Phase:** 2 (begins Week 2 — parallel with Phase 1 UX work in vigil repo)

---

## Your Mission

Create the AGENTS-side infrastructure that Vigil will consume for LLM-powered bug assistance. All work happens in the `nightingale` repository under AGENTS Sprint 06.

**Deliverables:**
- S07-01: POST `/api/v1/vigil/suggest` endpoint (~4V) — 🟠 P1
- S07-02: Prompt templates for bug suggest + similarity (~3V) — 🟠 P1
- S07-03: resource_manager Vigil tracking (~2V) — 🟡 P2

**Total: ~9V**

> ⚠️ **CRITICAL PATH:** S07-01 blocks Vigil Tracks B, C, and D. When your endpoint is ready, Vigil's `[DEV:server]` can flip `VIGIL_LLM_MODE=live` and wire the full LLM pipeline.

---

## Environment

```powershell
cd C:\Synaptix-Labs\projects\nightingale

# Start AGENTS FastAPI server
python -m uvicorn backend.app.main:app --reload --port 8000

# Health check
curl http://localhost:8000/api/v1/health

# Run AGENTS tests
pytest backend/tests/ -v
```

**Port:** 8000 (AGENTS FastAPI)

---

## S07-01 — AGENTS `/api/v1/vigil/suggest` Endpoint (~4V)

**File:** `backend/app/api/routes/vigil.py` (new file)

### API Contract

```python
# POST /api/v1/vigil/suggest
# Auth: X-Vigil-Key header → matches VIGIL_AGENTS_API_KEY env var

# Request Body:
{
  "type": "bug_title" | "steps" | "severity" | "similarity" | "classify",
  "context": {
    "url": str,                    # page URL where bug occurred
    "session_clock_ms": int,       # session elapsed time
    "recent_actions": [...],       # last N user actions from session
    "screenshot_b64": str | None,  # optional base64 screenshot
    "existing_bugs": [...]         # for similarity check — list of {title, description, severity}
  }
}

# Response:
{
  "suggestion": str,       # the LLM output (title, steps, severity, etc.)
  "confidence": float,     # 0.0 to 1.0
  "model_used": str,       # e.g. "llama-3.3-70b-versatile"
  "tokens_used": int       # total tokens consumed
}
```

### Implementation Guide

1. **Router registration:** Add to `backend/app/api/routes/__init__.py` — follow existing route patterns
2. **Auth middleware:** Read `X-Vigil-Key` header, validate against `VIGIL_AGENTS_API_KEY` env var. Return 401 on mismatch.
3. **Model selection:** Use `llm_core` model selection. Default: Groq `llama-3.3-70b-versatile` (D003/D012)
4. **Error handling:** If LLM call fails (timeout, rate limit, invalid response), return `{ "suggestion": "", "confidence": 0.0, "model_used": "none", "tokens_used": 0, "error": "..." }` with HTTP 200 (NOT 500 — vigil-server treats any error as "LLM unavailable, fallback to manual")

### Decisions

| ID | Decision |
|---|---|
| D003/D012 | Model: `llama-3.3-70b-versatile` via Groq (not 8B — quality-first) |
| D004 | Auth: `X-Vigil-Key` header + `VIGIL_AGENTS_API_KEY` env var |
| D010 | Cerebras NOT used (reserved for Subconscious Agent high-throughput) |
| D017 | Timeout: 10s for suggest calls. On timeout → return empty suggestion with confidence 0. |

---

## S07-02 — Prompt Templates (~3V)

**Location:** `backend/modules/llm_core/prompts/vigil/` (new directory)

Create 4 Jinja2 templates:

### `bug_title.jinja2`
Given URL + recent actions → suggest a concise bug title.
- Input: `url`, `recent_actions` (last 5-10 actions)
- Output: 1-sentence bug title (max 80 chars)
- Example: "Login button unresponsive after form submission on /auth/login"

### `steps_to_reproduce.jinja2`
Given action log → generate numbered steps to reproduce.
- Input: `recent_actions` (full action sequence)
- Output: Numbered markdown steps
- Must be human-readable, not raw action dumps

### `severity.jinja2`
Given bug title + context → suggest P0/P1/P2/P3 with reasoning.
- Input: `title`, `url`, `recent_actions`, `screenshot_b64` (optional)
- Output: `{ "severity": "P1", "reasoning": "..." }`
- P0 = system down, P1 = core flow broken, P2 = non-critical bug, P3 = cosmetic

### `similarity.jinja2`
Given new bug + existing fixed bugs → detect returning bug.
- Input: `new_bug` (title + description), `existing_bugs` (list of {title, description, severity})
- Output: `{ "is_returning": true/false, "confidence": 0.85, "matching_bug_id": "BUG-XXX", "reasoning": "..." }`
- Threshold: confidence > 0.8 triggers auto-escalation (D008)

---

## S07-03 — resource_manager Tracking (~2V)

Tag all Vigil LLM calls with:
- `project_id = "vigil"`
- `feature = "suggest"`

This enables per-product cost visibility in the AGENTS dashboard. No changes needed in vigil-server — AGENTS handles tracking internally via `resource_manager`.

---

## Handoff Protocol

When S07-01 is ready:

1. **PR merged** to nightingale main
2. **Health check:** `GET /api/v1/health` returns 200
3. **Curl example:** Send to Vigil `[DEV:server]`:
   ```bash
   curl -X POST http://localhost:8000/api/v1/vigil/suggest \
     -H "Content-Type: application/json" \
     -H "X-Vigil-Key: $VIGIL_AGENTS_API_KEY" \
     -d '{"type": "bug_title", "context": {"url": "http://localhost:3900", "session_clock_ms": 5000, "recent_actions": [{"type": "click", "target": "#login-btn"}]}}'
   ```
4. **Notify CPTO:** "S07-01 ready — endpoint live on :8000"

This unblocks Vigil S07-04 (server live mode).

---

## Quality Gates

```
✅ pytest passes for new vigil route tests
✅ Existing AGENTS tests unaffected
✅ Health check returns 200
✅ Curl example returns valid JSON with suggestion + confidence
✅ Auth rejects requests without X-Vigil-Key header (401)
✅ Timeout handling: 10s timeout returns graceful error (not 500)
```

---

*Generated: 2026-02-27 | Sprint 07 Phase 2 | Owner: CPTO*

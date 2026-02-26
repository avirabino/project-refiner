# Sprint 07 — Decisions Log

| ID | Decision | Rationale | Date |
|---|---|---|---|
| S07-D001 | AGENTS is the LLM platform — vigil-server is a thin consumer | Consolidates all SynaptixLabs LLM usage; avoids duplicating provider logic | 2026-02-26 |
| S07-D002 | AGENTS endpoint: POST /api/v1/vigil/suggest | Clean versioned contract; Vigil doesn't need full AGENTS scope | 2026-02-26 |
| S07-D003 | Groq llama-3.1-8b-instant as default model for suggest | Sub-200ms latency for inline auto-complete; llm_core handles fallback | 2026-02-26 |
| S07-D004 | Auth via X-Vigil-Key header + VIGIL_AGENTS_API_KEY env var | Simple shared secret; no OAuth complexity for internal service call | 2026-02-26 |
| S07-D005 | vigil_agent commits to vigil/fixes/sprint-XX branch only | Prevents autonomous agent from touching main; Avi controls merge | 2026-02-26 |
| S07-D006 | LLM auto-complete always optional — UI works if AGENTS offline | Resilience first; LLM is enhancement not dependency | 2026-02-26 |
| S07-D007 | resource_manager tracks Vigil calls with project_id="vigil" | Enables per-product cost visibility in AGENTS dashboard | 2026-02-26 |
| S07-D008 | Returning bug threshold: confidence > 0.8 to auto-escalate | Avoids false positives; tunable in vigil.config.json in future | 2026-02-26 |
| S07-D009 | Prompt templates live in AGENTS llm_core/prompts/vigil/ | Keeps prompt engineering co-located with model logic | 2026-02-26 |
| S07-D010 | Cerebras NOT used in Sprint 07 | Groq latency sufficient for short completions; Cerebras reserved for Nightingale Subconscious Agent (high-throughput sustained inference) | 2026-02-26 |

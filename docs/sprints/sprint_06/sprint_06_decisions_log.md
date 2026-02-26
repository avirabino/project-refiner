# Sprint 06 — Decisions Log

| ID | Decision | Rationale | Date |
|---|---|---|---|
| S06-D001 | vigil-server on port 7474 | Avoids conflicts with dev servers (3000, 8000, 33847) | 2026-02-26 |
| S06-D002 | Session = container, recording = opt-in | Removes friction — snapshot/bug always available without full rrweb overhead | 2026-02-26 |
| S06-D003 | Git-native filesystem storage (no DB in Sprint 06) | Debuggable, diffable, no infra dependency for core loop | 2026-02-26 |
| S06-D004 | MCP tools in vigil-server (not ext) | Extension has no filesystem access — server is the only bridge | 2026-02-26 |
| S06-D005 | VIGIL_LLM_MODE=mock in Sprint 06 | LLM wiring is Sprint 07 — stub keeps Sprint 06 shippable without AGENTS | 2026-02-26 |
| S06-D006 | Dashboard as React SPA served by vigil-server | No separate deploy — localhost only, bundled into server/public/ | 2026-02-26 |
| S06-D007 | Ctrl+Shift+B = snapshot + bug editor (merged) | One shortcut for the most common capture action | 2026-02-26 |
| S06-D008 | maxFixIterations default = 3, configurable via vigil.config.json | Prevents infinite loops; Avi can raise per-project | 2026-02-26 |
| S06-D009 | bug-fix commits to current branch (not a separate branch) | Sprint 07 vigil_agent will use branch isolation; Sprint 06 keeps it simple | 2026-02-26 |
| S06-D010 | FEAT-XXX uses same file format as BUG-XXX (type field differentiates) | Single schema, single parser, less code | 2026-02-26 |

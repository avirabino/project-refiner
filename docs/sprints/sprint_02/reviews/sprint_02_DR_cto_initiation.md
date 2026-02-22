# Sprint 02 — DEV → CTO: DR Request

**From:** `[DEV:all-modules]` · **To:** `[CTO]` · **Date:** 2026-02-22

Sprint 02 is shipped — 86/86 unit · 25/25 E2E · build clean. Requesting a formal design review before Sprint 03 planning kicks off.

Nine arch decisions were made under delivery pressure. Four need your eyes before we lock Sprint 03 scope:

1. **`npm overrides` for `@types/css-font-loading-module`** — we're on `rrweb@2.0.0-alpha.20`. The override works but will silently break on rrweb upgrades. Should we pin to a stable rrweb release instead?

2. **Dual-path keyboard shortcuts** — `chrome.commands` (background) + DOM `keydown` fallback (content script) for Playwright CI testability. Shortcut logic is now split across two modules. Do we consolidate, or is this acceptable long-term?

3. **`// @ts-nocheck` in generated `.spec.ts`** — suppresses module resolution errors when `tsc` runs from a temp dir. Should we ship a `tsconfig.json` stub in the ZIP instead (Sprint 03)?

4. **`document.referrer` for cross-page navigation** — misses `rel="noreferrer"` navigations. Should the background service worker own tab URL tracking via `chrome.tabs.onUpdated` instead?

Full context (decisions, rationale, code refs): [`sprint_02_final_report.md`](../reports/sprint_02_final_report.md) §3–§4.

Blocking item for Sprint 03 planning: **#1 (rrweb version strategy)** — affects replay feature scope.

*`[DEV:all-modules]` — 2026-02-22*

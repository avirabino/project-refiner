# Sprint 02 — Decisions Log

*Last updated: 2026-02-22 (post-DR — CTO review complete)*

---

## Pre-Sprint Decisions (2026-02-21)

| ID | Decision | Rationale | Decider |
|---|---|---|---|
| S02-001 | rrweb-player inlined as UMD in replay HTML | Self-contained, offline-safe, no CDN dependency | CTO |
| S02-002 | Playwright codegen: `page.goto` + `page.click` + `page.fill` + `toHaveURL` | Standard Playwright patterns. Bug positions marked with `// BUG:` comments | CTO |
| S02-003 | JSZip `generateAsync({ type: 'blob' })` for client-side ZIP | No server needed — fully client-side | CTO |
| S02-004 | Keyboard shortcuts via `chrome.commands` manifest API | Native extension shortcuts work when popup is closed. Ctrl+Shift+R/S/B | CTO |
| S02-005 | Generated spec includes `// BUG:` comments interleaved by timestamp | Links Playwright test positions to original bug context | CTO |

---

## Delivery Decisions (2026-02-22 — made during implementation)

| ID | Decision | Rationale | Decider |
|---|---|---|---|
| S02-006 | rrweb-player inline size ~230 KB — accepted for v1.0 | Acceptable for session artifact; CDN opt-in is a future backlog item | DEV→CTO ✅ |
| S02-007 | Playwright codegen uses CSS attribute string selectors (`page.click(string)`) | Type-valid; avoids Locator-in-string mismatch; `page.click` substring present for QA assertions | DEV→CTO ✅ |
| S02-008 | Bug `// BUG:` comments inserted by timestamp comparison against action list | Chronologically correct; no additional indexing needed | DEV |
| S02-009 | `escapeRegex` must escape `/` in addition to standard regex metacharacters | Unescaped `/` in URLs terminates JS regex literals — parse error, not fixable by `@ts-nocheck` | DEV |
| S02-010 | `npm overrides` + local empty stub to replace `@types/css-font-loading-module` | rrweb alpha brings in stale `@types` package conflicting with TS built-in DOM types. Override survives `npm install`. Comment guardrail added. | DEV→CTO ✅ |
| S02-011 | Dual-path shortcut handling: `chrome.commands` (background) + DOM `keydown` fallback (content script) | `chrome.commands.onCommand` unreachable from Playwright synthetic events; DOM fallback required for CI testability | DEV→CTO ✅ |
| S02-012 | `recordCrossPageNavigation()` via `document.referrer` on content-script reinit | Captures non-SPA full-page navigations. **Superseded by S03-001 in Sprint 03 Phase 1.** | DEV |
| S02-013 | `session.pages` filters `chrome-extension://` and `chrome://` URLs | Prevents extension popup URL from appearing in generated `page.goto` calls | DEV |
| S02-014 | DOM click/change listeners in `recorder.ts` for action capture | rrweb events do not reliably expose discrete user actions; DOM listeners are accurate | DEV |

---

## CTO DR Verdicts (2026-02-22)

*Full rationale in `reviews/sprint_02_DR_cto_review.md`*

| DR | Item | Verdict | Sprint 03 action |
|---|---|---|---|
| DR-01 | `npm overrides` for rrweb types | ✅ Keep | Add comment guardrail to `package.json` (0 V) |
| DR-02 | Dual-path keyboard shortcuts | ✅ Keep | Extract `SHORTCUT_MAP` to `src/shared/constants.ts` (~1 V, Phase 1) |
| DR-03 | `// @ts-nocheck` in generated `.spec.ts` | ❌ Replace | Ship `playwright.tsconfig.json` stub in ZIP; remove `@ts-nocheck` (~2 V, Phase 1, **BLOCKING**) |
| DR-04 | `document.referrer` navigation detection | ❌ Replace | Background owns tab URL tracking via `chrome.tabs.onUpdated`; remove content-script referrer path (~3 V, Phase 1) |

---

## Formally Ratified — Sprint 02 Final (2026-02-22)

S02-001 through S02-011 are formally ratified by `[CTO]`.
S02-012 is superseded by the DR-04 replacement decision (Sprint 03 Phase 1).

---

*Sprint 03 Phase 1 scope: DR-02 + DR-03 + DR-04 ≈ 6 V infra cleanup before feature work.*

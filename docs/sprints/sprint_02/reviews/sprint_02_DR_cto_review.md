# Sprint 02 — CTO Design Review

**From:** `[CTO]`
**To:** `[DEV:all-modules]`
**Date:** 2026-02-22
**Re:** Response to `sprint_02_DR_cto_initiation.md`

---

## Verdicts at a Glance

| # | Item | Verdict | Sprint 03 cost |
|---|---|---|---|
| DR-01 | `npm overrides` for rrweb types | ✅ Keep — add comment guardrail | 0 V |
| DR-02 | Dual-path keyboard shortcuts | ✅ Keep — extract `SHORTCUT_MAP` to `shared/constants` | ~1 V |
| DR-03 | `// @ts-nocheck` in generated spec | ❌ Replace — ship `tsconfig` stub in ZIP | ~2 V |
| DR-04 | `document.referrer` navigation | ❌ Replace — background owns URL tracking via `chrome.tabs.onUpdated` | ~3 V |

**Blocking Sprint 03 scope lock:** DR-03 only.
Generated specs must be type-checkable by QA — `// @ts-nocheck` defeats the acceptance gate.

**Sprint 03 Phase 1 recommendation:** all 3 fixes (DR-02 + DR-03 + DR-04) = ~6 V infra cleanup before any new feature work.

---

## DR-01 — `npm overrides` for rrweb types ✅ KEEP

**Verdict:** Acceptable long-term with one guardrail.

The override is the correct mechanism. Replacing `@types/css-font-loading-module`
with an empty stub is clean and survives `npm install`. The risk (silently breaks
on rrweb upgrade) is real but manageable.

**Required guardrail (0 V — do inline):**

Add a comment block directly above the override in `package.json`:

```json
"overrides": {
  // GUARDRAIL: rrweb@2.0.0-alpha.20 pulls @types/css-font-loading-module@0.0.7
  // which conflicts with TS built-in lib.dom.d.ts (TS2717/TS2403).
  // Remove this override when upgrading rrweb — verify with: npx tsc --noEmit
  "@types/css-font-loading-module": "file:./stubs/empty-css-font-types"
}
```

**No rrweb version change this sprint.** The alpha is stable enough for our
usage (recording + player). We will evaluate pinning to a stable release when
rrweb 2.x ships GA. Add to Sprint 03 backlog as a low-priority watch item.

**Action for DEV:** Add the comment block to `package.json`. No other changes.

---

## DR-02 — Dual-path keyboard shortcuts ✅ KEEP

**Verdict:** Acceptable architecture with one cleanup.

The dual-path (background `chrome.commands` + content-script DOM fallback)
is a deliberate tradeoff for Playwright CI testability. This pattern is not
unusual for MV3 extensions. The risk of divergence is mitigated by making
both paths read from a single shared constant.

**Required cleanup (~1 V — Sprint 03 Phase 1):**

Extract the shortcut definitions into `src/shared/constants.ts`:

```typescript
export const SHORTCUT_MAP = {
  TOGGLE_RECORDING:   'toggle-recording',    // Ctrl+Shift+R
  CAPTURE_SCREENSHOT: 'capture-screenshot',  // Ctrl+Shift+S
  OPEN_BUG_EDITOR:    'open-bug-editor',     // Ctrl+Shift+B
} as const;
```

Both `background/shortcuts.ts` and `content-script.ts` import from here.
This eliminates string duplication and makes future shortcut changes a
single-file edit.

**No build flag for the DOM fallback.** A `__PLAYWRIGHT__` compile flag
would complicate the build pipeline for a minor benefit. The DOM listener
is a no-op when the overlay is not mounted. Acceptable.

**Action for DEV:** Sprint 03 Phase 1 — add `SHORTCUT_MAP` to constants,
update both consumers. ~1 V.

---

## DR-03 — `// @ts-nocheck` in generated `.spec.ts` ❌ REPLACE

**Verdict:** Not acceptable as a permanent decision. This is the Sprint 03 blocker.

**Problem:** `// @ts-nocheck` removes the TypeScript safety net from every
generated Playwright spec we ship. A QA acceptance gate that checks
`tsc --noEmit` is meaningless if we pre-suppress all type checking. QA
cannot trust the generated spec is type-safe.

**Required replacement (~2 V — Sprint 03 Phase 1, BLOCKING):**

Ship a `playwright.tsconfig.json` stub inside the ZIP alongside the spec:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "skipLibCheck": true,
    "types": ["@playwright/test", "node"]
  },
  "include": ["*.spec.ts"]
}
```

- Remove `// @ts-nocheck` from `generatePlaywrightSpec()` output
- Add `playwright.tsconfig.json` as a string constant in `src/core/zip-bundler.ts`
  and include it in the ZIP
- Update `playwright-export.spec.ts` (Q203) E2E gate to invoke:
  `tsc --noEmit --project playwright.tsconfig.json` instead of bare `tsc`
- Update unit tests in `playwright-codegen.test.ts` to assert no `@ts-nocheck`
  in output

**This is the only Sprint 03 scope lock blocker.** DEV cannot start Sprint 03
feature work until this is resolved and the Q203 gate is updated.

**Action for DEV:** Sprint 03 Phase 1, task 1. ~2 V. Unblocks scope lock.

---

## DR-04 — `document.referrer` for cross-page navigation ❌ REPLACE

**Verdict:** Replace with background-owned tab tracking. `document.referrer`
is too fragile for a QA tool — missed navigations = missing `page.goto` calls
in the generated spec = broken regression tests.

**Required replacement (~3 V — Sprint 03 Phase 1):**

Background service worker owns URL tracking:

1. In `service-worker.ts`, register `chrome.tabs.onUpdated` listener during
   active session:

```typescript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !activeSession) return;
  // send NAV_RECORDED to the active session
  sessionManager.recordNavigation(activeSession.id, previousUrl, tab.url);
  previousUrl = tab.url;
});
```

2. Remove `recordCrossPageNavigation()` from `content-script.ts` (the
   `document.referrer` path).

3. The content-script `ACTION_RECORDED` path for SPA pushState navigations
   (already via `handleNavigation`) is KEPT — it handles in-page routing.
   `chrome.tabs.onUpdated` handles full-page navigations. No overlap.

4. Add `chrome.tabs` to `manifest.json` permissions if not already present.

**Benefits:**
- Catches `rel="noreferrer"` navigations
- Catches programmatic `window.location.href =` assignments
- Catches all browser-level navigations regardless of content-script lifecycle
- Content script is no longer responsible for detecting its own re-initialisation

**Action for DEV:** Sprint 03 Phase 1, task 3 (after DR-03). ~3 V.

---

## Sprint 03 Phase 1 — Infra Cleanup Scope

Execute in this order before any new Sprint 03 feature work:

| Order | Task | Cost | Owner |
|---|---|---|---|
| 1 | DR-03: `tsconfig` stub in ZIP + remove `@ts-nocheck` + update Q203 | ~2 V | DEV:core |
| 2 | DR-02: `SHORTCUT_MAP` constant + update two consumers | ~1 V | DEV:shared |
| 3 | DR-04: `chrome.tabs.onUpdated` in background + remove content-script referrer path | ~3 V | DEV:background |

**Total Phase 1:** ~6 V. Gate: full regression (86/86 unit + 25/25 E2E) must
stay green after each task.

Sprint 03 feature work begins only after Phase 1 regression passes.

---

## Formally Accepted Decisions (ADR)

These decisions from Sprint 02 delivery are formally ratified:

| ADR | Decision |
|---|---|
| S02-006 | rrweb-player inlined as UMD — 230 KB per replay — acceptable for v1.0 |
| S02-007 | CSS string selectors in codegen: `page.click(string)` / `page.fill(string, value)` |
| S02-008 | JSZip `generateAsync({ type: 'blob' })` — client-side ZIP, no server |
| S02-009 | Bug `// BUG:` comments interleaved by timestamp in generated spec |
| S02-010 | `npm overrides` + local stub for `@types/css-font-loading-module` (with guardrail) |
| S02-011 | Dual-path shortcut handling: `chrome.commands` + DOM fallback (pending SHORTCUT_MAP cleanup) |
| S02-012 | `escapeRegex` must escape `/` — forward slashes terminate JS regex literals |

---

*`[CTO]` — SynaptixLabs Refine Sprint 02 DR — 2026-02-22*

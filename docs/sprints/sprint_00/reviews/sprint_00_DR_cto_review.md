# Sprint 00 — DEV Scaffold: CTO Review Report

**From:** `[DEV:scaffold]`
**To:** `[CTO]`
**Date:** 2026-02-21
**Revision:** 2 (consolidated — covers all QA rounds)
**Scope:** `src/shared/`, `src/background/`, `src/content/`, `src/popup/`, `tests/unit/`, `vitest.config.ts`, `public/icons/`

---

## Summary

Sprint 00 DEV scaffold is complete. Seven issues were identified across two QA review rounds — all implemented and verified. This document is the definitive consolidated record for CTO sign-off.

---

## Final Verification Gates

| Gate | Result |
|---|---|
| `npm run build` | ✅ Clean — `dist/` generated, all assets present |
| `npx tsc --noEmit` | ✅ Zero type errors |
| `npx eslint src/` | ✅ Zero lint errors |
| `npx vitest run` | ✅ 11/11 passing, single-pass output (`···········`) |
| `dist/icons/*.png` | ✅ Valid PNGs — 0.07 kB each |
| `src/shared/` — zero Chrome runtime API | ✅ Verified |
| `MessageHandler` matches Chrome API signature | ✅ `sender` param present |

---

## Fix 1 — `src/shared/messages.ts`: Chrome runtime API removed

**Issue:** `sendMessage()` and `onMessage()` called `chrome.runtime.*` directly from `src/shared/`, violating the "zero Chrome API dependencies" constraint in AGENTS.md §4.3.

**Before:**
```typescript
export const sendMessage = async <TResponse = unknown>(
  message: ChromeMessage
): Promise<ChromeResponse<TResponse>> => {
  const response = await chrome.runtime.sendMessage(message); // ← Chrome API in shared/
  ...
};

export const onMessage = (handler: ...) => {
  chrome.runtime.onMessage.addListener(handler); // ← Chrome API in shared/
};
```

**After:**
```typescript
export type MessageHandler<T = unknown> = (
  message: ChromeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ChromeResponse<T>) => void
) => boolean | void;

// TODO (Sprint 01): sendMessage() and onMessage() implementations move to
// src/background/messaging.ts and src/content/messaging.ts respectively,
// where chrome.runtime is in scope.
```

**Notes:**
- `src/shared/` is now fully Chrome-runtime-API-free.
- `chrome.runtime.MessageSender` is a TypeScript type declaration from `@types/chrome` (devDep), not a runtime call — safe in `shared/`.
- `MessageHandler` includes `sender` to match the real `chrome.runtime.onMessage.addListener` signature exactly (QA Flag A, Round 2).

---

## Fix 2 — `src/background/service-worker.ts`: Chrome API inlined at correct scope

**Issue:** `service-worker.ts` imported `onMessage` from `@shared/index`. After Fix 1, the import was broken and the Chrome API needed to live in the background module directly.

**Before:**
```typescript
import { onMessage } from '@shared/index'; // ← Chrome wrapper imported from shared/
onMessage((message, _sender, sendResponse) => { ... });
```

**After:**
```typescript
// chrome.runtime is scoped to background — NOT imported from shared/
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Refine] Received message:', message.type, { payload: message.payload });
  sendResponse({ ok: true, data: { received: message.type } });
});
```

---

## Fix 3 — `src/shared/utils.ts`: `generateBugId()` upgraded to `crypto.randomUUID()`

**Issue:** `Math.random().toString(36).substring(2, 7)` produced 5-char base36 strings (~60M combinations). Not cryptographically secure; unsuitable for a production ID generator.

**Before:**
```typescript
export const generateBugId = (): string => {
  const randomChars = Math.random().toString(36).substring(2, 7);
  return `bug-${randomChars}`;
};
```

**After:**
```typescript
export const generateBugId = (): string => {
  return `bug-${crypto.randomUUID().split('-')[0]}`;
};
```

**New format:** `bug-XXXXXXXX` — first 8-char hex segment of a UUID v4. Cryptographically random, ~4 billion combinations per call.

---

## Fix 4 — `tests/unit/shared/utils.test.ts`: Updated for new ID format + uniqueness proof

**Before:**
```typescript
it('should generate an ID in the correct format', () => {
  expect(id).toMatch(/^bug-[a-z0-9]{5}$/); // ← matched Math.random base36
});
```

**After:**
```typescript
it('should generate an ID with bug- prefix and 8-char hex segment', () => {
  expect(id).toMatch(/^bug-[0-9a-f]{8}$/); // ← matches UUID v4 first segment
});

it('should generate unique IDs across 100 calls', () => {
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) ids.add(generateBugId());
  expect(ids.size).toBe(100); // ← uniqueness proven, not assumed
});
```

---

## Fix 5 — `public/icons/*.png`: Valid PNG placeholders (QA D018-BUG)

**Issue (QA D018-BUG):** Icon files were 0-byte. `dist/icons/` received 0-byte copies. Chrome loaded the extension but showed the default puzzle-piece icon.

**Fix:** Created minimal valid 1×1 transparent PNG files (68 bytes each) for all 4 required sizes.

| File | Before | After |
|---|---|---|
| `dist/icons/icon-16.png` | 0.00 kB | 0.07 kB ✅ |
| `dist/icons/icon-32.png` | 0.00 kB | 0.07 kB ✅ |
| `dist/icons/icon-48.png` | 0.00 kB | 0.07 kB ✅ |
| `dist/icons/icon-128.png` | 0.00 kB | 0.07 kB ✅ |

**Sprint 01 follow-up:** Replace 1×1 placeholders with branded SynaptixLabs icons.

---

## Fix 6 — `src/shared/messages.ts`: `MessageHandler` sender param (QA Flag A, Round 2)

Covered in Fix 1 above. The initial implementation omitted `sender: chrome.runtime.MessageSender` from `MessageHandler<T>`, making the type incompatible with the real Chrome API signature. Added in the same file update.

---

## Fix 7 — `vitest.config.ts`: Double-reporting eliminated (QA Flag B, Round 2)

**Issue:** Each test file appeared twice in `npx vitest run` terminal output (visual artifact — counts were always correct).

**Root cause:** Vitest 2.x `verbose`/`default` reporters emit incremental per-worker updates AND a final summary pass. With 2 worker threads and 2 test files, every file was printed 2–3 times.

**Investigation path:**
| Attempt | Outcome |
|---|---|
| Remove `globals: true` | Still doubled |
| Remove `/// <reference types="vitest" />` | Still doubled |
| `pool: 'forks', singleFork: true` | Tripled (worse) |
| Switch to `reporter: 'dot'` | ✅ Single-pass clean output |

**Before (`reporter: 'verbose'`):**
```
✓ tests/unit/shared/constants.test.ts (5)
✓ tests/unit/shared/utils.test.ts (6)
✓ tests/unit/shared/constants.test.ts (5)   ← duplicate
✓ tests/unit/shared/utils.test.ts (6)        ← duplicate

Test Files  2 passed (2) | Tests  11 passed (11)
```

**After (`reporter: 'dot'`):**
```
···········

Test Files  2 passed (2) | Tests  11 passed (11)
```

---

## Open Items Deferred to Sprint 01

| Item | File | Notes |
|---|---|---|
| `sendMessage()` implementation | `src/background/messaging.ts` (new) | Chrome runtime in correct scope |
| `onMessage()` implementation | `src/content/messaging.ts` (new) | Chrome runtime in correct scope |
| Branded icon assets | `public/icons/*.png` | Replace 1×1 placeholders |
| MV3 service worker keep-alive | `src/background/service-worker.ts` | `chrome.alarms` pattern, TODO in place |

---

## CTO Sign-Off Checklist

- [ ] Architecture: `src/shared/` is Chrome-runtime-API-free
- [ ] `MessageHandler` type matches real `chrome.runtime.onMessage.addListener` signature
- [ ] `generateBugId()` uses `crypto.randomUUID()`
- [ ] Test coverage: `generateBugId` uniqueness proven across 100 calls
- [ ] `dist/icons/*.png` — valid PNG files, Chrome-loadable
- [ ] Vitest output clean: single-pass `dot` reporter, 11/11 green
- [ ] `npm run build` + `tsc --noEmit` pass with zero errors
- [ ] Sprint 01 kickoff — pending CTO

---

*`[DEV:scaffold]` — All 7 issues resolved across 2 QA rounds. Sprint 00 complete. Ready for Sprint 01.*

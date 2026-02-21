# sprint_01 — Requirements Delta

## PRD Requirements In Scope

| ID | Requirement | Priority | Vibes | Sprint 01 Action |
|---|---|---|---|---|
| R001 | Session creation with auto-ID, name, description | P0 | 5V | ✅ Full implementation |
| R002 | DOM recording via rrweb across page navigations | P0 | 15V | ✅ Full implementation |
| R003 | Floating control bar (Record/Pause/Stop) | P0 | 8V | ✅ Full implementation |
| R004 | Screenshot capture on demand | P0 | 5V | ✅ Full implementation |
| R005 | Inline bug/feature editor | P0 | 10V | ✅ Full implementation |

## Infrastructure (not in PRD, required for features)

| Item | Vibes | Notes |
|---|---|---|
| Chrome messaging wrappers | 2V | Type-safe popup↔bg↔content communication |
| Service worker keep-alive | 1V | chrome.alarms for active session persistence |
| Branded icons | 1V | Replace 1×1 placeholders |

## Sprint 01 Total: ~47V

## Deferred to Sprint 02

| ID | Requirement | Priority | Notes |
|---|---|---|---|
| R006 | Report generation | P0 | Depends on recorded session data from Sprint 01 |
| R007 | Session list + delete | P0 | Basic list exists; full management in Sprint 02 |
| R010 | Visual replay | P1 | Depends on rrweb events stored in Sprint 01 |
| R011 | Playwright export | P1 | Depends on action log from Sprint 01 |
| R012 | ZIP bundle | P1 | Depends on R006 + R010 + R011 |
| R013 | Keyboard shortcuts | P1 | Polish item |

## Changes from PRD

None. Sprint 01 implements R001-R005 exactly as specified in PRD v0.1.0.

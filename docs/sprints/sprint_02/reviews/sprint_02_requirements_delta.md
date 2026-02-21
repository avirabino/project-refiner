# sprint_02 — Requirements Delta

## PRD Requirements In Scope

| ID | Requirement | Priority | Vibes | Sprint 02 Action |
|---|---|---|---|---|
| R006 | Session report generation (JSON + Markdown) | P0 | 8V | ✅ Full implementation |
| R007 | Session list with delete capability | P0 | 5V | ✅ Full implementation |
| R010 | Visual replay via rrweb-player | P1 | 10V | ✅ Full implementation |
| R011 | Playwright test script export | P1 | 15V | ✅ Full implementation |
| R012 | Export as ZIP bundle | P1 | 5V | ✅ Full implementation |
| R013 | Keyboard shortcuts | P1 | 3V | ✅ Full implementation |

## New Dependencies

| Dependency | Type | Notes |
|---|---|---|
| JSZip | npm package (MIT) | Client-side ZIP generation. CTO approval needed for new dep. |
| rrweb-player | npm package (MIT) | Already installed in Sprint 00. Inlined into replay HTML. |

## Sprint 02 Total: ~46V

## Cumulative Budget

| Sprint | Vibes | Running Total |
|---|---|---|
| Sprint 00 | ~15V | 15V |
| Sprint 01 | ~47V | 62V |
| Sprint 02 | ~46V | 108V |
| **Total budget** | **~110V** | **2V buffer** |

## Cut (P2 — Not Shipping)

| ID | Requirement | Priority | Reason |
|---|---|---|---|
| R020 | Session tagging / filtering | P2 | Nice-to-have. Can be added post-v1. |
| R021 | Bug/feature export to markdown | P2 | Report gen (R006) covers most of this need. |
| R022 | Action annotation | P2 | Adds complexity to recording engine. Post-v1. |
| R023 | Element inspector mode | P2 | Separate tool concern. Post-v1. |
| R024 | Dark/light theme for overlay | P2 | Cosmetic. Post-v1. |

## Changes from PRD

- **R012 dependency added:** JSZip npm package required (not in original PRD dependency list)
- **No scope changes.** Sprint 02 implements R006, R007, R010-R013 exactly as specified in PRD v0.1.0.

# sprint_01 — Sprint Index

**Sprint window:** 2026-02-22 → 2026-02-25
**Owners:** `[FOUNDER]` / `[CTO]` / `[CPO]`

## Status

- Sprint status: 🟡 PLANNING
- Current focus: Recording engine + inline capture — **first usable version**
- Key risks: rrweb cross-page persistence, Shadow DOM React mounting, MV3 service worker lifecycle

---

## Sprint Goal

Deliver the **core recording loop** — after this sprint, Avi can use Refine on Papyrus for real acceptance testing:

1. Start a named session from popup → content script begins rrweb recording
2. Floating control bar: Record ● / Pause ⏸ / Stop ⏹ / Screenshot 📸 / Bug 🐛
3. Navigate across pages — recording persists (service worker manages state)
4. Take screenshots on demand (auto-associated with URL + timestamp)
5. Log bugs/features inline with auto-context (URL, screenshot, element selector)
6. Stop session → data saved to IndexedDB (no export yet — Sprint 02)

**Estimated effort:** ~47 Vibes

---

## Team Structure

| Role | Tag | Scope |
|---|---|---|
| DEV | `[DEV:recording]` | Recording engine, messaging, session lifecycle, control bar, bug editor, unit tests |
| QA | `[QA]` | E2E tests for recording flows, update target app with recording scenarios, regression |
| CTO | `[CTO]` | Architecture compliance, review, CI updates |
| FOUNDER | `[FOUNDER]` | Manual acceptance on Papyrus via Refine |

> **Ownership rule:** DEV writes unit + integration tests. QA writes E2E tests.

---

## PRD Requirements Covered

| Req | Description | Priority | Vibes | Owner |
|---|---|---|---|---|
| R001 | Session creation (auto-ID, name, description) | P0 | 5 | DEV |
| R002 | DOM recording via rrweb (cross-page navigation) | P0 | 15 | DEV |
| R003 | Floating control bar (Record/Pause/Stop/Screenshot/Bug) | P0 | 8 | DEV |
| R004 | Screenshot capture on demand | P0 | 5 | DEV |
| R005 | Inline bug/feature editor with auto-context | P0 | 10 | DEV |
| — | Chrome messaging impl (sendMessage/onMessage) | Infra | 2 | DEV |
| — | Service worker keep-alive (chrome.alarms) | Infra | 1 | DEV |
| — | Branded extension icons | Infra | 1 | DEV |

---

## Deliverables Checklist

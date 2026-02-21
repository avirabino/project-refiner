# sprint_01 — Decisions Log

| ID | Decision | Rationale | Status |
|---|---|---|---|
| S01-001 | rrweb flush: 1000 events OR 30s | Balances memory vs write frequency. Large sessions (30min) produce ~50K events — chunking prevents OOM | Proposed |
| S01-002 | Plain CSS for overlay (no Tailwind in Shadow DOM) | Tailwind requires build pipeline integration into Shadow DOM. Overlay surface is small (~5 components). Plain CSS is simpler and fully isolated | Proposed |
| S01-003 | Auto-screenshot on bug editor open | Captures viewport at moment of bug discovery. User can retake manually if needed. Reduces friction in the "log bug" flow | Proposed |

---

## Notes

- All Sprint 00 decisions (S00-001 through S00-008, ADR-008) remain in effect
- S01 decisions are proposed — CTO approves during sprint or in design review

# sprint_02 — Decisions Log

| ID | Decision | Rationale | Status |
|---|---|---|---|
| S02-001 | JSZip for client-side ZIP bundling | No server needed. JSZip is mature (7M+ weekly npm downloads), MIT licensed, works in extension context. Alternative: Blob API manual ZIP — too complex for timeline. | Proposed |
| S02-002 | rrweb-player inlined in replay HTML | CDN links break offline replay. Inline player JS+CSS (~200KB) ensures replay works anywhere — email attachment, local file, shared drive. | Proposed |
| S02-003 | Version 1.0.0 = internal release | "1.0" for SynaptixLabs team distribution. Not Chrome Web Store. Sets expectation: stable for internal use, not public product. | Proposed |
| S02-004 | Manifest commands for keyboard shortcuts | chrome.commands API is the standard MV3 pattern. Max 4 commands; we use 3. Shortcuts are user-customizable via chrome://extensions/shortcuts. | Proposed |

---

## Notes

- All Sprint 00 + Sprint 01 decisions remain in effect
- S02 decisions are proposed — CTO approves during sprint or in design review

# sprint_00 — Decisions Log

## Decisions this sprint

| ID | Decision | Rationale | Status |
|---|---|---|---|
| S00-001 | Use SynaptixLabs Windsurf-Projects-Template as base | Consistent project structure across SynaptixLabs | Accepted |
| S00-002 | Adapt to Type C (Extension) structure | Chrome Extension doesn't use backend/frontend/ml-ai-data layout | Accepted |
| S00-003 | Single role: `@role_extension_dev` for all modules | All modules are TypeScript/React in extension context — one dev role suffices | Accepted |
| S00-004 | Skip Tier-2 AGENTS.md (no domain folders) | Flat `src/` structure — go directly from Tier-1 to Tier-3 per module | Accepted |
| S00-005 | Two-team structure: DEV + QA | DEV owns scaffold + code; QA owns test infra, test target app, first tests. TDD from sprint 0 | Accepted |
| S00-006 | Test target app on port 38470 | Avoids collision with Papyrus (338470) and other SynaptixLabs projects | Accepted |
| S00-007 | Playwright for E2E (not Puppeteer) | See ADR-008 in `docs/0l_DECISIONS.md`. Playwright supports extensions since v1.37+ | Accepted |
| S00-008 | Vitest `dot` reporter (not `verbose`) | Vitest 2.x verbose/default reporters double-print results with multi-worker pool — each file appears 2-3x. `dot` gives clean single-pass output: one dot per passing test, final summary only. | Accepted |

---

## Notes

All major technical decisions (platform, storage, recording, build tool, etc.) were made during the CPTO discussion and recorded in `docs/0l_DECISIONS.md` as ADR-001 through ADR-008.

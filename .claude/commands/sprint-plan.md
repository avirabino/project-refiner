# /project:sprint-plan — Generate Sprint Plan Artifacts

Generate the full sprint planning artifact set for the next sprint (or a specified sprint).

## Usage

```
/project:sprint-plan             # Plan the next sprint
/project:sprint-plan --sprint 07 # Plan a specific sprint
/project:sprint-plan --review    # Review current sprint scope before finalising
```

## Steps

1. **Read context:**
   - `vigil.config.json` → `sprintCurrent`
   - `docs/sprints/sprint_XX/sprint_XX_index.md` (current sprint DoD status)
   - `docs/sprints/backlog/` → deferred items to consider
   - `docs/0k_PRD.md` → remaining product goals
   - `docs/01_ARCHITECTURE.md` → current technical state

2. **Determine scope for next sprint:**
   - Pull unresolved items from current sprint (deferred bugs, partial features)
   - Pull highest-priority backlog items
   - Check AGENTS integration status (Sprint 07 = LLM live mode)
   - Propose scope table with cost estimates (V = vibe units)
   - Flag any dependencies on external teams or AGENTS project

3. **Produce artifacts** in `docs/sprints/sprint_XX/`:
   - `sprint_XX_index.md` — scope table, architecture notes, DoD checklist, sprint preview
   - `sprint_XX_decisions_log.md` — decisions table (pre-populated with known decisions)
   - `todo/sprint_XX_kickoff_dev.md` — per-track implementation guide with code stubs
   - `todo/sprint_XX_kickoff_qa.md` — regression gate + new test specs + testid requirements

4. **Update:**
   - `vigil.config.json` → `sprintCurrent`
   - `CLAUDE.md` → current sprint number
   - `CODEX.md` → sprint status table
   - `docs/00_INDEX.md` → current sprint links

5. **Confirm with Avi:** present scope table, budget, and first demo definition before generating full artifacts.

## Output Format

```
## Sprint XX — Proposed Scope

| ID | Track | Deliverable | Cost |
|---|---|---|---|
| S0X-01 | EXT | ... | ~XV |
...
Total: ~XXV

First demo goal: [one sentence — what Avi can click and see]
Dependencies: [any blockers]
Deferred from sprint_XX-1: [list]

Confirm to generate full artifact set? (yes/no)
```

## Rules
- NEVER generate artifacts before Avi confirms scope
- ALWAYS include a "first demo" definition — a concrete clickable moment
- ALWAYS pull deferred items from previous sprint before adding new scope
- Sprint budget should be 25–35V unless Avi specifies otherwise
- If scope exceeds 35V → propose what to cut, don't just inflate the plan

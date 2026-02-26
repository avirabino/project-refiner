# /project:bug-log — Log a New Bug or Feature

Log a new bug or feature to the current Vigil sprint.

## Steps

1. Read `vigil.config.json` → get `sprintCurrent`
2. Call `vigil_list_bugs` → check for duplicates (title similarity check)
3. If likely duplicate → show existing bug, ask user to confirm before proceeding
4. Prompt for:
   - **Type:** bug | feature
   - **Title:** short description
   - **Description:** what happened / what is needed
   - **URL:** page where bug occurred
   - **Severity:** P0 (blocker) | P1 (high) | P2 (medium) | P3 (low)
   - **Sprint:** default = `sprintCurrent`
5. Increment counter:
   - Bug → `nextBugId()` → `BUG-XXX`
   - Feature → `nextFeatId()` → `FEAT-XXX`
6. Write file to:
   - `docs/sprints/sprint_XX/BUGS/open/BUG-XXX_slug.md`
   - `docs/sprints/sprint_XX/FEATURES/open/FEAT-XXX_slug.md`
7. Confirm: "Logged as **BUG-XXX** — [title] (P1, sprint 06)"

## File Format

Use exact format from `CLAUDE.md §6`. Do not invent fields.

## Rules
- Always check for duplicates first
- Never log without a severity
- Never log P0 without immediately asking: "Should I start /project:bug-fix BUG-XXX now?"

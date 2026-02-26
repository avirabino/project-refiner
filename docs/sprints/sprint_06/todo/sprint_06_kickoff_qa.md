# Sprint 06 — QA Kickoff

You are `[QA]` on **SynaptixLabs Vigil** — Sprint 06.

**Repo:** `C:\Synaptix-Labs\projects\vigil`  
**Sprint index:** `docs/sprints/sprint_06/sprint_06_index.md`

---

## Your Mission

Validate the Vigil core platform end-to-end. Your primary concern: **the session model refactor must not break existing recording E2E tests**, and the new server integration must be verified via automated tests.

---

## Regression Gate (Run First)

Before testing any new Sprint 06 work, run all existing E2E tests:

```powershell
cd C:\Synaptix-Labs\projects\vigil
npx playwright test tests/e2e/ --reporter=list
```

All tests must still pass. Any failure is a P0 regression — block Sprint 06 DEV from proceeding until fixed.

---

## New Test Coverage Required

### Q601 — Session Model: Clock Runs Independently of Recording

```typescript
// tests/e2e/session-model.spec.ts
test('session clock runs when recording is stopped', async ({ page }) => {
  // Create session
  // Wait 2 seconds — do NOT start recording
  // Verify session clock > 0 via session state
  // Start recording, stop recording
  // Verify session still active (no auto-end)
});
```

### Q602 — SPACE Toggle

```typescript
test('SPACE toggles recording when not in input', async ({ page }) => {
  // Create session
  // Focus body (not input)
  // Press SPACE → verify recording starts (control bar shows recording indicator)
  // Press SPACE again → verify recording pauses
});

test('SPACE does NOT toggle when input is focused', async ({ page }) => {
  // Create session
  // Focus an input field on target app
  // Press SPACE → verify no recording state change
});
```

### Q603 — Ctrl+Shift+B Combo

```typescript
test('Ctrl+Shift+B captures screenshot and opens bug editor', async ({ page }) => {
  // Create session
  // Press Ctrl+Shift+B
  // Verify bug editor visible
  // Verify screenshot attached (bug editor shows screenshot preview)
  // Verify URL pre-filled
});
```

### Q604 — END SESSION POST

```typescript
test('END SESSION posts to vigil-server', async ({ page, context }) => {
  // Start vigil-server (or mock server on 7474)
  // Create session, add one bug
  // End session
  // Verify POST received by server
  // Verify BUG-001.md written to sprint folder
});

test('END SESSION queues when server offline', async ({ page }) => {
  // vigil-server NOT running
  // Create session, add one bug, end session
  // Verify toast: "Server offline — queued for sync"
  // Verify session has pendingSync: true in IndexedDB
});
```

### Q605 — MCP Tools

```typescript
// tests/integration/mcp-tools.spec.ts
test('vigil_list_bugs returns bugs from filesystem', async () => {
  // Write a BUG-001.md to sprint_06/BUGS/open/
  // Call vigil_list_bugs via MCP client
  // Verify BUG-001 in response
});

test('vigil_close_bug moves file to fixed/', async () => {
  // vigil_close_bug('BUG-001', 'Fixed null check', true)
  // Verify file moved from BUGS/open/ to BUGS/fixed/
  // Verify Status: FIXED in file content
});
```

### Q606 — Dashboard Loads

```typescript
test('dashboard loads and shows bug list', async ({ page }) => {
  await page.goto('http://localhost:7474/dashboard');
  await expect(page.getByTestId('dashboard-root')).toBeVisible();
  await expect(page.getByTestId('bug-list-table')).toBeVisible();
});
```

---

## data-testid Requirements

Ensure DEV adds these to new components:

| Component | Required testid |
|---|---|
| Dashboard root | `dashboard-root` |
| Bug list table | `bug-list-table` |
| Feature list table | `feature-list-table` |
| Sprint selector | `sprint-selector` |
| Bug row | `bug-row-{BUG-ID}` |
| Severity badge | `severity-badge-{BUG-ID}` |
| Server health indicator | `server-health-status` |

---

## Definition of Done (QA sign-off)

- [ ] All pre-existing E2E tests pass (zero regressions)
- [ ] Q601–Q606 all green
- [ ] Dashboard manually verified at localhost:7474/dashboard
- [ ] SPACE shortcut tested manually on TaskPilot demo app
- [ ] Ctrl+Shift+B tested manually — screenshot appears in bug editor
- [ ] Bug file format validated (correct markdown, correct folder placement)

---

*Kickoff generated: 2026-02-26 | Sprint 06 | Role: QA*

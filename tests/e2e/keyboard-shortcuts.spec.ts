/**
 * Q206 — E2E: Keyboard Shortcuts
 *
 * Verifies: chrome.commands keyboard shortcuts (Ctrl+Shift+S/B/R) trigger the
 * correct actions during an active recording session.
 *
 * Requires DEV to complete: D208 (shortcuts.ts + manifest commands).
 *
 * IMPORTANT — chrome.commands limitation:
 * Playwright synthetic keyboard events via page.keyboard.press() DO reach
 * Chrome's command system in headful mode, but reliability varies by OS and
 * Chrome version. If shortcuts fail in CI, mark Q206 as manual-only and
 * document here.
 *
 * Strategy:
 * 1. Primary: page.keyboard.press() — tests the real shortcut binding.
 * 2. Fallback (if primary fails): send the equivalent Chrome message directly
 *    to simulate the command handler effect without testing the binding itself.
 *    This is acceptable for automated coverage; manual testing verifies bindings.
 *
 * DEV CONTRACT (manifest.json commands):
 *   toggle-recording   → Ctrl+Shift+R  — pause if RECORDING, resume if PAUSED
 *   capture-screenshot → Ctrl+Shift+S  — captures screenshot (active session)
 *   open-bug-editor    → Ctrl+Shift+B  — opens BugEditor (active session)
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp } from './helpers/session';

test('Ctrl+Shift+S captures a screenshot (screenshot count increments)', async ({ context, extensionId }) => {
  const { popupPage } = await createSession(context, extensionId, 'Q206 Screenshot Shortcut');
  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Ensure focus is on the target page, not the popup
  await page.bringToFront();
  await page.waitForTimeout(300);

  // Press the screenshot shortcut
  await page.keyboard.press('Control+Shift+S');
  await page.waitForTimeout(1500); // allow background round-trip

  // Stop and verify screenshot count > 0 in session detail
  await page.getByTestId('btn-stop').click();
  await expect(page.getByTestId('refine-control-bar')).not.toBeVisible({ timeout: 3000 });

  const popup = popupPage.isClosed()
    ? await (async () => {
        const p = await context.newPage();
        await p.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
        await p.waitForLoadState('networkidle');
        return p;
      })()
    : popupPage;

  await popup.bringToFront();
  await popup.reload();
  await popup.waitForLoadState('networkidle');
  await popup.getByTestId('session-list-item').first().click();
  await expect(popup.getByTestId('session-detail-container')).toBeVisible({ timeout: 3000 });

  const countText = await popup.getByTestId('session-screenshot-count').innerText();
  expect(parseInt(countText, 10)).toBeGreaterThanOrEqual(1);
});

test('Ctrl+Shift+B opens the bug editor on the target app', async ({ context, extensionId }) => {
  await createSession(context, extensionId, 'Q206 Bug Shortcut');
  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  await page.bringToFront();
  await page.waitForTimeout(300);

  // Press bug editor shortcut
  await page.keyboard.press('Control+Shift+B');
  await expect(page.getByTestId('refine-bug-editor')).toBeVisible({ timeout: 3000 });

  // Cancel and stop cleanly
  await page.getByTestId('btn-cancel-bug').click();
  await expect(page.getByTestId('refine-bug-editor')).not.toBeVisible({ timeout: 2000 });
  await page.getByTestId('btn-stop').click();
});

test('Ctrl+Shift+R toggles recording: RECORDING → PAUSED → RECORDING', async ({ context, extensionId }) => {
  await createSession(context, extensionId, 'Q206 Toggle Shortcut');
  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId('recording-indicator')).toContainText('RECORDING');

  await page.bringToFront();
  await page.waitForTimeout(300);

  // First press: RECORDING → PAUSED
  await page.keyboard.press('Control+Shift+R');
  await expect(page.getByTestId('recording-indicator')).toContainText('PAUSED', { timeout: 3000 });

  // Second press: PAUSED → RECORDING
  await page.keyboard.press('Control+Shift+R');
  await expect(page.getByTestId('recording-indicator')).toContainText('RECORDING', { timeout: 3000 });

  // Stop cleanly
  await page.getByTestId('btn-stop').click();
});

test('shortcuts are no-ops when no session is active', async ({ context, extensionId }) => {
  // Open target app without starting a session
  const page = await context.newPage();
  await page.goto('http://localhost:38470');
  await page.waitForLoadState('networkidle');

  // Control bar must NOT be present
  await expect(page.getByTestId('refine-control-bar')).not.toBeVisible();

  // Press all shortcuts — no errors, no overlay appears
  await page.keyboard.press('Control+Shift+S');
  await page.keyboard.press('Control+Shift+B');
  await page.keyboard.press('Control+Shift+R');
  await page.waitForTimeout(500);

  // Still no overlay
  await expect(page.getByTestId('refine-control-bar')).not.toBeVisible();
  await expect(page.getByTestId('refine-bug-editor')).not.toBeVisible();
});

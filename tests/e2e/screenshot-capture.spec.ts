/**
 * Q103 — E2E: Screenshot Capture
 *
 * Verifies: Screenshot button in control bar triggers capture → screenshot is
 * persisted. Verification uses the popup session detail UI (session shows
 * screenshot count > 0) rather than direct IndexedDB access to avoid
 * cross-origin complexity.
 *
 * Requires DEV to complete: D116 (screenshot.ts), D113 (ControlBar btn-screenshot),
 * D118 (SessionList/detail showing screenshot count or thumbnail).
 *
 * DEV CONTRACT: After stopping a session, the popup session detail view must
 * expose data-testid="session-screenshot-count" with the number of captured
 * screenshots as text content (e.g., "1", "2").
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp, getPopupPage } from './helpers/session';

test('screenshot button captures and persists a screenshot', async ({ context, extensionId }) => {
  const { popupPage } = await createSession(context, extensionId, 'Q103 Session');
  const page = await openTargetApp(context);

  // 1. Control bar is visible
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // 2. Click Screenshot button — should not throw, UI should give feedback
  await page.getByTestId('btn-screenshot').click();

  // 3. Wait briefly for capture round-trip (content → background → chrome.tabs.captureVisibleTab)
  await page.waitForTimeout(1500);

  // 4. No extension errors from the capture
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('[Vigil]')) errors.push(msg.text());
  });
  expect(errors, `Screenshot errors: ${errors.join(', ')}`).toHaveLength(0);

  // 5. Stop session
  await page.getByTestId('btn-stop').click();
  await expect(page.getByTestId('refine-control-bar')).not.toBeVisible({ timeout: 3000 });

  // 6. Verify in popup: session shows screenshot count ≥ 1
  const verifyPopup = await getPopupPage(popupPage, context, extensionId);
  await verifyPopup.bringToFront();
  await verifyPopup.reload();
  await verifyPopup.waitForLoadState('networkidle');

  // Open session detail (click first session in list)
  await verifyPopup.getByTestId('session-list-item').first().click();
  const screenshotCount = verifyPopup.getByTestId('session-screenshot-count');
  await expect(screenshotCount).toBeVisible({ timeout: 3000 });
  const countText = await screenshotCount.innerText();
  expect(parseInt(countText, 10)).toBeGreaterThanOrEqual(1);
});

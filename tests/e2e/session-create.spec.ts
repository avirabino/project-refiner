/**
 * Q101 — E2E: Session Creation
 *
 * Verifies: popup NewSession form → START_SESSION message → background creates session
 * → content script receives RECORDING_STARTED → control bar appears on target app.
 *
 * Requires DEV to complete: D101 (db), D102 (message-handler), D103 (session-manager),
 * D105 (service-worker wired), D110 (content-script wired), D112/D113 (overlay mount + ControlBar),
 * D117 (NewSession form), D119 (App.tsx routing).
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp } from './helpers/session';

test('creating a session via popup starts recording and shows control bar on target app', async ({ context, extensionId }) => {
  // 1. Create session via popup
  const { popupPage } = await createSession(context, extensionId, 'Q101 Session');

  // 2. Navigate to target app — content script already injected
  const targetPage = await openTargetApp(context);

  // 3. Control bar must be visible (Playwright auto-pierces open Shadow DOM)
  const controlBar = targetPage.getByTestId('refine-control-bar');
  await expect(controlBar).toBeVisible({ timeout: 5000 });

  // 4. Recording indicator must show active state
  await expect(targetPage.getByTestId('recording-indicator')).toBeVisible();

  // 5. No extension errors in console
  const errors: string[] = [];
  targetPage.on('console', msg => {
    if (msg.type() === 'error' && msg.text().includes('[Vigil]')) errors.push(msg.text());
  });
  await targetPage.waitForTimeout(500);
  expect(errors, `Extension errors: ${errors.join(', ')}`).toHaveLength(0);

  // 6. Popup session list reflects RECORDING status (re-open popup — it may have closed on focus loss)
  const verifyPopup = popupPage.isClosed()
    ? await context.newPage().then(p => p.goto(`chrome-extension://${extensionId}/src/popup/popup.html`).then(() => p))
    : popupPage;
  await verifyPopup.bringToFront();
  await expect(verifyPopup.getByTestId('session-list-item').first()).toBeVisible({ timeout: 5000 });
  await expect(verifyPopup.getByTestId('recording-status').first()).toContainText('RECORDING');
});

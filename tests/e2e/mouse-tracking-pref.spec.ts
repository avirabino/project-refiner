/**
 * Q503 — E2E: Mouse Tracking Preference
 *
 * Verifies: The "Record mouse movements" checkbox on the NewSession form
 * defaults to unchecked, can be toggled, and the preference is stored on
 * the session record (visible in SessionDetail or via IndexedDB).
 *
 * DEV CONTRACT:
 *   toggle-record-mouse-move  — checkbox input on NewSession form
 */

import { test, expect } from './fixtures/extension.fixture';
import { openTargetApp, stopAndOpenDetail } from './helpers/session';

test('Mouse tracking checkbox defaults to unchecked', async ({ context, extensionId }) => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState('networkidle');

  await popupPage.getByTestId('btn-new-session').first().click();

  const checkbox = popupPage.getByTestId('toggle-record-mouse-move');
  await expect(checkbox).toBeVisible({ timeout: 3000 });
  await expect(checkbox).not.toBeChecked();
});

test('Mouse tracking checkbox can be toggled on and off', async ({ context, extensionId }) => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState('networkidle');

  await popupPage.getByTestId('btn-new-session').first().click();

  const checkbox = popupPage.getByTestId('toggle-record-mouse-move');
  await expect(checkbox).not.toBeChecked();

  // Toggle on
  await checkbox.click();
  await expect(checkbox).toBeChecked();

  // Toggle off
  await checkbox.click();
  await expect(checkbox).not.toBeChecked();
});

test('Session created with mouse tracking off stores recordMouseMove=false', async ({ context, extensionId }) => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState('networkidle');

  await popupPage.getByTestId('btn-new-session').first().click();
  await popupPage.getByTestId('input-project-name').fill('C:\\E2E\\test-project');
  await popupPage.getByTestId('input-session-name').fill('Q503 Mouse Off Session');
  // Leave checkbox unchecked (default)
  await popupPage.getByTestId('btn-start-recording').click();

  await popupPage.waitForTimeout(1500).catch(() => {});

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  // Verify via IndexedDB that recordMouseMove is false
  const recordMouseMove = await detail.evaluate(async () => {
    return new Promise<boolean>((resolve) => {
      const req = indexedDB.open('refine-db');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const sessions = getAll.result as Array<{ recordMouseMove: boolean }>;
          const latest = sessions[sessions.length - 1];
          resolve(latest?.recordMouseMove ?? true);
        };
      };
    });
  });

  expect(recordMouseMove).toBe(false);
});

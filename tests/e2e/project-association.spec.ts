/**
 * Q505 — E2E: Project Association
 *
 * Verifies:
 *   1. A session created with a project name appears under that project filter.
 *   2. Selecting a project in the filter reveals the gear (⚙️) settings button.
 *   3. Clicking the gear button opens the ProjectSettings page.
 *   4. btn-publish is visible in SessionDetail when session.outputPath is set
 *      (outputPath is attached at session creation time from chrome.storage.local).
 *
 * Q505 OPEN QUESTION — RESOLVED:
 *   btn-publish visibility is driven by session.outputPath stored on the Session
 *   record in IndexedDB — NOT by reading chrome.storage.local at render time.
 *   The background reads refineOutputPath from chrome.storage.local during
 *   CREATE_SESSION and stores it on the session. Therefore, to make btn-publish
 *   appear in E2E tests, we must set chrome.storage.local.refineOutputPath
 *   BEFORE creating the session (done via page.evaluate in the fixture below).
 *
 * DEV CONTRACT:
 *   select-project-filter     — project filter <select> in SessionList
 *   btn-project-settings      — gear button (only visible when project selected)
 *   project-settings-container — root of ProjectSettings page
 *   btn-export-config         — export refine.project.json button
 *   btn-refresh-dashboard     — refresh dashboard HTML button
 *   btn-publish               — publish button in SessionDetail (requires outputPath)
 *   input-project-name        — project name input on NewSession form
 */

import { test, expect } from './fixtures/extension.fixture';
import { openTargetApp, stopAndOpenDetail } from './helpers/session';

const TEST_PROJECT = 'q505-test-project';
const TEST_OUTPUT_PATH = '/tmp/refine-q505-output';

test('Session with project name appears in project filter', async ({ context, extensionId }) => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState('networkidle');

  // Create session with project name
  await popupPage.getByTestId('btn-new-session').first().click();
  await popupPage.getByTestId('input-session-name').fill('Q505 Project Filter Session');
  await popupPage.getByTestId('input-project-name').fill(TEST_PROJECT);
  await popupPage.getByTestId('btn-start-recording').click();
  await popupPage.waitForTimeout(1500).catch(() => {});

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });
  await page.getByTestId('btn-stop').click();
  await expect(page.getByTestId('refine-control-bar')).not.toBeVisible({ timeout: 3000 });

  // Reload popup
  if (popupPage.isClosed()) {
    const p = await context.newPage();
    await p.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await p.waitForLoadState('networkidle');
    // Verify project appears in filter
    const select = p.getByTestId('select-project-filter');
    await expect(select).toBeVisible({ timeout: 3000 });
    await expect(p.locator(`option[value="${TEST_PROJECT}"]`)).toBeAttached({ timeout: 3000 });
  } else {
    await popupPage.bringToFront();
    await popupPage.reload();
    await popupPage.waitForLoadState('networkidle');
    const select = popupPage.getByTestId('select-project-filter');
    await expect(select).toBeVisible({ timeout: 3000 });
    await expect(popupPage.locator(`option[value="${TEST_PROJECT}"]`)).toBeAttached({ timeout: 3000 });
  }
});

test('Selecting a project in filter shows gear button, clicking opens ProjectSettings', async ({ context, extensionId }) => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState('networkidle');

  // Create session with project
  await popupPage.getByTestId('btn-new-session').first().click();
  await popupPage.getByTestId('input-session-name').fill('Q505 Gear Button Session');
  await popupPage.getByTestId('input-project-name').fill(TEST_PROJECT);
  await popupPage.getByTestId('btn-start-recording').click();
  await popupPage.waitForTimeout(1500).catch(() => {});

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });
  await page.getByTestId('btn-stop').click();
  await expect(page.getByTestId('refine-control-bar')).not.toBeVisible({ timeout: 3000 });

  // Re-open popup
  const popup = popupPage.isClosed() ? await context.newPage() : popupPage;
  if (popup.isClosed() || popup.url() === 'about:blank') {
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  } else {
    await popup.bringToFront();
    await popup.reload();
  }
  await popup.waitForLoadState('networkidle');

  // Gear button should NOT be visible when "All Projects" is selected
  await expect(popup.getByTestId('btn-project-settings')).not.toBeVisible();

  // Select the test project
  const select = popup.getByTestId('select-project-filter');
  await select.selectOption(TEST_PROJECT);

  // Gear button should now be visible
  await expect(popup.getByTestId('btn-project-settings')).toBeVisible({ timeout: 2000 });

  // Click gear → ProjectSettings opens
  await popup.getByTestId('btn-project-settings').click();
  await expect(popup.getByTestId('project-settings-container')).toBeVisible({ timeout: 3000 });

  // Both action buttons are present
  await expect(popup.getByTestId('btn-export-config')).toBeVisible();
  await expect(popup.getByTestId('btn-refresh-dashboard')).toBeVisible();
});

// BUG-EXT-002: Fixed in Sprint 07 (S07-21) — btn-publish now renders when session.outputPath is set.
test('btn-publish is visible in SessionDetail when outputPath is set via storage', async ({ context, extensionId }) => {
  // Set refineOutputPath in chrome.storage.local BEFORE creating the session
  // so the background attaches outputPath to the Session record at creation time.
  const setupPage = await context.newPage();
  await setupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await setupPage.waitForLoadState('networkidle');

  await setupPage.evaluate((outputPath) => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set({ refineOutputPath: outputPath }, () => resolve());
    });
  }, TEST_OUTPUT_PATH);

  // Now create the session — background will read refineOutputPath and store it
  await setupPage.getByTestId('btn-new-session').first().click();
  await setupPage.getByTestId('input-session-name').fill('Q505 Publish Button Session');
  await setupPage.getByTestId('input-project-name').fill(TEST_PROJECT);
  await setupPage.getByTestId('btn-start-recording').click();
  await setupPage.waitForTimeout(1500).catch(() => {});

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  const detail = await stopAndOpenDetail(page, setupPage, context, extensionId);

  // btn-publish should be visible because session.outputPath is set
  await expect(detail.getByTestId('btn-publish')).toBeVisible({ timeout: 3000 });

  // Clean up storage
  await detail.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.local.remove('refineOutputPath', () => resolve());
    });
  });
});

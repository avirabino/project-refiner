/**
 * Shared helper for creating a recording session via the popup UI.
 *
 * DEV CONTRACT — popup must implement these data-testid attributes:
 *   btn-new-session        — button on SessionList that opens NewSession form
 *   input-session-name     — text input for the session name
 *   btn-start-recording    — submit button that sends START_SESSION to background
 *   recording-status       — element showing current session status text
 *   session-list-item      — repeated element for each session in the list
 *
 * DEV CONTRACT — overlay (Shadow DOM) must implement:
 *   refine-control-bar     — root element of the floating control bar
 *   recording-indicator    — status dot / label inside the control bar
 *   btn-pause              — pause recording button
 *   btn-resume             — resume recording button
 *   btn-stop               — stop recording button
 *   btn-screenshot         — capture screenshot button
 *   btn-bug                — open bug editor button
 *
 * DEV CONTRACT — Shadow DOM:
 *   - Shadow root MUST be open mode (required for Playwright auto-piercing)
 *   - Host element appended to <body> — any selector is fine, testid on inner elements is sufficient
 *
 * DEV CONTRACT — Dexie database name: 'refine-db'
 *   Required for any page.evaluate() IndexedDB queries in specs.
 */

import { type BrowserContext, type Page } from '@playwright/test';

export interface SessionHandle {
  popupPage: Page;
  sessionName: string;
}

export async function createSession(
  context: BrowserContext,
  extensionId: string,
  sessionName: string = 'QA Test Session'
): Promise<SessionHandle> {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await popupPage.waitForLoadState('networkidle');

  await popupPage.getByTestId('btn-new-session').first().click();
  await popupPage.getByTestId('input-session-name').fill(sessionName);
  await popupPage.getByTestId('btn-start-recording').click();

  // Allow background to process — popup may close if it loses focus; that is normal
  try {
    await popupPage.waitForTimeout(1500);
  } catch {
    // popup closed — background already processed the message
  }

  return { popupPage, sessionName };
}

export async function getPopupPage(
  existingPage: Page,
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  if (!existingPage.isClosed()) return existingPage;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
  await page.waitForLoadState('networkidle');
  return page;
}

export async function openTargetApp(
  context: BrowserContext,
  path: string = ''
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`http://localhost:38470${path}`);
  await page.waitForLoadState('networkidle');
  return page;
}

// Sprint 02 helpers -------------------------------------------------------

/**
 * Assumed Dexie DB name. Update if DEV uses a different name in src/core/db.ts.
 * Used for page.evaluate() IndexedDB verification in Q205.
 */
export const DB_NAME = 'refine-db';

/**
 * Stops the active recording on targetPage, then opens (or re-opens) the popup
 * and navigates to the SessionDetail of the most recent session.
 *
 * DEV CONTRACT — SessionDetail must expose:
 *   session-detail-container  — root of the session detail view
 *   btn-back                  — returns to SessionList
 *   btn-download-report       — triggers JSON + MD report downloads
 *   btn-watch-replay          — opens replay.html in a new tab
 *   btn-export-playwright     — downloads regression.spec.ts
 *   btn-download-zip          — downloads refine-<id>.zip
 *   btn-delete-session        — opens delete confirmation
 *   confirm-delete            — confirms the delete action
 */
export async function stopAndOpenDetail(
  targetPage: Page,
  popupPage: Page,
  context: BrowserContext,
  extensionId: string
): Promise<Page> {
  const { expect } = await import('@playwright/test');

  await targetPage.getByTestId('btn-stop').click();
  await expect(targetPage.getByTestId('refine-control-bar')).not.toBeVisible({ timeout: 3000 });

  const popup = await getPopupPage(popupPage, context, extensionId);
  await popup.bringToFront();
  await popup.reload();
  await popup.waitForLoadState('networkidle');

  await popup.getByTestId('session-list-item').first().click();
  await expect(popup.getByTestId('session-detail-container')).toBeVisible({ timeout: 3000 });

  return popup;
}

/**
 * Awaits a file download triggered by calling triggerFn().
 * Returns the Playwright Download object for content inspection.
 */
export async function waitForDownload(
  page: Page,
  triggerFn: () => Promise<void>
): Promise<import('@playwright/test').Download> {
  const downloadPromise = page.waitForEvent('download');
  await triggerFn();
  return downloadPromise;
}

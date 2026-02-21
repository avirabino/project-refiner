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
 * DEV CONTRACT — Dexie database name: 'RefineDB'
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

  await popupPage.getByTestId('btn-new-session').click();
  await popupPage.getByTestId('input-session-name').fill(sessionName);
  await popupPage.getByTestId('btn-start-recording').click();

  // Allow background to acknowledge and content script to receive message
  await popupPage.waitForTimeout(1500);

  return { popupPage, sessionName };
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

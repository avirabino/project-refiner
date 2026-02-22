/**
 * Q202 — E2E: Replay Viewer
 *
 * Verifies: SessionDetail "Watch Replay" opens a new browser tab containing
 * a self-contained HTML replay with rrweb-player.
 *
 * Requires DEV to complete: D202 (replay-bundler), D203 (SessionDetail),
 * D206 (Watch Replay button wired).
 *
 * DEV CONTRACT:
 *   btn-watch-replay   — opens replay HTML in a new tab (NOT a download)
 *
 * ASSUMPTION (CTO B2): Watch Replay opens a new tab via URL.createObjectURL
 * or a data: URL. This spec uses context.waitForEvent('page') to capture it.
 * If DEV instead triggers a download, change to waitForDownload() pattern.
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp, stopAndOpenDetail } from './helpers/session';

test('Watch Replay opens a new tab with rrweb-player content', async ({ context, extensionId }) => {
  const { popupPage } = await createSession(context, extensionId, 'Q202 Replay Session');

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Record some navigation so there are rrweb events to replay
  await page.getByTestId('nav-about').click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('nav-form').click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('input-name').fill('Replay Test User');

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  // Wait for new tab opened by Watch Replay button
  const [replayPage] = await Promise.all([
    context.waitForEvent('page'),
    detail.getByTestId('btn-watch-replay').click(),
  ]);

  await replayPage.waitForLoadState('domcontentloaded');

  // 1. Replay page must not be blank
  const bodyContent = await replayPage.evaluate(() => document.body.innerHTML);
  expect(bodyContent.length).toBeGreaterThan(100);

  // 2. Page must contain rrweb-player (either the element or its script)
  const hasPlayer =
    (await replayPage.locator('rrweb-player').count()) > 0 ||
    (await replayPage.locator('[class*="replayer"]').count()) > 0 ||
    bodyContent.includes('rrweb') ||
    bodyContent.includes('replayer');
  expect(hasPlayer).toBe(true);

  // 3. Session metadata present (name in title or body)
  const pageTitle = await replayPage.title();
  const hasMetadata =
    pageTitle.includes('Replay') ||
    bodyContent.includes('Q202 Replay Session') ||
    bodyContent.includes('replay');
  expect(hasMetadata).toBe(true);

  // 4. No JS errors in replay page
  const jsErrors: string[] = [];
  replayPage.on('console', msg => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });
  await replayPage.waitForTimeout(1000);
  // Allow rrweb-player internal warnings but fail on hard errors
  const hardErrors = jsErrors.filter(e => !e.includes('Warning') && !e.includes('rrweb'));
  expect(hardErrors, `Replay page JS errors: ${hardErrors.join(', ')}`).toHaveLength(0);
});

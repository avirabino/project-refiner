/**
 * Q202 — E2E: Replay Viewer (Download)
 *
 * Verifies: SessionDetail "Download Replay" downloads a self-contained HTML
 * file containing rrweb-player and session events.
 *
 * DEV CONTRACT:
 *   btn-watch-replay   — triggers download of replay-<id>.html
 *
 * NOTE: Originally opened a new tab via blob:chrome-extension:// URL, but
 * MV3 CSP blocks inline <script> tags in extension-origin tabs. Changed to
 * download pattern (S02 CSP fix, 2026-02-22). Sprint 03 will build a proper
 * CSP-compliant extension replay page (s03-replay-csp).
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp, stopAndOpenDetail, waitForDownload } from './helpers/session';

test('Download Replay produces a valid self-contained HTML file', async ({ context, extensionId }) => {
  const { popupPage } = await createSession(context, extensionId, 'Q202 Replay Session');

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Record some interaction so there are rrweb events to bundle
  await page.getByTestId('nav-about').click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('nav-form').click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('input-name').fill('Replay Test User');

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  const download = await waitForDownload(detail, () =>
    detail.getByTestId('btn-watch-replay').click()
  );

  // 1. Filename must match replay-<session-id>.html pattern
  expect(download.suggestedFilename()).toMatch(/^replay-.+\.html$/);

  // 2. File must have non-zero size
  const filePath = await download.path();
  expect(filePath).toBeTruthy();

  if (filePath) {
    const { statSync, readFileSync } = await import('fs');
    const stats = statSync(filePath);
    // Replay HTML must be at least 10 KB (rrweb-player UMD alone is ~200 KB)
    expect(stats.size).toBeGreaterThan(10_000);

    // Must contain rrweb-player markers and session name
    const html = readFileSync(filePath, 'utf-8');
    expect(html).toContain('rrweb');
    expect(html).toContain('Q202 Replay Session');
  }
});

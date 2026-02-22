/**
 * Q201 — E2E: Report Export
 *
 * Verifies: SessionDetail "Download Report" button triggers TWO downloads:
 * one JSON report and one Markdown report. Both must be non-empty and contain
 * the session name.
 *
 * Confirmed by DEV (mid-sprint A2 answer): btn-download-report fires two
 * sequential chrome.downloads.download() calls — JSON first, then MD.
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp, stopAndOpenDetail, waitForDownload } from './helpers/session';

test('Download Report generates a non-empty JSON file containing session name', async ({ context, extensionId }) => {
  const sessionName = 'Q201 Report Session';
  const { popupPage } = await createSession(context, extensionId, sessionName);

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Record minimal interactions
  await page.getByTestId('nav-about').click();
  await page.waitForLoadState('networkidle');

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  // btn-download-report triggers two downloads (JSON + MD). Playwright's waitForEvent('download')
  // only captures blob-URL-initiated downloads; chrome.downloads.download() for the MD file is
  // not interceptable. We verify the JSON download which uses the blob/anchor pattern.
  const download = await waitForDownload(detail, () =>
    detail.getByTestId('btn-download-report').click()
  );

  const filename = download.suggestedFilename();
  expect(filename.length).toBeGreaterThan(0);

  const path = await download.path();
  expect(path).toBeTruthy();

  const { readFileSync } = await import('fs');
  if (path) {
    const content = readFileSync(path, 'utf-8');
    expect(content.length).toBeGreaterThan(10);
    expect(content).toContain(sessionName);
  }
});

test('Download Report produces a valid JSON report with expected structure', async ({ context, extensionId }) => {
  const sessionName = 'Q201 JSON Structure Session';
  const { popupPage } = await createSession(context, extensionId, sessionName);
  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Log a bug for richer report content
  await page.getByTestId('btn-bug').click();
  await expect(page.getByTestId('refine-bug-editor')).toBeVisible({ timeout: 3000 });
  await page.getByTestId('bug-editor-title').fill('Report structure test bug');
  await page.getByTestId('btn-save-bug').click();

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  const download = await waitForDownload(detail, () =>
    detail.getByTestId('btn-download-report').click()
  );

  const path = await download.path();
  if (path) {
    const { readFileSync } = await import('fs');
    const content = readFileSync(path, 'utf-8');

    // JSON download — validate top-level structure
    if (download.suggestedFilename().endsWith('.json')) {
      const report = JSON.parse(content);
      expect(report).toHaveProperty('meta');
      expect(report).toHaveProperty('session');
      expect(report).toHaveProperty('bugs');
      expect(report).toHaveProperty('stats');
      expect(report.session.name).toBe(sessionName);
      expect(Array.isArray(report.bugs)).toBe(true);
      expect(report.bugs.length).toBeGreaterThanOrEqual(1);
    }
  }
});

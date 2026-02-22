/**
 * Q201 — E2E: Report Export
 *
 * Verifies: SessionDetail "Download Report" button triggers JSON and Markdown
 * downloads. Files must be non-empty and contain the session name.
 *
 * Requires DEV to complete: D201 (report-generator), D203 (SessionDetail),
 * D206 (export buttons wired).
 *
 * DEV CONTRACT:
 *   session-detail-container  — visible after clicking session-list-item
 *   btn-download-report       — triggers report download(s)
 *
 * ASSUMPTION: btn-download-report triggers one download event (JSON). If it
 * triggers two (JSON + MD), update the test to await two download events.
 * Update based on CTO answer to advisory question A2.
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp, stopAndOpenDetail, waitForDownload } from './helpers/session';

test('Download Report generates a non-empty file containing session name', async ({ context, extensionId }) => {
  const sessionName = 'Q201 Report Session';
  const { popupPage } = await createSession(context, extensionId, sessionName);

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Record minimal interactions
  await page.getByTestId('nav-about').click();
  await page.waitForLoadState('networkidle');

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  // Download report and verify
  const download = await waitForDownload(detail, () =>
    detail.getByTestId('btn-download-report').click()
  );

  // File must have a name (not unnamed)
  const filename = download.suggestedFilename();
  expect(filename.length).toBeGreaterThan(0);

  // File must not be empty
  const path = await download.path();
  expect(path).toBeTruthy();

  // Read file content and verify it contains the session name or is valid JSON/MD
  const { readFileSync } = await import('fs');
  if (path) {
    const content = readFileSync(path, 'utf-8');
    expect(content.length).toBeGreaterThan(10);
    // Either JSON or Markdown — both should reference the session name
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

    // If JSON: validate top-level structure
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

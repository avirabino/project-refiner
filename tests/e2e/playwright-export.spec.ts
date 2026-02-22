/**
 * Q203 — E2E: Playwright Codegen Export
 *
 * Verifies: SessionDetail "Export Playwright" downloads a valid TypeScript
 * .spec.ts file containing page.goto, page.click/fill actions, and // BUG:
 * comments at bug-logged positions.
 *
 * Requires DEV to complete: D204 (playwright-codegen), D203 (SessionDetail),
 * D206 (Export Playwright button wired).
 *
 * DEV CONTRACT:
 *   btn-export-playwright  — downloads regression.spec.ts
 *
 * Note: The "bonus" validation (running the exported spec against the target
 * app) is tested in the second test case below. It requires the exported
 * spec to use selectors from the QA target app which are stable.
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp, stopAndOpenDetail, waitForDownload } from './helpers/session';

test('Export Playwright downloads a .spec.ts with expected Playwright commands and bug comments', async ({ context, extensionId }) => {
  const sessionName = 'Q203 Playwright Export Session';
  const { popupPage } = await createSession(context, extensionId, sessionName);

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Record meaningful interactions across multiple pages
  await page.getByTestId('nav-about').click();
  await page.waitForLoadState('networkidle');

  await page.getByTestId('nav-form').click();
  await page.waitForLoadState('networkidle');

  await page.getByTestId('input-name').fill('Export Test User');
  await page.getByTestId('input-email').fill('test@example.com');

  // Log a bug — must appear as // BUG: comment in exported spec
  await page.getByTestId('btn-bug').click();
  await expect(page.getByTestId('refine-bug-editor')).toBeVisible({ timeout: 3000 });
  await page.getByTestId('bug-editor-title').fill('Submit button misaligned');
  await page.getByTestId('btn-save-bug').click();
  await expect(page.getByTestId('refine-bug-editor')).not.toBeVisible({ timeout: 3000 });

  await page.getByTestId('btn-submit').click();

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  // Download the exported Playwright spec
  const download = await waitForDownload(detail, () =>
    detail.getByTestId('btn-export-playwright').click()
  );

  const filename = download.suggestedFilename();
  expect(filename).toMatch(/\.spec\.ts$/);

  const path = await download.path();
  expect(path).toBeTruthy();

  if (path) {
    const { readFileSync } = await import('fs');
    const content = readFileSync(path, 'utf-8');

    // Must contain Playwright imports
    expect(content).toContain("from '@playwright/test'");

    // Must contain a test() function
    expect(content).toMatch(/test\(.*async.*\{/);

    // Must contain page.goto with the target app URL
    expect(content).toContain('page.goto');
    expect(content).toContain('localhost:38470');

    // Must contain click or fill actions from our recording
    const hasActions = content.includes('page.click') || content.includes('page.fill');
    expect(hasActions).toBe(true);

    // Bug comment must be present
    expect(content).toContain('// BUG:');
    expect(content).toContain('Submit button misaligned');
  }
});

test('Exported .spec.ts is syntactically valid TypeScript', async ({ context, extensionId }) => {
  const { popupPage } = await createSession(context, extensionId, 'Q203 TypeScript Validity Session');
  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  await page.getByTestId('nav-about').click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('input-name').fill('TS validity test');
  await page.waitForLoadState('networkidle');

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  const download = await waitForDownload(detail, () =>
    detail.getByTestId('btn-export-playwright').click()
  );

  const path = await download.path();
  if (path) {
    // Write to a temp location and run tsc on it
    const { readFileSync, writeFileSync } = await import('fs');
    const { execSync } = await import('child_process');
    const { tmpdir } = await import('os');
    const { join } = await import('path');

    const content = readFileSync(path, 'utf-8');
    const tmpPath = join(tmpdir(), 'exported-spec.ts');
    writeFileSync(tmpPath, content, 'utf-8');

    // tsc --noEmit --strict false --target ES2020 --module commonjs
    // Wrap in try/catch — report content if it fails
    let tscError = '';
    try {
      execSync(`npx tsc --noEmit --allowJs --target ES2020 --moduleResolution node ${tmpPath}`, {
        cwd: process.cwd(),
        encoding: 'utf-8',
        timeout: 15000,
      });
    } catch (e: unknown) {
      tscError = e instanceof Error ? e.message : String(e);
    }

    expect(tscError, `TypeScript compile error in exported spec:\n${tscError}`).toBe('');
  }
});

import { test, expect } from './fixtures/extension.fixture';

test('extension stays active across target app page navigations', async ({ context }) => {
  const page = await context.newPage();
  const consoleMessages: string[] = [];

  page.on('console', msg => {
    consoleMessages.push(msg.text());
  });

  // Home page
  await page.goto('http://localhost:38470');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/localhost:38470/);
  await expect(page.getByTestId('hero-cta')).toBeVisible();

  // Navigate to About
  await page.getByTestId('nav-about').click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/about/);
  await expect(page.getByTestId('nav-home').first()).toBeVisible();

  // Navigate to Form
  await page.getByTestId('nav-form').click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/form/);
  await expect(page.getByTestId('btn-submit')).toBeVisible();

  // Navigate back to Home
  await page.getByTestId('nav-home').click();
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/localhost:38470/);

  // Verify no extension errors in console (no "[Vigil] ERROR" messages)
  const extensionErrors = consoleMessages.filter(m => m.includes('[Vigil] ERROR'));
  expect(extensionErrors, `Unexpected extension errors: ${JSON.stringify(extensionErrors)}`).toHaveLength(0);
});

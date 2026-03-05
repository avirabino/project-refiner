import { test, expect } from './fixtures/extension.fixture';

test('content script injects on QA target app and logs to console', async ({ context }) => {
  const page = await context.newPage();
  const consoleMessages: string[] = [];

  page.on('console', msg => {
    consoleMessages.push(msg.text());
  });

  await page.goto('http://localhost:38470');
  await page.waitForTimeout(1500);

  const injected = consoleMessages.some(m => m.includes('[Vigil] Content script loaded'));
  expect(injected, `Expected "[Vigil] Content script loaded" in console. Got: ${JSON.stringify(consoleMessages)}`).toBe(true);
});

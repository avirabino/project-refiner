
import { test, expect } from './fixtures/extension.fixture';
import { openTargetApp } from './helpers/session';

test('control bar appears after starting session', async ({ context, extensionId }) => {
  // 1. Open target app first (simulate user browsing before extension interaction)
  const page = await openTargetApp(context);
  const targetUrl = page.url();

  // Monitor console logs to debug injection/messaging issues
  page.on('console', msg => console.log(`[Target Page] ${msg.text()}`));

  // Fetch the real Tab ID of the target page using the background worker
  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  
  const realTabId = await worker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({ url });
    return tabs[0]?.id;
  }, targetUrl);

  console.log(`[Test] Target Page Tab ID: ${realTabId}`);

  // 2. Open extension popup (simulating side panel/popup interaction)
  const popupPage = await context.newPage();
  
  // Mock chrome.tabs.query to return the target page (simulating side panel behavior)
  await popupPage.addInitScript(({ targetUrl, realTabId }) => {
    const originalQuery = chrome.tabs.query;
    (chrome.tabs as any).query = (queryInfo: any, callback: any) => {
      // If querying for active tab, return our mock target
      if (queryInfo.active) {
        const mockTab = {
          id: realTabId, // Use the REAL tab ID so background sends messages to the correct place
          url: targetUrl,
          windowId: 1,
          active: true,
          index: 0,
          pinned: false,
          highlighted: true,
          incognito: false,
          selected: true,
          discarded: false,
          autoDiscardable: false,
          groupId: -1
        };
        callback([mockTab]);
        return;
      }
      originalQuery(queryInfo, callback);
    };
  }, { targetUrl, realTabId });

  await popupPage.goto(`chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`);
  await popupPage.waitForLoadState('networkidle');

  // 3. Start New Session
  await popupPage.getByTestId('btn-new-session').first().click();
  
  // Verify the form detected the correct URL
  const urlDisplay = popupPage.getByTitle(targetUrl);
  await expect(urlDisplay).toBeVisible();

  await popupPage.getByTestId('input-project-name').fill('C:\\E2E\\test-project');
  await popupPage.getByTestId('input-session-name').fill('Repro Missing Control Bar');
  await popupPage.getByTestId('btn-start-recording').click();

  // 4. Verify Control Bar appears on the target page
  // This asserts that:
  // a) Background received CREATE_SESSION
  // b) Background identified the correct tab
  // c) Background sent START_RECORDING
  // d) Content script received it (or was auto-injected and then received it)
  // e) Overlay was mounted
  const controlBar = page.getByTestId('refine-control-bar');
  await expect(controlBar).toBeVisible({ timeout: 10000 });
  
  // 5. Verify status is RECORDING
  await expect(page.getByTestId('recording-indicator')).toContainText('RECORDING');
});

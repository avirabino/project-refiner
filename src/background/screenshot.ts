/**
 * @file screenshot.ts
 * @description Screenshot capture via chrome.tabs.captureVisibleTab().
 * Stores PNG data URLs in Dexie. Compression (JPEG 80%) is a Sprint 02 optimization.
 */

import { generateScreenshotId } from '@shared/utils';
import type { Screenshot } from '@shared/types';
import { addScreenshot, updateSession, getSession } from '@core/db';

export async function captureScreenshot(
  sessionId: string,
  tabId?: number
): Promise<Screenshot> {
  const tab = tabId ? await chrome.tabs.get(tabId).catch(() => undefined) : undefined;
  const windowId = tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
  const url = tab?.url ?? 'unknown';

  // Ensure the target tab is active so captureVisibleTab captures the right window
  if (tabId && tab) {
    await chrome.tabs.update(tabId, { active: true }).catch(() => {});
    // Brief settle to let Chrome activate the tab
    await new Promise<void>((r) => setTimeout(r, 150));
  }

  const dataUrl = await new Promise<string>((resolve) => {
    chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 80 }, (result) => {
      if (chrome.runtime.lastError || !result) {
        console.warn('[Vigil] captureVisibleTab unavailable:', chrome.runtime.lastError?.message ?? 'empty result');
        // Fallback: store a 1×1 placeholder so the session screenshot count is still recorded
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      } else {
        resolve(result);
      }
    });
  });

  const dimensions = await inferDimensions(dataUrl);

  const screenshot: Screenshot = {
    id: generateScreenshotId(),
    sessionId,
    dataUrl,
    url,
    timestamp: Date.now(),
    width: dimensions.width,
    height: dimensions.height,
  };

  await addScreenshot(screenshot);

  const session = await getSession(sessionId);
  if (session) {
    await updateSession(sessionId, { screenshotCount: session.screenshotCount + 1 });
  }

  console.log('[Vigil] Screenshot captured:', screenshot.id);
  return screenshot;
}

async function inferDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  try {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const view = new DataView(bytes.buffer);
    if (
      view.getUint8(0) === 0x89 &&
      view.getUint8(1) === 0x50 // PNG magic
    ) {
      return {
        width: view.getUint32(16),
        height: view.getUint32(20),
      };
    }
  } catch {
    // ignore
  }
  return { width: 0, height: 0 };
}

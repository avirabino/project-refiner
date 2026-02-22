/**
 * @file shortcuts.ts
 * @description Keyboard shortcut handler for chrome.commands API.
 * Commands are declared in manifest.json under "commands".
 */

import { sessionManager } from './session-manager';
import { captureScreenshot } from './screenshot';
import { MessageType } from '@shared/types';

export function initShortcuts(): void {
  chrome.commands.onCommand.addListener(async (command) => {
    console.log('[Refine] Command received:', command);

    switch (command) {
      case 'toggle-recording': {
        if (sessionManager.isRecording()) {
          await sessionManager.pauseSession().catch((e) =>
            console.warn('[Refine] Shortcut pause failed:', e)
          );
        } else if (sessionManager.getStatus() === 'PAUSED') {
          await sessionManager.resumeSession().catch((e) =>
            console.warn('[Refine] Shortcut resume failed:', e)
          );
        }
        // No active session → no-op
        break;
      }

      case 'capture-screenshot': {
        const sessionId = sessionManager.getActiveSessionId();
        if (!sessionId) break;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        await captureScreenshot(sessionId, tabId).catch((e) =>
          console.warn('[Refine] Shortcut screenshot failed:', e)
        );
        break;
      }

      case 'open-bug-editor': {
        const sessionId = sessionManager.getActiveSessionId();
        if (!sessionId) break;
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tabId = tabs[0]?.id;
        if (!tabId) break;
        chrome.tabs.sendMessage(tabId, {
          type: MessageType.LOG_BUG,
          payload: { openEditor: true },
          source: 'background',
        }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[Refine] Shortcut open-bug-editor failed:', chrome.runtime.lastError.message);
          }
        });
        break;
      }
    }
  });
}

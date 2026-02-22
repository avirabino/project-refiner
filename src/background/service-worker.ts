/**
 * @file service-worker.ts
 * @description Background service worker for SynaptixLabs Refine.
 * Wires: message router, keep-alive alarm listener, session manager.
 */

import { handleMessage } from './message-handler';
import { initKeepAliveListener } from './keep-alive';
import { initShortcuts } from './shortcuts';
import { sessionManager } from './session-manager';

console.log('[Refine] Background service worker initialized.');

// Route all incoming messages through the type-safe handler
chrome.runtime.onMessage.addListener(handleMessage);

// Start keep-alive alarm listener (alarm itself is created on session start)
initKeepAliveListener();

// Wire keyboard shortcuts (Ctrl+Shift+R/S/B)
initShortcuts();

// DR-04: Use tabs API to detect full-page navigations — replaces unreliable document.referrer
// When a tab completes loading during an active session, notify the content script
// so it can record an accurate cross-page navigation action.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!sessionManager.isRecording()) return;
  if (!tab.url || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('chrome://')) return;
  chrome.tabs.sendMessage(
    tabId,
    { type: 'BACKGROUND_NAV', payload: { url: tab.url }, source: 'background' },
    () => { if (chrome.runtime.lastError) { /* content script not yet ready — ok */ } }
  );
});

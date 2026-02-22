/**
 * @file service-worker.ts
 * @description Background service worker for SynaptixLabs Refine.
 * Wires: message router, keep-alive alarm listener, session manager.
 */

import { handleMessage } from './message-handler';
import { initKeepAliveListener } from './keep-alive';
import { initShortcuts } from './shortcuts';

console.log('[Refine] Background service worker initialized.');

// Route all incoming messages through the type-safe handler
chrome.runtime.onMessage.addListener(handleMessage);

// Start keep-alive alarm listener (alarm itself is created on session start)
initKeepAliveListener();

// Wire keyboard shortcuts (Ctrl+Shift+R/S/B)
initShortcuts();

/**
 * @file service-worker.ts
 * @description Background service worker for SynaptixLabs Refine.
 * Manages extension lifecycle, cross-context messaging, and core state.
 */

// Initialize background script
console.log('[Refine] Background service worker initialized.');

// Listen for messages from popup or content scripts
// chrome.runtime is scoped to background — NOT imported from shared/
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Refine] Received message:', message.type, { payload: message.payload });

  // Acknowledge receipt
  sendResponse({ ok: true, data: { received: message.type } });
});

// TODO: keep-alive (Sprint 01)
// MV3 service workers shut down after ~30s of inactivity.
// We will need to implement a keep-alive mechanism using chrome.alarms.

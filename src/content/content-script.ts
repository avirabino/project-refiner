/**
 * @file content-script.ts
 * @description Content script injected into the target page.
 * Wires: rrweb recorder, background message listener, navigation detection, Shadow DOM overlay.
 */

import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  handleNavigation,
} from './recorder';
import { mountOverlay, unmountOverlay } from './overlay/mount';

console.log(`[Refine] Content script loaded on: ${window.location.href}`);

// ── On-load: resume recording if a session is already active ─────────────────

chrome.runtime.sendMessage(
  { type: 'GET_SESSION_STATUS', source: 'content' },
  (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.ok && response.data?.isRecording && response.data?.sessionId) {
      startRecording(response.data.sessionId as string);
      mountOverlay(response.data.sessionId as string);
      chrome.runtime.sendMessage({
        type: 'SESSION_STATUS_UPDATE',
        payload: { url: window.location.href },
        source: 'content',
      });
    }
  }
);

// ── Message listener (commands from background) ───────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case 'START_RECORDING': {
      const { sessionId } = payload as { sessionId: string };
      startRecording(sessionId);
      mountOverlay(sessionId);
      sendResponse({ ok: true });
      break;
    }
    case 'PAUSE_RECORDING':
      pauseRecording();
      sendResponse({ ok: true });
      break;
    case 'RESUME_RECORDING':
      resumeRecording();
      sendResponse({ ok: true });
      break;
    case 'STOP_RECORDING':
      stopRecording();
      unmountOverlay();
      sendResponse({ ok: true });
      break;
    default:
      break;
  }
  return false;
});

// ── SPA navigation detection (history API) ────────────────────────────────────

let lastUrl = window.location.href;

const observer = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    handleNavigation(currentUrl);
    lastUrl = currentUrl;
  }
});

observer.observe(document.body, { subtree: true, childList: true });

// Also catch popstate (back/forward navigation)
window.addEventListener('popstate', () => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    handleNavigation(currentUrl);
    lastUrl = currentUrl;
  }
});

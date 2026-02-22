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
  recordCrossPageNavigation,
} from './recorder';
import { mountOverlay, unmountOverlay } from './overlay/mount';

console.log(`[Refine] Content script loaded on: ${window.location.href}`);

// ── On-load: resume recording if a session is already active ─────────────────

chrome.runtime.sendMessage(
  { type: 'GET_SESSION_STATUS', source: 'content' },
  (response) => {
    if (chrome.runtime.lastError) return;
    if (response?.ok && response.data?.isRecording && response.data?.sessionId) {
      const sid = response.data.sessionId as string;
      startRecording(sid);
      mountOverlay(sid);
      // DR-04: use background-tracked lastPageUrl — more reliable than document.referrer
      const fromUrl = response.data.lastPageUrl as string | null;
      const toUrl = window.location.href;
      if (fromUrl && fromUrl !== toUrl) {
        recordCrossPageNavigation(sid, fromUrl, toUrl);
      }
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

// ── SPA navigation detection ─────────────────────────────────────────────────
// B17: Use lightweight setInterval polling instead of MutationObserver(subtree)
// which fires hundreds of times per second on React/SPA pages.

let lastUrl = window.location.href;

setInterval(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    handleNavigation(currentUrl);
    lastUrl = currentUrl;
  }
}, 500);

// popstate catches immediate back/forward browser navigation
window.addEventListener('popstate', () => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    handleNavigation(currentUrl);
    lastUrl = currentUrl;
  }
});

// ── Keyboard shortcut fallback (for Playwright automation and headless mode) ──
// chrome.commands.onCommand cannot be triggered by Playwright keyboard events.
// These DOM-level listeners mirror the manifest command behaviour by
// programmatically clicking the corresponding overlay control-bar buttons.

function getShadowRoot(): ShadowRoot | null {
  return (document.getElementById('refine-root') as HTMLElement & { shadowRoot: ShadowRoot | null })?.shadowRoot ?? null;
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (!e.ctrlKey || !e.shiftKey) return;

  const root = getShadowRoot();
  if (!root) return;

  if (e.key === 'S') {
    e.preventDefault();
    (root.querySelector('[data-testid="btn-screenshot"]') as HTMLButtonElement | null)?.click();
  } else if (e.key === 'B') {
    e.preventDefault();
    (root.querySelector('[data-testid="btn-bug"]') as HTMLButtonElement | null)?.click();
  } else if (e.key === 'R') {
    e.preventDefault();
    const btnPause = root.querySelector('[data-testid="btn-pause"]') as HTMLButtonElement | null;
    const btnResume = root.querySelector('[data-testid="btn-resume"]') as HTMLButtonElement | null;
    (btnPause ?? btnResume)?.click();
  }
}, { capture: true });

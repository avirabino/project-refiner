/**
 * @file mount.ts
 * @description Mounts the Refine React overlay inside an isolated Shadow DOM.
 * Creates #refine-root → shadow root → React tree. Tears down on unmount.
 *
 * Sprint 07: Also mounts the light DOM annotation canvas (SVG) and
 * initializes annotation state for the session.
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ControlBar from './ControlBar';
import overlayStyles from '../styles/overlay.css?inline';
import { mountAnnotationCanvas, unmountAnnotationCanvas } from '../annotation-canvas';
import { initAnnotationState, destroyAnnotationState } from '../annotation-state';

let hostElement: HTMLDivElement | null = null;
let reactRoot: Root | null = null;
let overlayObserver: MutationObserver | null = null;

interface OverlayOptions {
  sessionName?: string;
}

export function isOverlayMounted(): boolean {
  return document.getElementById('refine-root') !== null;
}

export function mountOverlay(sessionId: string, options: OverlayOptions = {}): void {
  // BUG-030: Check actual DOM presence, not just variable — hostElement can go stale
  // after window.open() popup steals and returns focus
  if (isOverlayMounted()) return;

  // Clear stale references if the DOM element was removed but variables weren't cleaned
  if (hostElement) {
    reactRoot?.unmount();
    reactRoot = null;
    hostElement = null;
  }

  hostElement = document.createElement('div');
  hostElement.id = 'refine-root';
  hostElement.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; pointer-events: none;';

  // GOD MODE: Stop ALL mouse/pointer/keyboard events from propagating to the
  // host page. Without this, clicks on Vigil UI (bug editor, annotations)
  // bubble through #refine-root to the page, triggering "click outside"
  // listeners that close the app's popups/modals.
  const stopPropagation = (e: Event) => e.stopPropagation();
  for (const eventType of [
    'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
    'pointerdown', 'pointerup', 'pointerover', 'pointerout',
    'touchstart', 'touchend', 'touchmove',
    'keydown', 'keyup', 'keypress',
    'focusin', 'focusout', 'focus', 'blur',
    'input', 'change',
    'contextmenu', 'wheel',
  ]) {
    hostElement.addEventListener(eventType, stopPropagation, true);
  }

  const shadow = hostElement.attachShadow({ mode: 'open' });

  // Inject scoped styles into Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = overlayStyles;
  shadow.appendChild(styleEl);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  document.body.appendChild(hostElement);

  reactRoot = createRoot(mountPoint);
  reactRoot.render(
    React.createElement(ControlBar, {
      sessionId,
      sessionName: options.sessionName ?? sessionId,
      onStop: unmountOverlay,
    })
  );

  // Sprint 07: Mount annotation canvas (light DOM) + init state
  mountAnnotationCanvas();
  initAnnotationState(sessionId);

  // BUG-032: Start MutationObserver to keep overlay on top of app modals (GOD MODE)
  startOverlayObserver();

  console.log('[Vigil] Overlay mounted for session:', sessionId);
}

export function unmountOverlay(): void {
  // BUG-032: Tear down GOD MODE observer
  stopOverlayObserver();

  // Sprint 07: Tear down annotations first
  destroyAnnotationState();
  unmountAnnotationCanvas();

  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
  }
  console.log('[Vigil] Overlay unmounted');
}

/**
 * BUG-032: Re-append #refine-root as the last child of document.body so it
 * renders on top of any modals/overlays the page has added. Safe to call at
 * any time — no-ops if already last or not mounted.
 */
export function resurfaceOverlay(): void {
  const el = document.getElementById('refine-root');
  if (!el) return;
  if (document.body.lastElementChild !== el) {
    document.body.appendChild(el); // moves existing node to the end
    console.log('[Vigil] BUG-032: Resurfaced control bar overlay');
  }
}

// ── BUG-032: MutationObserver — keep overlay as last body child (GOD MODE) ──

function startOverlayObserver(): void {
  stopOverlayObserver(); // ensure no duplicate

  overlayObserver = new MutationObserver((mutations) => {
    // Only act when nodes were actually added (modals, dialogs, overlays)
    const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
    if (!hasAddedNodes) return;

    const el = document.getElementById('refine-root');
    if (!el) return;

    // Re-append only when we're no longer the last child
    if (document.body.lastElementChild !== el) {
      document.body.appendChild(el);
    }
  });

  overlayObserver.observe(document.body, { childList: true });
}

function stopOverlayObserver(): void {
  if (overlayObserver) {
    overlayObserver.disconnect();
    overlayObserver = null;
  }
}

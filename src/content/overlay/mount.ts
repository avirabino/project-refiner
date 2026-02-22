/**
 * @file mount.ts
 * @description Mounts the Refine React overlay inside an isolated Shadow DOM.
 * Creates #refine-root → shadow root → React tree. Tears down on unmount.
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ControlBar from './ControlBar';
import overlayStyles from '../styles/overlay.css?inline';

let hostElement: HTMLDivElement | null = null;
let reactRoot: Root | null = null;

interface OverlayOptions {
  sessionName?: string;
}

export function mountOverlay(sessionId: string, options: OverlayOptions = {}): void {
  if (hostElement) return; // already mounted

  hostElement = document.createElement('div');
  hostElement.id = 'refine-root';
  hostElement.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';

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

  console.log('[Refine] Overlay mounted for session:', sessionId);
}

export function unmountOverlay(): void {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
  }
  console.log('[Refine] Overlay unmounted');
}

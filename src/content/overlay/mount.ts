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

interface OverlayOptions {
  sessionName?: string;
}

export function mountOverlay(sessionId: string, options: OverlayOptions = {}): void {
  if (hostElement) return; // already mounted

  hostElement = document.createElement('div');
  hostElement.id = 'refine-root';
  hostElement.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; pointer-events: none;';

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

  console.log('[Vigil] Overlay mounted for session:', sessionId);
}

export function unmountOverlay(): void {
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

/**
 * @file inspector.ts
 * @description R023: Element inspector mode. Highlights hovered elements and
 * captures their selectors on click without firing the original click event.
 * Activated/deactivated via the custom DOM event `refine:toggle-inspector`.
 */

import { MessageType } from '@shared/types';
import type { InspectedElement } from '@shared/types';
import { getBestSelector } from './selector-engine';
import { safeSendMessage } from './safe-message';

const HIGHLIGHT_STYLE = 'outline: 2px solid #6366f1 !important; outline-offset: 1px !important;';

let active = false;
let lastHighlighted: Element | null = null;

function onMouseOver(e: MouseEvent): void {
  const target = e.target as Element;
  if (!target || target.closest('#refine-root')) return;

  if (lastHighlighted && lastHighlighted !== target) {
    (lastHighlighted as HTMLElement).style.removeProperty('outline');
    (lastHighlighted as HTMLElement).style.removeProperty('outline-offset');
  }

  (target as HTMLElement).style.cssText += HIGHLIGHT_STYLE;
  lastHighlighted = target;
}

function onMouseOut(e: MouseEvent): void {
  const target = e.target as Element;
  if (target && !target.closest('#refine-root')) {
    (target as HTMLElement).style.removeProperty('outline');
    (target as HTMLElement).style.removeProperty('outline-offset');
  }
}

function onClick(e: MouseEvent): void {
  const target = e.target as Element;
  if (!target || target.closest('#refine-root')) return;

  e.preventDefault();
  e.stopPropagation();

  const { selector } = getBestSelector(target);
  const sessionId = (window as typeof window & { __refineSessionId?: string }).__refineSessionId;
  if (!sessionId) {
    console.warn('[Vigil] Inspector: no active sessionId on window');
    return;
  }

  const el: InspectedElement = {
    id: `insp-${crypto.randomUUID().split('-')[0]}`,
    sessionId,
    selector,
    url: window.location.href,
    tagName: target.tagName.toLowerCase(),
    timestamp: Date.now(),
  };

  console.log(`[Vigil] Inspector: ${selector}`);
  safeSendMessage({ type: MessageType.LOG_INSPECTOR_ELEMENT, payload: el, source: 'content' });
}

function startInspector(): void {
  if (active) return;
  active = true;
  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
  console.log('[Vigil] Inspector activated');
}

function stopInspector(): void {
  if (!active) return;
  active = false;
  document.removeEventListener('mouseover', onMouseOver, true);
  document.removeEventListener('mouseout', onMouseOut, true);
  document.removeEventListener('click', onClick, true);

  if (lastHighlighted) {
    (lastHighlighted as HTMLElement).style.removeProperty('outline');
    (lastHighlighted as HTMLElement).style.removeProperty('outline-offset');
    lastHighlighted = null;
  }
  console.log('[Vigil] Inspector deactivated');
}

export function isInspectorActive(): boolean {
  return active;
}

// Listen for toggle events dispatched from ControlBar
window.addEventListener('refine:toggle-inspector', (e: Event) => {
  const detail = (e as CustomEvent<{ active: boolean; sessionId: string }>).detail;
  (window as typeof window & { __refineSessionId?: string }).__refineSessionId = detail.sessionId;
  if (detail.active) {
    startInspector();
  } else {
    stopInspector();
  }
});

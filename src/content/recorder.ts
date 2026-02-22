/**
 * @file recorder.ts
 * @description rrweb recorder wrapper. Buffers events and flushes to background.
 * Handles start/pause/stop/resume lifecycle.
 */

import { record } from 'rrweb';
import { MessageType } from '@shared/types';
import type { RecordingChunk, Action } from '@shared/types';
import { createNavigationAction } from './action-extractor';
import { getBestSelector } from './selector-engine';
import { SESSION_ID_FORMAT } from '@shared/constants';

const MAX_BUFFER_EVENTS = 500;
const MAX_BUFFER_BYTES = 5 * 1024 * 1024; // 5MB

interface RecorderState {
  sessionId: string | null;
  isRecording: boolean;
  isPaused: boolean;
  stopFn: (() => void) | null;
  eventBuffer: unknown[];
  bufferBytes: number;
  chunkIndex: number;
  lastUrl: string;
}

const state: RecorderState = {
  sessionId: null,
  isRecording: false,
  isPaused: false,
  stopFn: null,
  eventBuffer: [],
  bufferBytes: 0,
  chunkIndex: 0,
  lastUrl: '',
};

function sendAction(action: Action): void {
  sendToBackground(MessageType.ACTION_RECORDED, action);
}

function onDocumentClick(e: MouseEvent): void {
  if (!state.isRecording || state.isPaused || !state.sessionId) return;
  const element = e.target as Element;
  if (!element || element.closest('#refine-root')) return;
  const { selector, strategy, confidence } = getBestSelector(element);
  sendAction({
    id: `act-${crypto.randomUUID().split('-')[0]}`,
    sessionId: state.sessionId,
    timestamp: Date.now(),
    type: 'click',
    pageUrl: window.location.href,
    selector,
    selectorStrategy: strategy,
    selectorConfidence: confidence,
  });
}

function onDocumentChange(e: Event): void {
  if (!state.isRecording || state.isPaused || !state.sessionId) return;
  const element = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  if (!element || element.closest('#refine-root')) return;
  const { selector, strategy, confidence } = getBestSelector(element);
  sendAction({
    id: `act-${crypto.randomUUID().split('-')[0]}`,
    sessionId: state.sessionId,
    timestamp: Date.now(),
    type: 'input',
    pageUrl: window.location.href,
    selector,
    selectorStrategy: strategy,
    selectorConfidence: confidence,
    value: (element as HTMLInputElement).value ?? '',
  });
}

function sendToBackground(type: string, payload: unknown): void {
  chrome.runtime.sendMessage({ type, payload, source: 'content' }, () => {
    if (chrome.runtime.lastError) {
      console.warn('[Refine] Background message failed:', chrome.runtime.lastError.message);
    }
  });
}

function flushBuffer(final = false): void {
  if (state.eventBuffer.length === 0 || !state.sessionId) return;

  const chunk: RecordingChunk = {
    sessionId: state.sessionId,
    chunkIndex: state.chunkIndex++,
    pageUrl: state.lastUrl,
    events: [...state.eventBuffer],
    createdAt: Date.now(),
  };

  sendToBackground(MessageType.RECORDING_CHUNK, chunk);
  state.eventBuffer = [];
  state.bufferBytes = 0;

  if (final) {
    console.log('[Refine] Final chunk flushed, index:', chunk.chunkIndex);
  }
}

export function startRecording(sessionId: string): void {
  if (state.isRecording) {
    console.warn('[Refine] Already recording');
    return;
  }
  if (!SESSION_ID_FORMAT.test(sessionId)) {
    console.error('[Refine] Invalid session ID format, refusing to start:', sessionId);
    return;
  }

  state.sessionId = sessionId;
  state.isRecording = true;
  state.isPaused = false;
  state.eventBuffer = [];
  state.bufferBytes = 0;
  state.chunkIndex = 0;
  state.lastUrl = window.location.href;

  const stopFn = record({
    emit(event) {
      if (state.isPaused) return;

      state.eventBuffer.push(event);
      try { state.bufferBytes += JSON.stringify(event).length * 2; } catch { /* ignore */ }

      const shouldFlush =
        state.eventBuffer.length >= MAX_BUFFER_EVENTS ||
        state.bufferBytes >= MAX_BUFFER_BYTES;

      if (shouldFlush) flushBuffer();
    },
    maskInputOptions: { password: true },
    sampling: {
      mousemove: 50,
      mouseInteraction: true,
      scroll: 300,
    },
    checkoutEveryNms: 30000, // S01-001: full snapshot every 30s
    blockSelector: '#refine-root', // exclude our own overlay from recording
  });

  state.stopFn = stopFn ?? null;

  document.addEventListener('click', onDocumentClick, { capture: true });
  document.addEventListener('change', onDocumentChange, { capture: true });

  console.log('[Refine] Recording started for session:', sessionId);
}

export function pauseRecording(): void {
  if (!state.isRecording || state.isPaused) return;
  state.isPaused = true;
  flushBuffer();
  console.log('[Refine] Recording paused');
}

export function resumeRecording(): void {
  if (!state.isRecording || !state.isPaused) return;
  state.isPaused = false;
  console.log('[Refine] Recording resumed');
}

export function stopRecording(): void {
  if (!state.isRecording) return;

  if (state.stopFn) {
    state.stopFn();
    state.stopFn = null;
  }

  flushBuffer(true);

  document.removeEventListener('click', onDocumentClick, { capture: true });
  document.removeEventListener('change', onDocumentChange, { capture: true });

  state.isRecording = false;
  state.isPaused = false;
  state.sessionId = null;
  console.log('[Refine] Recording stopped');
}

export function handleNavigation(toUrl: string): void {
  if (!state.isRecording || !state.sessionId) return;

  const fromUrl = state.lastUrl;
  flushBuffer(); // flush current page events before navigation

  const action = createNavigationAction(state.sessionId, fromUrl, toUrl, Date.now());
  sendToBackground(MessageType.ACTION_RECORDED, action);

  // Notify background of new page for session.pages tracking
  sendToBackground(MessageType.SESSION_STATUS_UPDATE, { url: toUrl });

  state.lastUrl = toUrl;
  console.log('[Refine] Navigation recorded:', fromUrl, '→', toUrl);
}

/**
 * Records a cross-page (full reload) navigation when the content script
 * reinitialises on a new page that belongs to an active session.
 * Uses document.referrer as the fromUrl.
 */
export function recordCrossPageNavigation(sessionId: string, fromUrl: string, toUrl: string): void {
  if (!fromUrl || fromUrl === toUrl) return;
  const action = createNavigationAction(sessionId, fromUrl, toUrl, Date.now());
  sendToBackground(MessageType.ACTION_RECORDED, action);
}

export function isRecording(): boolean {
  return state.isRecording && !state.isPaused;
}

export function getSessionId(): string | null {
  return state.sessionId;
}

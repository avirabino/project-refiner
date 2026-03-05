/**
 * @file annotation-state.ts
 * @description Annotation state machine for the content script.
 * Manages: current tool, annotation list, selection, drawing state.
 * CRUD operations write to IndexedDB via chrome.runtime messages and
 * dispatch custom DOM events for canvas + toolbar sync.
 */

import type { Annotation } from '@shared/types';
import type { AnnotationKind } from '@synaptix/vigil-shared';
import { MessageType } from '@shared/types';

// ── Custom event names ────────────────────────────────────────────────────────

export const ANNOTATION_EVENTS = {
  TOOL_CHANGED: 'vigil:annotation-tool-changed',
  UPDATED: 'vigil:annotations-updated',
  COMMENT_REQUEST: 'vigil:annotation-comment-request',
  SELECTED: 'vigil:annotation-selected',
} as const;

// ── State ─────────────────────────────────────────────────────────────────────

export type AnnotationTool = AnnotationKind | null;

interface AnnotationState {
  sessionId: string | null;
  tool: AnnotationTool;
  annotations: Annotation[];
  selectedId: string | null;
  isDrawing: boolean;
}

const state: AnnotationState = {
  sessionId: null,
  tool: null,
  annotations: [],
  selectedId: null,
  isDrawing: false,
};

// ── Getters ───────────────────────────────────────────────────────────────────

export function getAnnotationState(): Readonly<AnnotationState> {
  return state;
}

export function getAnnotations(): readonly Annotation[] {
  return state.annotations;
}

export function getSelectedAnnotation(): Annotation | null {
  if (!state.selectedId) return null;
  return state.annotations.find((a) => a.id === state.selectedId) ?? null;
}

// ── Init / Teardown ───────────────────────────────────────────────────────────

export function initAnnotationState(sessionId: string): void {
  state.sessionId = sessionId;
  state.tool = null;
  state.annotations = [];
  state.selectedId = null;
  state.isDrawing = false;

  // Load existing annotations for this session
  chrome.runtime.sendMessage(
    { type: MessageType.LOG_ANNOTATION, payload: { action: 'list', sessionId }, source: 'content' },
    (response) => {
      if (response?.ok && response.data?.annotations && Array.isArray(response.data.annotations)) {
        state.annotations = response.data.annotations;
        dispatch(ANNOTATION_EVENTS.UPDATED);
      }
    },
  );
}

export function destroyAnnotationState(): void {
  state.sessionId = null;
  state.tool = null;
  state.annotations = [];
  state.selectedId = null;
  state.isDrawing = false;
}

// ── Tool selection ────────────────────────────────────────────────────────────

export function setTool(tool: AnnotationTool): void {
  state.tool = tool;
  state.selectedId = null;
  dispatch(ANNOTATION_EVENTS.TOOL_CHANGED, { tool });
}

export function getTool(): AnnotationTool {
  return state.tool;
}

// ── Drawing state ─────────────────────────────────────────────────────────────

export function setDrawing(drawing: boolean): void {
  state.isDrawing = drawing;
}

export function isDrawing(): boolean {
  return state.isDrawing;
}

// ── Selection ─────────────────────────────────────────────────────────────────

export function selectAnnotation(id: string | null): void {
  state.selectedId = id;
  dispatch(ANNOTATION_EVENTS.SELECTED, { id });
  dispatch(ANNOTATION_EVENTS.UPDATED);
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function addAnnotation(annotation: Annotation): void {
  state.annotations.push(annotation);
  dispatch(ANNOTATION_EVENTS.UPDATED);

  // Persist via background
  chrome.runtime.sendMessage(
    { type: MessageType.LOG_ANNOTATION, payload: { action: 'add', annotation }, source: 'content' },
    () => { /* fire and forget */ },
  );
}

export function updateAnnotation(id: string, patch: Partial<Annotation>): void {
  const idx = state.annotations.findIndex((a) => a.id === id);
  if (idx === -1) return;
  state.annotations[idx] = { ...state.annotations[idx], ...patch, updatedAt: Date.now() };
  dispatch(ANNOTATION_EVENTS.UPDATED);

  chrome.runtime.sendMessage(
    { type: MessageType.UPDATE_ANNOTATION, payload: { id, patch }, source: 'content' },
    () => {},
  );
}

export function deleteAnnotationById(id: string): void {
  state.annotations = state.annotations.filter((a) => a.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  dispatch(ANNOTATION_EVENTS.UPDATED);

  chrome.runtime.sendMessage(
    { type: MessageType.DELETE_ANNOTATION, payload: { id }, source: 'content' },
    () => {},
  );
}

export function clearAllAnnotations(): void {
  if (!state.sessionId) return;
  const sessionId = state.sessionId;
  state.annotations = [];
  state.selectedId = null;
  dispatch(ANNOTATION_EVENTS.UPDATED);

  chrome.runtime.sendMessage(
    { type: MessageType.CLEAR_ANNOTATIONS, payload: { sessionId }, source: 'content' },
    () => {},
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dispatch(event: string, detail?: Record<string, unknown>): void {
  document.dispatchEvent(new CustomEvent(event, { detail }));
}

export function generateAnnotationId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAnnotationBase(kind: AnnotationKind): Omit<Annotation, 'id'> {
  const now = Date.now();
  return {
    sessionId: state.sessionId ?? '',
    kind,
    color: '#ef4444',
    strokeWidth: 2,
    pageUrl: window.location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    timestamp: now,
    createdAt: now,
    updatedAt: now,
  };
}

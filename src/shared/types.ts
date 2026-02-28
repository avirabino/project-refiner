/**
 * @file types.ts
 * @description Core TypeScript types for Vigil Chrome Extension.
 *
 * Shared types (Bug, Feature, VIGILSession, etc.) are re-exported from
 * @synaptix/vigil-shared — the single source of truth for ext + server + dashboard.
 * Extension-only types (MessageType, Action, Session, etc.) remain here.
 */

// ── Re-exports from shared package (S07-11) ─────────────────────────────────
export {
  BugPriority,
  BugPrioritySchema,
  BugStatus,
  BugStatusSchema,
  FeatureType,
  FeatureTypeSchema,
  FeatureStatus,
  FeatureStatusSchema,
  BugSchema,
  FeatureSchema,
  RrwebChunkSchema,
  VIGILRecordingSchema,
  VIGILSnapshotSchema,
  VIGILSessionSchema,
  BugUpdateSchema,
  TEST_STATUS,
} from '@synaptix/vigil-shared';

export type {
  Bug,
  Feature,
  RrwebChunk,
  VIGILRecording,
  VIGILSnapshot,
  VIGILSession,
  BugUpdate,
  BugFile,
  FeatureFile,
  HealthStatus,
} from '@synaptix/vigil-shared';

// ── Extension-only types ─────────────────────────────────────────────────────

/**
 * Status of a recording session.
 */
export enum SessionStatus {
  RECORDING = 'RECORDING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

/**
 * Types of Chrome extension messages.
 */
export enum MessageType {
  PING = 'PING',
  PONG = 'PONG',
  CREATE_SESSION = 'CREATE_SESSION',
  START_RECORDING = 'START_RECORDING',
  STOP_RECORDING = 'STOP_RECORDING',
  PAUSE_RECORDING = 'PAUSE_RECORDING',
  RESUME_RECORDING = 'RESUME_RECORDING',
  RECORDING_CHUNK = 'RECORDING_CHUNK',
  ACTION_RECORDED = 'ACTION_RECORDED',
  LOG_BUG = 'LOG_BUG',
  LOG_FEATURE = 'LOG_FEATURE',
  CAPTURE_SCREENSHOT = 'CAPTURE_SCREENSHOT',
  SESSION_STATUS_UPDATE = 'SESSION_STATUS_UPDATE',
  GET_SESSION_STATUS = 'GET_SESSION_STATUS',
  ANNOTATE_ACTION = 'ANNOTATE_ACTION',
  LOG_INSPECTOR_ELEMENT = 'LOG_INSPECTOR_ELEMENT',
  OPEN_SIDE_PANEL = 'OPEN_SIDE_PANEL',
  // Sprint 06 — Vigil session model
  TOGGLE_RECORDING = 'TOGGLE_RECORDING',
  OPEN_BUG_EDITOR = 'OPEN_BUG_EDITOR',
  SESSION_SYNCED = 'SESSION_SYNCED',
  SESSION_SYNC_FAILED = 'SESSION_SYNC_FAILED',
  // Sprint 07 — Project-oriented sessions (S07-16)
  GET_PROJECT_SPRINTS = 'GET_PROJECT_SPRINTS',
}

/**
 * Represents a recorded user action during a session.
 */
export interface Action {
  id: string;
  sessionId: string;
  timestamp: number;
  type: 'click' | 'input' | 'navigation' | 'scroll';
  pageUrl: string;
  selector?: string;
  selectorStrategy?: 'data-testid' | 'aria-label' | 'id' | 'css' | 'playwright';
  selectorConfidence?: 'high' | 'medium' | 'low';
  value?: string;
  note?: string;
}

/**
 * Represents a complete recording session (legacy model).
 */
export interface Session {
  id: string;
  name: string;
  description: string;
  status: SessionStatus;
  project?: string;
  outputPath?: string;
  tags: string[];
  startedAt: number;
  stoppedAt?: number;
  duration: number;
  pages: string[];
  actionCount: number;
  bugCount: number;
  featureCount: number;
  screenshotCount: number;
  recordMouseMove: boolean;
}

/**
 * Configuration schema for an AI-native Refine project.
 */
export interface RefineProjectConfig {
  name: string;
  displayName: string;
  baseUrl: string;
  outputPath: string;
  description?: string;
  created: string;
  version: string;
}

/**
 * A chunk of rrweb events from one page load within a session (legacy/Dexie model).
 */
export interface RecordingChunk {
  id?: number;
  sessionId: string;
  chunkIndex: number;
  pageUrl: string;
  events: unknown[];
  createdAt: number;
  compressed?: boolean;
  data?: string;
}

/**
 * An element captured by the inspector tool during a session.
 */
export interface InspectedElement {
  id: string;
  sessionId: string;
  selector: string;
  url: string;
  tagName: string;
  timestamp: number;
}

/**
 * A screenshot captured during a session.
 */
export interface Screenshot {
  id: string;
  sessionId: string;
  dataUrl: string;
  url: string;
  timestamp: number;
  width: number;
  height: number;
}

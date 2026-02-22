/**
 * @file types.ts
 * @description Core TypeScript interfaces and enums for SynaptixLabs Refine.
 */

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
 * Priority level for logged bugs.
 */
export enum BugPriority {
  P0 = 'P0', // Critical: Blocker
  P1 = 'P1', // High: Core functionality broken
  P2 = 'P2', // Medium: Non-critical bug
  P3 = 'P3'  // Low: Cosmetic or minor issue
}

/**
 * Type of feature request logged.
 */
export enum FeatureType {
  ENHANCEMENT = 'ENHANCEMENT',
  NEW_FEATURE = 'NEW_FEATURE',
  UX_IMPROVEMENT = 'UX_IMPROVEMENT'
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
}

/**
 * Represents a logged bug during a session.
 */
export interface Bug {
  id: string;               // bug-XXXXXXXX
  sessionId: string;
  type: 'bug';
  priority: BugPriority;
  title: string;
  description: string;
  url: string;
  elementSelector?: string;
  screenshotId?: string;
  timestamp: number;
}

/**
 * Represents a logged feature request during a session.
 */
export interface Feature {
  id: string;               // feat-XXXXXXXX
  sessionId: string;
  type: 'feature';
  featureType: FeatureType;
  title: string;
  description: string;
  url: string;
  elementSelector?: string;
  screenshotId?: string;
  timestamp: number;
}

/**
 * Represents a complete recording session.
 */
export interface Session {
  id: string;               // ats-YYYY-MM-DD-NNN
  name: string;
  description: string;
  status: SessionStatus;
  startedAt: number;        // Unix ms
  stoppedAt?: number;
  duration: number;         // ms (excludes paused time)
  pages: string[];          // distinct URLs visited
  actionCount: number;
  bugCount: number;
  featureCount: number;
  screenshotCount: number;
}

/**
 * A chunk of rrweb events from one page load within a session.
 */
export interface RecordingChunk {
  id?: number;              // auto-increment (Dexie)
  sessionId: string;
  chunkIndex: number;
  pageUrl: string;
  events: unknown[];        // rrweb serialized events
  createdAt: number;
}

/**
 * A screenshot captured during a session.
 */
export interface Screenshot {
  id: string;               // ss-XXXXXXXX
  sessionId: string;
  dataUrl: string;          // base64 data URL (JPEG 80%)
  url: string;              // page URL when captured
  timestamp: number;
  width: number;
  height: number;
}

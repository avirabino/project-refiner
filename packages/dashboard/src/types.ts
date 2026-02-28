// ── Re-exports from shared package (S07-11) ─────────────────────────────────
import type { RrwebChunk as SharedRrwebChunk } from '@synaptix/vigil-shared';

export type { HealthStatus, BugUpdate, RrwebChunk } from '@synaptix/vigil-shared';

// ── Dashboard-local types (structure differs from shared BugFile/FeatureFile) ─

/** Bug as rendered in dashboard list views. Maps from server BugFile. */
export interface BugItem {
  id: string;
  title: string;
  status: string;       // 'OPEN' | 'FIXED' (from filesystem folder)
  severity: string;     // 'P0' | 'P1' | 'P2' | 'P3'
  sprint: string;
  discovered: string;
  stepsToReproduce?: string;
  expected?: string;
  actual?: string;
  regressionTest?: string;  // raw text from markdown section
  resolution?: string;
}

/** Feature as rendered in dashboard list views. Maps from server FeatureFile. */
export interface FeatureItem {
  id: string;
  title: string;
  status: string;       // 'OPEN' | 'DONE' (from filesystem folder)
  priority: string;     // 'P0'-'P3' or 'ENHANCEMENT' etc.
  sprint: string;
  description?: string;
}

// ── Sprint 07: Session-oriented types (S07-17a/17b) ────────────────────────

/** Summary returned by GET /api/sessions — lightweight for list views. */
export interface SessionSummary {
  id: string;
  project: string;          // project folder name (S07-16)
  sprint: string;           // e.g., "07"
  name: string;             // e.g., "vigil-session-2026-02-27-001"
  startedAt: number;        // epoch ms
  endedAt?: number;
  recordingCount: number;
  snapshotCount: number;
  bugCount: number;
  featureCount: number;
}

/** A point-in-time screenshot captured during a session. */
export interface SnapshotItem {
  id: string;
  capturedAt: number;       // session clock ms (relative to startedAt)
  screenshotDataUrl: string;
  url: string;
  triggeredBy: 'manual' | 'bug-editor' | 'auto';
}

/** An rrweb recording segment within a session. */
export interface RecordingItem {
  id: string;
  startedAt: number;        // epoch ms
  endedAt?: number;
  rrwebChunks: SharedRrwebChunk[];
  mouseTracking: boolean;
}

/** Full session detail returned by GET /api/sessions/:id. */
export interface SessionDetail {
  id: string;
  project: string;
  sprint: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  clock: number;            // ms elapsed
  recordings: RecordingItem[];
  snapshots: SnapshotItem[];
  bugs: SessionBug[];
  features: SessionFeature[];
}

/** Bug as embedded in a session (from extension, not filesystem). */
export interface SessionBug {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: string;
  url: string;
  screenshotId?: string;
  timestamp: number;
}

/** Feature as embedded in a session (from extension, not filesystem). */
export interface SessionFeature {
  id: string;
  sessionId: string;
  title: string;
  description: string;
  featureType: 'ENHANCEMENT' | 'NEW_FEATURE' | 'UX_IMPROVEMENT';
  status: string;
  url: string;
  timestamp: number;
}

/** Timeline event for S07-17b session timeline view. */
export type TimelineEvent =
  | { type: 'recording-start'; time: number; recordingId: string }
  | { type: 'recording-end'; time: number; recordingId: string }
  | { type: 'snapshot'; time: number; snapshot: SnapshotItem }
  | { type: 'bug'; time: number; bug: SessionBug }
  | { type: 'feature'; time: number; feature: SessionFeature };

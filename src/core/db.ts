/**
 * @file db.ts
 * @description Dexie (IndexedDB) database schema and CRUD helpers for Refine.
 * Chrome-API-free — safe to import from any module.
 */

import Dexie, { type Table } from 'dexie';
import type { Session, Bug, Feature, RecordingChunk, Screenshot, Action } from '@shared/types';
import { DB_NAME } from '@shared/constants';

class RefineDatabase extends Dexie {
  sessions!: Table<Session, string>;
  recordings!: Table<RecordingChunk, number>;
  bugs!: Table<Bug, string>;
  features!: Table<Feature, string>;
  screenshots!: Table<Screenshot, string>;
  actions!: Table<Action, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      sessions:    '&id, status, startedAt',
      recordings:  '++id, sessionId, chunkIndex',
      bugs:        '&id, sessionId, timestamp',
      features:    '&id, sessionId, timestamp',
      screenshots: '&id, sessionId, timestamp',
      actions:     '&id, sessionId, timestamp',
    });
  }
}

export const db = new RefineDatabase();

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(session: Session): Promise<string> {
  await db.sessions.add(session);
  return session.id;
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function updateSession(id: string, changes: Partial<Session>): Promise<void> {
  await db.sessions.update(id, changes);
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.bugs, db.features, db.screenshots, db.recordings, db.actions], async () => {
    await db.sessions.delete(id);
    await db.bugs.where('sessionId').equals(id).delete();
    await db.features.where('sessionId').equals(id).delete();
    await db.screenshots.where('sessionId').equals(id).delete();
    await db.recordings.where('sessionId').equals(id).delete();
    await db.actions.where('sessionId').equals(id).delete();
  });
}

export async function getAllSessions(): Promise<Session[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray();
}

export async function getSessionsForToday(): Promise<Session[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return db.sessions
    .where('startedAt')
    .aboveOrEqual(startOfDay.getTime())
    .toArray();
}

// ── Recording chunks ──────────────────────────────────────────────────────────

export async function addRecordingChunk(chunk: RecordingChunk): Promise<number> {
  return (await db.recordings.add(chunk)) as number;
}

export async function getRecordingChunks(sessionId: string): Promise<RecordingChunk[]> {
  return db.recordings.where('sessionId').equals(sessionId).sortBy('chunkIndex');
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function addAction(action: Action): Promise<string> {
  await db.actions.add(action);
  return action.id;
}

export async function getActionsBySession(sessionId: string): Promise<Action[]> {
  return db.actions.where('sessionId').equals(sessionId).sortBy('timestamp');
}

// ── Bugs ──────────────────────────────────────────────────────────────────────

export async function addBug(bug: Bug): Promise<string> {
  await db.bugs.add(bug);
  return bug.id;
}

export async function getBugsBySession(sessionId: string): Promise<Bug[]> {
  return db.bugs.where('sessionId').equals(sessionId).sortBy('timestamp');
}

// ── Features ──────────────────────────────────────────────────────────────────

export async function addFeature(feature: Feature): Promise<string> {
  await db.features.add(feature);
  return feature.id;
}

export async function getFeaturesBySession(sessionId: string): Promise<Feature[]> {
  return db.features.where('sessionId').equals(sessionId).sortBy('timestamp');
}

// ── Atomic counters (race-safe via Dexie .modify()) ─────────────────────────

export async function incrementSessionActionCount(sessionId: string): Promise<void> {
  await db.sessions.where('id').equals(sessionId).modify((s) => { s.actionCount++; });
}

export async function incrementSessionBugCount(sessionId: string): Promise<void> {
  await db.sessions.where('id').equals(sessionId).modify((s) => { s.bugCount++; });
}

export async function incrementSessionFeatureCount(sessionId: string): Promise<void> {
  await db.sessions.where('id').equals(sessionId).modify((s) => { s.featureCount++; });
}

// ── Screenshots ───────────────────────────────────────────────────────────────

export async function addScreenshot(screenshot: Screenshot): Promise<string> {
  await db.screenshots.add(screenshot);
  return screenshot.id;
}

export async function getScreenshotsBySession(sessionId: string): Promise<Screenshot[]> {
  return db.screenshots.where('sessionId').equals(sessionId).sortBy('timestamp');
}

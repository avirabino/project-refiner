/**
 * @file db.ts
 * @description Dexie (IndexedDB) database schema and CRUD helpers for Refine.
 * Chrome-API-free — safe to import from any module.
 */

import Dexie, { type Table } from 'dexie';
import type { Session, Bug, Feature, RecordingChunk, Screenshot, Action, InspectedElement, Annotation } from '@shared/types';

/** Persisted project directory handle for File System Access API re-use across browser sessions. */
export interface ProjectHandle {
  /** Project name (folder name, e.g. "vigil") — primary key */
  name: string;
  /** The FileSystemDirectoryHandle (stored via structured clone in IndexedDB) */
  handle: FileSystemDirectoryHandle;
  /** When this handle was first stored */
  storedAt: number;
  /** When this handle was last used */
  lastUsedAt: number;
}
import { DB_NAME } from '@shared/constants';

class RefineDatabase extends Dexie {
  sessions!: Table<Session, string>;
  recordings!: Table<RecordingChunk, number>;
  bugs!: Table<Bug, string>;
  features!: Table<Feature, string>;
  screenshots!: Table<Screenshot, string>;
  actions!: Table<Action, string>;
  inspectedElements!: Table<InspectedElement, string>;
  annotations!: Table<Annotation, string>;
  projectHandles!: Table<ProjectHandle, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      sessions:          '&id, status, startedAt, project', // R025: added project
      recordings:        '++id, sessionId, chunkIndex',
      bugs:              '&id, sessionId, timestamp',
      features:          '&id, sessionId, timestamp',
      screenshots:       '&id, sessionId, timestamp',
      actions:           '&id, sessionId, timestamp',
      inspectedElements: '&id, sessionId, timestamp',   // R023
    });

    // Sprint 07 — Annotation overlay (visual markup)
    this.version(2).stores({
      annotations:       '&id, sessionId, timestamp',
    });

    // Sprint 07 — Project handle persistence (File System Access API)
    this.version(3).stores({
      projectHandles:    '&name',
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

export async function getSessionsByProject(project: string): Promise<Session[]> {
  return db.sessions.where('project').equals(project).reverse().sortBy('startedAt');
}

export async function updateSession(id: string, changes: Partial<Session>): Promise<void> {
  await db.sessions.update(id, changes);
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.bugs, db.features, db.screenshots, db.recordings, db.actions, db.annotations], async () => {
    await db.sessions.delete(id);
    await db.bugs.where('sessionId').equals(id).delete();
    await db.features.where('sessionId').equals(id).delete();
    await db.screenshots.where('sessionId').equals(id).delete();
    await db.recordings.where('sessionId').equals(id).delete();
    await db.actions.where('sessionId').equals(id).delete();
    await db.annotations.where('sessionId').equals(id).delete();
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

export async function updateRecordingChunk(chunkId: number, changes: Partial<RecordingChunk>): Promise<void> {
  await db.recordings.update(chunkId, changes);
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

export async function getLastActionBySession(sessionId: string): Promise<Action | undefined> {
  const all = await db.actions.where('sessionId').equals(sessionId).sortBy('timestamp');
  return all[all.length - 1];
}

export async function updateActionNote(id: string, note: string): Promise<void> {
  await db.actions.update(id, { note });
}

// ── Bugs ──────────────────────────────────────────────────────────────────────

export async function addBug(bug: Bug): Promise<string> {
  await db.bugs.add(bug);
  return bug.id;
}

export async function getBugsBySession(sessionId: string): Promise<Bug[]> {
  return db.bugs.where('sessionId').equals(sessionId).sortBy('timestamp');
}

export async function updateBugStatus(id: string, status: Bug['status']): Promise<void> {
  await db.bugs.update(id, { status });
}

// ── Features ──────────────────────────────────────────────────────────────────

export async function addFeature(feature: Feature): Promise<string> {
  await db.features.add(feature);
  return feature.id;
}

export async function getFeaturesBySession(sessionId: string): Promise<Feature[]> {
  return db.features.where('sessionId').equals(sessionId).sortBy('timestamp');
}

export async function updateFeature(id: string, patch: Partial<Feature>): Promise<void> {
  await db.features.update(id, patch);
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

// ── Counting helpers (FEAT-SP-003: live session counters) ────────────────────

export async function countScreenshotsBySession(sessionId: string): Promise<number> {
  return db.screenshots.where('sessionId').equals(sessionId).count();
}

export async function countRecordingChunksBySession(sessionId: string): Promise<number> {
  return db.recordings.where('sessionId').equals(sessionId).count();
}

// ── Screenshots ───────────────────────────────────────────────────────────────

export async function addScreenshot(screenshot: Screenshot): Promise<string> {
  await db.screenshots.add(screenshot);
  return screenshot.id;
}

export async function getScreenshotsBySession(sessionId: string): Promise<Screenshot[]> {
  return db.screenshots.where('sessionId').equals(sessionId).sortBy('timestamp');
}

// ── Inspected elements ────────────────────────────────────────────────────────

export async function addInspectedElement(el: InspectedElement): Promise<string> {
  await db.inspectedElements.add(el);
  return el.id;
}

export async function getInspectedElementsBySession(sessionId: string): Promise<InspectedElement[]> {
  return db.inspectedElements.where('sessionId').equals(sessionId).sortBy('timestamp');
}

// ── Annotations (Sprint 07 — visual markup) ──────────────────────────────────

export async function addAnnotation(annotation: Annotation): Promise<string> {
  await db.annotations.add(annotation);
  return annotation.id;
}

export async function getAnnotationsBySession(sessionId: string): Promise<Annotation[]> {
  return db.annotations.where('sessionId').equals(sessionId).sortBy('timestamp');
}

export async function updateAnnotation(id: string, patch: Partial<Annotation>): Promise<void> {
  await db.annotations.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteAnnotation(id: string): Promise<void> {
  await db.annotations.delete(id);
}

export async function deleteAnnotationsBySession(sessionId: string): Promise<void> {
  await db.annotations.where('sessionId').equals(sessionId).delete();
}

// ── Project handles (Sprint 07 — File System Access API persistence) ────────

/**
 * Store (or update) a project directory handle for later re-use.
 * Uses `put` so re-selecting the same project overwrites the previous handle.
 */
export async function storeProjectHandle(name: string, handle: FileSystemDirectoryHandle): Promise<void> {
  const now = Date.now();
  await db.projectHandles.put({ name, handle, storedAt: now, lastUsedAt: now });
}

/** Retrieve a previously stored project handle by name. */
export async function getProjectHandle(name: string): Promise<ProjectHandle | undefined> {
  return db.projectHandles.get(name);
}

/** List all stored project handles, most recently used first. */
export async function listProjectHandles(): Promise<ProjectHandle[]> {
  return db.projectHandles.orderBy('name').toArray();
}

/** Update `lastUsedAt` timestamp for a project handle. */
export async function touchProjectHandle(name: string): Promise<void> {
  await db.projectHandles.update(name, { lastUsedAt: Date.now() });
}

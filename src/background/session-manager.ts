/**
 * @file session-manager.ts
 * @description Session lifecycle state machine for Refine background service worker.
 * States: idle → RECORDING ↔ PAUSED → COMPLETED
 *
 * Sprint 06: Adds vigilSessionManager — session = container, recording = opt-in (D002).
 * Legacy sessionManager preserved for backward compat with existing E2E tests.
 */

import { SessionStatus, type Session, type VIGILSession, type VIGILRecording, type VIGILSnapshot, type Bug, type Feature, type Annotation } from '@shared/types';
import { generateSessionId, generateVigilSessionId, generateRecordingId } from '@shared/utils';
import {
  createSession,
  getSession,
  updateSession,
  getSessionsForToday,
} from '@core/db';
import { startKeepAlive, stopKeepAlive } from './keep-alive';

interface ActiveSessionState {
  sessionId: string | null;
  status: SessionStatus;
  pausedAt: number | null;
  totalPausedMs: number;
  tabId: number | undefined;
}

const state: ActiveSessionState = {
  sessionId: null,
  status: SessionStatus.COMPLETED,
  pausedAt: null,
  totalPausedMs: 0,
  tabId: undefined,
};

async function getNextSequence(): Promise<number> {
  const todaySessions = await getSessionsForToday();
  return todaySessions.length + 1;
}

async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    // Check if script is already running by sending a ping
    await new Promise<void>((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
        if (chrome.runtime.lastError || !response?.ok) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
    return true;
  } catch (e) {
    console.log('[Refine] Content script missing, injecting...', e);
    // Script missing, try to inject
    try {
      const manifest = await fetch(chrome.runtime.getURL('manifest.json')).then(r => r.json());
      const files = manifest.content_scripts?.[0]?.js ?? [];
      if (files.length === 0) return false;

      await chrome.scripting.executeScript({ target: { tabId }, files });
      
      // Wait for script to initialize
      await new Promise(r => setTimeout(r, 500));
      return true;
    } catch (injectErr) {
      console.error('[Refine] Injection failed:', injectErr);
      return false;
    }
  }
}

async function sendStartRecording(tabId: number, payload: { sessionId: string; recordMouseMove: boolean }, retries = 3): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: 'START_RECORDING', payload, source: 'background' }, (_response) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
      return true;
    } catch (e) {
      console.warn(`[Refine] START_RECORDING attempt ${i + 1} failed:`, e);
      if (i < retries - 1) {
        // Try injecting if it might be missing
        await ensureContentScript(tabId);
        await new Promise(r => setTimeout(r, 1000)); // Wait before retry
      }
    }
  }
  return false;
}

function notifyTab(tabId: number | undefined, type: string, payload?: unknown): void {
  if (!tabId) return;
  
  // Special handling for START_RECORDING to be robust
  if (type === 'START_RECORDING') {
    const startPayload = payload as { sessionId: string; recordMouseMove: boolean };
    sendStartRecording(tabId, startPayload).then(success => {
      if (!success) console.error('[Refine] Failed to start recording on tab', tabId);
      else console.log('[Refine] Recording started on tab', tabId);
    });
    return;
  }

  // Standard notification for other events
  chrome.tabs.sendMessage(tabId, { type, payload, source: 'background' }, () => {
    if (!chrome.runtime.lastError) return;
    console.warn('[Refine] Tab notify failed:', chrome.runtime.lastError.message);
  });
}

export const sessionManager = {
  setTabId(tabId: number): void {
    if (state.sessionId && !state.tabId) {
      state.tabId = tabId;
      console.log('[Refine] Updated recording tabId from content script:', tabId);
    }
  },

  async createSession(
    name: string,
    description: string,
    url: string,
    tabId?: number,
    recordMouseMove = false,
    tags: string[] = [],
    project?: string,
    sprint?: string,
    outputPath?: string
  ): Promise<Session> {
    if (state.sessionId) {
      throw new Error(`[Refine] Session already active: ${state.sessionId}`);
    }
    const sequence = await getNextSequence();
    const id = generateSessionId(new Date(), sequence);
    const now = Date.now();

    const isUserUrl = (u: string) =>
      Boolean(u) && !u.startsWith('chrome-extension://') && !u.startsWith('chrome://');

    const session: Session = {
      id,
      name,
      description,
      status: SessionStatus.RECORDING,
      startedAt: now,
      duration: 0,
      pages: isUserUrl(url) ? [url] : [],
      tags,
      project,
      sprint,
      outputPath,
      actionCount: 0,
      bugCount: 0,
      featureCount: 0,
      screenshotCount: 0,
      recordMouseMove,
    };

    await createSession(session);

    state.sessionId = id;
    state.status = SessionStatus.RECORDING;
    state.pausedAt = null;
    state.totalPausedMs = 0;
    state.tabId = tabId;

    startKeepAlive();
    notifyTab(tabId, 'START_RECORDING', { sessionId: id, recordMouseMove });

    console.log('[Refine] Session created:', id);
    return session;
  },

  async pauseSession(): Promise<void> {
    if (!state.sessionId || state.status !== SessionStatus.RECORDING) {
      throw new Error('No active recording session to pause');
    }

    state.status = SessionStatus.PAUSED;
    state.pausedAt = Date.now();

    await updateSession(state.sessionId, { status: SessionStatus.PAUSED });
    notifyTab(state.tabId, 'PAUSE_RECORDING');
    console.log('[Refine] Session paused:', state.sessionId);
  },

  async resumeSession(): Promise<void> {
    if (!state.sessionId || state.status !== SessionStatus.PAUSED) {
      throw new Error('No paused session to resume');
    }

    if (state.pausedAt) {
      state.totalPausedMs += Date.now() - state.pausedAt;
    }
    state.status = SessionStatus.RECORDING;
    state.pausedAt = null;

    await updateSession(state.sessionId, { status: SessionStatus.RECORDING });
    notifyTab(state.tabId, 'RESUME_RECORDING');
    console.log('[Refine] Session resumed:', state.sessionId);
  },

  async stopSession(): Promise<Session> {
    if (!state.sessionId) throw new Error('No active session to stop');

    const now = Date.now();
    const session = await getSession(state.sessionId);
    if (!session) throw new Error(`Session not found: ${state.sessionId}`);

    let pausedMs = state.totalPausedMs;
    if (state.pausedAt) pausedMs += now - state.pausedAt;
    const duration = Math.max(0, now - session.startedAt - pausedMs);

    const updates = { status: SessionStatus.COMPLETED, stoppedAt: now, duration };
    await updateSession(state.sessionId, updates);

    notifyTab(state.tabId, 'STOP_RECORDING');
    stopKeepAlive();

    const stoppedId = state.sessionId;
    state.sessionId = null;
    state.status = SessionStatus.COMPLETED;
    state.pausedAt = null;
    state.totalPausedMs = 0;
    state.tabId = undefined;

    console.log('[Refine] Session stopped:', stoppedId);
    return { ...session, ...updates };
  },

  addPage(url: string): void {
    if (!state.sessionId) return;
    getSession(state.sessionId).then((session) => {
      if (!session) return;
      if (!session.pages.includes(url)) {
        updateSession(state.sessionId!, { pages: [...session.pages, url] });
      }
    }).catch((err) => console.error('[Refine] addPage failed:', err));
  },

  getActiveSessionId(): string | null {
    return state.sessionId;
  },

  getStatus(): SessionStatus {
    return state.status;
  },

  isRecording(): boolean {
    return state.status === SessionStatus.RECORDING;
  },
};

// ── Sprint 06: Vigil Session Manager (D002) ────────────────────────────────
// Session = container (always running), recording = opt-in segments.

interface VigilActiveState {
  session: VIGILSession | null;
  activeRecordingId: string | null;
  tabId: number | undefined;
}

const vigilState: VigilActiveState = {
  session: null,
  activeRecordingId: null,
  tabId: undefined,
};

const VIGIL_STATE_KEY = 'vigilActiveSession';

function persistState(): void {
  const data = {
    session: vigilState.session,
    activeRecordingId: vigilState.activeRecordingId,
    tabId: vigilState.tabId,
  };
  chrome.storage.local.set({ [VIGIL_STATE_KEY]: data });
}

function clearPersistedState(): void {
  chrome.storage.local.remove(VIGIL_STATE_KEY);
}

/** Restore vigil session after service worker restart. */
export async function restoreVigilState(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(VIGIL_STATE_KEY, (result) => {
      const saved = result[VIGIL_STATE_KEY] as VigilActiveState | undefined;
      if (saved?.session) {
        vigilState.session = saved.session;
        vigilState.activeRecordingId = saved.activeRecordingId;
        vigilState.tabId = saved.tabId;
        startKeepAlive();
        console.log('[Vigil] Session restored from storage:', saved.session.id);
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

let cachedServerPort: number | null = null;
let cachedServerUrl: string | null = null;

export async function loadServerPort(): Promise<number> {
  if (cachedServerPort !== null) return cachedServerPort;
  await loadServerConfig();
  return cachedServerPort!;
}

export async function loadServerUrl(): Promise<string> {
  if (cachedServerUrl !== null) return cachedServerUrl;
  await loadServerConfig();
  return cachedServerUrl!;
}

async function loadServerConfig(): Promise<void> {
  try {
    const configUrl = chrome.runtime.getURL('vigil.config.json');
    const res = await fetch(configUrl);
    if (res.ok) {
      const config = await res.json();
      cachedServerPort = config.serverPort ?? 7474;
      // If serverUrl is set, POST directly there (e.g. Vercel).
      // Otherwise fall back to localhost:<port>.
      cachedServerUrl = config.serverUrl ?? `http://localhost:${cachedServerPort}`;
      console.log('[Vigil] Server config loaded → URL:', cachedServerUrl);
      return;
    }
  } catch {
    // config not bundled or unreachable — use defaults
  }
  cachedServerPort = 7474;
  cachedServerUrl = 'http://localhost:7474';
  console.log('[Vigil] Server config fallback → URL:', cachedServerUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Downscale a data URL to a small thumbnail using OffscreenCanvas (service worker safe). */
async function downsizeDataUrl(dataUrl: string, maxWidth: number, quality: number): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidth / bmp.width);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const outBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(outBlob);
  });
}

async function postWithRetry(session: VIGILSession, attempts = 3): Promise<void> {
  const serverUrl = await loadServerUrl();
  console.log(`[Vigil] postWithRetry → ${serverUrl}/api/session (session: ${session.id}, bugs: ${session.bugs.length}, features: ${session.features.length})`);

  // Downscale screenshots to small thumbnails to stay under Vercel's 4.5MB body limit.
  // Full-res screenshots stay in extension IndexedDB; server gets ~20KB thumbnails.
  const liteSnapshots = await Promise.all(
    session.snapshots.map(async (snap) => {
      if (!snap.screenshotDataUrl || snap.screenshotDataUrl.length < 1000) {
        return snap; // already empty or tiny
      }
      try {
        const thumb = await downsizeDataUrl(snap.screenshotDataUrl, 320, 0.5);
        return { ...snap, screenshotDataUrl: thumb };
      } catch {
        return { ...snap, screenshotDataUrl: '' };
      }
    }),
  );
  const liteSession = { ...session, snapshots: liteSnapshots };

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${serverUrl}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(liteSession),
      });
      if (res.ok) {
        console.log(`[Vigil] POST success → session ${session.id} synced to ${serverUrl}`);
        notifyTab(vigilState.tabId, 'SESSION_SYNCED');
        return;
      }
      // Log server-side validation errors (e.g. Zod schema failures)
      const errBody = await res.text().catch(() => '');
      console.error(`[Vigil] POST /api/session failed (${res.status}, attempt ${i + 1}/${attempts}):`, errBody);
      await sleep(1000 * (i + 1));
    } catch (e) {
      console.warn(`[Vigil] POST /api/session network error (attempt ${i + 1}/${attempts}):`, e);
      await sleep(1000 * (i + 1));
    }
  }
  // All retries failed — mark pending
  console.error(`[Vigil] POST /api/session failed after ${attempts} attempts — session ${session.id} marked pendingSync`);
  if (vigilState.session) {
    vigilState.session.pendingSync = true;
  }
  notifyTab(vigilState.tabId, 'SESSION_SYNC_FAILED');
}

export const vigilSessionManager = {
  setTabId(tabId: number): void {
    if (vigilState.session && !vigilState.tabId) {
      vigilState.tabId = tabId;
    }
  },

  async createSession(
    name: string,
    projectId: string,
    tabId?: number,
    sprint?: string,
    description?: string,
  ): Promise<VIGILSession> {
    if (vigilState.session) {
      throw new Error(`[Vigil] Session already active: ${vigilState.session.id}`);
    }

    const todaySessions = await getSessionsForToday();
    const sequence = todaySessions.length + 1;
    const now = Date.now();

    const session: VIGILSession = {
      id: generateVigilSessionId(new Date(), sequence),
      name,
      projectId,
      sprint,
      description,
      startedAt: now,
      clock: 0,
      recordings: [],
      snapshots: [],
      bugs: [],
      features: [],
      annotations: [],
    };

    vigilState.session = session;
    vigilState.tabId = tabId;
    vigilState.activeRecordingId = null;

    startKeepAlive();
    persistState();
    console.log('[Vigil] Session created:', session.id);
    return session;
  },

  startRecording(mouseTracking = false): VIGILRecording {
    if (!vigilState.session) {
      throw new Error('[Vigil] No active session');
    }
    if (vigilState.activeRecordingId) {
      throw new Error(`[Vigil] Recording already active: ${vigilState.activeRecordingId}`);
    }

    const recording: VIGILRecording = {
      id: generateRecordingId(),
      startedAt: Date.now(),
      rrwebChunks: [],
      mouseTracking,
    };

    vigilState.session.recordings.push(recording);
    vigilState.activeRecordingId = recording.id;

    notifyTab(vigilState.tabId, 'START_RECORDING', {
      sessionId: vigilState.session.id,
      recordMouseMove: mouseTracking,
    });

    persistState();
    console.log('[Vigil] Recording started:', recording.id);
    return recording;
  },

  stopRecording(): VIGILRecording | null {
    if (!vigilState.session || !vigilState.activeRecordingId) {
      return null;
    }

    const recording = vigilState.session.recordings.find(
      (r) => r.id === vigilState.activeRecordingId
    );
    if (recording) {
      recording.endedAt = Date.now();
    }

    notifyTab(vigilState.tabId, 'STOP_RECORDING');
    const stoppedId = vigilState.activeRecordingId;
    vigilState.activeRecordingId = null;

    persistState();
    console.log('[Vigil] Recording stopped:', stoppedId);
    return recording ?? null;
  },

  addSnapshot(snapshot: VIGILSnapshot): void {
    if (!vigilState.session) return;
    vigilState.session.snapshots.push(snapshot);
    persistState();
  },

  addBug(bug: Bug): void {
    if (!vigilState.session) return;
    vigilState.session.bugs.push(bug);
    persistState();
  },

  addFeature(feature: Feature): void {
    if (!vigilState.session) return;
    vigilState.session.features.push(feature);
    persistState();
  },

  addAnnotation(annotation: Annotation): void {
    if (!vigilState.session) return;
    vigilState.session.annotations.push(annotation);
    persistState();
  },

  async endSession(): Promise<VIGILSession> {
    if (!vigilState.session) {
      throw new Error('[Vigil] No active session to end');
    }

    // Stop any active recording
    this.stopRecording();

    const now = Date.now();
    vigilState.session.endedAt = now;
    vigilState.session.clock = now - vigilState.session.startedAt;

    const finalSession = { ...vigilState.session };

    // POST to vigil-server with retry
    await postWithRetry(finalSession);

    stopKeepAlive();
    notifyTab(vigilState.tabId, 'STOP_RECORDING');

    console.log('[Vigil] Session ended:', finalSession.id);

    // Reset state
    vigilState.session = null;
    vigilState.activeRecordingId = null;
    vigilState.tabId = undefined;
    clearPersistedState();

    return finalSession;
  },

  getActiveSession(): VIGILSession | null {
    return vigilState.session;
  },

  getActiveSessionId(): string | null {
    return vigilState.session?.id ?? null;
  },

  isRecordingActive(): boolean {
    return vigilState.activeRecordingId !== null;
  },

  hasActiveSession(): boolean {
    return vigilState.session !== null;
  },

  toggleRecording(mouseTracking = false): boolean {
    if (vigilState.activeRecordingId) {
      this.stopRecording();
      return false; // recording stopped
    } else {
      this.startRecording(mouseTracking);
      return true; // recording started
    }
  },
};

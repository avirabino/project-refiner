/**
 * @file session-manager.ts
 * @description Session lifecycle state machine for Refine background service worker.
 * States: idle → RECORDING ↔ PAUSED → COMPLETED
 */

import { SessionStatus, type Session } from '@shared/types';
import { generateSessionId } from '@shared/utils';
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

function notifyTab(tabId: number | undefined, type: string, payload?: unknown): void {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type, payload, source: 'background' }, () => {
    if (chrome.runtime.lastError) {
      console.warn('[Refine] Tab notify failed:', chrome.runtime.lastError.message);
    }
  });
}

export const sessionManager = {
  async createSession(
    name: string,
    description: string,
    url: string,
    tabId?: number
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
      actionCount: 0,
      bugCount: 0,
      featureCount: 0,
      screenshotCount: 0,
    };

    await createSession(session);

    state.sessionId = id;
    state.status = SessionStatus.RECORDING;
    state.pausedAt = null;
    state.totalPausedMs = 0;
    state.tabId = tabId;

    startKeepAlive();
    notifyTab(tabId, 'START_RECORDING', { sessionId: id });

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

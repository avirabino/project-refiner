/**
 * Unit tests: message-handler routing
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageType } from '@shared/types';

// ── Chrome API mocks ──────────────────────────────────────────────────────────

vi.stubGlobal('chrome', {
  alarms: { create: vi.fn(), clear: vi.fn(), onAlarm: { addListener: vi.fn() } },
  tabs: { sendMessage: vi.fn((_id, _msg, cb) => cb?.()), get: vi.fn(), captureVisibleTab: vi.fn(), query: vi.fn((_q: unknown, cb: (tabs: unknown[]) => void) => cb([])) },
  windows: { WINDOW_ID_CURRENT: -2 },
  runtime: { lastError: null, sendMessage: vi.fn(() => Promise.resolve()), getURL: vi.fn((path: string) => `chrome-extension://test/${path}`) },
  storage: { local: { get: vi.fn((_keys, cb) => cb?.({})), set: vi.fn() } },
});

const { handleMessage } = await import('@background/message-handler');

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMsg(type: string, payload?: unknown) {
  return { type, payload, source: 'content' } as Parameters<typeof handleMessage>[0];
}

function makeSender(tabId?: number): chrome.runtime.MessageSender {
  return tabId ? { tab: { id: tabId } } as chrome.runtime.MessageSender : {} as chrome.runtime.MessageSender;
}

function call(type: string, payload?: unknown, tabId?: number): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  return new Promise((resolve) => {
    handleMessage(makeMsg(type, payload), makeSender(tabId), resolve as (r: unknown) => void);
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => vi.clearAllMocks());

describe('handleMessage routing', () => {
  it('PING returns PONG', async () => {
    const res = await call(MessageType.PING);
    expect(res.ok).toBe(true);
    expect((res.data as { type: string }).type).toBe(MessageType.PONG);
  });

  it('CREATE_SESSION returns new session', async () => {
    const res = await call(MessageType.CREATE_SESSION, {
      name: 'Handler test',
      description: '',
      url: 'http://localhost:38470',
      tabId: undefined,
    });
    expect(res.ok).toBe(true);
    expect((res.data as { id: string }).id).toMatch(/^ats-/);
  });

  it('PAUSE_RECORDING returns ok (session is active from previous test)', async () => {
    const res = await call(MessageType.PAUSE_RECORDING);
    expect(res.ok).toBe(true);
  });

  it('RESUME_RECORDING returns ok', async () => {
    const res = await call(MessageType.RESUME_RECORDING);
    expect(res.ok).toBe(true);
  });

  it('GET_SESSION_STATUS returns status data', async () => {
    const res = await call(MessageType.GET_SESSION_STATUS);
    expect(res.ok).toBe(true);
    expect(res.data).toHaveProperty('isRecording');
    expect(res.data).toHaveProperty('status');
  });

  it('SESSION_STATUS_UPDATE returns ok', async () => {
    const res = await call(MessageType.SESSION_STATUS_UPDATE, { url: 'http://localhost:38470/about' });
    expect(res.ok).toBe(true);
  });

  it('unknown message type returns error', async () => {
    const res = await call('TOTALLY_UNKNOWN_TYPE');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Unknown');
  });

  it('STOP_RECORDING completes the session', async () => {
    const res = await call(MessageType.STOP_RECORDING);
    expect(res.ok).toBe(true);
    expect((res.data as { status: string }).status).toBe('COMPLETED');
  });

  it('GET_PROJECT_SPRINTS with empty projectPath returns fallback data', async () => {
    const res = await call(MessageType.GET_PROJECT_SPRINTS, { projectPath: '' });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ exists: false, sprints: [], current: null });
  });

  it('GET_PROJECT_SPRINTS with valid projectPath attempts fetch to vigil-server', async () => {
    const mockData = { exists: true, sprints: [{ id: '07', name: 'sprint_07' }], current: 'sprint_07' };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const res = await call(MessageType.GET_PROJECT_SPRINTS, { projectPath: 'C:\\test\\project' });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual(mockData);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/sprints/project?path='),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    fetchSpy.mockRestore();
  });

  it('GET_PROJECT_SPRINTS returns fallback on fetch failure', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const res = await call(MessageType.GET_PROJECT_SPRINTS, { projectPath: 'C:\\test\\project' });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ exists: false, sprints: [], current: null });

    fetchSpy.mockRestore();
  });
});

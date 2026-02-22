/**
 * @file message-handler.ts
 * @description Type-safe message router for the Refine background service worker.
 * Routes incoming ChromeMessages to the appropriate handler by MessageType.
 */

import { MessageType } from '@shared/types';
import type { ChromeMessage, ChromeResponse } from '@shared/messages';
import type { Bug, Feature, RecordingChunk } from '@shared/types';
import { sessionManager } from './session-manager';
import { captureScreenshot } from './screenshot';
import {
  addBug,
  addFeature,
  addRecordingChunk,
  addAction,
  getSession,
  incrementSessionActionCount,
  incrementSessionBugCount,
  incrementSessionFeatureCount,
} from '@core/db';

export function handleMessage(
  message: ChromeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ChromeResponse) => void
): boolean {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case MessageType.PING:
      sendResponse({ ok: true, data: { type: MessageType.PONG } });
      return false;

    case MessageType.CREATE_SESSION: {
      const { name, description, url, tabId: payloadTabId } = message.payload as {
        name: string;
        description: string;
        url: string;
        tabId?: number;
      };
      // popup sender.tab is undefined — use tabId sent explicitly in the payload
      const targetTabId = payloadTabId ?? tabId;
      sessionManager
        .createSession(name, description ?? '', url, targetTabId)
        .then((session) => sendResponse({ ok: true, data: session }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.PAUSE_RECORDING:
      sessionManager
        .pauseSession()
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;

    case MessageType.RESUME_RECORDING:
      sessionManager
        .resumeSession()
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;

    case MessageType.STOP_RECORDING:
      sessionManager
        .stopSession()
        .then((session) => sendResponse({ ok: true, data: session }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;

    case MessageType.RECORDING_CHUNK: {
      const chunk = message.payload as RecordingChunk;
      addRecordingChunk(chunk)
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.ACTION_RECORDED: {
      const action = message.payload as Parameters<typeof addAction>[0];
      const sessionId = sessionManager.getActiveSessionId();
      if (!sessionId) {
        sendResponse({ ok: false, error: 'No active session' });
        return false;
      }
      addAction(action)
        .then(() => incrementSessionActionCount(sessionId))
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.LOG_BUG: {
      const bug = message.payload as Bug;
      addBug(bug)
        .then(() => incrementSessionBugCount(bug.sessionId))
        .then(() => sendResponse({ ok: true, data: { id: bug.id } }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.LOG_FEATURE: {
      const feature = message.payload as Feature;
      addFeature(feature)
        .then(() => incrementSessionFeatureCount(feature.sessionId))
        .then(() => sendResponse({ ok: true, data: { id: feature.id } }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.CAPTURE_SCREENSHOT: {
      const { sessionId } = message.payload as { sessionId: string };
      captureScreenshot(sessionId, tabId)
        .then((screenshot) => sendResponse({ ok: true, data: screenshot }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.GET_SESSION_STATUS: {
      const activeId = sessionManager.getActiveSessionId();
      if (activeId) {
        getSession(activeId)
          .then((session) => sendResponse({
            ok: true,
            data: {
              sessionId: activeId,
              status: sessionManager.getStatus(),
              isRecording: sessionManager.isRecording(),
              startedAt: session?.startedAt ?? null,
              lastPageUrl: session?.pages[session.pages.length - 1] ?? null,
            },
          }))
          .catch(() => sendResponse({ ok: true, data: { sessionId: activeId, status: sessionManager.getStatus(), isRecording: sessionManager.isRecording(), startedAt: null, lastPageUrl: null } }));
      } else {
        sendResponse({ ok: true, data: { sessionId: null, status: sessionManager.getStatus(), isRecording: false, startedAt: null, lastPageUrl: null } });
      }
      return true;
    }

    case MessageType.SESSION_STATUS_UPDATE: {
      const { url } = message.payload as { url: string };
      if (url) sessionManager.addPage(url);
      sendResponse({ ok: true });
      return false;
    }

    default:
      console.warn('[Refine] Unknown message type:', message.type);
      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
      return false;
  }
}

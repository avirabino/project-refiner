/**
 * @file message-handler.ts
 * @description Type-safe message router for the Refine background service worker.
 * Routes incoming ChromeMessages to the appropriate handler by MessageType.
 */

import { MessageType } from '@shared/types';
import type { ChromeMessage, ChromeResponse } from '@shared/messages';
import type { Bug, Feature, RecordingChunk, InspectedElement, Annotation } from '@shared/types';
import { sessionManager, vigilSessionManager, loadServerUrl } from './session-manager';
import { startKeepAlive } from './keep-alive';
import { captureScreenshot } from './screenshot';
import {
  addBug,
  addFeature,
  addRecordingChunk,
  addAction,
  addInspectedElement,
  getSession,
  getLastActionBySession,
  updateActionNote,
  incrementSessionActionCount,
  incrementSessionBugCount,
  incrementSessionFeatureCount,
  getBugsBySession,
  getFeaturesBySession,
  getScreenshotsBySession,
  getRecordingChunks,
  deleteSession as deleteSessionFromDb,
  addAnnotation as addAnnotationToDb,
  getAnnotationsBySession,
  updateAnnotation as updateAnnotationInDb,
  deleteAnnotation as deleteAnnotationFromDb,
  deleteAnnotationsBySession,
} from '@core/db';
import type { VIGILSession, VIGILRecording, VIGILSnapshot } from '@shared/types';

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
      const { name, description, url, tabId: payloadTabId, recordMouseMove, tags, project, sprint } = message.payload as {
        name: string;
        description: string;
        url: string;
        tabId?: number;
        recordMouseMove?: boolean;
        tags?: string[];
        project?: string;
        sprint?: string;
      };

      const startSession = (finalTabId?: number) => {
        chrome.storage.local.get(['refineOutputPath'], (res) => {
          const outputPath = res.refineOutputPath as string | undefined;
          sessionManager
            .createSession(name, description ?? '', url, finalTabId, recordMouseMove ?? false, tags ?? [], project, sprint, outputPath)
            .then(async (session) => {
              // Sprint 06 BUG-FAT-011: Create vigil session (idle — no auto-recording).
              // S07-16: Pass sprint + description for project-oriented sessions.
              try {
                await vigilSessionManager.createSession(name, project ?? '', finalTabId, sprint, description);
                console.log('[Vigil] Vigil session created alongside legacy session (idle)');
              } catch (e) {
                console.warn('[Vigil] Failed to create vigil session:', (e as Error).message);
              }
              sendResponse({ ok: true, data: session });
            })
            .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
        });
      };

      // popup sender.tab is undefined — use tabId sent explicitly in the payload
      let targetTabId = payloadTabId ?? tabId;

      if (!targetTabId) {
        // Fallback: query active tab if missing (e.g. from side panel)
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          const target = tabs.find(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'));
          if (target?.id) {
             console.log('[Refine] Auto-detected target tab:', target.id);
             startSession(target.id);
          } else {
             // Try getting ANY active tab in any window that is a valid page
             chrome.tabs.query({ active: true }, (allTabs) => {
               const anyTarget = allTabs.find(t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'));
               if (anyTarget?.id) {
                 console.log('[Refine] Auto-detected target tab (fallback):', anyTarget.id);
                 startSession(anyTarget.id);
               } else {
                 console.warn('[Refine] No target tab found for session');
                 startSession(undefined); // Start without a tab (will record but no overlay)
               }
             });
          }
        });
        return true;
      }

      startSession(targetTabId);
      return true; // async response
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
        .then(async (session) => {
          // Respond immediately — vigil POST (postWithRetry) can take 6s+ if server is down
          sendResponse({ ok: true, data: session });

          // Sprint 06 BUG-FAT-001: Also end vigil session if active → triggers POST to vigil-server
          // Runs AFTER sendResponse to avoid blocking callers (ControlBar, popup)
          // S07-FAT: Re-start keep-alive — legacy stopSession() killed it, but vigil POST still needs it
          console.log('[Vigil] STOP_RECORDING: vigil session active?', vigilSessionManager.hasActiveSession(), 'id:', vigilSessionManager.getActiveSessionId());
          if (vigilSessionManager.hasActiveSession()) {
            try {
              startKeepAlive();
              await vigilSessionManager.endSession();
              console.log('[Vigil] Vigil session ended + POSTed on STOP_RECORDING');
            } catch (e) {
              console.warn('[Vigil] Failed to end vigil session:', (e as Error).message);
            }
          }
          // Notify all extension pages (popup, sidepanel) to refresh their session list
          try {
            chrome.runtime.sendMessage({ type: 'SESSION_COMPLETED', payload: { sessionId: session.id } }).catch(() => {});
          } catch {
            // No listeners (popup/sidepanel closed) — expected, ignore
          }
        })
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
      // BUG-FAT-012: Also store in vigil session so POST includes bugs
      if (vigilSessionManager.hasActiveSession()) {
        vigilSessionManager.addBug(bug);
      }
      addBug(bug)
        .then(() => incrementSessionBugCount(bug.sessionId))
        .then(() => sendResponse({ ok: true, data: { id: bug.id } }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.LOG_FEATURE: {
      const feature = message.payload as Feature;
      // BUG-FAT-012: Also store in vigil session so POST includes features
      if (vigilSessionManager.hasActiveSession()) {
        vigilSessionManager.addFeature(feature);
      }
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
              recordMouseMove: session?.recordMouseMove ?? false,
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
      // Update tabId if content script auto-resumed on a different tab
      if (tabId) sessionManager.setTabId(tabId);
      sendResponse({ ok: true });
      return false;
    }

    case MessageType.LOG_INSPECTOR_ELEMENT: {
      const el = message.payload as InspectedElement;
      addInspectedElement(el)
        .then(() => sendResponse({ ok: true, data: { id: el.id } }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.ANNOTATE_ACTION: {
      const { sessionId, note } = message.payload as { sessionId: string; note: string };
      getLastActionBySession(sessionId)
        .then((action) => {
          if (!action) return sendResponse({ ok: false, error: 'No actions to annotate' });
          return updateActionNote(action.id, note).then(() => sendResponse({ ok: true, data: { id: action.id } }));
        })
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.OPEN_SIDE_PANEL: {
      // Open side panel on the window of the sender tab, or last focused window
      const windowId = sender.tab?.windowId;
      if (windowId) {
        chrome.sidePanel.open({ windowId }, () => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true });
          }
        });
      } else {
        chrome.windows.getLastFocused((win) => {
          if (win?.id) {
            chrome.sidePanel.open({ windowId: win.id }, () => {
              if (chrome.runtime.lastError) {
                sendResponse({ ok: false, error: chrome.runtime.lastError.message });
              } else {
                sendResponse({ ok: true });
              }
            });
          } else {
            sendResponse({ ok: false, error: 'No window found' });
          }
        });
      }
      return true;
    }

    // Sprint 06: SPACE toggle recording — always use legacy session for rrweb control.
    // Vigil session is data-only (snapshots, bugs, POST) and does NOT control recording.
    case MessageType.TOGGLE_RECORDING: {
      if (sessionManager.isRecording()) {
        sessionManager.pauseSession()
          .then(() => sendResponse({ ok: true, data: { recording: false } }))
          .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      } else if (sessionManager.getStatus() === 'PAUSED') {
        sessionManager.resumeSession()
          .then(() => sendResponse({ ok: true, data: { recording: true } }))
          .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      } else {
        sendResponse({ ok: false, error: 'No active session' });
      }
      return true;
    }

    // Sprint 07 S07-16: Fetch sprint list for a project folder from vigil-server
    case MessageType.GET_PROJECT_SPRINTS: {
      const { projectPath } = message.payload as { projectPath: string };
      if (!projectPath) {
        sendResponse({ ok: true, data: { exists: false, sprints: [], current: null } });
        return false;
      }

      loadServerUrl()
        .then(serverUrl => fetch(`${serverUrl}/api/sprints/project?path=${encodeURIComponent(projectPath)}`, {
          signal: AbortSignal.timeout(3000),
        }))
        .then(r => r.json())
        .then(data => sendResponse({ ok: true, data }))
        .catch(() => sendResponse({ ok: true, data: { exists: false, sprints: [], current: null } }));
      return true;
    }

    // Sprint 07 FAT: Re-sync a completed session that failed to POST
    case MessageType.RESYNC_SESSION: {
      const { sessionId } = message.payload as { sessionId: string };
      if (!sessionId) {
        sendResponse({ ok: false, error: 'Missing sessionId' });
        return false;
      }

      (async () => {
        try {
          const session = await getSession(sessionId);
          if (!session) {
            sendResponse({ ok: false, error: `Session ${sessionId} not found in IndexedDB` });
            return;
          }

          // Reconstruct VIGILSession from IndexedDB tables
          const [bugs, features, screenshots, chunks] = await Promise.all([
            getBugsBySession(sessionId),
            getFeaturesBySession(sessionId),
            getScreenshotsBySession(sessionId),
            getRecordingChunks(sessionId),
          ]);

          // Group recording chunks into a single VIGILRecording
          const recordings: VIGILRecording[] = [];
          if (chunks.length > 0) {
            recordings.push({
              id: `rec-${sessionId}`,
              startedAt: session.startedAt,
              endedAt: session.stoppedAt ?? (session.startedAt + (session.duration ?? 0)),
              rrwebChunks: chunks.map((c) => ({
                chunkIndex: c.chunkIndex,
                pageUrl: c.pageUrl,
                events: c.events ?? [],
                createdAt: c.createdAt,
              })),
              mouseTracking: session.recordMouseMove ?? false,
            });
          }

          // Map screenshots to VIGILSnapshot
          const snapshots: VIGILSnapshot[] = screenshots.map((s) => ({
            id: s.id,
            capturedAt: s.timestamp,
            screenshotDataUrl: s.dataUrl ?? '',
            url: s.url ?? '',
            triggeredBy: 'manual' as const,
          }));

          const vigilSession: VIGILSession = {
            id: session.id,
            name: session.name,
            projectId: session.project ?? '',
            sprint: session.sprint,
            description: session.description,
            startedAt: session.startedAt,
            endedAt: session.stoppedAt,
            clock: session.duration ?? 0,
            recordings,
            snapshots,
            bugs,
            features,
            annotations: [],
          };

          // POST to server
          const serverUrl = await loadServerUrl();
          const res = await fetch(`${serverUrl}/api/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vigilSession),
          });

          if (res.ok) {
            const data = await res.json();
            console.log(`[Vigil] Resync success for session ${sessionId}:`, data);
            sendResponse({ ok: true, data });
          } else {
            const errText = await res.text().catch(() => '');
            console.error(`[Vigil] Resync POST failed (${res.status}):`, errText);
            sendResponse({ ok: false, error: `POST failed: ${res.status} ${errText}` });
          }
        } catch (e) {
          console.error('[Vigil] Resync error:', e);
          sendResponse({ ok: false, error: (e as Error).message });
        }
      })();
      return true;
    }

    // Sprint 07 FAT: Delete session from IndexedDB + Neon (single source of truth)
    case MessageType.DELETE_SESSION: {
      const { sessionId } = message.payload as { sessionId: string };
      if (!sessionId) {
        sendResponse({ ok: false, error: 'Missing sessionId' });
        return false;
      }

      (async () => {
        try {
          // 1. Delete from local IndexedDB first (always succeeds)
          await deleteSessionFromDb(sessionId);
          console.log(`[Vigil] Session ${sessionId} deleted from IndexedDB`);

          // 2. Also delete from server (Neon) — non-blocking; log warning on failure
          try {
            const serverUrl = await loadServerUrl();
            const res = await fetch(`${serverUrl}/api/sessions/${encodeURIComponent(sessionId)}`, {
              method: 'DELETE',
              signal: AbortSignal.timeout(5000),
            });
            if (res.ok) {
              console.log(`[Vigil] Session ${sessionId} deleted from server`);
            } else {
              console.warn(`[Vigil] Server delete returned ${res.status} for session ${sessionId}`);
            }
          } catch (e) {
            console.warn(`[Vigil] Server delete failed for session ${sessionId}:`, (e as Error).message);
          }

          sendResponse({ ok: true });
        } catch (e) {
          console.error('[Vigil] Delete session error:', e);
          sendResponse({ ok: false, error: (e as Error).message });
        }
      })();
      return true;
    }

    // Sprint 07: Annotation CRUD (visual markup overlay)
    case MessageType.LOG_ANNOTATION: {
      const { action: annotationAction, annotation, sessionId } = message.payload as {
        action: 'add' | 'list';
        annotation?: Annotation;
        sessionId?: string;
      };

      if (annotationAction === 'list' && sessionId) {
        getAnnotationsBySession(sessionId)
          .then((annotations) => sendResponse({ ok: true, data: { annotations } }))
          .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
        return true;
      }

      if (annotationAction === 'add' && annotation) {
        // Store in IndexedDB + add to vigil session (for POST payload)
        if (vigilSessionManager.hasActiveSession()) {
          vigilSessionManager.addAnnotation(annotation);
        }
        addAnnotationToDb(annotation)
          .then(() => sendResponse({ ok: true, data: { id: annotation.id } }))
          .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
        return true;
      }

      sendResponse({ ok: false, error: 'Invalid LOG_ANNOTATION payload' });
      return false;
    }

    case MessageType.UPDATE_ANNOTATION: {
      const { id, patch } = message.payload as { id: string; patch: Partial<Annotation> };
      updateAnnotationInDb(id, patch)
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.DELETE_ANNOTATION: {
      const { id } = message.payload as { id: string };
      deleteAnnotationFromDb(id)
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MessageType.CLEAR_ANNOTATIONS: {
      const { sessionId } = message.payload as { sessionId: string };
      deleteAnnotationsBySession(sessionId)
        .then(() => sendResponse({ ok: true }))
        .catch((err: Error) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    default:
      console.warn('[Refine] Unknown message type:', message.type);
      sendResponse({ ok: false, error: `Unknown message type: ${message.type}` });
      return false;
  }
}

/**
 * @file service-worker.ts
 * @description Background service worker for SynaptixLabs Refine.
 * Wires: message router, keep-alive alarm listener, session manager.
 */

import { handleMessage } from './message-handler';
import { initKeepAliveListener } from './keep-alive';
import { initShortcuts } from './shortcuts';
import { sessionManager, restoreVigilState } from './session-manager';
import { getAllSessions, getRecordingChunks, updateRecordingChunk } from '@core/db';
import { compressEvents } from '@core/compression';
import { SessionStatus } from '@shared/types';

console.log('[Vigil] Background service worker initialized.');

// Open the side panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
      // Side panel failed to open (e.g. window closing) — ignore
    });
  }
});

// Route all incoming messages through the type-safe handler
chrome.runtime.onMessage.addListener(handleMessage);

// Start keep-alive alarm listener (alarm itself is created on session start)
initKeepAliveListener();

// Wire keyboard shortcuts (Alt+Shift+V, Ctrl+Shift+S, Alt+Shift+G)
initShortcuts();

// Sprint 06: Restore vigil session if service worker restarted mid-session
restoreVigilState().then((restored) => {
  if (restored) console.log('[Vigil] Active session restored after service worker restart');
});

// DR-04: Use tabs API to detect full-page navigations — replaces unreliable document.referrer
// When a tab completes loading during an active session, notify the content script
// so it can record an accurate cross-page navigation action.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!sessionManager.isRecording()) return;
  if (!tab.url || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('chrome://')) return;
  chrome.tabs.sendMessage(
    tabId,
    { type: 'BACKGROUND_NAV', payload: { url: tab.url }, source: 'background' },
    () => { if (chrome.runtime.lastError) { /* content script not yet ready — ok */ } }
  );
});

// S04-05 / R015: Silence Compression Daemon
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refine-prune-chunks', { periodInMinutes: 60 });
  // Ensure extension icon click always opens/re-opens the side panel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'refine-prune-chunks') return;
  
  try {
    const sessions = await getAllSessions();
    const sevenDaysAgo = Date.now() - 7 * 86400 * 1000;
    
    // Find completed sessions older than 7 days
    const oldSessions = sessions.filter(
      s => s.status === SessionStatus.COMPLETED && s.stoppedAt && s.stoppedAt < sevenDaysAgo
    );

    for (const session of oldSessions) {
      const chunks = await getRecordingChunks(session.id);
      for (const chunk of chunks) {
        if (!chunk.compressed && chunk.events && chunk.events.length > 0) {
          const compressedData = await compressEvents(chunk.events);
          if (chunk.id) {
            await updateRecordingChunk(chunk.id, {
              compressed: true,
              data: compressedData,
              events: [] // Clear raw events to free IndexedDB space
            });
            console.log(`[Vigil] Compressed chunk ${chunk.id} for session ${session.id}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Vigil] Compression daemon error:', err);
  }
});

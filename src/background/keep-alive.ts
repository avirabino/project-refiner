/**
 * @file keep-alive.ts
 * @description Prevents MV3 service worker from shutting down during active sessions.
 * Uses chrome.alarms to ping every 24 seconds (MV3 SWs shut down after ~30s idle).
 */

import { KEEPALIVE_ALARM_NAME } from '@shared/constants';

const INTERVAL_MINUTES = 0.4; // 24 seconds

export function startKeepAlive(): void {
  chrome.alarms.create(KEEPALIVE_ALARM_NAME, { periodInMinutes: INTERVAL_MINUTES });
  console.log('[Vigil] Keep-alive started');
}

export function stopKeepAlive(): void {
  chrome.alarms.clear(KEEPALIVE_ALARM_NAME);
  console.log('[Vigil] Keep-alive stopped');
}

export function initKeepAliveListener(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === KEEPALIVE_ALARM_NAME) {
      console.log('[Vigil] Keep-alive ping', new Date().toISOString());
    }
  });
}

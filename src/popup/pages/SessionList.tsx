/**
 * @file SessionList.tsx
 * @description Session list page. Shows all sessions from Dexie with status badges.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SessionStatus } from '@shared/types';
import type { Session } from '@shared/types';
import { getAllSessions } from '@core/db';
import { formatTimestamp } from '@shared/utils';

interface SessionListProps {
  onNewSession: () => void;
}

const STATUS_COLORS: Record<SessionStatus, string> = {
  [SessionStatus.RECORDING]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [SessionStatus.PAUSED]:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [SessionStatus.STOPPED]:   'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [SessionStatus.PROCESSING]:'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [SessionStatus.COMPLETED]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [SessionStatus.ERROR]:     'bg-red-800/30 text-red-300 border-red-700/40',
};

function formatDuration(ms: number): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const SessionList: React.FC<SessionListProps> = ({ onNewSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllSessions();
      setSessions(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const activeSessions = sessions.filter(
    (s) => s.status === SessionStatus.RECORDING || s.status === SessionStatus.PAUSED
  );
  const pastSessions = sessions.filter(
    (s) => s.status !== SessionStatus.RECORDING && s.status !== SessionStatus.PAUSED
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-500 text-lg">⬡</span>
          <span className="text-sm font-bold text-white">Refine</span>
        </div>
        <button
          onClick={onNewSession}
          data-testid="btn-new-session"
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition-colors"
        >
          + New Session
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-2xl">
              🎬
            </div>
            <p className="text-sm font-medium text-gray-300">No sessions yet</p>
            <p className="text-xs text-gray-500">
              Start recording to capture your testing session
            </p>
            <button
              onClick={onNewSession}
              data-testid="btn-new-session"
              className="mt-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full transition-colors"
            >
              + New Session
            </button>
          </div>
        ) : (
          <div className="p-3 flex flex-col gap-2">
            {/* Active sessions first */}
            {activeSessions.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-0.5">
                  Active
                </p>
                {activeSessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </>
            )}

            {pastSessions.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mt-1 mb-0.5">
                  Past sessions
                </p>
                {pastSessions.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface SessionCardProps {
  session: Session;
}

const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const isActive =
    session.status === SessionStatus.RECORDING ||
    session.status === SessionStatus.PAUSED;

  return (
    <div
      data-testid="session-list-item"
      className={`rounded-xl border p-3 ${
        isActive
          ? 'border-indigo-700/60 bg-indigo-900/20'
          : 'border-gray-800 bg-gray-900/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{session.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatTimestamp(session.startedAt)}
          </p>
        </div>
        <span
          data-testid="recording-status"
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
            STATUS_COLORS[session.status]
          }`}
        >
          {session.status === SessionStatus.RECORDING && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-pulse" />
          )}
          {session.status}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span>⏱ {formatDuration(session.duration)}</span>
        {session.bugCount > 0 && <span>🐛 {session.bugCount}</span>}
        {session.screenshotCount > 0 && <span>📷 {session.screenshotCount}</span>}
        {session.actionCount > 0 && <span>🖱 {session.actionCount}</span>}
      </div>
    </div>
  );
};

export default SessionList;

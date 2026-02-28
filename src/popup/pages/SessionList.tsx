/**
 * @file SessionList.tsx
 * @description Session list page. Shows all sessions from Dexie with status badges.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SessionStatus, MessageType } from '@shared/types';
import type { Session } from '@shared/types';
import { getAllSessions } from '@core/db';
import { formatDuration, formatTimestamp } from '@shared/utils';
import { StorageIndicator } from '../components/StorageIndicator';
import { ChangelogModal } from '../components/ChangelogModal';
import { VERSION } from '@shared/constants';
import ProjectSettings from './ProjectSettings';

interface SessionListProps {
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
}

const STATUS_COLORS: Partial<Record<SessionStatus, string>> = {
  [SessionStatus.RECORDING]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [SessionStatus.PAUSED]:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  [SessionStatus.COMPLETED]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [SessionStatus.ERROR]:     'bg-red-800/30 text-red-300 border-red-700/40',
};


const SessionList: React.FC<SessionListProps> = ({ onNewSession, onSelectSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [showChangelog, setShowChangelog] = useState(false);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [selectedProjectSettings, setSelectedProjectSettings] = useState<string | null>(null);

  // S07-18: Ghost session detection
  const [ghostSessionId, setGhostSessionId] = useState<string | null>(null);
  const [endingGhost, setEndingGhost] = useState(false);

  useEffect(() => {
    chrome.storage.local.get('refineLastSeenVersion', (result) => {
      const seen = result.refineLastSeenVersion as string | undefined;
      if (seen !== VERSION) setHasNewVersion(true);
    });
  }, []);

  const handleOpenChangelog = () => {
    setShowChangelog(true);
    setHasNewVersion(false);
    chrome.storage.local.set({ refineLastSeenVersion: VERSION });
  };

  // S07-18: Detect orphaned/ghost sessions on mount
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: MessageType.GET_SESSION_STATUS, source: 'popup' },
      (response) => {
        if (chrome.runtime.lastError || !response?.ok) return;
        const data = response.data as { sessionId: string | null; status: string; isRecording: boolean };
        if (data.sessionId && (data.status === 'RECORDING' || data.status === 'PAUSED')) {
          setGhostSessionId(data.sessionId);
        } else {
          setGhostSessionId(null);
        }
      }
    );
  }, []);

  const handleEndGhostSession = () => {
    setEndingGhost(true);
    chrome.runtime.sendMessage(
      { type: MessageType.STOP_RECORDING, source: 'popup' },
      (response) => {
        setEndingGhost(false);
        if (chrome.runtime.lastError || !response?.ok) return;
        setGhostSessionId(null);
        loadSessions();
      }
    );
  };

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

  // Refresh when background signals a session stopped
  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === 'SESSION_COMPLETED') {
        setGhostSessionId(null);
        loadSessions();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [loadSessions]);

  const uniqueProjects = Array.from(new Set(sessions.map(s => s.project).filter(Boolean))) as string[];

  const filteredSessions = sessions.filter(s => {
    if (projectFilter !== 'all' && s.project !== projectFilter) return false;
    if (tagFilter && !s.tags?.some(t => t.toLowerCase().includes(tagFilter.toLowerCase()))) return false;
    return true;
  });

  const activeSessions = filteredSessions.filter(
    (s) => s.status === SessionStatus.RECORDING || s.status === SessionStatus.PAUSED
  );
  const pastSessions = filteredSessions.filter(
    (s) => s.status !== SessionStatus.RECORDING && s.status !== SessionStatus.PAUSED
  );

  if (selectedProjectSettings) {
    return (
      <ProjectSettings 
        project={selectedProjectSettings} 
        onBack={() => {
          setSelectedProjectSettings(null);
          loadSessions(); // Reload in case dashboard HTML generation failed or something
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
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

      {/* Filters (R025 / R020) */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/30">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          data-testid="select-project-filter"
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Projects</option>
          {uniqueProjects.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {projectFilter !== 'all' && (
          <button 
            onClick={() => setSelectedProjectSettings(projectFilter)}
            data-testid="btn-project-settings"
            className="shrink-0 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-2 py-1 rounded text-xs transition-colors"
            title="Project Settings"
          >
            ⚙️
          </button>
        )}
        <input
          type="text"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          data-testid="input-tag-filter"
          className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* S07-18: Ghost session banner */}
      {ghostSessionId && (
        <div
          data-testid="ghost-session-banner"
          className="mx-3 mt-2 px-3 py-2 rounded-lg border border-amber-600/40 bg-amber-900/20 flex items-center gap-2"
        >
          <span className="text-amber-400 text-sm shrink-0">&#x26A0;</span>
          <p className="text-xs text-amber-300 flex-1">
            Stale session detected <span className="text-amber-500 font-mono text-[10px]">({ghostSessionId})</span>
          </p>
          <button
            data-testid="ghost-session-end-btn"
            onClick={handleEndGhostSession}
            disabled={endingGhost}
            className="shrink-0 text-[10px] font-semibold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white px-2 py-1 rounded transition-colors"
          >
            {endingGhost ? 'Ending\u2026' : 'End stale session'}
          </button>
        </div>
      )}

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
                  <SessionCard key={s.id} session={s} onSelect={onSelectSession} />
                ))}
              </>
            )}

            {pastSessions.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mt-1 mb-0.5">
                  Past sessions
                </p>
                {pastSessions.map((s) => (
                  <SessionCard key={s.id} session={s} onSelect={onSelectSession} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center border-t border-gray-800">
        <div className="flex-1">
          <StorageIndicator />
        </div>
        <button
          data-testid="btn-whats-new"
          onClick={handleOpenChangelog}
          className="relative px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors shrink-0"
        >
          What's New
          {hasNewVersion && (
            <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-indigo-400" />
          )}
        </button>
      </div>
    </div>
  );
};

interface SessionCardProps {
  session: Session;
  onSelect: (id: string) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onSelect }) => {
  const isActive =
    session.status === SessionStatus.RECORDING ||
    session.status === SessionStatus.PAUSED;

  return (
    <div
      data-testid="session-list-item"
      onClick={() => onSelect(session.id)}
      style={{ cursor: 'pointer' }}
      className={`rounded-xl border p-3 transition-colors ${
        isActive
          ? 'border-indigo-700/60 bg-indigo-900/20 hover:bg-indigo-900/30'
          : 'border-gray-800 bg-gray-900/60 hover:bg-gray-800/60'
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

/**
 * @file SessionDetail.tsx
 * @description Session detail view. Shows full session metadata and export actions.
 * Reached by clicking a session card in SessionList.
 */

import React, { useState, useEffect } from 'react';
import { SessionStatus } from '@shared/types';
import type { Session, Bug } from '@shared/types';
import { getSession, getBugsBySession, deleteSession } from '@core/db';

interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

function formatDuration(ms: number): string {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-500/20 text-red-400 border-red-500/30',
  P2: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  P3: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  [SessionStatus.RECORDING]: 'text-red-400',
  [SessionStatus.PAUSED]:    'text-amber-400',
  [SessionStatus.COMPLETED]: 'text-green-400',
  [SessionStatus.STOPPED]:   'text-gray-400',
  [SessionStatus.PROCESSING]:'text-blue-400',
  [SessionStatus.ERROR]:     'text-red-300',
};

const SessionDetail: React.FC<SessionDetailProps> = ({ sessionId, onBack }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [s, b] = await Promise.all([
        getSession(sessionId),
        getBugsBySession(sessionId),
      ]);
      if (!cancelled) {
        setSession(s ?? null);
        setBugs(b);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleDelete = async () => {
    setDeleting(true);
    await deleteSession(sessionId);
    onBack();
  };

  const handleExport = async (type: string) => {
    setExportLoading(type);
    try {
      const { generateJsonReport, generateMarkdownReport } = await import('@core/report-generator');
      const { generateReplayHtml } = await import('@core/replay-bundler');
      const { generatePlaywrightSpec } = await import('@core/playwright-codegen');
      const { generateZipBundle } = await import('@core/zip-bundler');
      const { getRecordingChunks, getActionsBySession, getFeaturesBySession, getScreenshotsBySession } = await import('@core/db');

      if (!session) return;

      if (type === 'report') {
        const [actions, features, screenshots] = await Promise.all([
          getActionsBySession(sessionId),
          getFeaturesBySession(sessionId),
          getScreenshotsBySession(sessionId),
        ]);
        const json = generateJsonReport(session, bugs, features, actions, screenshots);
        const md = generateMarkdownReport(session, bugs, features, actions, screenshots);
        triggerDownload(JSON.stringify(json, null, 2), `report-${sessionId}.json`, 'application/json');
        triggerDownload(md, `report-${sessionId}.md`, 'text/markdown');
      } else if (type === 'replay') {
        const chunks = await getRecordingChunks(sessionId);
        const events = chunks.flatMap((c) => c.events);
        const html = generateReplayHtml(session, events);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        chrome.tabs.create({ url });
      } else if (type === 'playwright') {
        const [actions, bugsForSpec] = await Promise.all([
          getActionsBySession(sessionId),
          getBugsBySession(sessionId),
        ]);
        const spec = generatePlaywrightSpec(session, actions, bugsForSpec);
        triggerDownload(spec, `regression-${sessionId}.spec.ts`, 'text/plain');
      } else if (type === 'zip') {
        const [actions, features, screenshots, chunks] = await Promise.all([
          getActionsBySession(sessionId),
          getFeaturesBySession(sessionId),
          getScreenshotsBySession(sessionId),
          getRecordingChunks(sessionId),
        ]);
        const blob = await generateZipBundle(session, bugs, features, actions, screenshots, chunks);
        const url = URL.createObjectURL(blob);
        triggerDownload(url, `refine-${sessionId}.zip`, 'application/zip');
      }
    } catch (err) {
      console.error('[Refine] Export failed:', err);
    } finally {
      setExportLoading(null);
    }
  };

  if (loading) {
    return (
      <div data-testid="session-detail-container" className="flex flex-col h-full items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div data-testid="session-detail-container" className="flex flex-col h-full items-center justify-center text-gray-500 text-sm">
        Session not found.
        <button onClick={onBack} className="mt-3 text-xs text-indigo-400 hover:underline">
          Back
        </button>
      </div>
    );
  }

  return (
    <div data-testid="session-detail-container" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        <button
          data-testid="btn-back"
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors text-sm"
          aria-label="Back to session list"
        >
          ← Back
        </button>
        <span className="text-sm font-semibold text-white truncate flex-1">{session.name}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Status</p>
            <span
              data-testid="session-status"
              className={`font-bold ${STATUS_COLORS[session.status] ?? 'text-white'}`}
            >
              {session.status}
            </span>
          </div>
          <div>
            <p className="text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Duration</p>
            <span data-testid="session-duration" className="text-white font-semibold">
              {formatDuration(session.duration)}
            </span>
          </div>
          <div>
            <p className="text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Started</p>
            <span className="text-gray-300">{formatDate(session.startedAt)}</span>
          </div>
          <div>
            <p className="text-gray-500 uppercase tracking-wide font-semibold mb-0.5">Pages</p>
            <span className="text-gray-300">{session.pages.length}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-gray-800/60 p-2 text-center">
            <p className="text-gray-400">Bugs</p>
            <p data-testid="session-bug-count" className="text-white font-bold text-base mt-0.5">
              {session.bugCount}
            </p>
          </div>
          <div className="rounded-lg bg-gray-800/60 p-2 text-center">
            <p className="text-gray-400">Screenshots</p>
            <p data-testid="session-screenshot-count" className="text-white font-bold text-base mt-0.5">
              {session.screenshotCount}
            </p>
          </div>
          <div className="rounded-lg bg-gray-800/60 p-2 text-center">
            <p className="text-gray-400">Actions</p>
            <p className="text-white font-bold text-base mt-0.5">{session.actionCount}</p>
          </div>
        </div>

        {/* Bugs list */}
        {bugs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bugs</p>
            <div className="flex flex-col gap-1.5">
              {bugs.map((bug) => (
                <div key={bug.id} className="flex items-start gap-2 rounded-lg bg-gray-800/40 p-2 text-xs">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold ${PRIORITY_COLORS[bug.priority] ?? PRIORITY_COLORS.P3}`}>
                    {bug.priority}
                  </span>
                  <span className="text-gray-200 truncate">{bug.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export buttons */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Export</p>
          <button
            data-testid="btn-download-report"
            onClick={() => handleExport('report')}
            disabled={exportLoading !== null}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {exportLoading === 'report' ? '⏳ Generating…' : '📄 Download Report (JSON + MD)'}
          </button>
          <button
            data-testid="btn-watch-replay"
            onClick={() => handleExport('replay')}
            disabled={exportLoading !== null}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {exportLoading === 'replay' ? '⏳ Generating…' : '▶ Watch Replay'}
          </button>
          <button
            data-testid="btn-export-playwright"
            onClick={() => handleExport('playwright')}
            disabled={exportLoading !== null}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {exportLoading === 'playwright' ? '⏳ Generating…' : '🎭 Export Playwright Spec'}
          </button>
          <button
            data-testid="btn-download-zip"
            onClick={() => handleExport('zip')}
            disabled={exportLoading !== null}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {exportLoading === 'zip' ? '⏳ Generating…' : '📦 Download ZIP Bundle'}
          </button>
        </div>

        {/* Danger zone */}
        <div className="mt-auto pt-2 border-t border-gray-800">
          {!showDeleteConfirm ? (
            <button
              data-testid="btn-delete-session"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-xs text-red-400 hover:text-red-300 py-2 transition-colors"
            >
              Delete session
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-gray-400 text-center">Delete this session and all its data?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  data-testid="confirm-delete"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default SessionDetail;

/**
 * @file SessionDetail.tsx
 * @description Session detail view. Shows full session metadata and export actions.
 * Reached by clicking a session card in SessionList.
 */

import React, { useState, useEffect } from 'react';
import { MessageType, SessionStatus } from '@shared/types';
import type { Session, Bug, Feature, InspectedElement, Annotation } from '@shared/types';
import { getSession, getBugsBySession } from '@core/db';
import { formatDuration } from '@shared/utils';

interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-900/40 text-red-300 border-red-600/50',
  P1: 'bg-red-500/20 text-red-400 border-red-500/30',
  P2: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  P3: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  [SessionStatus.RECORDING]: 'text-red-400',
  [SessionStatus.PAUSED]:    'text-amber-400',
  [SessionStatus.COMPLETED]: 'text-green-400',
  [SessionStatus.ERROR]:     'text-red-300',
};

const SessionDetail: React.FC<SessionDetailProps> = ({ sessionId, onBack }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [inspectedElements, setInspectedElements] = useState<InspectedElement[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { getFeaturesBySession, getInspectedElementsBySession, getAnnotationsBySession } = await import('@core/db');
      const [s, b, f, insp, ann] = await Promise.all([
        getSession(sessionId),
        getBugsBySession(sessionId),
        getFeaturesBySession(sessionId),
        getInspectedElementsBySession(sessionId),
        getAnnotationsBySession(sessionId),
      ]);
      if (!cancelled) {
        setSession(s ?? null);
        setBugs(b);
        setFeatures(f);
        setInspectedElements(insp);
        setAnnotations(ann);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleEndSession = () => {
    setEnding(true);
    try {
      chrome.runtime.sendMessage(
        { type: MessageType.STOP_RECORDING, source: 'popup' },
        (response) => {
          setEnding(false);
          if (chrome.runtime.lastError || !response?.ok) {
            console.warn('[Vigil] End session failed:', chrome.runtime.lastError?.message || response?.error);
          }
          // Reload session data to show COMPLETED status
          getSession(sessionId).then((s) => {
            if (s) setSession(s);
          });
        }
      );
    } catch {
      setEnding(false);
      console.warn('[Vigil] Extension context invalidated');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: MessageType.DELETE_SESSION, payload: { sessionId }, source: 'popup' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!response?.ok) {
              reject(new Error(response?.error || 'Delete failed'));
            } else {
              resolve();
            }
          }
        );
      });
    } catch (err) {
      console.warn('[Vigil] Delete failed:', err);
    }
    onBack();
  };

  const handleBugStatusUpdate = async (bugId: string, nextStatus: string) => {
    await import('@core/db').then(m => m.updateBugStatus(bugId, nextStatus as Bug['status']));
    setBugs(bugs.map(b => b.id === bugId ? { ...b, status: nextStatus as Bug['status'] } : b));
  };

  const handleFeatureSprintUpdate = async (featureId: string, sprintRef: string) => {
    await import('@core/db').then(m => m.updateFeature(featureId, { sprintRef }));
    setFeatures(features.map(f => f.id === featureId ? { ...f, sprintRef } : f));
  };

  const getBugStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-900/40 text-red-400 border-red-800';
      case 'in_progress': return 'bg-amber-900/40 text-amber-400 border-amber-800';
      case 'resolved': return 'bg-green-900/40 text-green-400 border-green-800';
      case 'wontfix': return 'bg-gray-800 text-gray-400 border-gray-700';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const handleExport = async (type: string) => {
    setExportLoading(type);
    setExportError(null);
    try {
      const { generateJsonReport, generateMarkdownReport } = await import('@core/report-generator');
      const { generatePlaywrightSpec } = await import('@core/playwright-codegen');
      const { generateZipBundle } = await import('@core/zip-bundler');
      const { getRecordingChunks, getActionsBySession, getFeaturesBySession, getScreenshotsBySession } = await import('@core/db');

      if (!session) return;

      if (type === 'publish') {
        const { publishSession } = await import('@core/publish');
        const [actions, features, screenshots, chunks] = await Promise.all([
          getActionsBySession(sessionId),
          getFeaturesBySession(sessionId),
          getScreenshotsBySession(sessionId),
          getRecordingChunks(sessionId),
        ]);
        await publishSession(session, bugs, features, actions, screenshots, chunks);
        return;
      }

      if (type === 'bugs-features') {
        const { generateBugFeatureMd } = await import('@core/report-generator');
        const md = generateBugFeatureMd(session, bugs, features);
        triggerDownload(md, `bugs-features-${sessionId}.md`, 'text/markdown');
      } else if (type === 'report') {
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
        const replayUrl = chrome.runtime.getURL(`src/replay-viewer/replay-viewer.html?sessionId=${sessionId}`);
        chrome.tabs.create({ url: replayUrl }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[Vigil] Failed to open replay tab:', chrome.runtime.lastError.message);
          }
        });
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
        const date = new Date(session.startedAt).toISOString().split('T')[0];
        const slug = session.name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
        const filename = `vigil-${slug}-${date}.zip`;
        await new Promise<void>((resolve, reject) => {
          chrome.downloads.download({ url, filename, saveAs: true, conflictAction: 'overwrite' }, (id) => {
            URL.revokeObjectURL(url);
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (id === undefined) reject(new Error('Download failed'));
            else resolve();
          });
        });
      }
    } catch (err) {
      console.error('[Vigil] Export failed:', err);
      setExportError(err instanceof Error ? err.message : 'Export failed');
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
      <div className="flex flex-col gap-1 px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
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
        {session.project && (
          <div className="text-[10px] text-gray-500 pl-8 truncate" title={session.outputPath}>
            📁 {session.project} {session.outputPath ? `(${session.outputPath})` : ''}
          </div>
        )}
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
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg bg-gray-800/60 p-2 text-center">
            <p className="text-gray-400">Bugs</p>
            <p data-testid="session-bug-count" className="text-white font-bold text-base mt-0.5">
              {session.bugCount}
            </p>
          </div>
          <div className="rounded-lg bg-gray-800/60 p-2 text-center">
            <p className="text-gray-400">Annotations</p>
            <p data-testid="session-annotation-count" className="text-white font-bold text-base mt-0.5">
              {annotations.length}
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
                  <select
                    value={bug.status}
                    onChange={(e) => handleBugStatusUpdate(bug.id, e.target.value)}
                    className={`shrink-0 cursor-pointer outline-none px-1 py-0.5 rounded border text-[10px] font-bold transition-colors appearance-none text-center ${getBugStatusColor(bug.status)}`}
                    title="Change status"
                  >
                    <option value="open" className="bg-gray-900 text-red-400">OPEN</option>
                    <option value="in_progress" className="bg-gray-900 text-amber-400">IN PROGRESS</option>
                    <option value="resolved" className="bg-gray-900 text-green-400">RESOLVED</option>
                    <option value="wontfix" className="bg-gray-900 text-gray-400">WONTFIX</option>
                  </select>
                  <span className="text-gray-200 truncate" title={bug.title}>{bug.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features list */}
        {features.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Features</p>
            <div className="flex flex-col gap-1.5">
              {features.map((feature) => (
                <div key={feature.id} className="flex flex-col gap-1.5 rounded-lg bg-gray-800/40 p-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold bg-blue-900/40 text-blue-400 border-blue-800">
                      {feature.featureType}
                    </span>
                    <span className="text-gray-200 truncate flex-1" title={feature.title}>{feature.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-500 text-[10px] uppercase">Sprint:</span>
                    <input
                      type="text"
                      className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors"
                      placeholder="e.g. Sprint 04"
                      defaultValue={feature.sprintRef || ''}
                      onBlur={(e) => handleFeatureSprintUpdate(feature.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inspected elements */}
        {inspectedElements.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Inspected Elements</p>
            <div className="flex flex-col gap-1.5">
              {inspectedElements.map((el) => (
                <div key={el.id} className="flex items-start gap-2 rounded-lg bg-gray-800/40 p-2 text-xs">
                  <span className="shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold bg-indigo-900/40 text-indigo-400 border-indigo-800">
                    {el.tagName}
                  </span>
                  <span className="font-mono text-gray-300 text-[10px] truncate flex-1" title={el.selector}>
                    {el.selector}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export buttons */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Export</p>
          {exportError && (
            <div data-testid="export-error" className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {exportError}
            </div>
          )}
          <button
            data-testid="btn-download-report"
            onClick={() => handleExport('report')}
            disabled={exportLoading !== null}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {exportLoading === 'report' ? '⏳ Generating…' : '📄 Download Report (JSON + MD)'}
          </button>
          <button
            data-testid="btn-export-bugs-features"
            onClick={() => handleExport('bugs-features')}
            disabled={exportLoading !== null}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {exportLoading === 'bugs-features' ? '⏳ Generating…' : '🐛 Export Bugs & Features MD'}
          </button>
          <button
            data-testid="btn-watch-replay"
            onClick={() => handleExport('replay')}
            disabled={exportLoading !== null}
            className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-xs font-medium text-white transition-colors"
          >
            {exportLoading === 'replay' ? '⏳ Opening…' : '▶ Watch Replay'}
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
            className="w-full text-left px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
          >
            {exportLoading === 'zip' ? '⏳ Generating…' : '📦 Export ZIP (Save As…)'}
          </button>
          {session.outputPath && (
            <button
              data-testid="btn-publish"
              onClick={() => handleExport('publish')}
              disabled={exportLoading !== null}
              className="w-full text-left px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
            >
              {exportLoading === 'publish' ? '⏳ Publishing…' : '🚀 Publish to Output Path'}
            </button>
          )}
        </div>

        {/* End Session — only for active sessions */}
        {(session.status === SessionStatus.RECORDING || session.status === SessionStatus.PAUSED) && (
          <div className="pt-2 border-t border-gray-800">
            <button
              data-testid="btn-end-session"
              onClick={handleEndSession}
              disabled={ending}
              className="w-full text-xs py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {ending ? 'Ending session…' : 'End Session & Save'}
            </button>
          </div>
        )}

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

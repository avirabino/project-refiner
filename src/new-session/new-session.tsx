/**
 * @file new-session.tsx
 * @description Standalone tab entry point for the New Recording Session form (S07-16).
 * Project-oriented: required project field, auto-sprint detection, auto-generated name.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageType } from '@shared/types';
import type { Session } from '@shared/types';
import { generateSessionName } from '@shared/utils';
import {
  isDirectoryPickerAvailable,
  pickProjectDirectory,
  type SprintEntry,
} from '@shared/directory-handle';
import '@popup/popup.css';

interface SessionHistory {
  lastProject: string;
  lastSprint: string;
  recentProjects: string[];
}

const HISTORY_KEY = 'vigilSessionHistory';

const NewSessionTab: React.FC = () => {
  // Form state
  const [project, setProject] = useState('');
  const [sprint, setSprint] = useState('');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [recordMouseMove, setRecordMouseMove] = useState(false);

  // Tab state
  const [activeTabUrl, setActiveTabUrl] = useState('');
  const [activeTabId, setActiveTabId] = useState<number | undefined>(undefined);

  // Sprint auto-detect
  const [sprints, setSprints] = useState<SprintEntry[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [projectExists, setProjectExists] = useState<boolean | null>(null);

  // Browse state (File System Access API)
  const canBrowse = isDirectoryPickerAvailable();
  const projectHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [rootMarkers, setRootMarkers] = useState<string[]>([]);
  const [browsed, setBrowsed] = useState(false);

  // History
  const [history, setHistory] = useState<SessionHistory>({ lastProject: '', lastSprint: '', recentProjects: [] });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sessionSequence, setSessionSequence] = useState(1);

  useEffect(() => {
    chrome.storage.local.get(['refineOriginTabId', 'refineOriginTabUrl', HISTORY_KEY], (res) => {
      const tabId = res.refineOriginTabId as number | undefined;
      const tabUrl = (res.refineOriginTabUrl as string) || '';
      if (tabId) setActiveTabId(tabId);
      if (tabUrl) setActiveTabUrl(tabUrl);

      const saved = res[HISTORY_KEY] as SessionHistory | undefined;
      if (saved) {
        setHistory(saved);
        if (saved.lastProject) {
          setProject(saved.lastProject);
          if (saved.lastSprint) setSprint(saved.lastSprint);
        }
      }
    });

    import('@core/db').then(({ getSessionsForToday }) => {
      getSessionsForToday().then(sessions => {
        setSessionSequence(sessions.length + 1);
      });
    });
  }, []);

  // Auto-generate session name when project changes
  useEffect(() => {
    if (!nameEdited && project.trim()) {
      setName(generateSessionName(project.trim(), sessionSequence));
    }
  }, [project, sessionSequence, nameEdited]);

  // Fetch sprints when project path changes (debounced)
  const fetchSprints = useCallback((projectPath: string) => {
    if (!projectPath.trim()) {
      setSprints([]);
      setProjectExists(null);
      return;
    }

    setSprintsLoading(true);
    try {
      chrome.runtime.sendMessage(
        { type: MessageType.GET_PROJECT_SPRINTS, payload: { projectPath: projectPath.trim() }, source: 'new-session-tab' },
        (response) => {
          setSprintsLoading(false);
          if (chrome.runtime.lastError || !response?.ok) {
            setSprints([]);
            setProjectExists(null);
            return;
          }
          const data = response.data as { exists: boolean; sprints: SprintEntry[]; current: string | null };
          setProjectExists(data.exists);
          setSprints(data.sprints);
          if (data.current && !sprint) {
            setSprint(data.current);
          }
        }
      );
    } catch {
      setSprintsLoading(false);
    }
  }, [sprint]);

  // Skip server-side sprint fetch when project was selected via Browse (client-side detection)
  useEffect(() => {
    if (browsed) return; // sprints already detected client-side
    const timer = setTimeout(() => fetchSprints(project), 500);
    return () => clearTimeout(timer);
  }, [project, fetchSprints, browsed]);

  const handleNameChange = (val: string) => {
    setName(val);
    setNameEdited(true);
  };

  // File System Access API — Browse for project folder
  const handleBrowse = async () => {
    try {
      const result = await pickProjectDirectory();
      projectHandleRef.current = result.handle;
      setProject(result.name);
      setBrowsed(true);
      setRootMarkers(result.rootMarkers);
      setProjectExists(true);

      // Use client-side sprint detection instead of server roundtrip
      if (result.sprints.length > 0) {
        setSprints(result.sprints);
        // Auto-select the latest sprint
        const latest = result.sprints[result.sprints.length - 1];
        if (!sprint) setSprint(latest.id);
      } else {
        setSprints([]);
      }

      // Persist handle for future sessions
      import('@core/db').then(({ storeProjectHandle }) => {
        storeProjectHandle(result.name, result.handle);
      });
    } catch (e) {
      // User cancelled the picker (AbortError) — silently ignore
      if ((e as DOMException)?.name !== 'AbortError') {
        console.warn('[Vigil] Browse failed:', e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim()) return;

    setLoading(true);
    setError(null);

    const sessionName = name.trim() || generateSessionName(project.trim(), sessionSequence);
    const projectKey = project.trim();
    const sprintKey = sprint.trim() || undefined;

    // Note: .vigil/ directory creation removed — too invasive for first-time projects.
    // Will be opt-in via explicit user action in a future sprint.

    // Save history
    const updatedHistory: SessionHistory = {
      lastProject: projectKey,
      lastSprint: sprintKey ?? '',
      recentProjects: [projectKey, ...history.recentProjects.filter(p => p !== projectKey)].slice(0, 10),
    };
    chrome.storage.local.set({ [HISTORY_KEY]: updatedHistory });

    try {
      chrome.runtime.sendMessage(
        {
          type: MessageType.CREATE_SESSION,
          payload: {
            name: sessionName,
            description: description.trim(),
            project: projectKey,
            sprint: sprintKey,
            tags: [],
            url: activeTabUrl,
            tabId: activeTabId,
            recordMouseMove,
          },
          source: 'new-session-tab',
        },
        (response: { ok: boolean; data?: Session; error?: string }) => {
          setLoading(false);
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message ?? 'Failed to start session');
            return;
          }
          if (response?.ok) {
            setDone(true);
            if (activeTabId) {
              chrome.tabs.update(activeTabId, { active: true }, () => {
                if (chrome.runtime.lastError) {
                  console.warn('[Vigil] Tab switch failed:', chrome.runtime.lastError.message);
                }
                setTimeout(() => window.close(), 400);
              });
            } else {
              setTimeout(() => window.close(), 1200);
            }
          } else {
            setError(response?.error ?? 'Failed to start session');
          }
        }
      );
    } catch {
      setLoading(false);
      setError('Extension context invalidated — reload the extension');
    }
  };

  const handleCancel = () => {
    window.close();
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">{'\u2705'}</div>
          <p className="text-white font-semibold text-lg">Recording started!</p>
          <p className="text-gray-400 text-sm mt-1">Switch back to your target tab — the control bar is active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-indigo-400 text-lg">{'\u2B21'}</span>
            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">SynaptixLabs Vigil</span>
          </div>
          <h1 className="text-xl font-bold text-white">New Session</h1>
          {activeTabUrl && (
            <p className="text-xs text-gray-500 mt-1 truncate">Recording on: {activeTabUrl}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* 1. Project (REQUIRED) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Project <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                list="projects-list"
                data-testid="input-project-name"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder={canBrowse ? 'Browse or type project name' : 'e.g. TaskPilot'}
                value={project}
                onChange={(e) => { setProject(e.target.value); setBrowsed(false); projectHandleRef.current = null; setRootMarkers([]); }}
                autoFocus
                required
              />
              {canBrowse && (
                <button
                  type="button"
                  onClick={handleBrowse}
                  data-testid="btn-browse-project"
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 font-medium transition-colors whitespace-nowrap"
                  title="Open folder picker"
                >
                  Browse
                </button>
              )}
            </div>
            <datalist id="projects-list">
              {history.recentProjects.map(p => <option key={p} value={p} />)}
            </datalist>
            {/* Root marker indicators (shown after Browse) */}
            {browsed && rootMarkers.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {rootMarkers.map(m => (
                  <span key={m} className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-900/20 border border-green-800/40 rounded px-1.5 py-0.5">
                    {'\u2713'} {m}
                  </span>
                ))}
              </div>
            )}
            {browsed && rootMarkers.length === 0 && (
              <p className="mt-1 text-[10px] text-yellow-500">No project root markers found (.git, package.json) — verify correct folder</p>
            )}
            {!browsed && project.trim() && projectExists === false && (
              <p className="mt-1 text-[10px] text-yellow-500">Folder not found — sprint auto-detect unavailable</p>
            )}
          </div>

          {/* 2. Sprint (auto-detected or manual) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Sprint
              {sprintsLoading && <span className="ml-1.5 text-gray-600 font-normal">detecting...</span>}
            </label>
            {sprints.length > 0 ? (
              <select
                data-testid="select-sprint"
                value={sprint}
                onChange={(e) => setSprint(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="">— Select sprint —</option>
                {sprints.map(s => (
                  <option key={s.name} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                data-testid="input-sprint"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="e.g. sprint_07"
                value={sprint}
                onChange={(e) => setSprint(e.target.value)}
              />
            )}
          </div>

          {/* 3. Session Name (auto-generated, editable) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Session Name
              {!nameEdited && project.trim() && <span className="ml-1.5 text-gray-600 font-normal">(auto)</span>}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Auto-generated from project"
              data-testid="input-session-name"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* 4. Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Description <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              placeholder="What are you testing?"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-description"
            />
          </div>

          {/* 5. Record mouse movements */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="record-mouse-move"
              checked={recordMouseMove}
              onChange={(e) => setRecordMouseMove(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 cursor-pointer flex-shrink-0"
              data-testid="toggle-record-mouse-move"
            />
            <label htmlFor="record-mouse-move" className="text-xs text-gray-400 cursor-pointer select-none">
              Record mouse movements <span className="text-gray-600">(increases replay file size)</span>
            </label>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!project.trim() || loading}
              data-testid="btn-start-recording"
              className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {loading ? 'Starting\u2026' : '\u25B6 Start Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<NewSessionTab />);
}

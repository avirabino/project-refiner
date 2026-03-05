/**
 * @file NewSession.tsx
 * @description Project-oriented session creation form (S07-16).
 * Sends CREATE_SESSION to background with project, sprint, auto-generated name.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MessageType } from '@shared/types';
import type { Session } from '@shared/types';
import { generateSessionName } from '@shared/utils';

interface NewSessionProps {
  onBack: () => void;
  onCreated: (session: Session) => void;
}

interface SprintEntry {
  id: string;
  name: string;
}

interface SessionHistory {
  lastProject: string;
  lastSprint: string;
  recentProjects: string[];
}

const HISTORY_KEY = 'vigilSessionHistory';

const NewSession: React.FC<NewSessionProps> = ({ onBack, onCreated }) => {
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

  // History
  const [history, setHistory] = useState<SessionHistory>({ lastProject: '', lastSprint: '', recentProjects: [] });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSequence, setSessionSequence] = useState(1);

  // Load history + active tab + config sprint on mount
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const target = tabs.find(
        t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://')
      );
      if (target?.url) {
        setActiveTabUrl(target.url);
        setActiveTabId(target.id);
      } else {
        setError('No active tab found. Navigate to a webpage before starting a session.');
      }
    });

    chrome.storage.local.get([HISTORY_KEY], (res) => {
      const saved = res[HISTORY_KEY] as SessionHistory | undefined;
      if (saved) {
        setHistory(saved);
        if (saved.lastProject) {
          setProject(saved.lastProject);
          if (saved.lastSprint) setSprint(saved.lastSprint);
        }
      }
    });

    // Read sprintCurrent from bundled vigil.config.json as fallback
    fetch(chrome.runtime.getURL('vigil.config.json'))
      .then(r => r.json())
      .then((config: { sprintCurrent?: string }) => {
        if (config.sprintCurrent) {
          setSprint(prev => prev || config.sprintCurrent!);
        }
      })
      .catch(() => {});

    // Count today's sessions for auto-name sequence
    import('@core/db').then(({ getSessionsForToday }) => {
      getSessionsForToday().then(sessions => {
        setSessionSequence(sessions.length + 1);
      });
    });
  }, []);

  // Auto-generate session name when project changes (unless user edited)
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
        { type: MessageType.GET_PROJECT_SPRINTS, payload: { projectPath: projectPath.trim() }, source: 'popup' },
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

  // Debounce project path changes
  useEffect(() => {
    const timer = setTimeout(() => fetchSprints(project), 500);
    return () => clearTimeout(timer);
  }, [project, fetchSprints]);

  const handleNameChange = (val: string) => {
    setName(val);
    setNameEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim()) return;

    setLoading(true);
    setError(null);

    const sessionName = name.trim() || generateSessionName(project.trim(), sessionSequence);
    const projectKey = project.trim();
    const sprintKey = sprint.trim() || undefined;

    // Save history
    const updatedHistory: SessionHistory = {
      lastProject: projectKey,
      lastSprint: sprintKey ?? '',
      recentProjects: [projectKey, ...history.recentProjects.filter(p => p !== projectKey)].slice(0, 10),
    };
    chrome.storage.local.set({ [HISTORY_KEY]: updatedHistory });
    setHistory(updatedHistory);

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
          source: 'popup',
        },
        (response) => {
          setLoading(false);
          if (chrome.runtime.lastError) {
            setError(chrome.runtime.lastError.message ?? 'Failed to start session');
            return;
          }
          if (response?.ok && response.data) {
            onCreated(response.data as Session);
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-800 flex-shrink-0">
        <h2 className="text-base font-bold text-white flex-1">New Session</h2>
      </div>

      {/* Scrollable form body */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2">

          {/* 1. Project (REQUIRED) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Project <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              list="projects-list"
              data-testid="input-project-name"
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="e.g. TaskPilot"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              autoFocus
              required
            />
            <datalist id="projects-list">
              {history.recentProjects.map(p => <option key={p} value={p} />)}
            </datalist>
            {project.trim() && projectExists === false && !sprint && (
              <p className="mt-1 text-[10px] text-yellow-500">Folder not found — enter sprint manually</p>
            )}
            {project.trim() && projectExists === true && sprints.length === 0 && (
              <p className="mt-1 text-[10px] text-gray-500">No docs/sprints/ folder found — enter sprint manually</p>
            )}
            <button
              type="button"
              className="mt-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
              onClick={() => {
                // Save origin tab info so the standalone tab knows which tab to record
                const info: Record<string, unknown> = {};
                if (activeTabId) info.refineOriginTabId = activeTabId;
                if (activeTabUrl) info.refineOriginTabUrl = activeTabUrl;
                chrome.storage.local.set(info, () => {
                  chrome.tabs.create({ url: chrome.runtime.getURL('src/new-session/new-session.html') });
                  window.close();
                });
              }}
            >
              Open in tab for folder picker &rarr;
            </button>
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
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* 4. Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Description <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              placeholder="What are you testing?"
              rows={1}
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

          {/* 6. Starting URL (read-only) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Starting URL
            </label>
            <div className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-500 truncate" title={activeTabUrl}>
              {activeTabUrl || 'Loading\u2026'}
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Sticky footer: Cancel + Start Session */}
        <div className="flex gap-2 px-4 py-2 border-t border-gray-800 flex-shrink-0 bg-gray-950">
          <button
            type="button"
            onClick={onBack}
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
  );
};

export default NewSession;

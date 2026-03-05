/**
 * @file NewSession.tsx
 * @description Simplified session creation form — project dropdown + name + description.
 * Projects are created/managed from the dashboard, NOT the extension.
 * Sprint is derived from the project's currentSprint (set in dashboard).
 */

import React, { useState, useEffect } from 'react';
import { MessageType } from '@shared/types';
import type { Session, ProjectInfo } from '@shared/types';
import { generateSessionName } from '@shared/utils';

interface NewSessionProps {
  onBack: () => void;
  onCreated: (session: Session) => void;
}

const DEFAULT_DASHBOARD_URL = 'http://localhost:7474/dashboard';

/** Read vigil.config.json (bundled in extension) and derive dashboard URL. */
async function loadDashboardUrl(): Promise<string> {
  try {
    const configUrl = chrome.runtime.getURL('vigil.config.json');
    const res = await fetch(configUrl);
    if (res.ok) {
      const config = await res.json();
      const serverUrl: string = config.serverUrl ?? `http://localhost:${config.serverPort ?? 7474}`;
      return `${serverUrl}/dashboard`;
    }
  } catch {
    // config not bundled — use default
  }
  return DEFAULT_DASHBOARD_URL;
}

const NewSession: React.FC<NewSessionProps> = ({ onBack, onCreated }) => {
  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [name, setName] = useState('');
  const [nameEdited, setNameEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [recordMouseMove, setRecordMouseMove] = useState(false);

  // Projects from server
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Dashboard URL (derived from vigil.config.json serverUrl)
  const [dashboardUrl, setDashboardUrl] = useState(DEFAULT_DASHBOARD_URL);

  // Tab state
  const [activeTabUrl, setActiveTabUrl] = useState('');
  const [activeTabId, setActiveTabId] = useState<number | undefined>(undefined);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSequence, setSessionSequence] = useState(1);

  /** Fetch projects from server via background and return the list. */
  const fetchProjects = (callback?: (list: ProjectInfo[]) => void) => {
    chrome.runtime.sendMessage(
      { type: MessageType.GET_PROJECTS, payload: {}, source: 'popup' },
      (response) => {
        setProjectsLoading(false);
        if (chrome.runtime.lastError || !response?.ok) {
          setProjectsError('Could not load projects — is vigil-server running?');
          return;
        }
        const list = (response.data?.projects ?? []) as ProjectInfo[];
        setProjects(list);
        callback?.(list);
      }
    );
  };

  // Load config, projects, and active tab on mount
  useEffect(() => {
    // Load dashboard URL from vigil.config.json
    loadDashboardUrl().then(setDashboardUrl);

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

    // Fetch projects and handle auto-select for newly created projects
    fetchProjects((list) => {
      chrome.storage.local.get(['vigilLastProjectId', 'vigilAwaitingNewProject', 'vigilKnownProjectIds'], (res) => {
        const awaiting = res.vigilAwaitingNewProject as boolean | undefined;
        const knownIds = res.vigilKnownProjectIds as string[] | undefined;

        if (awaiting && knownIds) {
          // Find newly created project(s) — select the first new one
          const newProject = list.find(p => !knownIds.includes(p.id));
          if (newProject) {
            setSelectedProjectId(newProject.id);
            chrome.storage.local.set({ vigilLastProjectId: newProject.id });
          }
          // Clear the awaiting flag
          chrome.storage.local.remove(['vigilAwaitingNewProject', 'vigilKnownProjectIds']);
        } else {
          // Normal flow — auto-select last used project
          const lastId = res.vigilLastProjectId as string | undefined;
          if (lastId && list.some(p => p.id === lastId)) {
            setSelectedProjectId(lastId);
          }
        }
      });
    });

    // Count today's sessions for auto-name sequence
    import('@core/db').then(({ getSessionsForToday }) => {
      getSessionsForToday().then(sessions => {
        setSessionSequence(sessions.length + 1);
      });
    });
  }, []);

  // Auto-generate session name when project changes (unless user edited)
  useEffect(() => {
    if (!nameEdited && selectedProjectId) {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj) {
        setName(generateSessionName(proj.name, sessionSequence));
      }
    }
  }, [selectedProjectId, sessionSequence, nameEdited, projects]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleNameChange = (val: string) => {
    setName(val);
    setNameEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    setLoading(true);
    setError(null);

    const proj = projects.find(p => p.id === selectedProjectId);
    const sessionName = name.trim() || generateSessionName(proj?.name ?? selectedProjectId, sessionSequence);
    const sprint = proj?.currentSprint || undefined;

    // Remember last project
    chrome.storage.local.set({ vigilLastProjectId: selectedProjectId });

    try {
      chrome.runtime.sendMessage(
        {
          type: MessageType.CREATE_SESSION,
          payload: {
            name: sessionName,
            description: description.trim(),
            project: selectedProjectId,
            sprint,
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

  const openDashboardProjects = () => {
    chrome.tabs.create({ url: `${dashboardUrl}#projects` });
  };

  const openNewProject = () => {
    // Save current project IDs so we can detect the new one when popup reopens
    const knownIds = projects.map(p => p.id);
    chrome.storage.local.set({
      vigilAwaitingNewProject: true,
      vigilKnownProjectIds: knownIds,
    });
    chrome.tabs.create({ url: `${dashboardUrl}#new-project` });
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

          {/* 1. Project dropdown (REQUIRED) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Project <span className="text-red-400">*</span>
            </label>
            {projectsLoading ? (
              <div className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-500">
                Loading projects...
              </div>
            ) : projectsError ? (
              <div className="w-full bg-gray-900 border border-red-800 rounded-md px-3 py-1.5 text-sm text-red-400">
                {projectsError}
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs text-gray-500 mb-2">No projects yet</p>
                <button
                  type="button"
                  onClick={openNewProject}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Create your first project in the dashboard &rarr;
                </button>
              </div>
            ) : (
              <select
                data-testid="select-project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              >
                <option value="">— Select project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {selectedProject?.currentSprint && (
              <p className="mt-1 text-[10px] text-gray-500">
                Sprint: {selectedProject.currentSprint}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={openNewProject}
              >
                + New Project
              </button>
              <span className="text-[10px] text-gray-700">|</span>
              <button
                type="button"
                className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                onClick={openDashboardProjects}
              >
                Manage Projects
              </button>
            </div>
          </div>

          {/* 2. Session Name (auto-generated, editable) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Session Name
              {!nameEdited && selectedProjectId && <span className="ml-1.5 text-gray-600 font-normal">(auto)</span>}
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

          {/* 3. Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Description <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              placeholder="What are you testing?"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-description"
            />
          </div>

          {/* 4. Record mouse movements */}
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

          {/* 5. Starting URL (read-only) */}
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
            disabled={!selectedProjectId || loading}
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

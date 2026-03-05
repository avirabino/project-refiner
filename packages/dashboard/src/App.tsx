import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBugs, fetchFeatures, fetchSprints, fetchHealth, fetchSessions, fetchSession, deleteSession, fetchProjects } from './api';
import type { BugItem, FeatureItem, HealthStatus, SessionSummary, SessionDetail as SessionDetailType, ProjectItem } from './types';
import { Sidebar } from './components/Sidebar';
import { SprintSelector } from './components/SprintSelector';
import { HealthIndicator } from './components/HealthIndicator';
import { BugList } from './views/BugList';
import { FeatureList } from './views/FeatureList';
import { SessionList } from './views/SessionList';
import { SessionDetail } from './views/SessionDetail';
import { ProjectList } from './views/ProjectList';

type Tab = 'bugs' | 'features' | 'sessions' | 'projects';

const TAB_CONFIG: { key: Tab; label: string; icon: string }[] = [
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'sessions', label: 'Sessions', icon: '📹' },
  { key: 'bugs', label: 'Bugs', icon: '🐛' },
  { key: 'features', label: 'Features', icon: '✨' },
];

export default function App() {
  // ── Global state ──────────────────────────────────────────────────────────
  const [sprints, setSprints] = useState<string[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [health, setHealth] = useState<HealthStatus>({ status: 'error' });
  const [autoCreateProject, setAutoCreateProject] = useState(false);

  // Derive initial tab + auto-create from URL hash (#new-project, #projects, #sessions, etc.)
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'new-project') return 'projects';
    if (hash === 'sessions' || hash === 'bugs' || hash === 'features' || hash === 'projects') return hash;
    return 'projects';
  });

  // ── Bugs & Features state ─────────────────────────────────────────────────
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // ── Projects state ───────────────────────────────────────────────────────
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // ── Session state ─────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [sessionSprintFilter, setSessionSprintFilter] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ── Hash routing (#new-project → auto-show create form) ──────────────────
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'new-project') {
      setAutoCreateProject(true);
      // Clear hash so refresh doesn't re-trigger
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // ── Health polling ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchHealth().then(setHealth);
    const interval = setInterval(() => fetchHealth().then(setHealth), 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Load sprints ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSprints()
      .then(({ ids, current }) => {
        setSprints(ids);
        if (!selectedSprint) setSelectedSprint(current || ids[ids.length - 1] || '');
      })
      .catch(() => setDataError('Could not load sprints — is vigil-server running?'));
  }, [selectedSprint]);

  // ── Load projects ────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const list = await fetchProjects();
      setProjectItems(list);
    } catch {
      // Silently fail — projects sidebar will just be empty
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ── Load bugs & features (for bugs/features tabs) ─────────────────────────
  const loadBugsAndFeatures = useCallback(async () => {
    if (!selectedSprint) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const [b, f] = await Promise.all([
        fetchBugs(selectedSprint),
        fetchFeatures(selectedSprint),
      ]);
      setBugs(b);
      setFeatures(f);
    } catch {
      setDataError('Could not load data — is vigil-server running on port 7474?');
    } finally {
      setDataLoading(false);
    }
  }, [selectedSprint]);

  useEffect(() => {
    loadBugsAndFeatures();
  }, [loadBugsAndFeatures]);

  // ── Load sessions ─────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const list = await fetchSessions(
        selectedProject || undefined,
        sessionSprintFilter || undefined,
      );
      list.sort((a, b) => b.startedAt - a.startedAt);
      setSessions(list);
    } catch {
      setSessionsError('Could not load sessions — is vigil-server running on port 7474?');
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedProject, sessionSprintFilter]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Load session detail ───────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetail(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    fetchSession(selectedSessionId)
      .then(setSessionDetail)
      .catch(() => setDetailError('Could not load session details.'))
      .finally(() => setDetailLoading(false));
  }, [selectedSessionId]);

  const sessionSprints = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.sprint) set.add(s.sprint);
    });
    return Array.from(set).sort();
  }, [sessions]);

  // ── Event handlers ────────────────────────────────────────────────────────
  function handleProjectSelect(project: string) {
    setSelectedProject(project);
    setSelectedSessionId(null);
    setSessionDetail(null);
  }

  function handleSessionSelect(sessionId: string) {
    setSelectedSessionId(sessionId);
  }

  function handleBackToList() {
    setSelectedSessionId(null);
    setSessionDetail(null);
  }

  async function handleDeleteSession(sessionId: string) {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setSessionDetail(null);
      }
    } catch {
      // Silently fail
    }
  }

  const tabCounts: Record<Tab, number> = {
    sessions: sessions.length,
    bugs: bugs.length,
    features: features.length,
    projects: projectItems.length,
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderSessionsContent() {
    if (selectedSessionId) {
      return (
        <div>
          <button
            data-testid="back-to-sessions"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            onClick={handleBackToList}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to sessions
          </button>
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : detailError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {detailError}
            </div>
          ) : sessionDetail ? (
            <SessionDetail session={sessionDetail} />
          ) : null}
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <SprintSelector
            sprints={sessionSprints}
            selected={sessionSprintFilter}
            onChange={setSessionSprintFilter}
            showAll
          />
          <span className="text-sm text-slate-500">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : sessionsError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {sessionsError}
          </div>
        ) : (
          <SessionList
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={handleSessionSelect}
            onDelete={handleDeleteSession}
          />
        )}
      </div>
    );
  }

  return (
    <div data-testid="dashboard-root" className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-950 to-indigo-900 px-6 py-3.5 shrink-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Vigil</h1>
            </div>
            {(activeTab === 'bugs' || activeTab === 'features') && (
              <SprintSelector
                sprints={sprints}
                selected={selectedSprint}
                onChange={setSelectedSprint}
                dark
              />
            )}
          </div>
          <HealthIndicator health={health} />
        </div>
      </header>

      {/* Body: Sidebar + Main */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          projects={projectItems}
          selectedProject={selectedProject}
          onSelectProject={handleProjectSelect}
          onManageProjects={() => setActiveTab('projects')}
        />

        <main className="flex-1 px-8 py-6 overflow-y-auto custom-scrollbar">
          {/* Tab bar */}
          <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
            {TAB_CONFIG.map(({ key, label, icon }) => (
              <button
                key={key}
                data-testid={`tab-${key}`}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                onClick={() => setActiveTab(key)}
              >
                <span className="mr-1.5">{icon}</span>
                {label}
                <span className={`ml-1.5 text-xs ${
                  activeTab === key ? 'text-indigo-600' : 'text-slate-400'
                }`}>
                  {tabCounts[key]}
                </span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'sessions' ? (
            renderSessionsContent()
          ) : activeTab === 'bugs' ? (
            <>
              {dataError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {dataError}
                </div>
              )}
              {dataLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : (
                <BugList bugs={bugs} onRefresh={loadBugsAndFeatures} />
              )}
            </>
          ) : activeTab === 'features' ? (
            <>
              {dataError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  {dataError}
                </div>
              )}
              {dataLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : (
                <FeatureList features={features} />
              )}
            </>
          ) : activeTab === 'projects' ? (
            projectsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <ProjectList
                projects={projectItems}
                onRefresh={loadProjects}
                autoCreate={autoCreateProject}
                onAutoCreateConsumed={() => setAutoCreateProject(false)}
              />
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}

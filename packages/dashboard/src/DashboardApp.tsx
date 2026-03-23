/**
 * DashboardApp — the original dashboard view (bugs, features, sessions, projects)
 *
 * Extracted from the original App.tsx to work inside React Router.
 * This is the main authenticated dashboard content.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBugs, fetchFeatures, fetchSprints, fetchHealth, fetchSessions, fetchSession, deleteSession, fetchProjects, restoreSession } from './api';
import type { BugItem, FeatureItem, HealthStatus, SessionSummary, SessionDetail as SessionDetailType, ProjectItem } from './types';
import { Sidebar } from './components/Sidebar';
import { SprintSelector } from './components/SprintSelector';
import { HealthIndicator } from './components/HealthIndicator';
import { BugList } from './views/BugList';
import { FeatureList } from './views/FeatureList';
import { SessionList } from './views/SessionList';
import { SessionDetail } from './views/SessionDetail';
import { ProjectList } from './views/ProjectList';
import { useAuth } from './modules/auth/hooks/useAuth';

type Tab = 'bugs' | 'features' | 'sessions' | 'projects';

const TAB_CONFIG: { key: Tab; label: string; icon: string }[] = [
  { key: 'projects', label: 'Projects', icon: '📁' },
  { key: 'sessions', label: 'Sessions', icon: '📹' },
  { key: 'bugs', label: 'Bugs', icon: '🐛' },
  { key: 'features', label: 'Features', icon: '✨' },
];

export function DashboardApp() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ── Global state ──────────────────────────────────────────────────────────
  const [sprints, setSprints] = useState<string[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [health, setHealth] = useState<HealthStatus>({ status: 'error' });
  const [autoCreateProject, setAutoCreateProject] = useState(false);

  // ── Archive toggle state ────────────────────────────────────────────────
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);
  const [showArchivedSessions, setShowArchivedSessions] = useState(false);
  const [showArchivedBugs, setShowArchivedBugs] = useState(false);
  const [showArchivedFeatures, setShowArchivedFeatures] = useState(false);

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
      .then(({ ids }) => {
        setSprints(ids);
      })
      .catch(() => setDataError('Could not load sprints — is vigil-server running?'));
  }, []);

  // ── Load projects ────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const list = await fetchProjects(showArchivedProjects);
      setProjectItems(list);
    } catch {
      // Silently fail — projects sidebar will just be empty
    } finally {
      setProjectsLoading(false);
    }
  }, [showArchivedProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ── Load bugs & features (for bugs/features tabs) ─────────────────────────
  const loadBugsAndFeatures = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const sprintArg = selectedSprint || undefined;
      const [b, f] = await Promise.all([
        fetchBugs(sprintArg, undefined, showArchivedBugs),
        fetchFeatures(sprintArg, undefined, showArchivedFeatures),
      ]);
      setBugs(b);
      setFeatures(f);
    } catch {
      setDataError('Could not load data — is vigil-server running on port 7474?');
    } finally {
      setDataLoading(false);
    }
  }, [selectedSprint, showArchivedBugs, showArchivedFeatures]);

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
        showArchivedSessions,
      );
      list.sort((a, b) => b.startedAt - a.startedAt);
      setSessions(list);
    } catch {
      setSessionsError('Could not load sessions — is vigil-server running on port 7474?');
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedProject, sessionSprintFilter, showArchivedSessions]);

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
    if (project) setActiveTab('sessions');
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
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setSessionDetail(null);
      }
      loadSessions();
    } catch {
      // Silently fail
    }
  }

  async function handleRestoreSession(sessionId: string) {
    try {
      await restoreSession(sessionId);
      loadSessions();
    } catch {
      // Silently fail
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/auth/login');
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
        <div className="flex flex-col h-[calc(100vh-10rem)]">
          <button
            data-testid="back-to-sessions"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-v-accent-400 hover:text-v-accent-300 font-medium transition-colors shrink-0"
            onClick={handleBackToList}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to sessions
          </button>
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-v-accent-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : detailError ? (
            <div className="bg-v-p0/10 border border-v-p0/30 text-v-p0 px-4 py-3 rounded-v-lg text-sm">
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
        </div>
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-v-accent-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessionsError ? (
          <div className="bg-v-p0/10 border border-v-p0/30 text-v-p0 px-4 py-3 rounded-v-lg text-sm">
            {sessionsError}
          </div>
        ) : (
          <SessionList
            sessions={sessions}
            selectedId={selectedSessionId}
            onSelect={handleSessionSelect}
            onDelete={handleDeleteSession}
            onRestore={handleRestoreSession}
            showArchived={showArchivedSessions}
            onToggleArchived={setShowArchivedSessions}
          />
        )}
      </div>
    );
  }

  return (
    <div data-testid="dashboard-root" className="min-h-screen bg-v-bg-base flex flex-col">
      {/* Header */}
      <header className="bg-v-bg-raised border-b border-v-border-subtle px-6 py-3.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-v-lg bg-v-accent-500/20 flex items-center justify-center shadow-v-sm">
                <svg className="w-5 h-5 text-v-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-v-text-primary tracking-tight">Vigil</h1>
            </div>
            {(activeTab === 'bugs' || activeTab === 'features') && (
              <SprintSelector
                sprints={sprints}
                selected={selectedSprint}
                onChange={setSelectedSprint}
                dark
                showAll
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <HealthIndicator health={health} />
            {/* User menu */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard/settings')}
                className="text-sm text-v-text-secondary hover:text-v-text-primary transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <span className="text-sm text-v-text-secondary">{user?.name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-v-text-tertiary hover:text-v-p0 transition-colors px-2 py-1 rounded-v-md hover:bg-v-bg-hover"
              >
                Sign Out
              </button>
            </div>
          </div>
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
          <div className="flex gap-1 mb-6 bg-v-bg-overlay p-1 rounded-v-xl w-fit">
            {TAB_CONFIG.map(({ key, label, icon }) => (
              <button
                key={key}
                data-testid={`tab-${key}`}
                className={`px-4 py-2 text-sm font-medium rounded-v-lg transition-all duration-200 ${
                  activeTab === key
                    ? 'bg-v-bg-raised text-v-text-primary shadow-v-sm'
                    : 'text-v-text-secondary hover:text-v-text-primary'
                }`}
                onClick={() => setActiveTab(key)}
              >
                <span className="mr-1.5">{icon}</span>
                {label}
                <span className={`ml-1.5 text-xs ${
                  activeTab === key ? 'text-v-accent-400' : 'text-v-text-tertiary'
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
                <div className="bg-v-p0/10 border border-v-p0/30 text-v-p0 px-4 py-3 rounded-v-lg mb-4 text-sm">
                  {dataError}
                </div>
              )}
              {dataLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-v-accent-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <BugList bugs={bugs} onRefresh={loadBugsAndFeatures} showArchived={showArchivedBugs} onToggleArchived={setShowArchivedBugs} />
              )}
            </>
          ) : activeTab === 'features' ? (
            <>
              {dataError && (
                <div className="bg-v-p0/10 border border-v-p0/30 text-v-p0 px-4 py-3 rounded-v-lg mb-4 text-sm">
                  {dataError}
                </div>
              )}
              {dataLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-v-accent-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <FeatureList features={features} onRefresh={loadBugsAndFeatures} showArchived={showArchivedFeatures} onToggleArchived={setShowArchivedFeatures} />
              )}
            </>
          ) : activeTab === 'projects' ? (
            projectsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-v-accent-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ProjectList
                projects={projectItems}
                onRefresh={loadProjects}
                autoCreate={autoCreateProject}
                onAutoCreateConsumed={() => setAutoCreateProject(false)}
                showArchived={showArchivedProjects}
                onToggleArchived={setShowArchivedProjects}
                onSelectProject={handleProjectSelect}
              />
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}

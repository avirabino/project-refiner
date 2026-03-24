/**
 * @file SidePanelApp.tsx
 * @description Simple 2-step side panel flow:
 *   Step 1: Select project (auto-detect / pick existing / create new)
 *   Step 2: Start session (once project is selected)
 */

import React, { useState } from 'react';
import { useProjects } from './hooks/useProjects';
import NewProjectForm from './components/NewProjectForm';
import { MessageType } from '@shared/types';
import { VERSION } from '@shared/constants';

const SidePanelApp: React.FC = () => {
  const {
    projects,
    loading,
    error,
    selectedProjectId,
    autoDetected,
    currentTabUrl,
    selectProject,
    refresh: refreshProjects,
  } = useProjects();

  const [showNewProject, setShowNewProject] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Derive current tab origin for new project form
  const currentOrigin = currentTabUrl ? (() => {
    try { return new URL(currentTabUrl).origin; }
    catch { return ''; }
  })() : '';

  const handleStartSession = () => {
    if (!selectedProjectId) return;
    const proj = selectedProject;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs.find(
        t => t.url && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('chrome://'),
      );
      if (!tab?.url || !tab.id) return;

      chrome.runtime.sendMessage(
        {
          type: MessageType.CREATE_SESSION,
          payload: {
            name: '',
            description: '',
            project: selectedProjectId,
            sprint: proj?.currentSprint || undefined,
            tags: [],
            url: tab.url,
            tabId: tab.id,
            recordMouseMove: false,
          },
          source: 'sidepanel',
        },
        (response) => {
          if (response?.ok) {
            setSessionStarted(true);
          }
        },
      );
    });
  };

  const handleProjectCreated = (projectId: string) => {
    setShowNewProject(false);
    refreshProjects();
    setTimeout(() => selectProject(projectId), 300);
  };

  // ── Styles (inline — Shadow DOM safe) ─────────────────────────────────────
  const styles = {
    root: { width: '100%', height: '100vh', background: '#0a0a0f', color: '#e8eaed', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #1f2937' },
    logo: { display: 'flex', alignItems: 'center', gap: '8px' },
    logoText: { fontSize: '14px', fontWeight: 700, color: '#e8eaed' },
    version: { fontSize: '10px', color: '#4b5563' },
    body: { flex: 1, display: 'flex', flexDirection: 'column' as const, padding: '16px', gap: '16px', overflowY: 'auto' as const },
    section: { background: '#111118', border: '1px solid #1f2937', borderRadius: '8px', padding: '16px' },
    sectionTitle: { fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px' },
    select: { width: '100%', padding: '8px 12px', background: '#050507', border: '1px solid #2d3748', borderRadius: '6px', color: '#e8eaed', fontSize: '13px', outline: 'none', cursor: 'pointer' },
    btnPrimary: { width: '100%', padding: '10px', background: '#06b6d4', color: '#000', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { width: '100%', padding: '8px', background: 'transparent', color: '#9ca3af', border: '1px solid #2d3748', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
    btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
    autoTag: { fontSize: '10px', color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' },
    projectInfo: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#16161f', borderRadius: '6px', marginBottom: '10px' },
    projectName: { fontSize: '13px', fontWeight: 600, color: '#e8eaed' },
    projectUrl: { fontSize: '11px', color: '#6b7280', marginTop: '2px' },
    error: { padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', fontSize: '12px', color: '#ef4444' },
    success: { textAlign: 'center' as const, padding: '24px 16px' },
    successIcon: { fontSize: '32px', marginBottom: '8px' },
    successText: { fontSize: '14px', fontWeight: 600, color: '#22c55e', marginBottom: '4px' },
    successHint: { fontSize: '12px', color: '#6b7280' },
  };

  // ── Session started confirmation ──────────────────────────────────────────
  if (sessionStarted) {
    return (
      <div style={styles.root}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={{ color: '#22d3ee', fontSize: '16px' }}>&#9673;</span>
            <span style={styles.logoText}>Vigil</span>
            <span style={styles.version}>v{VERSION}</span>
          </div>
        </div>
        <div style={{ ...styles.body, justifyContent: 'center', alignItems: 'center' }}>
          <div style={styles.success}>
            <div style={styles.successIcon}>&#9989;</div>
            <div style={styles.successText}>Session Started</div>
            <div style={styles.successHint}>Recording on {selectedProject?.name ?? 'project'}. Use the control bar to capture bugs.</div>
            <button
              style={{ ...styles.btnSecondary, width: 'auto', marginTop: '16px', padding: '6px 16px' }}
              onClick={() => setSessionStarted(false)}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={{ color: '#22d3ee', fontSize: '16px' }}>&#9673;</span>
          <span style={styles.logoText}>Vigil</span>
          <span style={styles.version}>v{VERSION}</span>
        </div>
      </div>

      <div style={styles.body}>
        {/* Error */}
        {error && (
          <div style={styles.error}>
            {error}
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px' }}>Is vigil-server running on port 7474?</div>
          </div>
        )}

        {/* Step 1: Project Selection */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Step 1 — Select Project</div>

          {loading ? (
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Loading projects...</div>
          ) : (
            <>
              {/* Auto-detected info */}
              {selectedProject && autoDetected && (
                <div style={styles.projectInfo}>
                  <div>
                    <div style={styles.projectName}>{selectedProject.name}</div>
                    <div style={styles.projectUrl}>{selectedProject.url ?? ''}</div>
                  </div>
                  <span style={styles.autoTag}>auto</span>
                </div>
              )}

              {/* Project dropdown */}
              <select
                style={styles.select}
                value={selectedProjectId ?? ''}
                onChange={(e) => selectProject(e.target.value || '')}
              >
                <option value="">— Choose a project —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* New project button */}
              <button
                style={{ ...styles.btnSecondary, marginTop: '8px' }}
                onClick={() => setShowNewProject(true)}
              >
                + New Project
              </button>
            </>
          )}
        </div>

        {/* Step 2: Start Session */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Step 2 — Start Session</div>

          {selectedProjectId ? (
            <button
              style={styles.btnPrimary}
              onClick={handleStartSession}
            >
              &#9658; Start Recording on {selectedProject?.name ?? 'Project'}
            </button>
          ) : (
            <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '8px' }}>
              Select a project first
            </div>
          )}
        </div>
      </div>

      {/* New project overlay */}
      {showNewProject && (
        <NewProjectForm
          defaultUrl={currentOrigin}
          onCreated={handleProjectCreated}
          onCancel={() => setShowNewProject(false)}
        />
      )}
    </div>
  );
};

export default SidePanelApp;

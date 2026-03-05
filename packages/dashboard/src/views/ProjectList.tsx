import { useState, useEffect } from 'react';
import type { ProjectItem } from '../types';
import { createProject, updateProject, deleteProject, detectProjectInfo } from '../api';

interface ProjectListProps {
  projects: ProjectItem[];
  onRefresh: () => void;
  /** Auto-show the create form on mount (e.g. from extension #new-project link) */
  autoCreate?: boolean;
  /** Called once autoCreate has been consumed so it doesn't re-trigger */
  onAutoCreateConsumed?: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function ProjectList({ projects, onRefresh, autoCreate, onAutoCreateConsumed }: ProjectListProps) {
  const [showCreate, setShowCreate] = useState(false);

  // Auto-show create form when navigated from extension "New Project" link
  useEffect(() => {
    if (autoCreate) {
      setShowCreate(true);
      onAutoCreateConsumed?.();
    }
  }, [autoCreate, onAutoCreateConsumed]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  const [newIdEdited, setNewIdEdited] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newSprint, setNewSprint] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSprint, setEditSprint] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const resetCreateForm = () => {
    setNewName('');
    setNewId('');
    setNewIdEdited(false);
    setNewDesc('');
    setNewSprint('');
    setNewUrl('');
    setShowCreate(false);
    setError(null);
  };

  const handleAutoDetect = async () => {
    const path = newUrl.trim();
    if (!path) {
      setError('Enter a project URL / path first, then click Auto Detect');
      return;
    }
    setDetecting(true);
    setError(null);
    try {
      const info = await detectProjectInfo(path);
      if (info.sprint) setNewSprint(info.sprint);
      if (info.description) setNewDesc(info.description);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDetecting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const id = (newIdEdited && newId.trim()) ? newId.trim() : slugify(newName);
    if (!id) return;

    setCreating(true);
    setError(null);
    try {
      await createProject({
        id,
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        currentSprint: newSprint.trim() || undefined,
        url: newUrl.trim() || undefined,
      });
      resetCreateForm();
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: ProjectItem) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDesc(p.description ?? '');
    setEditSprint(p.currentSprint ?? '');
    setEditUrl(p.url ?? '');
    setError(null);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await updateProject(id, {
        name: editName.trim() || undefined,
        description: editDesc.trim() || undefined,
        currentSprint: editSprint.trim() || undefined,
        url: editUrl.trim() || undefined,
      });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}"? All its sessions, bugs, and features will be permanently deleted.`)) return;
    try {
      await deleteProject(id);
      onRefresh();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div data-testid="project-list">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-slate-500">
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </span>
        {!showCreate && (
          <button
            data-testid="btn-create-project"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            onClick={() => setShowCreate(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl border border-indigo-200 p-5 mb-4 shadow-sm"
          data-testid="create-project-form"
        >
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Create New Project</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                data-testid="input-project-name"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. TaskPilot"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newIdEdited) setNewId(slugify(e.target.value));
                }}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                ID (slug)
              </label>
              <input
                type="text"
                data-testid="input-project-id"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="auto-generated"
                value={newId}
                onChange={(e) => {
                  setNewId(e.target.value);
                  setNewIdEdited(true);
                }}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">URL / Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="e.g. C:\Projects\my-app  or  https://github.com/..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
              <button
                type="button"
                disabled={detecting || !newUrl.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap"
                onClick={handleAutoDetect}
                title="Read CLAUDE.md / README.md to auto-fill sprint &amp; description"
              >
                {detecting ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {detecting ? 'Detecting...' : 'Auto Detect'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Current Sprint</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="e.g. 07"
                value={newSprint}
                onChange={(e) => setNewSprint(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="What is this project about?"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              onClick={resetCreateForm}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || creating}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg transition-colors"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      {/* Project list */}
      {projects.length === 0 && !showCreate ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📁</div>
          <div className="text-sm font-medium text-slate-600 mb-1">No projects yet</div>
          <div className="text-xs text-slate-400 mb-4">Create a project to start organizing your Vigil sessions.</div>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            onClick={() => setShowCreate(true)}
          >
            Create your first project
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <div
              key={p.id}
              data-testid={`project-row-${p.id}`}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-md"
            >
              {editingId === p.id ? (
                /* Edit mode */
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Current Sprint</label>
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        value={editSprint}
                        onChange={(e) => setEditSprint(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">URL</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                    <textarea
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg"
                      disabled={saving}
                      onClick={() => handleSave(p.id)}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                        <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{p.id}</span>
                      </div>
                      {p.description && (
                        <p className="text-xs text-slate-500 mb-1 ml-4">{p.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-400 ml-4">
                        {p.currentSprint && (
                          <span className="text-indigo-400">Sprint {p.currentSprint}</span>
                        )}
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 truncate max-w-[200px]">
                            {p.url}
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors px-2 py-1"
                        onClick={() => startEdit(p)}
                        data-testid={`btn-edit-project-${p.id}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition-colors px-2 py-1"
                        onClick={() => handleDelete(p.id, p.name)}
                        data-testid={`btn-delete-project-${p.id}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

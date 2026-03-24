/**
 * @file NewProjectForm.tsx
 * @description Inline form for creating a new project from the side panel.
 * Uses inline styles (side panel doesn't reliably process Tailwind).
 */

import React, { useState } from 'react';
import { createProject } from '../api';

interface NewProjectFormProps {
  defaultUrl?: string;
  onCreated: (projectId: string) => void;
  onCancel: () => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

const NewProjectForm: React.FC<NewProjectFormProps> = ({ defaultUrl, onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slug = slugify(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug) return;

    setSaving(true);
    setError(null);
    try {
      const project = await createProject(slug, name.trim(), url.trim() || undefined);
      onCreated(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const s = {
    overlay: { position: 'absolute' as const, inset: '0', background: 'rgba(5,5,7,0.92)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '48px' },
    form: { width: '90%', maxWidth: '320px', background: '#111118', border: '1px solid #2d3748', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
    title: { fontSize: '14px', fontWeight: 700, color: '#e8eaed', margin: 0 } as React.CSSProperties,
    label: { display: 'block', fontSize: '11px', fontWeight: 600, color: '#9ca3af', marginBottom: '4px' } as React.CSSProperties,
    input: { width: '100%', padding: '7px 10px', background: '#050507', border: '1px solid #2d3748', borderRadius: '6px', color: '#e8eaed', fontSize: '13px', outline: 'none', boxSizing: 'border-box' as const },
    slug: { fontSize: '10px', color: '#6b7280', marginTop: '3px', fontFamily: 'monospace' },
    error: { fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '6px 10px' },
    btnRow: { display: 'flex', gap: '8px', marginTop: '4px' },
    btnCancel: { flex: 1, padding: '7px', background: '#1c1c28', color: '#9ca3af', border: '1px solid #2d3748', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
    btnCreate: { flex: 2, padding: '7px', background: '#06b6d4', color: '#000', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  };

  return (
    <div style={s.overlay}>
      <form onSubmit={handleSubmit} style={s.form}>
        <h3 style={s.title}>New Project</h3>

        <div>
          <label style={s.label}>Project Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My App"
            style={s.input}
            autoFocus
          />
          {slug && <div style={s.slug}>ID: {slug}</div>}
        </div>

        <div>
          <label style={s.label}>URL <span style={{ color: '#4b5563', fontWeight: 400 }}>(for auto-detection)</span></label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://myapp.com"
            style={s.input}
          />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.btnRow}>
          <button type="button" onClick={onCancel} style={s.btnCancel}>Cancel</button>
          <button
            type="submit"
            disabled={!slug || saving}
            style={{ ...s.btnCreate, ...(!slug || saving ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
          >
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewProjectForm;

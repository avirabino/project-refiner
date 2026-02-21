/**
 * @file BugEditor.tsx
 * @description Inline bug/feature editor rendered inside the Shadow DOM overlay.
 * Pre-fills URL and element selector. Saves to background via messaging.
 */

import React, { useState } from 'react';
import { MessageType, BugPriority, FeatureType } from '@shared/types';
import { generateBugId, generateFeatureId } from '@shared/utils';

interface BugEditorProps {
  sessionId: string;
  currentUrl: string;
  elementSelector?: string;
  screenshotId?: string;
  onClose: () => void;
}

type EntryType = 'bug' | 'feature';

const BugEditor: React.FC<BugEditorProps> = ({
  sessionId,
  currentUrl,
  elementSelector,
  screenshotId,
  onClose,
}) => {
  const [entryType, setEntryType] = useState<EntryType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<BugPriority>(BugPriority.P1);
  const [featureType, setFeatureType] = useState<FeatureType>(FeatureType.ENHANCEMENT);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);

    const timestamp = Date.now();

    if (entryType === 'bug') {
      const bug = {
        id: generateBugId(),
        sessionId,
        type: 'bug' as const,
        priority,
        title: title.trim(),
        description: description.trim(),
        url: currentUrl,
        elementSelector,
        screenshotId,
        timestamp,
      };
      chrome.runtime.sendMessage({ type: MessageType.LOG_BUG, payload: bug, source: 'content' });
    } else {
      const feature = {
        id: generateFeatureId(),
        sessionId,
        type: 'feature' as const,
        featureType,
        title: title.trim(),
        description: description.trim(),
        url: currentUrl,
        elementSelector,
        screenshotId,
        timestamp,
      };
      chrome.runtime.sendMessage({ type: MessageType.LOG_FEATURE, payload: feature, source: 'content' });
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="refine-bug-editor" data-testid="refine-bug-editor">
      <h3>{entryType === 'bug' ? '🐛 Log Bug' : '✨ Log Feature'}</h3>

      <div className="refine-type-toggle">
        <button
          className={`refine-type-btn ${entryType === 'bug' ? 'refine-type-btn--active' : ''}`}
          onClick={() => setEntryType('bug')}
        >
          Bug
        </button>
        <button
          className={`refine-type-btn ${entryType === 'feature' ? 'refine-type-btn--active' : ''}`}
          onClick={() => setEntryType('feature')}
        >
          Feature
        </button>
      </div>

      <div className="refine-priority-row">
        <div className="refine-field">
          <label className="refine-label">
            {entryType === 'bug' ? 'Priority' : 'Type'}
          </label>
          {entryType === 'bug' ? (
            <select
              className="refine-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as BugPriority)}
            >
              <option value={BugPriority.P0}>P0 — Critical</option>
              <option value={BugPriority.P1}>P1 — High</option>
              <option value={BugPriority.P2}>P2 — Medium</option>
              <option value={BugPriority.P3}>P3 — Low</option>
            </select>
          ) : (
            <select
              className="refine-select"
              value={featureType}
              onChange={(e) => setFeatureType(e.target.value as FeatureType)}
            >
              <option value={FeatureType.ENHANCEMENT}>Enhancement</option>
              <option value={FeatureType.NEW_FEATURE}>New Feature</option>
              <option value={FeatureType.UX_IMPROVEMENT}>UX Improvement</option>
            </select>
          )}
        </div>
        <div className="refine-field">
          <label className="refine-label">Page</label>
          <div className="refine-url-display" title={currentUrl}>
            {currentUrl.replace(/^https?:\/\//, '').substring(0, 40)}
          </div>
        </div>
      </div>

      <div className="refine-field">
        <label className="refine-label">Title *</label>
        <input
          className="refine-input"
          type="text"
          placeholder={entryType === 'bug' ? 'Describe the bug…' : 'Describe the feature…'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="bug-editor-title"
          autoFocus
        />
      </div>

      <div className="refine-field">
        <label className="refine-label">Description</label>
        <textarea
          className="refine-textarea"
          placeholder="Steps to reproduce, expected vs actual behavior…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="refine-actions">
        <button
          className="refine-btn--save"
          onClick={handleSave}
          disabled={!title.trim() || saving}
          data-testid="btn-save-bug"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="refine-btn--cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BugEditor;

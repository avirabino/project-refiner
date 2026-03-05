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
  screenshotDataUrl?: string;
  onClose: () => void;
}

type EntryType = 'bug' | 'feature';

const BugEditor: React.FC<BugEditorProps> = ({
  sessionId,
  currentUrl,
  elementSelector,
  screenshotId,
  screenshotDataUrl,
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

    let finalScreenshotId = screenshotId;

    // B17: Auto-screenshot on save if one isn't provided
    if (!finalScreenshotId) {
      finalScreenshotId = await new Promise<string | undefined>((resolve) => {
        try {
          chrome.runtime.sendMessage(
            { type: MessageType.CAPTURE_SCREENSHOT, payload: { sessionId }, source: 'content' },
            (response) => {
              if (chrome.runtime.lastError || !response?.ok) {
                console.warn('[Vigil] Auto-screenshot failed:', chrome.runtime.lastError?.message);
                resolve(undefined);
              } else {
                resolve(response.data?.screenshotId as string | undefined);
              }
            }
          );
        } catch {
          // Extension context invalidated — resolve without screenshot
          resolve(undefined);
        }
      });
    }

    const timestamp = Date.now();

    if (entryType === 'bug') {
      const bug = {
        id: generateBugId(),
        sessionId,
        type: 'bug' as const,
        priority,
        status: 'open' as const,
        title: title.trim(),
        description: description.trim(),
        url: currentUrl,
        elementSelector,
        screenshotId: finalScreenshotId,
        timestamp,
      };
      await new Promise<void>((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: MessageType.LOG_BUG, payload: bug, source: 'content' }, () => resolve());
        } catch {
          resolve(); // Extension context invalidated — bug lost but no crash
        }
      });
    } else {
      const feature = {
        id: generateFeatureId(),
        sessionId,
        type: 'feature' as const,
        featureType,
        status: 'open' as const,
        title: title.trim(),
        description: description.trim(),
        url: currentUrl,
        elementSelector,
        screenshotId: finalScreenshotId,
        timestamp,
      };
      await new Promise<void>((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: MessageType.LOG_FEATURE, payload: feature, source: 'content' }, () => resolve());
        } catch {
          resolve(); // Extension context invalidated — feature lost but no crash
        }
      });
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="refine-bug-editor" data-testid="refine-bug-editor">
      <h3>{entryType === 'bug' ? '🐛 Log Bug' : '✨ Log Feature'}</h3>

      {screenshotDataUrl && (
        <div className="refine-screenshot-preview" data-testid="bug-editor-screenshot">
          <img
            src={screenshotDataUrl}
            alt="Screenshot preview"
            style={{ width: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #444', marginBottom: '8px' }}
          />
        </div>
      )}

      <div className="refine-type-toggle">
        <button
          className={`refine-type-btn ${entryType === 'bug' ? 'refine-type-btn--active' : ''}`}
          data-testid="btn-type-bug"
          onClick={() => setEntryType('bug')}
        >
          Bug
        </button>
        <button
          className={`refine-type-btn ${entryType === 'feature' ? 'refine-type-btn--active' : ''}`}
          data-testid="btn-type-feature"
          onClick={() => setEntryType('feature')}
        >
          Feature
        </button>
      </div>

      <div className="refine-priority-row">
        <div className="refine-field">
          <label className="refine-label" htmlFor="refine-priority-select">
            {entryType === 'bug' ? 'Priority' : 'Type'}
          </label>
          {entryType === 'bug' ? (
            <select
              id="refine-priority-select"
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
              id="refine-priority-select"
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
          <div className="refine-url-display" title={currentUrl} data-testid="bug-editor-url">
            {currentUrl.replace(/^https?:\/\//, '').substring(0, 40)}
          </div>
        </div>
      </div>

      <div className="refine-field">
        <label className="refine-label" htmlFor="refine-bug-title">Title *</label>
        <input
          id="refine-bug-title"
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
        <label className="refine-label" htmlFor="refine-bug-description">Description</label>
        <textarea
          id="refine-bug-description"
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
          {saving ? 'Submitting…' : 'Submit'}
        </button>
        <button className="refine-btn--cancel" data-testid="btn-cancel-bug" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BugEditor;

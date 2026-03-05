/**
 * @file AnnotationCommentEditor.tsx
 * @description Inline comment form for annotation pins.
 * Creates a Bug or Feature record (reuses LOG_BUG/LOG_FEATURE flow)
 * AND creates an Annotation with comment coordinates + linkedEntityId.
 *
 * Appears near the clicked position (inside Shadow DOM).
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageType, BugPriority, FeatureType } from '@shared/types';
import type { Annotation } from '@shared/types';
import { generateBugId, generateFeatureId } from '@shared/utils';
import {
  addAnnotation,
  updateAnnotation,
  getAnnotations,
  generateAnnotationId,
  createAnnotationBase,
  setTool,
  ANNOTATION_EVENTS,
} from '../annotation-state';

interface CommentEditorProps {
  sessionId: string;
  onClose: () => void;
}

type EntryType = 'bug' | 'feature';

const AnnotationCommentEditor: React.FC<CommentEditorProps> = ({ sessionId, onClose }) => {
  const [entryType, setEntryType] = useState<EntryType>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<BugPriority>(BugPriority.P1);
  const [featureType, setFeatureType] = useState<FeatureType>(FeatureType.ENHANCEMENT);
  const [saving, setSaving] = useState(false);
  const [pinPosition, setPinPosition] = useState<{ x: number; y: number } | null>(null);
  const [waitingForClick, setWaitingForClick] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  // Edit mode: when editing an existing annotation
  const [editAnnotation, setEditAnnotation] = useState<Annotation | null>(null);

  // Wait for user to click a position on the page to place the pin
  useEffect(() => {
    if (!waitingForClick) return;

    const handleClick = (e: MouseEvent) => {
      // Don't capture clicks on the editor itself or the refine root
      const target = e.target as Element;
      if (target.closest('#refine-root')) return;

      e.preventDefault();
      e.stopPropagation();

      setPinPosition({ x: e.clientX, y: e.clientY });
      setWaitingForClick(false);
    };

    // Use capture phase to catch clicks before the page
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [waitingForClick]);

  // Listen for comment requests from the annotation toolbar / canvas
  useEffect(() => {
    const handleCommentRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail as { annotationId?: string | null; editMode?: boolean } | undefined;
      if (detail?.annotationId && detail?.editMode) {
        // Edit existing comment — load annotation data
        const existing = getAnnotations().find(a => a.id === detail.annotationId);
        if (existing && existing.kind === 'comment') {
          setEditAnnotation(existing);
          setEntryType(existing.commentEntityType === 'feature' ? 'feature' : 'bug');
          setTitle(existing.commentText ?? '');
          setDescription(''); // Description is on the linked entity, not the annotation
          if (existing.comment) setPinPosition({ x: existing.comment.x, y: existing.comment.y });
          setWaitingForClick(false);
          return;
        }
      }
      if (detail?.annotationId && !detail?.editMode) {
        // Just selecting — don't open editor in new-comment mode
        return;
      }
      // New comment — wait for click placement
      setEditAnnotation(null);
      setWaitingForClick(true);
      setPinPosition(null);
    };

    document.addEventListener(ANNOTATION_EVENTS.COMMENT_REQUEST, handleCommentRequest);
    return () => document.removeEventListener(ANNOTATION_EVENTS.COMMENT_REQUEST, handleCommentRequest);
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !pinPosition) return;
    setSaving(true);

    // ── Edit mode: update existing annotation ──────────────────────────────
    if (editAnnotation) {
      updateAnnotation(editAnnotation.id, {
        commentText: title.trim(),
        commentEntityType: entryType as 'bug' | 'feature',
      });
      setSaving(false);
      setTool(null);
      onClose();
      return;
    }

    // ── New comment mode: create entity + annotation ───────────────────────
    const timestamp = Date.now();
    let linkedEntityId: string;

    // Create the Bug or Feature record
    if (entryType === 'bug') {
      linkedEntityId = generateBugId();
      const bug = {
        id: linkedEntityId,
        sessionId,
        type: 'bug' as const,
        priority,
        status: 'open' as const,
        title: title.trim(),
        description: description.trim(),
        url: window.location.href,
        timestamp,
      };
      await new Promise<void>((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: MessageType.LOG_BUG, payload: bug, source: 'content' }, () => resolve());
        } catch { resolve(); }
      });
    } else {
      linkedEntityId = generateFeatureId();
      const feature = {
        id: linkedEntityId,
        sessionId,
        type: 'feature' as const,
        featureType,
        status: 'open' as const,
        title: title.trim(),
        description: description.trim(),
        url: window.location.href,
        timestamp,
      };
      await new Promise<void>((resolve) => {
        try {
          chrome.runtime.sendMessage({ type: MessageType.LOG_FEATURE, payload: feature, source: 'content' }, () => resolve());
        } catch { resolve(); }
      });
    }

    // Create the comment Annotation with pin coordinates
    const base = createAnnotationBase('comment');
    const annotation = {
      ...base,
      id: generateAnnotationId(),
      comment: { x: pinPosition.x, y: pinPosition.y },
      commentEntityType: entryType as 'bug' | 'feature',
      commentText: title.trim(),
      linkedEntityId,
    };
    addAnnotation(annotation);

    setSaving(false);
    setTool(null);
    onClose();
  };

  const handleCancel = () => {
    setTool(null);
    onClose();
  };

  // Compute editor position near the pin
  const editorStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2147483647,
    pointerEvents: 'auto',
  };

  if (pinPosition) {
    // Position to the right of the pin, or left if near right edge
    const rightSpace = window.innerWidth - pinPosition.x;
    if (rightSpace > 340) {
      editorStyle.left = `${pinPosition.x + 20}px`;
    } else {
      editorStyle.left = `${pinPosition.x - 340}px`;
    }
    // Vertically center on pin
    const topPos = Math.max(10, Math.min(pinPosition.y - 100, window.innerHeight - 340));
    editorStyle.top = `${topPos}px`;
  } else {
    // Waiting for click — center on screen
    editorStyle.left = '50%';
    editorStyle.top = '50%';
    editorStyle.transform = 'translate(-50%, -50%)';
  }

  if (waitingForClick) {
    return (
      <div
        className="refine-bug-editor"
        style={{
          ...editorStyle,
          width: '280px',
          textAlign: 'center',
          left: '50%',
          bottom: '80px',
          top: 'auto',
          transform: 'translateX(-50%)',
        }}
      >
        <h3>💬 Place Comment Pin</h3>
        <p style={{ fontSize: '12px', color: 'var(--refine-text-muted)', margin: '12px 0' }}>
          Click anywhere on the page to place the comment pin
        </p>
        <button className="refine-btn--cancel" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div ref={editorRef} className="refine-bug-editor" style={{ ...editorStyle, width: '320px' }}>
      <h3>{editAnnotation ? '✏️ Edit Comment' : (entryType === 'bug' ? '🐛 Comment Bug' : '✨ Comment Feature')}</h3>

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
        <label className="refine-label">Title *</label>
        <input
          className="refine-input"
          type="text"
          placeholder={entryType === 'bug' ? 'Describe the bug…' : 'Describe the feature…'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="refine-field">
        <label className="refine-label">Description</label>
        <textarea
          className="refine-textarea"
          placeholder="Details…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="refine-actions">
        <button
          className="refine-btn--save"
          onClick={handleSave}
          disabled={!title.trim() || saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="refine-btn--cancel" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AnnotationCommentEditor;

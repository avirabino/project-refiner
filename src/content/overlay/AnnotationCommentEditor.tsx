/**
 * @file AnnotationCommentEditor.tsx
 * @description Inline comment form for annotation pins.
 * Creates a Bug or Feature record (reuses LOG_BUG/LOG_FEATURE flow)
 * AND creates an Annotation with comment coordinates + linkedEntityId.
 *
 * Appears near the clicked position (inside Shadow DOM).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // ── Draggable editor position ─────────────────────────────────────────────
  const MARGIN = 12;
  const EDITOR_W = 320;
  const EDITOR_H = 380; // approximate height

  const [editorPos, setEditorPos] = useState<{ left: number; top: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

  // Clamp position inside viewport with margins
  const clamp = useCallback((left: number, top: number) => ({
    left: Math.max(MARGIN, Math.min(left, window.innerWidth - EDITOR_W - MARGIN)),
    top: Math.max(MARGIN, Math.min(top, window.innerHeight - EDITOR_H - MARGIN)),
  }), []);

  // Compute initial position when pin is placed
  useEffect(() => {
    if (!pinPosition) {
      setEditorPos(null);
      return;
    }
    // Position to the right of pin, or left if near right edge
    const rightSpace = window.innerWidth - pinPosition.x;
    let left: number;
    if (rightSpace > EDITOR_W + 30) {
      left = pinPosition.x + 20;
    } else {
      left = pinPosition.x - EDITOR_W - 20;
    }
    const top = pinPosition.y - 100;
    setEditorPos(clamp(left, top));
  }, [pinPosition, clamp]);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    if (!editorPos) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: editorPos.left, oy: editorPos.top };

    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      const nx = dragStart.current.ox + (me.clientX - dragStart.current.mx);
      const ny = dragStart.current.oy + (me.clientY - dragStart.current.my);
      setEditorPos(clamp(nx, ny));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [editorPos, clamp]);

  // Build style
  const editorStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2147483647,
    pointerEvents: 'auto',
  };

  if (editorPos) {
    editorStyle.left = `${editorPos.left}px`;
    editorStyle.top = `${editorPos.top}px`;
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
      <h3
        style={{ cursor: 'grab', userSelect: 'none' }}
        onMouseDown={onDragStart}
      >
        {editAnnotation ? '✏️ Edit Comment' : (entryType === 'bug' ? '🐛 Comment Bug' : '✨ Comment Feature')}
      </h3>

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

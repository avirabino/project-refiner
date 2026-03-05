/**
 * @file AnnotationToolbar.tsx
 * @description Floating pill FAB for visual annotation tools.
 * Rendered inside Shadow DOM (CSS-isolated). Controls annotation-state.ts
 * via custom DOM events.
 *
 * Collapsed: single pencil icon.
 * Expanded: Comment | Rectangle | Circle | Freehand | — | Clear All | Close
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Annotation } from '@shared/types';
import {
  setTool,
  getTool,
  clearAllAnnotations,
  getAnnotations,
  deleteAnnotationById,
  getAnnotationState,
  ANNOTATION_EVENTS,
  type AnnotationTool,
} from '../annotation-state';
import { resetInteractionState } from '../annotation-canvas';

interface AnnotationToolbarProps {
  visible: boolean;
  onClose: () => void;
}

const TOOLS: Array<{ id: AnnotationTool; icon: string; label: string }> = [
  { id: 'comment', icon: '💬', label: 'Comment pin' },
  { id: 'rectangle', icon: '▭', label: 'Rectangle' },
  { id: 'circle', icon: '◯', label: 'Circle' },
  { id: 'freehand', icon: '✏️', label: 'Freehand' },
];

const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({ visible, onClose }) => {
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null);
  const [annotations, setAnnotations] = useState<readonly Annotation[]>([]);

  // Derived counts
  const counts = useMemo(() => {
    let shapes = 0;
    let bugs = 0;
    let features = 0;
    for (const ann of annotations) {
      if (ann.kind === 'comment') {
        if (ann.commentEntityType === 'bug') bugs++;
        else if (ann.commentEntityType === 'feature') features++;
      } else {
        shapes++;
      }
    }
    return { total: annotations.length, shapes, bugs, features };
  }, [annotations]);

  // Sync with annotation state
  useEffect(() => {
    const handleUpdate = () => {
      setAnnotations(getAnnotations());
    };
    const handleToolChange = () => {
      setActiveTool(getTool());
    };

    document.addEventListener(ANNOTATION_EVENTS.UPDATED, handleUpdate);
    document.addEventListener(ANNOTATION_EVENTS.TOOL_CHANGED, handleToolChange);

    // Initial sync
    handleUpdate();
    handleToolChange();

    return () => {
      document.removeEventListener(ANNOTATION_EVENTS.UPDATED, handleUpdate);
      document.removeEventListener(ANNOTATION_EVENTS.TOOL_CHANGED, handleToolChange);
    };
  }, []);

  // Keyboard: Delete/Backspace removes selected, Escape deselects
  useEffect(() => {
    if (!visible) return;

    const handleKey = (e: KeyboardEvent) => {
      const { selectedId } = getAnnotationState();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteAnnotationById(selectedId);
      }
      if (e.key === 'Escape') {
        if (activeTool) {
          setTool(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [visible, activeTool, onClose]);

  const handleToolClick = useCallback((tool: AnnotationTool) => {
    if (tool === activeTool) {
      setTool(null); // toggle off
    } else {
      if (tool === 'comment') {
        // Comment tool: dispatch event for comment pin placement
        setTool('comment');
        document.dispatchEvent(
          new CustomEvent(ANNOTATION_EVENTS.COMMENT_REQUEST, { detail: { annotationId: null } }),
        );
      } else {
        setTool(tool);
      }
    }
  }, [activeTool]);

  const handleClearAll = useCallback(() => {
    if (counts.total === 0) return;
    // Simple confirm — works in content script context
    const ok = window.confirm(`Clear all ${counts.total} annotation(s)?`);
    if (ok) {
      resetInteractionState(); // Ensure canvas is not stuck in drag/resize mode
      clearAllAnnotations();
    }
  }, [counts.total]);

  if (!visible) return null;

  return (
    <div className="refine-annotation-toolbar" data-testid="annotation-toolbar" role="toolbar" aria-label="Annotation tools">
      {TOOLS.map(({ id, icon, label }) => (
        <button
          key={id}
          className={`refine-btn${activeTool === id ? ' refine-btn--annotation-active' : ''}`}
          title={label}
          aria-label={label}
          aria-pressed={activeTool === id}
          data-testid={`btn-annotation-${id}`}
          tabIndex={0}
          onClick={() => handleToolClick(id)}
        >
          {icon}
        </button>
      ))}

      <div className="refine-divider" />

      <button
        className="refine-btn refine-btn--danger"
        title={`Clear all (${counts.total})`}
        aria-label="Clear all annotations"
        data-testid="btn-annotation-clear"
        tabIndex={0}
        disabled={counts.total === 0}
        onClick={handleClearAll}
        style={counts.total === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >
        🗑️
      </button>

      {counts.total > 0 && (
        <div className="refine-annotation-stats">
          {counts.shapes > 0 && <span className="refine-annotation-stat" title="Shapes">{'📐'}{counts.shapes}</span>}
          {counts.bugs > 0 && <span className="refine-annotation-stat" title="Bugs">{'🐛'}{counts.bugs}</span>}
          {counts.features > 0 && <span className="refine-annotation-stat" title="Features">{'✨'}{counts.features}</span>}
        </div>
      )}

      <button
        className="refine-btn"
        title="Close annotation toolbar"
        aria-label="Close annotation toolbar"
        data-testid="btn-annotation-close"
        tabIndex={0}
        onClick={() => {
          setTool(null);
          onClose();
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default AnnotationToolbar;

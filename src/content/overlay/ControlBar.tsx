/**
 * @file ControlBar.tsx
 * @description Floating control bar rendered inside Shadow DOM.
 * Shows recording status, timer, and action buttons.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageType } from '@shared/types';
import { stopRecording } from '../recorder';
import { safeSendMessage } from '../safe-message';
import { getAnnotations, ANNOTATION_EVENTS } from '../annotation-state';
import BugEditor from './BugEditor';
import AnnotationToolbar from './AnnotationToolbar';
import AnnotationCommentEditor from './AnnotationCommentEditor';

interface ControlBarProps {
  sessionId: string;
  sessionName: string;
  onStop?: () => void;
}

type RecordingState = 'recording' | 'paused';

function applyThemeToHost(theme: 'dark' | 'light'): void {
  const host = document.getElementById('refine-root');
  if (!host) return;
  if (theme === 'light') {
    host.setAttribute('data-theme', 'light');
  } else {
    host.removeAttribute('data-theme');
  }
}

const ControlBar: React.FC<ControlBarProps> = ({ sessionId, sessionName, onStop }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const [totalPaused, setTotalPaused] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showBugEditor, setShowBugEditor] = useState(false);
  const [showSizeWarning, setShowSizeWarning] = useState(false);
  const sizeWarningFiredRef = useRef(false);
  const [lastClickedSelector, setLastClickedSelector] = useState<string | undefined>(undefined);
  const [bugEditorScreenshotId, setBugEditorScreenshotId] = useState<string | undefined>(undefined);
  const [bugEditorScreenshotDataUrl, setBugEditorScreenshotDataUrl] = useState<string | undefined>(undefined);
  const [noteInput, setNoteInput] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [showAnnotationTools, setShowAnnotationTools] = useState(false);
  const [showCommentEditor, setShowCommentEditor] = useState(false);
  const [hasUnseenAnnotations, setHasUnseenAnnotations] = useState(false);
  const lastSeenAnnotationCountRef = useRef(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  // R024: Load stored theme on mount and apply to host element
  useEffect(() => {
    chrome.storage.local.get('refineTheme', (result) => {
      const stored = (result.refineTheme as 'dark' | 'light') ?? 'dark';
      setTheme(stored);
      applyThemeToHost(stored);
    });
  }, []);

  // B15: Sync startTime from background so timer survives cross-page navigation
  useEffect(() => {
    safeSendMessage(
      { type: MessageType.GET_SESSION_STATUS, source: 'content' },
      (response) => {
        if (response?.ok && response.data?.startedAt) {
          setStartTime(response.data.startedAt as number);
        }
      }
    );
  }, []);

  // Track elapsed time + 30-min size warning (PRD §Risks)
  useEffect(() => {
    const id = setInterval(() => {
      if (recordingState === 'recording') {
        const next = Date.now() - startTime - totalPaused;
        setElapsed(next);
        if (!sizeWarningFiredRef.current && next >= 30 * 60 * 1000) {
          sizeWarningFiredRef.current = true;
          setShowSizeWarning(true);
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [recordingState, startTime, totalPaused]);

  // Track last clicked element for bug editor pre-fill
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = e.target as Element;
      if (el && !el.closest('#refine-root')) {
        const testId = el.getAttribute('data-testid');
        if (testId) setLastClickedSelector(`[data-testid="${testId}"]`);
        else if (el.id) setLastClickedSelector(`#${el.id}`);
      }
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  // Sprint 06: Listen for OPEN_BUG_EDITOR event from Ctrl+Shift+B combo
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { snapshotId?: string; screenshotDataUrl?: string } | undefined;
      setBugEditorScreenshotId(detail?.snapshotId);
      setBugEditorScreenshotDataUrl(detail?.screenshotDataUrl);
      setShowBugEditor(true);
    };
    window.addEventListener('vigil:open-bug-editor', handler);
    return () => window.removeEventListener('vigil:open-bug-editor', handler);
  }, []);

  // Sprint 07: Listen for annotation comment tool activation
  useEffect(() => {
    const handler = () => setShowCommentEditor(true);
    document.addEventListener('vigil:annotation-comment-request', handler);
    return () => document.removeEventListener('vigil:annotation-comment-request', handler);
  }, []);

  // Sprint 07: "What's New" badge — track unseen annotations
  useEffect(() => {
    const handleAnnotationsUpdated = () => {
      const count = getAnnotations().length;
      if (!showAnnotationTools && count > lastSeenAnnotationCountRef.current) {
        setHasUnseenAnnotations(true);
      }
      lastSeenAnnotationCountRef.current = count;
    };
    document.addEventListener(ANNOTATION_EVENTS.UPDATED, handleAnnotationsUpdated);
    return () => document.removeEventListener(ANNOTATION_EVENTS.UPDATED, handleAnnotationsUpdated);
  }, [showAnnotationTools]);

  // Clear badge when toolbar is opened
  useEffect(() => {
    if (showAnnotationTools) {
      setHasUnseenAnnotations(false);
      lastSeenAnnotationCountRef.current = getAnnotations().length;
    }
  }, [showAnnotationTools]);

  // BUG-FAT-002: Sync recording state when SPACE toggle fires from content-script
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { recording: boolean } | undefined;
      if (detail == null) return;
      const newState: RecordingState = detail.recording ? 'recording' : 'paused';
      setRecordingState((prev) => {
        if (prev === newState) return prev;
        // Update pause tracking
        if (newState === 'paused') {
          setPauseStart(Date.now());
        } else {
          setPauseStart((ps) => {
            if (ps) setTotalPaused((p) => p + Date.now() - ps);
            return null;
          });
        }
        return newState;
      });
    };
    window.addEventListener('vigil:recording-state-changed', handler);
    return () => window.removeEventListener('vigil:recording-state-changed', handler);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // BUG-FAT-004: Listen for toast events from keyboard shortcut captures
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string } | undefined;
      if (detail?.message) showToast(detail.message);
    };
    window.addEventListener('vigil:show-toast', handler);
    return () => window.removeEventListener('vigil:show-toast', handler);
  }, [showToast]);

  const handlePauseResume = () => {
    if (recordingState === 'recording') {
      safeSendMessage({ type: MessageType.PAUSE_RECORDING, source: 'content' });
      setPauseStart(Date.now());
      setRecordingState('paused');
    } else {
      safeSendMessage({ type: MessageType.RESUME_RECORDING, source: 'content' });
      if (pauseStart) setTotalPaused((p) => p + Date.now() - pauseStart);
      setPauseStart(null);
      setRecordingState('recording');
    }
  };

  const handleStop = () => {
    stopRecording(); // flush rrweb buffer locally — works even if background tabId is stale
    safeSendMessage({ type: MessageType.STOP_RECORDING, source: 'content' }, () => {
      // Open side panel so the user can see the session results
      safeSendMessage({ type: MessageType.OPEN_SIDE_PANEL, source: 'content' });
    });
    // Unmount overlay immediately — don't block on background response
    // (background may await vigilSessionManager.endSession → postWithRetry which can take 6s+)
    onStop?.();
  };

  const handleOpenPanel = () => {
    safeSendMessage({ type: MessageType.OPEN_SIDE_PANEL, source: 'content' });
  };

  const handleToggleTheme = () => {
    const next: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyThemeToHost(next);
    try { chrome.storage.local.set({ refineTheme: next }); } catch { /* stale context */ }
    showToast(next === 'light' ? '☀️ Light mode' : '🌙 Dark mode');
  };

  const handleToggleInspector = () => {
    const next = !isInspecting;
    setIsInspecting(next);
    window.dispatchEvent(
      new CustomEvent('refine:toggle-inspector', { detail: { active: next, sessionId } })
    );
    showToast(next ? '🔍 Inspector ON' : '🔍 Inspector OFF');
  };

  const handleNoteLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setNoteInput('');
    }, 500);
  };

  const handleNoteLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleNoteSubmit = () => {
    if (noteInput === null) return;
    const trimmed = noteInput.trim();
    if (trimmed) {
      safeSendMessage(
        { type: MessageType.ANNOTATE_ACTION, payload: { sessionId, note: trimmed }, source: 'content' },
        () => showToast('✓ Note added')
      );
    }
    setNoteInput(null);
  };

  useEffect(() => {
    if (noteInput !== null) noteInputRef.current?.focus();
  }, [noteInput]);

  const handleScreenshot = () => {
    safeSendMessage(
      { type: MessageType.CAPTURE_SCREENSHOT, payload: { sessionId }, source: 'content' },
      () => showToast('✓ Screenshot captured')
    );
  };

  const formatTime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <>
      {showSizeWarning && (
        <div className="refine-size-warning" role="alertdialog" aria-modal="true" aria-labelledby="refine-size-warning-title">
          <p id="refine-size-warning-title" className="refine-size-warning__title">⚠️ 30-minute recording</p>
          <p className="refine-size-warning__body">Large sessions use significant storage. Consider stopping and starting a new session to keep recordings manageable.</p>
          <div className="refine-size-warning__actions">
            <button
              className="refine-btn--save"
              onClick={() => {
                setShowSizeWarning(false);
                handleStop();
              }}
            >
              Stop &amp; Save
            </button>
            <button
              className="refine-btn--cancel"
              onClick={() => setShowSizeWarning(false)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {showBugEditor && (
        <BugEditor
          sessionId={sessionId}
          currentUrl={window.location.href}
          elementSelector={lastClickedSelector}
          screenshotId={bugEditorScreenshotId}
          screenshotDataUrl={bugEditorScreenshotDataUrl}
          onClose={() => { setShowBugEditor(false); setBugEditorScreenshotId(undefined); setBugEditorScreenshotDataUrl(undefined); }}
        />
      )}

      {showCommentEditor && (
        <AnnotationCommentEditor
          sessionId={sessionId}
          onClose={() => setShowCommentEditor(false)}
        />
      )}

      <AnnotationToolbar
        visible={showAnnotationTools}
        onClose={() => setShowAnnotationTools(false)}
      />

      <div className="refine-control-bar" data-testid="refine-control-bar" role="toolbar" aria-label="Refine recording controls">
        <div className="refine-indicator-wrapper" data-testid="recording-indicator">
          <div
            className={`refine-recording-dot ${recordingState === 'paused' ? 'refine-recording-dot--paused' : ''}`}
          />
          <span className={`refine-status-badge ${recordingState === 'recording' ? 'refine-status-badge--recording' : 'refine-status-badge--paused'}`}>
            {recordingState === 'recording' ? 'RECORDING' : 'PAUSED'}
          </span>
        </div>

        <span className="refine-session-name" title={sessionName}>
          {sessionName}
        </span>

        <span className="refine-timer">{formatTime(elapsed)}</span>

        <div className="refine-divider" />

        {recordingState === 'recording' && (
          <button
            className="refine-btn"
            title="Pause (Alt+Shift+V)"
            aria-label="Pause recording"
            data-testid="btn-pause"
            tabIndex={0}
            onClick={handlePauseResume}
          >
            ⏸
          </button>
        )}
        {recordingState === 'paused' && (
          <button
            className="refine-btn"
            title="Resume (Alt+Shift+V)"
            aria-label="Resume recording"
            data-testid="btn-resume"
            tabIndex={0}
            onClick={handlePauseResume}
          >
            ▶
          </button>
        )}

        <button
          className="refine-btn refine-btn--danger"
          title="End Session"
          aria-label="End Session"
          data-testid="btn-stop"
          tabIndex={0}
          onClick={handleStop}
        >
          ⏹
        </button>

        <button
          className="refine-btn"
          title="Take screenshot (Ctrl+Shift+S)"
          aria-label="Take screenshot"
          data-testid="btn-screenshot"
          tabIndex={0}
          onClick={handleScreenshot}
        >
          📷
        </button>

        <button
          className="refine-btn refine-btn--record"
          title="Log Bug / Feature (Alt+Shift+G)"
          aria-label="Log Bug or Feature"
          data-testid="btn-bug"
          tabIndex={0}
          onClick={() => setShowBugEditor(true)}
        >
          🐛
        </button>

        <button
          className="refine-btn"
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle theme"
          data-testid="btn-theme"
          tabIndex={0}
          onClick={handleToggleTheme}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button
          className={`refine-btn${isInspecting ? ' refine-btn--inspect-active' : ''}`}
          title="Toggle element inspector (R023)"
          aria-label="Toggle element inspector"
          data-testid="btn-inspect"
          tabIndex={0}
          onClick={handleToggleInspector}
        >
          🔍
        </button>

        <button
          className={`refine-btn${showAnnotationTools ? ' refine-btn--inspect-active' : ''}${hasUnseenAnnotations ? ' refine-btn--has-badge' : ''}`}
          title="Annotation tools (Ctrl+Shift+A)"
          aria-label="Toggle annotation toolbar"
          data-testid="btn-annotations"
          tabIndex={0}
          onClick={() => setShowAnnotationTools((v) => !v)}
        >
          ✏️
        </button>

        <button
          className="refine-btn"
          title="Annotate last action (long-press)"
          aria-label="Add annotation note"
          data-testid="btn-annotate"
          tabIndex={0}
          onMouseDown={handleNoteLongPressStart}
          onMouseUp={handleNoteLongPressEnd}
          onMouseLeave={handleNoteLongPressEnd}
          onTouchStart={handleNoteLongPressStart}
          onTouchEnd={handleNoteLongPressEnd}
        >
          📝
        </button>

        {noteInput !== null && (
          <div className="refine-note-input-wrapper" data-testid="note-input-overlay">
            <input
              ref={noteInputRef}
              type="text"
              className="refine-note-input"
              placeholder="Add note…"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNoteSubmit();
                if (e.key === 'Escape') setNoteInput(null);
              }}
              data-testid="note-input"
            />
            <button
              className="refine-btn refine-btn--sm"
              onClick={handleNoteSubmit}
              data-testid="btn-note-submit"
            >
              ✓
            </button>
          </div>
        )}

        {toast && <span className="refine-toast">{toast}</span>}

        <div className="refine-divider" />

        <button
          className="refine-btn"
          title="Open Refine panel"
          aria-label="Open Refine panel"
          data-testid="btn-open-panel"
          tabIndex={0}
          onClick={handleOpenPanel}
        >
          ◀
        </button>

      </div>
    </>
  );
};

export default ControlBar;

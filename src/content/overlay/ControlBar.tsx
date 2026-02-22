/**
 * @file ControlBar.tsx
 * @description Floating control bar rendered inside Shadow DOM.
 * Shows recording status, timer, and action buttons.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MessageType } from '@shared/types';
import BugEditor from './BugEditor';

interface ControlBarProps {
  sessionId: string;
  sessionName: string;
  onStop?: () => void;
}

type RecordingState = 'recording' | 'paused';

const ControlBar: React.FC<ControlBarProps> = ({ sessionId, sessionName, onStop }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('recording');
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const [totalPaused, setTotalPaused] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showBugEditor, setShowBugEditor] = useState(false);
  const [lastClickedSelector, setLastClickedSelector] = useState<string | undefined>(undefined);

  // B15: Sync startTime from background so timer survives cross-page navigation
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: MessageType.GET_SESSION_STATUS, source: 'content' },
      (response) => {
        if (response?.ok && response.data?.startedAt) {
          setStartTime(response.data.startedAt as number);
        }
      }
    );
  }, []);

  // Track elapsed time
  useEffect(() => {
    const id = setInterval(() => {
      if (recordingState === 'recording') {
        setElapsed(Date.now() - startTime - totalPaused);
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handlePauseResume = () => {
    if (recordingState === 'recording') {
      chrome.runtime.sendMessage({ type: MessageType.PAUSE_RECORDING, source: 'content' });
      setPauseStart(Date.now());
      setRecordingState('paused');
    } else {
      chrome.runtime.sendMessage({ type: MessageType.RESUME_RECORDING, source: 'content' });
      if (pauseStart) setTotalPaused((p) => p + Date.now() - pauseStart);
      setPauseStart(null);
      setRecordingState('recording');
    }
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: MessageType.STOP_RECORDING, source: 'content' }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Refine] Stop recording failed:', chrome.runtime.lastError.message);
      }
      onStop?.();
    });
  };

  const handleScreenshot = () => {
    chrome.runtime.sendMessage(
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
      {showBugEditor && (
        <BugEditor
          sessionId={sessionId}
          currentUrl={window.location.href}
          elementSelector={lastClickedSelector}
          onClose={() => setShowBugEditor(false)}
        />
      )}

      <div className="refine-control-bar" data-testid="refine-control-bar">
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
            title="Pause (Ctrl+Shift+R)"
            aria-label="Pause recording"
            data-testid="btn-pause"
            onClick={handlePauseResume}
          >
            ⏸
          </button>
        )}
        {recordingState === 'paused' && (
          <button
            className="refine-btn"
            title="Resume (Ctrl+Shift+R)"
            aria-label="Resume recording"
            data-testid="btn-resume"
            onClick={handlePauseResume}
          >
            ▶
          </button>
        )}

        <button
          className="refine-btn refine-btn--danger"
          title="Stop recording"
          aria-label="Stop recording"
          data-testid="btn-stop"
          onClick={handleStop}
        >
          ⏹
        </button>

        <button
          className="refine-btn"
          title="Take screenshot (Ctrl+Shift+S)"
          aria-label="Take screenshot"
          data-testid="btn-screenshot"
          onClick={handleScreenshot}
        >
          📷
        </button>

        <button
          className="refine-btn refine-btn--record"
          title="Log Bug / Feature (Ctrl+Shift+B)"
          aria-label="Log Bug or Feature"
          data-testid="btn-bug"
          onClick={() => setShowBugEditor(true)}
        >
          🐛
        </button>

        {toast && <span className="refine-toast">{toast}</span>}
      </div>
    </>
  );
};

export default ControlBar;

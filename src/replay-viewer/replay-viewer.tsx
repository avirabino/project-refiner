/**
 * @file replay-viewer.tsx
 * @description CSP-compliant extension page for replaying recorded sessions.
 * Reads ?sessionId=X from URL params, loads events from IndexedDB, renders rrweb-player.
 */

import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSession, getRecordingChunks, getBugsBySession, getScreenshotsBySession, getActionsBySession, getFeaturesBySession } from '@core/db';
import type { Session, Bug, Screenshot, Action, Feature } from '@shared/types';
import { formatDuration } from '@shared/utils';
import 'rrweb-player/dist/style.css';

type RrwebReplayer = {
  play(timeOffset?: number): void;
  pause(timeOffset?: number): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
};
type RrwebPlayerInstance = {
  $set: (props: Record<string, unknown>) => void;
  getMetaData: () => { startTime: number; endTime: number; totalTime: number };
  getReplayer: () => RrwebReplayer;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RrwebPlayerCtor = new (opts: { target: HTMLElement; props: Record<string, unknown> }) => RrwebPlayerInstance;

const SPEEDS = [1, 2, 4, 8];

type LogEvent = { id: string; type: 'bug' | 'screenshot' | 'action' | 'feature'; label: string; timestamp: number; detail: Record<string, unknown>; };
const LOG_ICONS: Record<LogEvent['type'], string> = { bug: '🐛', screenshot: '📷', action: '🖱', feature: '✨' };

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function ReplayViewer() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('sessionId') ?? '';

  const [session, setSession] = useState<Session | null>(null);
  const [events, setEvents] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<RrwebPlayerInstance | null>(null);
  const replayerRef = useRef<RrwebReplayer | null>(null);
  const metaStartRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentMs, setCurrentMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<LogEvent | null>(null);
  const [hoveredLogId, setHoveredLogId] = useState<string | null>(null);

  // Ref-based current position for handlers (avoids stale closure)
  const currentMsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1);

  // Load session data
  useEffect(() => {
    if (!sessionId) { setError('No sessionId provided in URL.'); setLoading(false); return; }
    (async () => {
      try {
        const [s, chunks] = await Promise.all([getSession(sessionId), getRecordingChunks(sessionId)]);
        if (!s) { setError(`Session not found: ${sessionId}`); return; }
        const evts = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex).flatMap((c) => c.events);
        const [bugs, screenshots, actions, features] = await Promise.all([
          getBugsBySession(sessionId),
          getScreenshotsBySession(sessionId),
          getActionsBySession(sessionId),
          getFeaturesBySession(sessionId),
        ]);
        const log: LogEvent[] = [
          ...bugs.map((b: Bug) => ({ id: b.id, type: 'bug' as const, label: b.title || b.description || 'Bug', timestamp: b.timestamp,
            detail: { title: b.title, description: b.description, priority: b.priority, status: b.status, url: b.url } })),
          ...screenshots.map((sc: Screenshot) => ({ id: sc.id, type: 'screenshot' as const, label: `Screenshot (${sc.url.replace(/.*\//, '') || 'page'})`, timestamp: sc.timestamp,
            detail: { url: sc.url, dimensions: `${sc.width}×${sc.height}`, dataUrl: sc.dataUrl } })),
          ...actions.map((a: Action) => ({ id: a.id, type: 'action' as const, label: `${a.type}${a.value ? ': ' + String(a.value).slice(0, 30) : ''}`, timestamp: a.timestamp,
            detail: { type: a.type, value: a.value ?? '', page: a.pageUrl, selector: a.selector ?? '', note: a.note ?? '' } })),
          ...features.map((f: Feature) => ({ id: f.id, type: 'feature' as const, label: f.title || f.description || 'Feature', timestamp: f.timestamp,
            detail: { title: f.title, description: f.description, url: f.url } })),
        ].sort((a, b) => a.timestamp - b.timestamp);
        setLogEvents(log);
        setSession(s);
        setEvents(evts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  // Init rrweb-player with showController:false — we supply our own controls
  useEffect(() => {
    if (!session || events.length === 0 || !playerContainerRef.current) return;
    import('rrweb-player').then((mod) => {
      const RrwebPlayer = (mod.default ?? mod) as unknown as RrwebPlayerCtor;
      if (!playerContainerRef.current) return;
      const player = new RrwebPlayer({
        target: playerContainerRef.current,
        props: {
          events,
          width: Math.min(window.innerWidth - 40, 1280),
          height: Math.min(window.innerHeight - 180, 700),
          showController: false,
          autoPlay: false,
          speed: 1,
          speedOption: SPEEDS,
        },
      });
      playerRef.current = player;
      const replayer = player.getReplayer();
      replayerRef.current = replayer;
      const meta = player.getMetaData();
      metaStartRef.current = meta.startTime;
      setTotalMs(meta.totalTime);

      replayer.on('event-cast', (e: unknown) => {
        const ev = e as { timestamp: number };
        const offset = Math.max(0, ev.timestamp - meta.startTime);
        currentMsRef.current = offset;
      });
      replayer.on('finish', () => {
        currentMsRef.current = meta.totalTime;
        setCurrentMs(meta.totalTime);
        setIsPlaying(false);
        isPlayingRef.current = false;
      });

      const onResize = () => player.$set({
        width: Math.min(window.innerWidth - 40, 1280),
        height: Math.min(window.innerHeight - 180, 700),
      });
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }).catch((e) => setError(`Failed to load player: ${e.message}`));
  }, [session, events]);

  // Poll current position for smooth progress bar (only while playing)
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setCurrentMs(currentMsRef.current), 100);
    return () => clearInterval(id);
  }, [isPlaying]);

  const doPlay = (offset?: number) => {
    const from = offset ?? currentMsRef.current;
    replayerRef.current?.play(from);
    currentMsRef.current = from;
    setCurrentMs(from);
    setIsPlaying(true);
    isPlayingRef.current = true;
  };
  const doPause = () => {
    replayerRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentMs(currentMsRef.current);
  };
  const doStop = () => {
    replayerRef.current?.pause(0);
    currentMsRef.current = 0;
    setCurrentMs(0);
    setIsPlaying(false);
    isPlayingRef.current = false;
  };
  const doSkip = (deltaMs: number) => {
    const next = Math.max(0, Math.min(currentMsRef.current + deltaMs, totalMs));
    currentMsRef.current = next;
    setCurrentMs(next);
    if (isPlayingRef.current) replayerRef.current?.play(next);
    else replayerRef.current?.pause(next);
  };
  const doSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const next = Math.floor(ratio * totalMs);
    currentMsRef.current = next;
    setCurrentMs(next);
    if (isPlayingRef.current) replayerRef.current?.play(next);
    else replayerRef.current?.pause(next);
  };
  const doSpeed = (s: number) => {
    speedRef.current = s;
    setSpeed(s);
    playerRef.current?.$set({ speed: s });
    if (isPlayingRef.current) {
      const cur = currentMsRef.current;
      replayerRef.current?.play(cur);
    }
  };

  const progress = totalMs > 0 ? (currentMs / totalMs) * 100 : 0;

  const btnStyle = (active = false): React.CSSProperties => ({
    background: active ? '#6366f1' : '#334155',
    color: '#f1f5f9',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    whiteSpace: 'nowrap',
  });
  const iconBtn = (title: string, label: string, onClick: () => void, disabled = false): React.ReactNode => (
    <button title={title} onClick={onClick} disabled={disabled}
      style={{ ...btnStyle(), padding: '6px 12px', fontSize: 16, opacity: disabled ? 0.4 : 1 }}>
      {label}
    </button>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#94a3b8', fontSize: 14 }}>
      Loading session…
    </div>
  );
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 8 }}>
      <p style={{ color: '#ef4444', fontSize: 14 }}>⚠ {error}</p>
      <p style={{ color: '#64748b', fontSize: 12 }}>Session ID: {sessionId || '(none)'}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Info header ── */}
      <header style={{ padding: '10px 20px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: 0, whiteSpace: 'nowrap' }}>⬡ {session?.name}</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 12 }}>
          {session && <>
            <span>Started: {new Date(session.startedAt).toLocaleString()}</span>
            <span>Duration: {formatDuration(session.duration)}</span>
            <span>Pages: {session.pages.length}</span>
            <span>Events: {events.length}</span>
          </>}
        </div>
      </header>

      {/* ── Main area: player + event log ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Player */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '16px 16px 0' }}>
          {events.length === 0
            ? <p style={{ color: '#64748b', fontSize: 14 }}>No recording events found for this session.</p>
            : <div ref={playerContainerRef} />}
        </div>

        {/* Event log panel */}
        {logEvents.length > 0 && (
          <div style={{ width: 268, flexShrink: 0, background: '#0f172a', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #334155', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#1e293b' }}>
              Event Log · {logEvents.length}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {logEvents.map(ev => {
                const offset = metaStartRef.current > 0 ? Math.max(0, ev.timestamp - metaStartRef.current) : 0;
                const isActive = metaStartRef.current > 0 && currentMs >= offset && currentMs < offset + 2000;
                const isHovered = hoveredLogId === ev.id;
                const bg = isActive ? '#312e81' : isHovered ? '#1e293b' : 'transparent';
                return (
                  <div key={ev.id}
                    onMouseEnter={() => setHoveredLogId(ev.id)}
                    onMouseLeave={() => setHoveredLogId(null)}
                    onClick={() => setSelectedEvent(ev)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1e3a5f22', background: bg, transition: 'background 0.1s' }}>
                    <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{LOG_ICONS[ev.type]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#475569', marginTop: 2 }}>{metaStartRef.current > 0 ? fmtMs(offset) : '--:--'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Control banner ── */}
      {events.length > 0 && (
        <div style={{ flexShrink: 0, background: '#1e293b', borderTop: '1px solid #334155', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Seekbar */}
          <div onClick={doSeek} style={{ width: '100%', height: 6, background: '#334155', borderRadius: 3, cursor: 'pointer', position: 'relative' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#6366f1', borderRadius: 3, transition: 'width 0.1s linear' }} />
            <div style={{ position: 'absolute', top: '50%', left: `${progress}%`, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: '#a5b4fc', pointerEvents: 'none' }} />
          </div>

          {/* Buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {iconBtn('Stop (go to start)', '⏹', doStop)}
            {iconBtn('Skip back 10s', '⏪ 10s', () => doSkip(-10000))}
            {isPlaying
              ? iconBtn('Pause', '⏸', doPause)
              : iconBtn('Play', '▶', () => doPlay())}
            {iconBtn('Skip forward 10s', '10s ⏩', () => doSkip(10000))}

            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4, whiteSpace: 'nowrap', minWidth: 90 }}>
              {fmtMs(currentMs)} / {fmtMs(totalMs)}
            </span>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {SPEEDS.map(s => (
                <button key={s} onClick={() => doSpeed(s)} style={btnStyle(speed === s)}>
                  ×{s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* ── Event detail popup ── */}
      {selectedEvent && (
        <div
          onClick={() => setSelectedEvent(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', maxWidth: '88vw', maxHeight: '88vh', overflow: 'auto', minWidth: 340, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid #334155', background: '#0f172a', borderRadius: '12px 12px 0 0' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{LOG_ICONS[selectedEvent.type]}</span>
                <span style={{ textTransform: 'capitalize' }}>{selectedEvent.type}</span>
                <span style={{ color: '#64748b', fontWeight: 400 }}>—</span>
                <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', fontWeight: 500 }}>{selectedEvent.label}</span>
              </span>
              <button onClick={() => setSelectedEvent(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>

            {/* Modal body */}
            <div style={{ padding: 18 }}>
              {selectedEvent.type === 'screenshot' ? (
                <img
                  src={selectedEvent.detail.dataUrl as string}
                  alt="Screenshot"
                  style={{ maxWidth: '80vw', maxHeight: '68vh', borderRadius: 8, display: 'block', border: '1px solid #334155' }}
                />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(selectedEvent.detail)
                      .filter(([k, v]) => k !== 'dataUrl' && v != null && v !== '')
                      .map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid #1e3a5f33' }}>
                          <td style={{ padding: '6px 10px 6px 0', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', verticalAlign: 'top', textTransform: 'capitalize', width: 90 }}>{k}</td>
                          <td style={{ padding: '6px 0', fontSize: 12, color: '#e2e8f0', wordBreak: 'break-word' }}>{String(v)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* Jump to button */}
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    const o = metaStartRef.current > 0 ? Math.max(0, selectedEvent.timestamp - metaStartRef.current) : 0;
                    currentMsRef.current = o; setCurrentMs(o);
                    if (isPlayingRef.current) replayerRef.current?.play(o); else replayerRef.current?.pause(o);
                    setSelectedEvent(null);
                  }}
                  style={{ background: '#6366f1', color: '#f1f5f9', border: 'none', borderRadius: 6, padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  ▶ Jump to {metaStartRef.current > 0 ? fmtMs(Math.max(0, selectedEvent.timestamp - metaStartRef.current)) : '--:--'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(React.createElement(ReplayViewer));
}

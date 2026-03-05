import { useState, useMemo, useRef, useCallback } from 'react';
import type { SessionDetail as SessionDetailType, SnapshotItem, SessionBug } from '../types';
import { SessionTimeline } from '../components/SessionTimeline';
import { RecordingPlayer } from '../components/RecordingPlayer';
import type { RecordingPlayerHandle } from '../components/RecordingPlayer';
import { ImageLightbox } from '../components/ImageLightbox';
import type { LightboxImage } from '../components/ImageLightbox';

interface SessionDetailProps {
  session: SessionDetailType;
}

function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
}

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ScreenshotInline({ snapshot, onImageClick }: { snapshot: SnapshotItem; onImageClick?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid="bug-screenshot-inline" className="mt-2">
      <button
        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '▼ Hide screenshot' : '▶ Show screenshot'}
      </button>
      {expanded && snapshot.screenshotDataUrl && (
        <img
          src={snapshot.screenshotDataUrl}
          alt="Bug screenshot"
          className="mt-2 rounded-lg border border-slate-200 max-w-full max-h-[32rem] object-contain shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all"
          onClick={onImageClick}
        />
      )}
    </div>
  );
}

function BugCard({ bug, snapshots, onScreenshotClick }: { bug: SessionBug; snapshots: SnapshotItem[]; onScreenshotClick?: (src: string) => void }) {
  const linkedSnapshot = bug.screenshotId
    ? snapshots.find((s) => s.id === bug.screenshotId)
    : undefined;

  const priorityStyles: Record<string, string> = {
    P0: 'bg-red-100 text-red-800 ring-1 ring-red-200',
    P1: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
    P2: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    P3: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900">{bug.title}</div>
          {bug.description && (
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{bug.description}</p>
          )}
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold shrink-0 ${
            priorityStyles[bug.priority] || priorityStyles.P3
          }`}
        >
          {bug.priority}
        </span>
      </div>
      {linkedSnapshot && (
        <ScreenshotInline
          snapshot={linkedSnapshot}
          onImageClick={() => onScreenshotClick?.(linkedSnapshot.screenshotDataUrl)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-lg font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function hasTimelineContent(session: SessionDetailType): boolean {
  return (
    session.recordings.length > 0 ||
    session.bugs.length > 0 ||
    session.features.length > 0 ||
    session.snapshots.length > 0
  );
}

export function SessionDetail({ session }: SessionDetailProps) {
  const playerRef = useRef<RecordingPlayerHandle>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleTimelineSeek = useCallback((timeOffset: number) => {
    playerRef.current?.goto(timeOffset);
  }, []);

  const lightboxImages: LightboxImage[] = useMemo(() =>
    session.snapshots
      .filter((snap) => snap.screenshotDataUrl)
      .map((snap) => ({
        src: snap.screenshotDataUrl,
        alt: `Snapshot at ${formatClock(snap.capturedAt)}`,
        caption: `${formatClock(snap.capturedAt)}  ·  ${snap.triggeredBy}`,
      })),
    [session.snapshots],
  );

  const openLightbox = useCallback((src: string) => {
    const idx = lightboxImages.findIndex((img) => img.src === src);
    if (idx >= 0) setLightboxIndex(idx);
  }, [lightboxImages]);

  const showTimeline = hasTimelineContent(session);
  const showPlayer = session.recordings.length > 0;

  return (
    <div data-testid="session-detail" className="space-y-5">
      {/* Session header card */}
      <div className="bg-gradient-to-r from-indigo-50 to-slate-50 rounded-xl border border-indigo-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900 mb-1">{session.name}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDate(session.startedAt)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Duration: {formatClock(session.clock)}
          </span>
          {session.sprint && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
              Sprint {session.sprint}
            </span>
          )}
          {session.description && (
            <span className="text-slate-400">{session.description}</span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Snapshots" value={session.snapshots.length} icon="📸" />
        <StatCard label="Bugs" value={session.bugs.length} icon="🐛" />
        <StatCard label="Features" value={session.features.length} icon="✨" />
        <StatCard label="Annotations" value={session.annotations.length} icon="✏️" />
        <StatCard label="Recordings" value={session.recordings.length} icon="🎥" />
      </div>

      {/* Timeline + Recording Player section */}
      {(showTimeline || showPlayer) && (
        <div data-testid="timeline-player-section" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {showTimeline && (
            <SessionTimeline
              session={session}
              onSeek={showPlayer ? handleTimelineSeek : undefined}
            />
          )}

          {showPlayer ? (
            <RecordingPlayer
              ref={playerRef}
              recordings={session.recordings}
              width={560}
              height={400}
            />
          ) : showTimeline ? (
            <div
              data-testid="recording-player"
              className="bg-white rounded-xl border border-slate-200 p-8 text-center"
            >
              <div className="text-3xl mb-2">🎥</div>
              <div className="text-sm text-slate-500">No recording for this session</div>
              <div className="text-xs text-slate-400 mt-1">Start recording in the extension to capture DOM replay data.</div>
            </div>
          ) : null}
        </div>
      )}

      {/* Bugs section */}
      {session.bugs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span>🐛</span>
            Bugs ({session.bugs.length})
          </h3>
          <div className="space-y-2">
            {session.bugs.map((bug) => (
              <BugCard key={bug.id} bug={bug} snapshots={session.snapshots} onScreenshotClick={openLightbox} />
            ))}
          </div>
        </div>
      )}

      {/* Features section */}
      {session.features.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span>✨</span>
            Features ({session.features.length})
          </h3>
          <div className="space-y-2">
            {session.features.map((feat) => (
              <div key={feat.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div className="text-sm font-semibold text-slate-900">{feat.title}</div>
                {feat.description && (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{feat.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Annotations section */}
      {session.annotations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span>✏️</span>
            Annotations ({session.annotations.length})
          </h3>
          <div className="space-y-2">
            {session.annotations.map((ann) => (
              <div key={ann.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
                    ann.kind === 'comment' ? 'bg-amber-50 text-amber-700' :
                    ann.kind === 'rectangle' ? 'bg-blue-50 text-blue-700' :
                    ann.kind === 'circle' ? 'bg-purple-50 text-purple-700' :
                    'bg-slate-50 text-slate-600'
                  }`}>
                    {ann.kind}
                  </span>
                  {ann.text && (
                    <span className="text-sm text-slate-900">{ann.text}</span>
                  )}
                </div>
                {ann.url && (
                  <div className="text-xs text-slate-400 mt-1 truncate">{ann.url}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshots gallery */}
      {session.snapshots.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <span>📸</span>
            Snapshots ({session.snapshots.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {session.snapshots.map((snap) => (
              <div key={snap.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                {snap.screenshotDataUrl ? (
                  <img
                    src={snap.screenshotDataUrl}
                    alt={`Snapshot at ${formatClock(snap.capturedAt)}`}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    onClick={() => openLightbox(snap.screenshotDataUrl)}
                  />
                ) : (
                  <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">
                    📸
                  </div>
                )}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{formatClock(snap.capturedAt)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    snap.triggeredBy === 'manual'
                      ? 'bg-blue-50 text-blue-600'
                      : snap.triggeredBy === 'bug-editor'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-slate-50 text-slate-500'
                  }`}>
                    {snap.triggeredBy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no data */}
      {!showTimeline && session.bugs.length === 0 && session.features.length === 0 && session.annotations.length === 0 && session.snapshots.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm font-medium text-slate-600 mb-1">Empty session</div>
          <div className="text-xs text-slate-400">This session has no bugs, features, recordings, or snapshots.</div>
        </div>
      )}

      {/* Screenshot lightbox */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

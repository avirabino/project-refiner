import { useState } from 'react';
import type { SessionDetail as SessionDetailType, SnapshotItem, SessionBug } from '../types';

interface SessionDetailProps {
  session: SessionDetailType;
}

function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
}

function ScreenshotInline({ snapshot }: { snapshot: SnapshotItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid="bug-screenshot-inline" className="mt-2">
      <button
        className="text-xs text-blue-600 hover:underline"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Hide screenshot' : 'Show screenshot'}
      </button>
      {expanded && (
        <img
          src={snapshot.screenshotDataUrl}
          alt="Bug screenshot"
          className="mt-1 rounded border border-gray-200 max-w-full max-h-64 object-contain"
        />
      )}
    </div>
  );
}

function BugCard({ bug, snapshots }: { bug: SessionBug; snapshots: SnapshotItem[] }) {
  const linkedSnapshot = bug.screenshotId
    ? snapshots.find((s) => s.id === bug.screenshotId)
    : undefined;

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">{bug.title}</div>
        <span
          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
            bug.priority === 'P0'
              ? 'bg-red-100 text-red-800'
              : bug.priority === 'P1'
                ? 'bg-orange-100 text-orange-800'
                : bug.priority === 'P2'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
          }`}
        >
          {bug.priority}
        </span>
      </div>
      {bug.description && (
        <p className="text-xs text-gray-600 mt-1">{bug.description}</p>
      )}
      {linkedSnapshot && <ScreenshotInline snapshot={linkedSnapshot} />}
    </div>
  );
}

export function SessionDetail({ session }: SessionDetailProps) {
  return (
    <div data-testid="session-detail" className="space-y-4">
      {/* Session metadata */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{session.name}</h2>
        <div className="flex gap-4 mt-1 text-xs text-gray-500">
          <span>Duration: {formatClock(session.clock)}</span>
          <span>Snapshots: {session.snapshots.length}</span>
          <span>Bugs: {session.bugs.length}</span>
          <span>Features: {session.features.length}</span>
          <span>Recordings: {session.recordings.length}</span>
        </div>
      </div>

      {/* Bugs section */}
      {session.bugs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Bugs ({session.bugs.length})
          </h3>
          <div className="space-y-2">
            {session.bugs.map((bug) => (
              <BugCard key={bug.id} bug={bug} snapshots={session.snapshots} />
            ))}
          </div>
        </div>
      )}

      {/* Features section */}
      {session.features.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Features ({session.features.length})
          </h3>
          <div className="space-y-2">
            {session.features.map((feat) => (
              <div key={feat.id} className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900">{feat.title}</div>
                {feat.description && (
                  <p className="text-xs text-gray-600 mt-1">{feat.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshots gallery */}
      {session.snapshots.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Snapshots ({session.snapshots.length})
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {session.snapshots.map((snap) => (
              <div key={snap.id} className="border border-gray-200 rounded overflow-hidden">
                <img
                  src={snap.screenshotDataUrl}
                  alt={`Snapshot at ${formatClock(snap.capturedAt)}`}
                  className="w-full h-24 object-cover"
                />
                <div className="px-2 py-1 text-xs text-gray-500">
                  {formatClock(snap.capturedAt)} &middot; {snap.triggeredBy}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

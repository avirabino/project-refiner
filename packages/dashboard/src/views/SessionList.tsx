import type { SessionSummary } from '../types';

interface SessionListProps {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
}

function formatDuration(startedAt: number, endedAt?: number): string {
  if (!endedAt) return 'In progress';
  const ms = endedAt - startedAt;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
}

function formatDate(epoch: number): string {
  return new Date(epoch).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionList({ sessions, selectedId, onSelect }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div
        data-testid="session-list"
        className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500"
      >
        No sessions found.
      </div>
    );
  }

  return (
    <div data-testid="session-list" className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {sessions.map((session) => (
          <button
            key={session.id}
            data-testid={`session-row-${session.id}`}
            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
              selectedId === session.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
            }`}
            onClick={() => onSelect(session.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{session.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatDate(session.startedAt)} &middot; {formatDuration(session.startedAt, session.endedAt)}
                </div>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                {session.bugCount > 0 && (
                  <span className="text-red-600">{session.bugCount} bug{session.bugCount !== 1 ? 's' : ''}</span>
                )}
                {session.featureCount > 0 && (
                  <span className="text-blue-600">{session.featureCount} feat</span>
                )}
                {session.snapshotCount > 0 && (
                  <span>{session.snapshotCount} snap</span>
                )}
                {session.recordingCount > 0 && (
                  <span>{session.recordingCount} rec</span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

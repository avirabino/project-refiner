import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { RecordingItem } from '../types';
import { loadRrwebPlayer } from './rrweb-loader';

type RrwebEvent = { timestamp: number; type: number; data: unknown };

export interface RecordingPlayerHandle {
  goto: (timeOffset: number) => void;
}

export interface RecordingPlayerProps {
  recordings: RecordingItem[];
  width?: number;
  height?: number;
}

// ── Decompression (mirrors src/core/compression.ts for the dashboard) ────────

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function decompressEvents(base64: string): Promise<unknown[]> {
  const arrayBuffer = base64ToArrayBuffer(base64);
  const stream = new Response(arrayBuffer).body;
  if (!stream) throw new Error('Failed to create decompression stream');
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(decompressedStream);
  const jsonStr = await response.text();
  return JSON.parse(jsonStr);
}

// ── Flatten + decompress rrweb events from all recordings ────────────────────

async function flattenEventsAsync(recordings: RecordingItem[]): Promise<RrwebEvent[]> {
  const events: RrwebEvent[] = [];

  for (const rec of recordings) {
    for (const chunk of rec.rrwebChunks) {
      // Handle compressed chunks (gzip → base64 in chunk.data)
      let chunkEvents: unknown[] = [];

      if (chunk.compressed && chunk.data) {
        try {
          chunkEvents = await decompressEvents(chunk.data);
        } catch (err) {
          console.warn('[RecordingPlayer] Failed to decompress chunk:', err);
        }
      } else if (Array.isArray(chunk.events)) {
        chunkEvents = chunk.events;
      }

      for (const evt of chunkEvents) {
        const e = evt as RrwebEvent;
        if (e && typeof e.timestamp === 'number') {
          events.push(e);
        }
      }
    }
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

export const RecordingPlayer = forwardRef<RecordingPlayerHandle, RecordingPlayerProps>(
  function RecordingPlayer({ recordings, width = 640, height = 480 }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerRef = useRef<any>(null);
    const [events, setEvents] = useState<RrwebEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const gotoFn = useCallback((timeOffset: number) => {
      if (playerRef.current?.goto) {
        playerRef.current.goto(timeOffset, false);
      }
    }, []);

    useImperativeHandle(ref, () => ({ goto: gotoFn }), [gotoFn]);

    // Decompress and flatten events on mount / recording change
    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);

      flattenEventsAsync(recordings).then((evts) => {
        if (!cancelled) {
          setEvents(evts);
          setLoading(false);
        }
      }).catch((err) => {
        if (!cancelled) {
          setEvents([]);
          setError(err instanceof Error ? err.message : 'Failed to decompress recording');
          setLoading(false);
        }
      });

      return () => { cancelled = true; };
    }, [recordings]);

    const hasEvents = events.length > 0;

    useEffect(() => {
      if (!hasEvents || !containerRef.current) return;

      const container = containerRef.current;
      container.innerHTML = '';

      let player: unknown = null;

      loadRrwebPlayer().then((Player) => {
        if (!container.isConnected) return;

        try {
          player = new Player({
            target: container,
            props: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              events: events as any,
              width,
              height,
              autoPlay: false,
              showController: true,
              skipInactive: true,
            },
          });
          playerRef.current = player;
        } catch (err) {
          console.warn('[RecordingPlayer] Failed to init rrweb-player:', err);
        }
      }).catch((err) => {
        console.warn('[RecordingPlayer] Failed to load rrweb-player:', err);
      });

      return () => {
        playerRef.current = null;
        if (player && typeof (player as Record<string, unknown>).$destroy === 'function') {
          (player as { $destroy: () => void }).$destroy();
        }
        container.innerHTML = '';
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasEvents, events, width, height]);

    if (loading) {
      return (
        <div
          data-testid="recording-player"
          className="bg-white rounded-xl border border-slate-200 p-8 text-center"
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3" />
          <div className="text-sm text-slate-500">Decompressing recording...</div>
        </div>
      );
    }

    if (!hasEvents) {
      return (
        <div
          data-testid="recording-player"
          className="bg-white rounded-xl border border-slate-200 p-8 text-center"
        >
          <div className="text-3xl mb-2">{error ? '⚠️' : '🎥'}</div>
          <div className="text-sm text-slate-500">
            {error ? 'Failed to load recording' : 'No recording available'}
          </div>
          {error && (
            <div className="text-xs text-red-400 mt-1 font-mono">{error}</div>
          )}
        </div>
      );
    }

    return (
      <div data-testid="recording-player" className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            Session Recording
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {events.length} events across {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div
          ref={containerRef}
          className="p-3 flex justify-center overflow-hidden min-h-[560px]"
        />
      </div>
    );
  },
);

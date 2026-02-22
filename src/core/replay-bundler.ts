/**
 * @file replay-bundler.ts
 * @description Generates a self-contained replay.html from rrweb events.
 * Inlines rrweb-player UMD + CSS so the file is portable with no CDN deps.
 */

import type { Session } from '@shared/types';
// Relative path bypasses the rrweb-player package exports map.
// Vite inlines these as raw strings at build time.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import playerJs from '../../node_modules/rrweb-player/dist/rrweb-player.umd.min.cjs?raw';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import playerCss from '../../node_modules/rrweb-player/dist/style.min.css?raw';

function formatDuration(ms: number): string {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

/**
 * Generates a fully self-contained HTML string for replaying a session.
 * The resulting HTML can be opened in any browser without network access.
 *
 * @param session   - The completed session metadata
 * @param events    - Raw rrweb events (from RecordingChunk[].flatMap(c => c.events))
 */
function safeJson(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f');
}

export function generateReplayHtml(session: Session, events: unknown[]): string {
  const sessionJson = safeJson({
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
    duration: session.duration,
    pages: session.pages,
  });
  const eventsJson = safeJson(events);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Replay: ${escapeHtml(session.name)}</title>
  <style>
    ${playerCss}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0f172a;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 12px 20px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    header h1 { font-size: 14px; font-weight: 700; color: #f1f5f9; }
    header .meta { font-size: 11px; color: #94a3b8; display: flex; gap: 16px; }
    #player-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    #no-events {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      padding: 60px;
    }
  </style>
</head>
<body>
  <header>
    <h1>⬡ Refine Replay — ${escapeHtml(session.name)}</h1>
    <div class="meta">
      <span>Started: ${new Date(session.startedAt).toLocaleString()}</span>
      <span>Duration: ${formatDuration(session.duration)}</span>
      <span>Pages: ${session.pages.length}</span>
    </div>
  </header>
  <div id="player-container">
    <div id="player"></div>
    <div id="no-events" style="display:none">No recording events found for this session.</div>
  </div>
  <script>
    ${playerJs}
  </script>
  <script>
    const sessionMeta = ${sessionJson};
    const events = ${eventsJson};

    if (!events || events.length === 0) {
      document.getElementById('player').style.display = 'none';
      document.getElementById('no-events').style.display = 'block';
    } else {
      try {
        const player = new rrwebPlayer({
          target: document.getElementById('player'),
          props: {
            events: events,
            width: Math.min(window.innerWidth - 48, 1280),
            height: Math.min(window.innerHeight - 120, 720),
            showController: true,
            autoPlay: false,
            speedOption: [1, 2, 4, 8],
          },
        });
        window.addEventListener('resize', () => {
          player.$set({
            width: Math.min(window.innerWidth - 48, 1280),
            height: Math.min(window.innerHeight - 120, 720),
          });
        });
      } catch (e) {
        document.getElementById('player').innerHTML =
          '<p style="color:#ef4444;padding:20px">Failed to initialise player: ' + e.message + '</p>';
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @file zip-bundler.ts
 * @description Packages all session exports into a single ZIP file using JSZip.
 */

import JSZip from 'jszip';
import type { Session, Bug, Feature, Action, Screenshot, RecordingChunk } from '@shared/types';
import { generateJsonReport, generateMarkdownReport } from './report-generator';
import { generateReplayHtml } from './replay-bundler';
import { generatePlaywrightSpec } from './playwright-codegen';

/**
 * Creates a ZIP bundle containing:
 *   replay.html          — self-contained rrweb replay
 *   report.json          — machine-readable session report
 *   report.md            — human-readable session report
 *   regression.spec.ts   — Playwright regression spec
 *   screenshots/         — all captured screenshots as JPEG files
 */
export async function generateZipBundle(
  session: Session,
  bugs: Bug[],
  features: Feature[],
  actions: Action[],
  screenshots: Screenshot[],
  recordings: RecordingChunk[]
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(`refine-${session.id}`)!;

  // Report files
  const jsonReport = generateJsonReport(session, bugs, features, actions, screenshots);
  folder.file('report.json', JSON.stringify(jsonReport, null, 2));
  folder.file('report.md', generateMarkdownReport(session, bugs, features, actions, screenshots));

  // Replay HTML
  const events = recordings.flatMap((c) => c.events);
  folder.file('replay.html', generateReplayHtml(session, events));

  // Playwright spec
  folder.file('regression.spec.ts', generatePlaywrightSpec(session, actions, bugs));

  // Screenshots
  if (screenshots.length > 0) {
    const ssFolder = folder.folder('screenshots')!;
    screenshots.forEach((ss, i) => {
      const base64 = ss.dataUrl.split(',')[1] ?? '';
      const ext = ss.dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
      const name = `screenshot-${String(i + 1).padStart(3, '0')}.${ext}`;
      ssFolder.file(name, base64, { base64: true });
    });
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

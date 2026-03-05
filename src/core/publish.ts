import type { Session, Bug, Feature, Action, Screenshot, RecordingChunk, RefineProjectConfig } from '@shared/types';
import { generateJsonReport, generateMarkdownReport } from './report-generator';
import { generatePlaywrightSpec } from './playwright-codegen';
import { generateReplayHtml } from './replay-bundler';
import { generateProjectDashboard } from './dashboard-generator';
import { VERSION } from '@shared/constants';

/**
 * @file publish.ts
 * @description R025: Downloads all session artifacts to a local project folder
 * via the chrome.downloads API.
 */

/**
 * Converts an absolute or relative path to a relative path suitable for
 * chrome.downloads.download (which only accepts paths relative to ~/Downloads).
 * e.g. "C:\Users\Avi\projects" → "Users/Avi/projects"
 *      "/home/avi/projects"     → "home/avi/projects"
 *      "my-project"             → "my-project"
 */
function toRelativeDownloadPath(p: string): string {
  let rel = p.replace(/\\/g, '/');          // backslashes → forward slashes
  rel = rel.replace(/^[a-zA-Z]:\//, '');    // strip Windows drive letter (C:/)
  rel = rel.replace(/^\/+/, '');            // strip leading slashes
  rel = rel.replace(/\/+$/, '');            // strip trailing slashes
  // Remove any '..' segments to prevent path traversal
  rel = rel.split('/').filter(seg => seg !== '..' && seg !== '.').join('/');
  return rel || 'refine-exports';
}

export async function publishSession(
  session: Session,
  bugs: Bug[],
  features: Feature[],
  actions: Action[],
  screenshots: Screenshot[],
  chunks: RecordingChunk[]
): Promise<void> {
  if (!session.project || !session.outputPath) {
    throw new Error('Cannot publish: Session is missing project or outputPath configuration.');
  }

  // chrome.downloads.download only accepts paths relative to ~/Downloads.
  // Convert any absolute path to a relative one.
  const relativeBase = toRelativeDownloadPath(session.outputPath);
  const baseDir = `${relativeBase}/${session.project}/sessions/${session.id}`;

  const downloads: Promise<number>[] = [];
  // Project-level base (one level up from sessions/<id>/)
  const projectDir = `${relativeBase}/${session.project}`;

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    return new Promise<number>((resolve, reject) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download(
        {
          url,
          filename: `${baseDir}/${filename}`,
          saveAs: false, // Bypass save dialog
          conflictAction: 'overwrite',
        },
        (downloadId) => {
          URL.revokeObjectURL(url);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (downloadId === undefined) {
            reject(new Error('Download failed without ID'));
          } else {
            resolve(downloadId);
          }
        }
      );
    });
  };

  const triggerDownloadAt = (content: string, fullRelPath: string, mimeType: string) => {
    return new Promise<number>((resolve, reject) => {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download(
        { url, filename: fullRelPath, saveAs: false, conflictAction: 'overwrite' },
        (downloadId) => {
          URL.revokeObjectURL(url);
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (downloadId === undefined) reject(new Error('Download failed without ID'));
          else resolve(downloadId);
        }
      );
    });
  };

  const triggerBase64Download = (dataUrl: string, filename: string) => {
    return new Promise<number>(async (resolve, reject) => {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        chrome.downloads.download(
          {
            url,
            filename: `${baseDir}/${filename}`,
            saveAs: false,
            conflictAction: 'overwrite',
          },
          (downloadId) => {
            URL.revokeObjectURL(url);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (downloadId === undefined) {
              reject(new Error('Download failed without ID'));
            } else {
              resolve(downloadId);
            }
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  };

  try {
    // 1. JSON Report
    const json = generateJsonReport(session, bugs, features, actions, screenshots);
    downloads.push(triggerDownload(JSON.stringify(json, null, 2), 'report.json', 'application/json'));

    // 2. Markdown Report
    const md = generateMarkdownReport(session, bugs, features, actions, screenshots);
    downloads.push(triggerDownload(md, 'report.md', 'text/markdown'));

    // 3. Playwright Spec
    const spec = generatePlaywrightSpec(session, actions, bugs);
    downloads.push(triggerDownload(spec, 'regression.spec.ts', 'text/plain'));

    // 4. Replay HTML
    const html = await generateReplayHtml(session, chunks);
    downloads.push(triggerDownload(html, 'replay.html', 'text/html'));

    // 5. Screenshots
    if (screenshots.length > 0) {
      screenshots.forEach((ss, i) => {
        const ext = ss.dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
        const name = `screenshots/screenshot-${String(i + 1).padStart(3, '0')}.${ext}`;
        downloads.push(triggerBase64Download(ss.dataUrl, name));
      });
    }

    // 6. Project Config (if publishing to a new project)
    const config: RefineProjectConfig = {
      name: session.project,
      displayName: session.project,
      baseUrl: session.pages[0] || 'http://localhost',
      outputPath: session.outputPath,
      created: new Date().toISOString().split('T')[0],
      version: VERSION
    };
    // Use projectDir directly to avoid '..' segments that Chrome downloads API rejects
    downloads.push(
      triggerDownloadAt(
        JSON.stringify(config, null, 2),
        `${projectDir}/refine.project.json`,
        'application/json'
      )
    );

    // 7. Dashboard HTML
    const dashboardHtml = generateProjectDashboard([session], [bugs]);
    downloads.push(
      triggerDownloadAt(
        dashboardHtml,
        `${projectDir}/index.html`,
        'text/html'
      )
    );

    await Promise.all(downloads);
  } catch (err) {
    console.error('[Vigil] Publish failed:', err);
    throw err;
  }
}

import { writeFile, mkdir, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getSprintDir, getVigilDataDir, loadConfig } from '../config.js';
import { nextBugId, nextFeatId } from './counter.js';
import { TEST_STATUS } from '@synaptix/vigil-shared';
import type { Bug, Feature, VIGILSession, BugUpdate } from '@synaptix/vigil-shared';

/** Resolve sprint dir for bugs. Undefined → current sprint from config. */
function bugDir(sprint?: string, status: 'open' | 'fixed' = 'open'): string {
  return resolve(getSprintDir(sprint), 'BUGS', status);
}

/** Resolve sprint dir for features. Undefined → current sprint from config. */
function featDir(sprint?: string, status: 'open' | 'done' = 'open'): string {
  return resolve(getSprintDir(sprint), 'FEATURES', status);
}

/** Resolve the actual sprint label (e.g. "06") for writing into markdown. */
function resolveSprint(sprint?: string): string {
  return sprint ?? loadConfig().sprintCurrent;
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().split('T')[0];
}

function bugToMarkdown(bugId: string, bug: Bug, sessionId: string, sprint: string): string {
  return `# ${bugId} — ${bug.title}

## Status: OPEN
## Severity: ${bug.priority}
## Sprint: ${sprint}
## Discovered: ${formatDate(bug.timestamp)} via vigil-session: ${sessionId}

## Steps to Reproduce
${bug.description}

## Expected
_To be filled_

## Actual
_To be filled_

## URL
${bug.url}

## Regression Test
File: tests/e2e/regression/${bugId}.spec.ts
Status: ${TEST_STATUS.PENDING}
`;
}

function featureToMarkdown(featId: string, feat: Feature, sessionId: string, sprint: string): string {
  return `# ${featId} — ${feat.title}

## Status: OPEN
## Priority: ${feat.featureType}
## Sprint: ${sprint}
## Discovered: ${formatDate(feat.timestamp)} via vigil-session: ${sessionId}

## Description
${feat.description}

## URL
${feat.url}
`;
}

export async function writeBug(bug: Bug, sprint?: string): Promise<string> {
  const s = resolveSprint(sprint);
  const bugId = await nextBugId();
  const dir = bugDir(s);
  await mkdir(dir, { recursive: true });

  const filePath = resolve(dir, `${bugId}.md`);
  const content = bugToMarkdown(bugId, bug, bug.sessionId, s);
  await writeFile(filePath, content, 'utf8');

  return bugId;
}

export async function writeFeature(feat: Feature, sprint?: string): Promise<string> {
  const s = resolveSprint(sprint);
  const featId = await nextFeatId();
  const dir = featDir(s);
  await mkdir(dir, { recursive: true });

  const filePath = resolve(dir, `${featId}.md`);
  const content = featureToMarkdown(featId, feat, feat.sessionId, s);
  await writeFile(filePath, content, 'utf8');

  return featId;
}

export async function writeSessionJson(session: VIGILSession): Promise<string> {
  const dir = resolve(getVigilDataDir(), 'sessions');
  await mkdir(dir, { recursive: true });

  const filePath = resolve(dir, `${session.id}.json`);
  await writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');

  return filePath;
}

export async function updateBug(bugId: string, fields: BugUpdate, sprint?: string): Promise<boolean> {
  const openPath = resolve(bugDir(sprint), `${bugId}.md`);
  let filePath = openPath;
  let content: string;

  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    // Try fixed directory
    const fixedPath = resolve(bugDir(sprint, 'fixed'), `${bugId}.md`);
    try {
      content = await readFile(fixedPath, 'utf8');
      filePath = fixedPath;
    } catch {
      return false;
    }
  }

  if (fields.status) {
    content = content.replace(/## Status: \w+/, `## Status: ${fields.status.toUpperCase()}`);
  }
  if (fields.severity) {
    content = content.replace(/## Severity: \w+/, `## Severity: ${fields.severity}`);
  }
  if (fields.resolution) {
    if (content.includes('## Resolution')) {
      content = content.replace(/## Resolution\n[\s\S]*?(?=\n## |\n$|$)/, `## Resolution\n${fields.resolution}\n`);
    } else {
      content += `\n## Resolution\n${fields.resolution}\n`;
    }
  }

  await writeFile(filePath, content, 'utf8');
  return true;
}

export async function closeBug(
  bugId: string,
  resolution: string,
  keepTest: boolean,
  sprint?: string,
): Promise<boolean> {
  const openPath = resolve(bugDir(sprint), `${bugId}.md`);
  let content: string;

  try {
    content = await readFile(openPath, 'utf8');
  } catch {
    return false;
  }

  // Update status and add resolution
  content = content.replace(/## Status: \w+/, '## Status: FIXED');

  if (content.includes('## Resolution')) {
    content = content.replace(/## Resolution\n[\s\S]*?(?=\n## |\n$|$)/, `## Resolution\n${resolution}\n`);
  } else {
    content += `\n## Resolution\n${resolution}\n`;
  }

  // Update regression test status — target only within Regression Test section
  content = content.replace(
    new RegExp(`(## Regression Test\\nFile: [^\\n]+\\nStatus: )${TEST_STATUS.PENDING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    `$1${keepTest ? TEST_STATUS.PASSING : TEST_STATUS.ARCHIVED}`,
  );

  // Move from open/ to fixed/
  const fixedDir = bugDir(sprint, 'fixed');
  await mkdir(fixedDir, { recursive: true });
  const fixedPath = resolve(fixedDir, `${bugId}.md`);

  await writeFile(fixedPath, content, 'utf8');

  // Remove from open/
  try {
    await unlink(openPath);
  } catch {
    // Already gone or never existed in open
  }

  return true;
}

import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getSprintDir, loadConfig } from '../config.js';
import type { BugFile, FeatureFile } from '@synaptix/vigil-shared';

function parseBugFile(filename: string, content: string): BugFile {
  const id = filename.replace('.md', '');
  const titleMatch = content.match(/^# \S+ — (.+)$/m);
  const statusMatch = content.match(/^## Status: (.+)$/m);
  const severityMatch = content.match(/^## Severity: (.+)$/m);
  const sprintMatch = content.match(/^## Sprint: (.+)$/m);
  const discoveredMatch = content.match(/^## Discovered: (.+)$/m);

  // Extract sections
  const stepsMatch = content.match(/## Steps to Reproduce\n([\s\S]*?)(?=\n## |$)/);
  const expectedMatch = content.match(/## Expected\n([\s\S]*?)(?=\n## |$)/);
  const actualMatch = content.match(/## Actual\n([\s\S]*?)(?=\n## |$)/);
  const regressionMatch = content.match(/## Regression Test\n([\s\S]*?)(?=\n## |$)/);
  const resolutionMatch = content.match(/## Resolution\n([\s\S]*?)(?=\n## |$)/);
  const urlMatch = content.match(/## URL\n([\s\S]*?)(?=\n## |$)/);

  return {
    id,
    title: titleMatch?.[1]?.trim() ?? 'Unknown',
    status: statusMatch?.[1]?.trim() ?? 'OPEN',
    severity: severityMatch?.[1]?.trim() ?? 'P2',
    sprint: sprintMatch?.[1]?.trim() ?? 'unknown',
    discovered: discoveredMatch?.[1]?.trim() ?? 'unknown',
    stepsToReproduce: stepsMatch?.[1]?.trim(),
    expected: expectedMatch?.[1]?.trim(),
    actual: actualMatch?.[1]?.trim(),
    url: urlMatch?.[1]?.trim(),
    regressionTest: regressionMatch?.[1]?.trim(),
    resolution: resolutionMatch?.[1]?.trim(),
    raw: content,
  };
}

function parseFeatureFile(filename: string, content: string): FeatureFile {
  const id = filename.replace('.md', '');
  const titleMatch = content.match(/^# \S+ — (.+)$/m);
  const statusMatch = content.match(/^## Status: (.+)$/m);
  const priorityMatch = content.match(/^## Priority: (.+)$/m);
  const sprintMatch = content.match(/^## Sprint: (.+)$/m);
  const descMatch = content.match(/## Description\n([\s\S]*?)(?=\n## |$)/);

  return {
    id,
    title: titleMatch?.[1]?.trim() ?? 'Unknown',
    status: statusMatch?.[1]?.trim() ?? 'OPEN',
    priority: priorityMatch?.[1]?.trim() ?? 'ENHANCEMENT',
    sprint: sprintMatch?.[1]?.trim() ?? 'unknown',
    description: descMatch?.[1]?.trim(),
    raw: content,
  };
}

async function listFilesInDir(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

export async function listBugs(
  sprint?: string,
  status?: 'open' | 'fixed',
): Promise<BugFile[]> {
  const s = sprint ?? loadConfig().sprintCurrent;
  const sprintPath = getSprintDir(s);
  const bugs: BugFile[] = [];

  const statuses: Array<'open' | 'fixed'> = status ? [status] : ['open', 'fixed'];

  for (const st of statuses) {
    const dir = resolve(sprintPath, 'BUGS', st);
    const files = await listFilesInDir(dir);

    for (const file of files) {
      const content = await readFile(resolve(dir, file), 'utf8');
      bugs.push(parseBugFile(file, content));
    }
  }

  return bugs;
}

export async function getBug(bugId: string, sprint?: string): Promise<BugFile | null> {
  const s = sprint ?? loadConfig().sprintCurrent;
  const sprintPath = getSprintDir(s);

  for (const status of ['open', 'fixed'] as const) {
    const filePath = resolve(sprintPath, 'BUGS', status, `${bugId}.md`);
    try {
      const content = await readFile(filePath, 'utf8');
      return parseBugFile(`${bugId}.md`, content);
    } catch {
      continue;
    }
  }

  return null;
}

export async function listFeatures(
  sprint?: string,
  status?: 'open' | 'done',
): Promise<FeatureFile[]> {
  const s = sprint ?? loadConfig().sprintCurrent;
  const sprintPath = getSprintDir(s);
  const features: FeatureFile[] = [];

  const statuses: Array<'open' | 'done'> = status ? [status] : ['open', 'done'];

  for (const st of statuses) {
    const dir = resolve(sprintPath, 'FEATURES', st);
    const files = await listFilesInDir(dir);

    for (const file of files) {
      const content = await readFile(resolve(dir, file), 'utf8');
      features.push(parseFeatureFile(file, content));
    }
  }

  return features;
}

export async function getFeature(featId: string, sprint?: string): Promise<FeatureFile | null> {
  const s = sprint ?? loadConfig().sprintCurrent;
  const sprintPath = getSprintDir(s);

  for (const status of ['open', 'done'] as const) {
    const filePath = resolve(sprintPath, 'FEATURES', status, `${featId}.md`);
    try {
      const content = await readFile(filePath, 'utf8');
      return parseFeatureFile(`${featId}.md`, content);
    } catch {
      continue;
    }
  }

  return null;
}

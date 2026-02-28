import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { listBugs, getBug, listFeatures, getFeature } from '../filesystem/reader.js';
import { writeBug, writeFeature, writeSessionJson, updateBug, closeBug } from '../filesystem/writer.js';
import { nextBugId, nextFeatId, currentBugCount, currentFeatCount } from '../filesystem/counter.js';
import { getProjectRoot, loadConfig } from '../config.js';
import type { StorageProvider, SprintInfo } from './types.js';
import type { Bug, Feature, VIGILSession, BugFile, FeatureFile, BugUpdate } from '../types.js';

export class FilesystemStorage implements StorageProvider {
  readonly name = 'filesystem';

  listBugs(sprint?: string, status?: 'open' | 'fixed'): Promise<BugFile[]> {
    return listBugs(sprint, status);
  }

  getBug(bugId: string, sprint?: string): Promise<BugFile | null> {
    return getBug(bugId, sprint);
  }

  writeBug(bug: Bug, sprint?: string): Promise<string> {
    return writeBug(bug, sprint);
  }

  updateBug(bugId: string, fields: BugUpdate, sprint?: string): Promise<boolean> {
    return updateBug(bugId, fields, sprint);
  }

  closeBug(bugId: string, resolution: string, keepTest: boolean, sprint?: string): Promise<boolean> {
    return closeBug(bugId, resolution, keepTest, sprint);
  }

  listFeatures(sprint?: string, status?: 'open' | 'done'): Promise<FeatureFile[]> {
    return listFeatures(sprint, status);
  }

  getFeature(featId: string, sprint?: string): Promise<FeatureFile | null> {
    return getFeature(featId, sprint);
  }

  writeFeature(feat: Feature, sprint?: string): Promise<string> {
    return writeFeature(feat, sprint);
  }

  writeSessionJson(session: VIGILSession): Promise<string> {
    return writeSessionJson(session);
  }

  nextBugId(): Promise<string> {
    return nextBugId();
  }

  nextFeatId(): Promise<string> {
    return nextFeatId();
  }

  currentBugCount(): Promise<number> {
    return currentBugCount();
  }

  currentFeatCount(): Promise<number> {
    return currentFeatCount();
  }

  async listSprints(): Promise<{ sprints: SprintInfo[]; current: string }> {
    const sprintsDir = resolve(getProjectRoot(), 'docs', 'sprints');
    const entries = await readdir(sprintsDir, { withFileTypes: true });

    const sprints = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('sprint_'))
      .map((e) => {
        const id = e.name.replace('sprint_', '');
        return { id, name: e.name };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const current = loadConfig().sprintCurrent;
    return { sprints, current };
  }
}

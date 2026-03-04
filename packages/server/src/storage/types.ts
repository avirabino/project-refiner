import type { BugFile, FeatureFile, Bug, Feature, VIGILSession, BugUpdate } from '../types.js';

export interface SprintInfo {
  id: string;
  name: string;
}

export interface StorageProvider {
  readonly name: string;

  // Bugs
  listBugs(sprint?: string, status?: 'open' | 'fixed'): Promise<BugFile[]>;
  getBug(bugId: string, sprint?: string): Promise<BugFile | null>;
  writeBug(bug: Bug, sprint?: string): Promise<string>;
  updateBug(bugId: string, fields: BugUpdate, sprint?: string): Promise<boolean>;
  closeBug(bugId: string, resolution: string, keepTest: boolean, sprint?: string): Promise<boolean>;

  // Features
  listFeatures(sprint?: string, status?: 'open' | 'done'): Promise<FeatureFile[]>;
  getFeature(featId: string, sprint?: string): Promise<FeatureFile | null>;
  writeFeature(feat: Feature, sprint?: string): Promise<string>;

  // Sessions
  writeSessionJson(session: VIGILSession): Promise<string>;
  listSessions(project?: string, sprint?: string): Promise<VIGILSession[]>;
  getSession(sessionId: string): Promise<VIGILSession | null>;
  deleteSession(sessionId: string): Promise<boolean>;

  // Counters
  nextBugId(): Promise<string>;
  nextFeatId(): Promise<string>;
  currentBugCount(): Promise<number>;
  currentFeatCount(): Promise<number>;

  // Sprints
  listSprints(): Promise<{ sprints: SprintInfo[]; current: string }>;
}

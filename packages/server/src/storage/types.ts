import type { BugFile, FeatureFile, Bug, Feature, VIGILSession, BugUpdate } from '../types.js';

export interface SprintInfo {
  id: string;
  name: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  currentSprint?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export type ProjectCreate = Omit<ProjectRecord, 'createdAt' | 'updatedAt' | 'archivedAt'>;
export type ProjectUpdate = Partial<Pick<ProjectRecord, 'name' | 'description' | 'currentSprint' | 'url'>>;

export interface StorageProvider {
  readonly name: string;

  // Projects
  listProjects(includeArchived?: boolean): Promise<ProjectRecord[]>;
  getProject(projectId: string): Promise<ProjectRecord | null>;
  createProject(project: ProjectCreate): Promise<string>;
  updateProject(projectId: string, fields: ProjectUpdate): Promise<boolean>;
  deleteProject(projectId: string): Promise<boolean>;

  // Bugs
  listBugs(sprint?: string, status?: 'open' | 'fixed', includeArchived?: boolean): Promise<BugFile[]>;
  getBug(bugId: string, sprint?: string): Promise<BugFile | null>;
  writeBug(bug: Bug, sprint?: string): Promise<string>;
  updateBug(bugId: string, fields: BugUpdate, sprint?: string): Promise<boolean>;
  closeBug(bugId: string, resolution: string, keepTest: boolean, sprint?: string): Promise<boolean>;

  // Features
  listFeatures(sprint?: string, status?: 'open' | 'done', includeArchived?: boolean): Promise<FeatureFile[]>;
  getFeature(featId: string, sprint?: string): Promise<FeatureFile | null>;
  writeFeature(feat: Feature, sprint?: string): Promise<string>;

  // Sessions
  writeSessionJson(session: VIGILSession): Promise<string>;
  listSessions(project?: string, sprint?: string, includeArchived?: boolean): Promise<VIGILSession[]>;
  getSession(sessionId: string): Promise<VIGILSession | null>;
  deleteSession(sessionId: string): Promise<boolean>;

  // Archive / Restore
  archiveProject(projectId: string): Promise<boolean>;
  restoreProject(projectId: string): Promise<boolean>;
  archiveSession(sessionId: string): Promise<boolean>;
  restoreSession(sessionId: string): Promise<boolean>;
  archiveBug(bugId: string): Promise<boolean>;
  restoreBug(bugId: string): Promise<boolean>;
  archiveFeature(featId: string): Promise<boolean>;
  restoreFeature(featId: string): Promise<boolean>;

  // Maintenance
  cleanOrphans?(): Promise<{ bugs: number; features: number }>;
  backfillFromJsonb?(): Promise<{ bugsCreated: number; featuresCreated: number; errors: string[] }>;

  // Counters
  nextBugId(): Promise<string>;
  nextFeatId(): Promise<string>;
  currentBugCount(): Promise<number>;
  currentFeatCount(): Promise<number>;

  // Sprints
  listSprints(): Promise<{ sprints: SprintInfo[]; current: string }>;
}

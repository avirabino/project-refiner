import { z } from 'zod';

// ── Enums ────────────────────────────────────────────────────────────────────

export const BugPrioritySchema = z.enum(['P0', 'P1', 'P2', 'P3']);
export type BugPriority = z.infer<typeof BugPrioritySchema>;
export const BugPriority = BugPrioritySchema.enum;

export const BugStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'wontfix']);
export type BugStatus = z.infer<typeof BugStatusSchema>;
export const BugStatus = BugStatusSchema.enum;

export const FeatureTypeSchema = z.enum(['ENHANCEMENT', 'NEW_FEATURE', 'UX_IMPROVEMENT']);
export type FeatureType = z.infer<typeof FeatureTypeSchema>;
export const FeatureType = FeatureTypeSchema.enum;

export const FeatureStatusSchema = z.enum(['open', 'planned', 'in_sprint', 'done']);
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;
export const FeatureStatus = FeatureStatusSchema.enum;

// ── Wire-format schemas (ext → server) ──────────────────────────────────────

export const BugSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: z.literal('bug'),
  priority: BugPrioritySchema,
  status: BugStatusSchema,
  title: z.string(),
  description: z.string(),
  url: z.string(),
  elementSelector: z.string().optional(),
  screenshotId: z.string().optional(),
  timestamp: z.number(),
});
export type Bug = z.infer<typeof BugSchema>;

export const FeatureSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: z.literal('feature'),
  featureType: FeatureTypeSchema,
  status: FeatureStatusSchema,
  sprintRef: z.string().optional(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  elementSelector: z.string().optional(),
  screenshotId: z.string().optional(),
  timestamp: z.number(),
});
export type Feature = z.infer<typeof FeatureSchema>;

export const RrwebChunkSchema = z.object({
  chunkIndex: z.number(),
  pageUrl: z.string(),
  events: z.array(z.unknown()),
  createdAt: z.number(),
  compressed: z.boolean().optional(),
  data: z.string().optional(),
});
export type RrwebChunk = z.infer<typeof RrwebChunkSchema>;

export const VIGILRecordingSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  rrwebChunks: z.array(RrwebChunkSchema),
  mouseTracking: z.boolean(),
});
export type VIGILRecording = z.infer<typeof VIGILRecordingSchema>;

export const VIGILSnapshotSchema = z.object({
  id: z.string(),
  capturedAt: z.number(),
  screenshotDataUrl: z.string(),
  url: z.string(),
  triggeredBy: z.enum(['manual', 'bug-editor', 'auto']),
});
export type VIGILSnapshot = z.infer<typeof VIGILSnapshotSchema>;

export const VIGILSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectId: z.string(),
  sprint: z.string().optional(),
  description: z.string().optional(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  clock: z.number(),
  recordings: z.array(VIGILRecordingSchema),
  snapshots: z.array(VIGILSnapshotSchema),
  bugs: z.array(BugSchema),
  features: z.array(FeatureSchema),
  pendingSync: z.boolean().optional(),
});
export type VIGILSession = z.infer<typeof VIGILSessionSchema>;

// ── Mutation schemas ─────────────────────────────────────────────────────────

export const BugUpdateSchema = z.object({
  status: BugStatusSchema.optional(),
  severity: BugPrioritySchema.optional(),
  resolution: z.string().optional(),
  regressionTest: z.string().optional(),
});
export type BugUpdate = z.infer<typeof BugUpdateSchema>;

// ── Server/dashboard shared interfaces ───────────────────────────────────────

export interface BugFile {
  id: string;
  title: string;
  status: string;
  severity: string;
  sprint: string;
  discovered: string;
  stepsToReproduce?: string;
  expected?: string;
  actual?: string;
  url?: string;
  regressionTest?: string;
  resolution?: string;
  raw: string;
}

export interface FeatureFile {
  id: string;
  title: string;
  status: string;
  priority: string;
  sprint: string;
  description?: string;
  raw: string;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  version?: string;
  llmMode?: string;
  port?: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const TEST_STATUS = {
  PENDING: '\u2B1C',
  PASSING: '\uD83D\uDFE2',
  FAILING: '\uD83D\uDD34',
  ARCHIVED: '\u2B1C (archived)',
} as const;

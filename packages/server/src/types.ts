// Re-export all shared types from @synaptix/vigil-shared (S07-11)
// Server-specific code now imports directly from the shared package.
// This file exists for backward compatibility with tests and any remaining consumers.

export {
  BugPrioritySchema,
  BugPriority,
  BugStatusSchema,
  BugStatus,
  FeatureTypeSchema,
  FeatureType,
  FeatureStatusSchema,
  FeatureStatus,
  BugSchema,
  FeatureSchema,
  RrwebChunkSchema,
  VIGILRecordingSchema,
  VIGILSnapshotSchema,
  VIGILSessionSchema,
  BugUpdateSchema,
  TEST_STATUS,
} from '@synaptix/vigil-shared';

export type {
  Bug,
  Feature,
  RrwebChunk,
  VIGILRecording,
  VIGILSnapshot,
  VIGILSession,
  BugUpdate,
  BugFile,
  FeatureFile,
  HealthStatus,
} from '@synaptix/vigil-shared';

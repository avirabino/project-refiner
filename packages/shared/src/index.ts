export {
  // Enum schemas + values + types
  BugPrioritySchema,
  BugPriority,
  BugStatusSchema,
  BugStatus,
  FeatureTypeSchema,
  FeatureType,
  FeatureStatusSchema,
  FeatureStatus,

  // Wire-format schemas + types
  BugSchema,
  FeatureSchema,
  RrwebChunkSchema,
  VIGILRecordingSchema,
  VIGILSnapshotSchema,
  VIGILSessionSchema,

  // Annotation schemas (Sprint 07 — visual markup)
  AnnotationKindSchema,
  AnnotationSchema,

  // Mutation schemas + types
  BugUpdateSchema,

  // Constants
  TEST_STATUS,

  // Utilities
  normalizeSprint,
} from './schemas.js';

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
  Annotation,
  AnnotationKind,
} from './schemas.js';

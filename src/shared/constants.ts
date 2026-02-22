/**
 * @file constants.ts
 * @description Global constants for SynaptixLabs Refine.
 */

/**
 * Regular expression for validating Session IDs.
 * Format: ats-YYYY-MM-DD-NNN
 */
export const SESSION_ID_FORMAT = /^ats-\d{4}-\d{2}-\d{2}-\d{3}$/;

export const VERSION = '1.0.0';

export const DB_NAME = 'refine-db';

export const KEEPALIVE_ALARM_NAME = 'refine-keepalive';

export const SHORTCUT_MAP = {
  R: 'toggle-recording',
  S: 'capture-screenshot',
  B: 'open-bug-editor',
} as const;

/**
 * Array of selector attributes to prioritize when generating locators.
 * Order matters: First match wins.
 */
export const SELECTOR_PRIORITIES = ['data-testid', 'aria-label', 'id', 'css'];

/**
 * Application limits and constraints.
 */
export const LIMITS = {
  MAX_SESSION_DURATION_MS: 1000 * 60 * 60, // 1 hour
  MAX_EVENTS_PER_SESSION: 50000,
  MAX_BUGS_PER_SESSION: 100,
  MAX_FEATURES_PER_SESSION: 100
};

/**
 * Default values for various entities and settings.
 */
export const DEFAULT_VALUES = {
  BUG_PRIORITY: 'P2', // Corresponds to BugPriority.P2 (but we avoid circular deps if needed)
  FEATURE_TYPE: 'ENHANCEMENT' // Corresponds to FeatureType.ENHANCEMENT
};

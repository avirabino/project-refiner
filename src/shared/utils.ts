/**
 * @file utils.ts
 * @description Core utility functions for SynaptixLabs Refine.
 */

/**
 * Generates a standard Session ID (ats-YYYY-MM-DD-NNN).
 * @param date Current date (defaults to new Date())
 * @param sequence Sequence number for the day (defaults to 1)
 * @returns Formatted session ID string
 */
export const generateSessionId = (date: Date = new Date(), sequence: number = 1): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seqStr = String(sequence).padStart(3, '0');

  return `ats-${year}-${month}-${day}-${seqStr}`;
};

/**
 * Formats a Unix timestamp into a human-readable string.
 * @param timestamp Epoch timestamp in milliseconds
 * @returns Formatted string (e.g., "YYYY-MM-DD HH:MM:SS")
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Generates a unique Bug ID using crypto.randomUUID().
 * Format: bug-XXXXXXXX (first segment of a UUID v4).
 * @returns Unique bug ID
 */
export const generateBugId = (): string => {
  return `bug-${crypto.randomUUID().split('-')[0]}`;
};

/**
 * Generates a unique Feature ID using crypto.randomUUID().
 * Format: feat-XXXXXXXX
 */
export const generateFeatureId = (): string => {
  return `feat-${crypto.randomUUID().split('-')[0]}`;
};

/**
 * Generates a unique Screenshot ID using crypto.randomUUID().
 * Format: ss-XXXXXXXX
 */
export const generateScreenshotId = (): string => {
  return `ss-${crypto.randomUUID().split('-')[0]}`;
};

/**
 * Formats a duration in milliseconds to a human-readable string.
 * Examples: "2h 5m 3s", "12m 30s", "45s", "0s"
 */
export const formatDuration = (ms: number): string => {
  if (!ms || isNaN(ms)) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

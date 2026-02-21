import { describe, it, expect } from 'vitest';
import { generateSessionId, formatTimestamp, generateBugId } from '@shared/utils';

describe('Shared Utils', () => {
  describe('generateSessionId', () => {
    it('should generate an ID in the correct format', () => {
      const id = generateSessionId();
      expect(id).toMatch(/^ats-\d{4}-\d{2}-\d{2}-\d{3}$/);
    });

    it('should use provided date and sequence', () => {
      const testDate = new Date('2026-02-21T10:00:00Z');
      const id = generateSessionId(testDate, 42);
      expect(id).toBe('ats-2026-02-21-042');
    });

    it('should pad single digit dates correctly', () => {
      const testDate = new Date('2026-01-05T10:00:00Z');
      const id = generateSessionId(testDate, 1);
      expect(id).toBe('ats-2026-01-05-001');
    });
  });

  describe('formatTimestamp', () => {
    it('should format epoch timestamp into readable string', () => {
      const testDate = new Date(2026, 1, 21, 14, 30, 45);
      const timestamp = testDate.getTime();
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toBe('2026-02-21 14:30:45');
    });
  });

  describe('generateBugId', () => {
    it('should generate an ID with bug- prefix and 8-char hex segment', () => {
      const id = generateBugId();
      expect(id).toMatch(/^bug-[0-9a-f]{8}$/);
    });

    it('should generate unique IDs across 100 calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) ids.add(generateBugId());
      expect(ids.size).toBe(100);
    });
  });
});

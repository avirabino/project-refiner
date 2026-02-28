// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
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
  VIGILSessionSchema,
  BugUpdateSchema,
  TEST_STATUS,
} from '@synaptix/vigil-shared';

// ── Enum schemas ──────────────────────────────────────────────────────────────

describe('BugPrioritySchema', () => {
  it('accepts P0-P3', () => {
    for (const p of ['P0', 'P1', 'P2', 'P3']) {
      expect(BugPrioritySchema.safeParse(p).success).toBe(true);
    }
  });

  it('rejects invalid values', () => {
    expect(BugPrioritySchema.safeParse('P5').success).toBe(false);
    expect(BugPrioritySchema.safeParse('high').success).toBe(false);
  });

  it('provides enum-like access via declaration merge', () => {
    expect(BugPriority.P0).toBe('P0');
    expect(BugPriority.P3).toBe('P3');
  });
});

describe('BugStatusSchema', () => {
  it('accepts valid statuses', () => {
    for (const s of ['open', 'in_progress', 'resolved', 'wontfix']) {
      expect(BugStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    expect(BugStatusSchema.safeParse('closed').success).toBe(false);
  });

  it('provides enum-like access', () => {
    expect(BugStatus.open).toBe('open');
    expect(BugStatus.resolved).toBe('resolved');
  });
});

describe('FeatureTypeSchema', () => {
  it('accepts valid types', () => {
    for (const t of ['ENHANCEMENT', 'NEW_FEATURE', 'UX_IMPROVEMENT']) {
      expect(FeatureTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it('rejects invalid type', () => {
    expect(FeatureTypeSchema.safeParse('BUG_FIX').success).toBe(false);
  });

  it('provides enum-like access', () => {
    expect(FeatureType.ENHANCEMENT).toBe('ENHANCEMENT');
  });
});

describe('FeatureStatusSchema', () => {
  it('accepts valid statuses', () => {
    for (const s of ['open', 'planned', 'in_sprint', 'done']) {
      expect(FeatureStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it('provides enum-like access', () => {
    expect(FeatureStatus.done).toBe('done');
  });
});

// ── Wire-format schemas ───────────────────────────────────────────────────────

describe('BugSchema', () => {
  const validBug = {
    id: 'temp-1',
    sessionId: 'vigil-SESSION-001',
    type: 'bug' as const,
    priority: 'P1',
    status: 'open',
    title: 'Test bug',
    description: 'Something is broken',
    url: 'http://localhost:3000/page',
    timestamp: 1740000000000,
  };

  it('validates a correct bug', () => {
    expect(BugSchema.safeParse(validBug).success).toBe(true);
  });

  it('accepts optional fields', () => {
    const withOptionals = { ...validBug, elementSelector: '#btn', screenshotId: 'snap-1' };
    expect(BugSchema.safeParse(withOptionals).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { title: _t, ...noTitle } = validBug;
    expect(BugSchema.safeParse(noTitle).success).toBe(false);
  });

  it('rejects wrong type literal', () => {
    expect(BugSchema.safeParse({ ...validBug, type: 'feature' }).success).toBe(false);
  });
});

describe('FeatureSchema', () => {
  const validFeature = {
    id: 'temp-2',
    sessionId: 'vigil-SESSION-001',
    type: 'feature' as const,
    featureType: 'ENHANCEMENT',
    status: 'open',
    title: 'Test feature',
    description: 'A new feature',
    url: 'http://localhost:3000/page',
    timestamp: 1740000000000,
  };

  it('validates a correct feature', () => {
    expect(FeatureSchema.safeParse(validFeature).success).toBe(true);
  });

  it('rejects invalid featureType', () => {
    expect(FeatureSchema.safeParse({ ...validFeature, featureType: 'INVALID' }).success).toBe(false);
  });
});

describe('RrwebChunkSchema', () => {
  it('validates a minimal chunk (no id/sessionId)', () => {
    const chunk = {
      chunkIndex: 0,
      pageUrl: 'http://localhost:3000',
      events: [{ type: 2, data: {} }],
      createdAt: 1740000000000,
    };
    expect(RrwebChunkSchema.safeParse(chunk).success).toBe(true);
  });

  it('rejects chunk with extra id field (drift guard)', () => {
    const chunk = {
      id: 1,
      chunkIndex: 0,
      pageUrl: 'http://localhost:3000',
      events: [],
      createdAt: 1740000000000,
    };
    // Zod strips unknown keys by default — it should still parse
    const result = RrwebChunkSchema.safeParse(chunk);
    expect(result.success).toBe(true);
    if (result.success) {
      // Verify `id` is NOT in the parsed output
      expect('id' in result.data).toBe(false);
    }
  });
});

describe('VIGILSessionSchema', () => {
  const validSession = {
    id: 'vigil-SESSION-20260226-001',
    name: 'Test Session',
    projectId: 'my-project',
    startedAt: 1740000000000,
    endedAt: 1740000060000,
    clock: 60000,
    recordings: [],
    snapshots: [],
    bugs: [],
    features: [],
  };

  it('validates a minimal session', () => {
    expect(VIGILSessionSchema.safeParse(validSession).success).toBe(true);
  });

  it('accepts optional sprint and description (S07-16)', () => {
    const withSprint = { ...validSession, sprint: '07', description: 'A test session' };
    expect(VIGILSessionSchema.safeParse(withSprint).success).toBe(true);
  });

  it('accepts optional pendingSync flag', () => {
    const withSync = { ...validSession, pendingSync: true };
    expect(VIGILSessionSchema.safeParse(withSync).success).toBe(true);
  });

  it('rejects session without required fields', () => {
    expect(VIGILSessionSchema.safeParse({ id: 'test' }).success).toBe(false);
  });
});

// ── Mutation schema ───────────────────────────────────────────────────────────

describe('BugUpdateSchema', () => {
  it('accepts partial updates', () => {
    expect(BugUpdateSchema.safeParse({ status: 'resolved' }).success).toBe(true);
    expect(BugUpdateSchema.safeParse({ severity: 'P0' }).success).toBe(true);
    expect(BugUpdateSchema.safeParse({ resolution: 'Fixed in commit abc' }).success).toBe(true);
  });

  it('accepts empty object (no updates)', () => {
    expect(BugUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('rejects invalid status in update', () => {
    expect(BugUpdateSchema.safeParse({ status: 'INVALID' }).success).toBe(false);
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('TEST_STATUS', () => {
  it('exports all status values', () => {
    expect(TEST_STATUS.PENDING).toBeDefined();
    expect(TEST_STATUS.PASSING).toBeDefined();
    expect(TEST_STATUS.FAILING).toBeDefined();
    expect(TEST_STATUS.ARCHIVED).toBeDefined();
  });

  it('uses correct unicode characters', () => {
    expect(TEST_STATUS.PENDING).toBe('\u2B1C');          // ⬜
    expect(TEST_STATUS.PASSING).toBe('\uD83D\uDFE2');   // 🟢
    expect(TEST_STATUS.FAILING).toBe('\uD83D\uDD34');   // 🔴
  });
});

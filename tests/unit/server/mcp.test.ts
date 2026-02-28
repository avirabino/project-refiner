// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const TEST_ROOT = resolve(import.meta.dirname, '..', '..', '..', '.vigil-mcp-test');
const TEST_VIGIL_DIR = resolve(TEST_ROOT, '.vigil');
const TEST_SPRINT_DIR = resolve(TEST_ROOT, 'docs', 'sprints', 'sprint_06');

vi.mock('../../../packages/server/src/config.js', () => ({
  loadConfig: () => ({
    projectId: 'test',
    sprintCurrent: '06',
    serverPort: 7474,
    maxFixIterations: 3,
    llmMode: 'mock',
    agentsApiUrl: 'http://localhost:8000',
  }),
  getProjectRoot: () => TEST_ROOT,
  getVigilDataDir: () => TEST_VIGIL_DIR,
  getSprintDir: (sprint?: string) => {
    const s = sprint ?? '06';
    return resolve(TEST_ROOT, 'docs', 'sprints', `sprint_${s}`);
  },
}));

// We test the tool handlers by importing registerTools and creating a mock McpServer
// Since McpServer.tool() registers callbacks, we capture them and invoke directly.

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

const registeredTools: Map<string, ToolHandler> = new Map();

const mockServer = {
  tool: (name: string, _description: string, _schema: unknown, handler: ToolHandler) => {
    registeredTools.set(name, handler);
  },
};

const { registerTools } = await import('../../../packages/server/src/mcp/tools.js');
const { initStorage } = await import('../../../packages/server/src/storage/index.js');

const BUG_CONTENT = `# BUG-001 — Save button broken

## Status: OPEN
## Severity: P1
## Sprint: 06
## Discovered: 2026-02-26 via vigil-session: test-001

## Steps to Reproduce
Click save

## Expected
Form saves

## Actual
Nothing

## URL
http://localhost:3000

## Regression Test
File: tests/e2e/regression/BUG-001.spec.ts
Status: ⬜
`;

const FEAT_CONTENT = `# FEAT-001 — Dark mode

## Status: OPEN
## Priority: UX_IMPROVEMENT
## Sprint: 06
## Discovered: 2026-02-26 via vigil-session: test-001

## Description
Add dark mode

## URL
http://localhost:3000
`;

describe('MCP tools', () => {
  beforeEach(async () => {
    registeredTools.clear();
    registerTools(mockServer as any);

    await mkdir(resolve(TEST_SPRINT_DIR, 'BUGS', 'open'), { recursive: true });
    await mkdir(resolve(TEST_SPRINT_DIR, 'BUGS', 'fixed'), { recursive: true });
    await mkdir(resolve(TEST_SPRINT_DIR, 'FEATURES', 'open'), { recursive: true });
    await mkdir(TEST_VIGIL_DIR, { recursive: true });

    await writeFile(resolve(TEST_SPRINT_DIR, 'BUGS', 'open', 'BUG-001.md'), BUG_CONTENT, 'utf8');
    await writeFile(resolve(TEST_SPRINT_DIR, 'FEATURES', 'open', 'FEAT-001.md'), FEAT_CONTENT, 'utf8');

    // Initialize filesystem storage (DATABASE_URL unset → filesystem fallback)
    await initStorage();
  });

  afterEach(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true });
  });

  it('registers all 6 tools', () => {
    expect(registeredTools.size).toBe(6);
    expect(registeredTools.has('vigil_list_bugs')).toBe(true);
    expect(registeredTools.has('vigil_get_bug')).toBe(true);
    expect(registeredTools.has('vigil_update_bug')).toBe(true);
    expect(registeredTools.has('vigil_close_bug')).toBe(true);
    expect(registeredTools.has('vigil_list_features')).toBe(true);
    expect(registeredTools.has('vigil_get_feature')).toBe(true);
  });

  describe('vigil_list_bugs', () => {
    it('returns bugs for current sprint', async () => {
      const handler = registeredTools.get('vigil_list_bugs')!;
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBe(1);
      expect(data.bugs[0].id).toBe('BUG-001');
    });

    it('filters by status', async () => {
      const handler = registeredTools.get('vigil_list_bugs')!;
      const result = await handler({ status: 'fixed' });
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBe(0);
    });

    it('returns empty for nonexistent sprint', async () => {
      const handler = registeredTools.get('vigil_list_bugs')!;
      const result = await handler({ sprint: '99' });
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBe(0);
    });
  });

  describe('vigil_get_bug', () => {
    it('returns bug details', async () => {
      const handler = registeredTools.get('vigil_get_bug')!;
      const result = await handler({ bug_id: 'BUG-001' });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('BUG-001');
      expect(data.title).toBe('Save button broken');
      expect(data.severity).toBe('P1');
    });

    it('returns isError for nonexistent bug', async () => {
      const handler = registeredTools.get('vigil_get_bug')!;
      const result = await handler({ bug_id: 'BUG-999' });
      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toContain('BUG-999');
    });
  });

  describe('vigil_update_bug', () => {
    it('updates bug status', async () => {
      const handler = registeredTools.get('vigil_update_bug')!;
      const result = await handler({ bug_id: 'BUG-001', fields: { status: 'resolved' } });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.updated).toBe(true);
    });

    it('returns isError for nonexistent bug', async () => {
      const handler = registeredTools.get('vigil_update_bug')!;
      const result = await handler({ bug_id: 'BUG-999', fields: { status: 'resolved' } });
      expect(result.isError).toBe(true);
    });
  });

  describe('vigil_close_bug', () => {
    it('closes bug and moves to fixed/', async () => {
      const handler = registeredTools.get('vigil_close_bug')!;
      const result = await handler({ bug_id: 'BUG-001', resolution: 'Fixed root cause', keep_test: true });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.closed).toBe(true);
    });

    it('returns isError for nonexistent bug', async () => {
      const handler = registeredTools.get('vigil_close_bug')!;
      const result = await handler({ bug_id: 'BUG-999', resolution: 'Fixed', keep_test: false });
      expect(result.isError).toBe(true);
    });
  });

  describe('vigil_list_features', () => {
    it('returns features for current sprint', async () => {
      const handler = registeredTools.get('vigil_list_features')!;
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBe(1);
      expect(data.features[0].id).toBe('FEAT-001');
    });

    it('filters by status', async () => {
      const handler = registeredTools.get('vigil_list_features')!;
      const result = await handler({ status: 'done' });
      const data = JSON.parse(result.content[0].text);
      expect(data.count).toBe(0);
    });
  });

  describe('vigil_get_feature', () => {
    it('returns feature details', async () => {
      const handler = registeredTools.get('vigil_get_feature')!;
      const result = await handler({ feat_id: 'FEAT-001' });
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('FEAT-001');
      expect(data.title).toBe('Dark mode');
    });

    it('returns isError for nonexistent feature', async () => {
      const handler = registeredTools.get('vigil_get_feature')!;
      const result = await handler({ feat_id: 'FEAT-999' });
      expect(result.isError).toBe(true);
      const data = JSON.parse(result.content[0].text);
      expect(data.error).toContain('FEAT-999');
    });
  });
});

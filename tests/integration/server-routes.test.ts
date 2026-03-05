/**
 * S07-22 — HTTP Route Integration Tests
 * Tests all vigil-server routes via supertest with mocked storage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// vi.hoisted ensures mockStorage is initialized before vi.mock factories run
const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    name: 'mock',
    // Projects
    listProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    // Bugs
    listBugs: vi.fn(),
    getBug: vi.fn(),
    writeBug: vi.fn(),
    updateBug: vi.fn(),
    closeBug: vi.fn(),
    // Features
    listFeatures: vi.fn(),
    getFeature: vi.fn(),
    writeFeature: vi.fn(),
    // Sessions
    writeSessionJson: vi.fn(),
    listSessions: vi.fn(),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
    // Archive / Restore
    archiveProject: vi.fn(),
    restoreProject: vi.fn(),
    archiveSession: vi.fn(),
    restoreSession: vi.fn(),
    archiveBug: vi.fn(),
    restoreBug: vi.fn(),
    archiveFeature: vi.fn(),
    restoreFeature: vi.fn(),
    // Counters
    nextBugId: vi.fn(),
    nextFeatId: vi.fn(),
    currentBugCount: vi.fn(),
    currentFeatCount: vi.fn(),
    // Sprints
    listSprints: vi.fn(),
  },
}));

vi.mock('../../packages/server/src/storage/index.js', () => ({
  initStorage: vi.fn().mockResolvedValue(mockStorage),
  getStorage: vi.fn(() => mockStorage),
}));

vi.mock('../../packages/server/src/db/client.js', () => ({
  isDatabaseConfigured: vi.fn(() => false),
  getPool: vi.fn(),
}));

vi.mock('../../packages/server/src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    projectId: 'test-project',
    sprintCurrent: '07',
    serverPort: 7474,
    maxFixIterations: 3,
    llmMode: 'mock',
    agentsApiUrl: 'http://localhost:8000',
  })),
  getProjectRoot: vi.fn(() => '/tmp/vigil-test'),
  getVigilDataDir: vi.fn(() => '/tmp/vigil-test/.vigil'),
}));

import { app } from '../../packages/server/src/app.js';

// ── Fixtures ──

function makeValidSessionPayload() {
  return {
    id: 'vigil-SESSION-20260301-001',
    projectId: 'test-project',
    sprint: '07',
    name: 'Test Session',
    startedAt: Date.now() - 60000,
    endedAt: Date.now(),
    clock: 60000,
    recordings: [],
    snapshots: [],
    bugs: [],
    features: [],
  };
}

function makeBugFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'BUG-001',
    title: 'Test bug',
    status: 'OPEN',
    severity: 'P2',
    sprint: '07',
    discovered: '2026-03-01 via test',
    raw: '# BUG-001 — Test bug',
    archivedAt: null,
    ...overrides,
  };
}

function makeFeatureFile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'FEAT-001',
    title: 'Test feature',
    status: 'OPEN',
    priority: 'ENHANCEMENT',
    sprint: '07',
    raw: '# FEAT-001 — Test feature',
    archivedAt: null,
    ...overrides,
  };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'vigil-SESSION-20260301-001',
    projectId: 'test-project',
    sprint: '07',
    name: 'Test Session',
    startedAt: Date.now() - 60000,
    endedAt: Date.now(),
    clock: 60000,
    recordings: [],
    snapshots: [],
    bugs: [],
    features: [],
    annotations: [],
    ...overrides,
  };
}

// ── Tests ──

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /health', () => {
  it('returns 200 with correct shape', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('storage');
    expect(res.body).toHaveProperty('llmMode');
    expect(res.body).toHaveProperty('port');
  });

  it('reports mock storage name', async () => {
    const res = await request(app).get('/health');
    expect(res.body.storage).toBe('mock');
  });
});

describe('POST /api/session', () => {
  it('accepts valid session payload', async () => {
    mockStorage.getProject.mockResolvedValue({ id: 'test-project', name: 'Test' });
    mockStorage.writeSessionJson.mockResolvedValue('vigil-SESSION-20260301-001');
    const payload = makeValidSessionPayload();
    const res = await request(app).post('/api/session').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('bugsWritten', 0);
    expect(res.body).toHaveProperty('featuresWritten', 0);
  });

  it('writes bugs from session payload', async () => {
    mockStorage.getProject.mockResolvedValue({ id: 'test-project', name: 'Test' });
    mockStorage.writeSessionJson.mockResolvedValue('vigil-SESSION-20260301-001');
    mockStorage.writeBug.mockResolvedValue('BUG-001');
    const payload = makeValidSessionPayload();
    payload.bugs = [{
      id: 'temp-1',
      sessionId: payload.id,
      type: 'bug',
      title: 'Test bug',
      description: 'A test bug',
      priority: 'P2',
      status: 'open',
      url: 'http://localhost:3000',
      screenshotId: '',
      timestamp: Date.now(),
    }] as never[];
    const res = await request(app).post('/api/session').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.bugsWritten).toBe(1);
    expect(res.body.bugIds).toHaveLength(1);
  });

  it('rejects session with non-existent project', async () => {
    mockStorage.getProject.mockResolvedValue(null);
    const payload = makeValidSessionPayload();
    payload.projectId = 'no-such-project';
    const res = await request(app).post('/api/session').send(payload);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('does not exist');
  });

  it('rejects invalid payload with 400', async () => {
    const res = await request(app).post('/api/session').send({ bad: 'data' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on storage error', async () => {
    mockStorage.getProject.mockResolvedValue({ id: 'test-project', name: 'Test' });
    mockStorage.writeSessionJson.mockRejectedValue(new Error('DB down'));
    const payload = makeValidSessionPayload();
    const res = await request(app).post('/api/session').send(payload);
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/sessions', () => {
  it('returns empty session list', async () => {
    mockStorage.listSessions.mockResolvedValue([]);
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sessions');
    expect(res.body.sessions).toEqual([]);
  });

  it('returns session summaries', async () => {
    mockStorage.listSessions.mockResolvedValue([makeSession()]);
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0]).toHaveProperty('id');
    expect(res.body.sessions[0]).toHaveProperty('name');
  });

  it('passes query params to storage', async () => {
    mockStorage.listSessions.mockResolvedValue([]);
    await request(app).get('/api/sessions?project=myproj&sprint=07');
    expect(mockStorage.listSessions).toHaveBeenCalledWith('myproj', '07', false);
  });

  it('returns 500 on storage error', async () => {
    mockStorage.listSessions.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/sessions');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/sessions/:id', () => {
  it('returns session by ID', async () => {
    mockStorage.getSession.mockResolvedValue(makeSession());
    const res = await request(app).get('/api/sessions/vigil-SESSION-20260301-001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('session');
    expect(res.body.session).toHaveProperty('id');
  });

  it('returns 404 for unknown session', async () => {
    mockStorage.getSession.mockResolvedValue(null);
    const res = await request(app).get('/api/sessions/unknown-id');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on storage error', async () => {
    mockStorage.getSession.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/sessions/test-id');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/bugs', () => {
  it('returns empty bug list', async () => {
    mockStorage.listBugs.mockResolvedValue([]);
    const res = await request(app).get('/api/bugs');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('bugs');
    expect(res.body).toHaveProperty('count', 0);
  });

  it('returns bugs with count', async () => {
    mockStorage.listBugs.mockResolvedValue([makeBugFile(), makeBugFile({ id: 'BUG-002' })]);
    const res = await request(app).get('/api/bugs');
    expect(res.status).toBe(200);
    expect(res.body.bugs).toHaveLength(2);
    expect(res.body.count).toBe(2);
  });

  it('passes query params to storage', async () => {
    mockStorage.listBugs.mockResolvedValue([]);
    await request(app).get('/api/bugs?sprint=06&status=open');
    expect(mockStorage.listBugs).toHaveBeenCalledWith('06', 'open', false);
  });

  it('returns 500 on storage error', async () => {
    mockStorage.listBugs.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/bugs');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/bugs/:id', () => {
  it('returns bug by ID', async () => {
    mockStorage.getBug.mockResolvedValue(makeBugFile());
    const res = await request(app).get('/api/bugs/BUG-001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'BUG-001');
  });

  it('passes sprint query param', async () => {
    mockStorage.getBug.mockResolvedValue(makeBugFile());
    await request(app).get('/api/bugs/BUG-001?sprint=06');
    expect(mockStorage.getBug).toHaveBeenCalledWith('BUG-001', '06');
  });

  it('returns 404 for unknown bug', async () => {
    mockStorage.getBug.mockResolvedValue(null);
    const res = await request(app).get('/api/bugs/BUG-999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on storage error', async () => {
    mockStorage.getBug.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/bugs/BUG-001');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('PATCH /api/bugs/:id', () => {
  it('updates bug fields', async () => {
    mockStorage.updateBug.mockResolvedValue(true);
    const res = await request(app).patch('/api/bugs/BUG-001').send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('updated', true);
    expect(res.body).toHaveProperty('bugId', 'BUG-001');
  });

  it('passes sprint query param', async () => {
    mockStorage.updateBug.mockResolvedValue(true);
    await request(app).patch('/api/bugs/BUG-001?sprint=06').send({ severity: 'P1' });
    expect(mockStorage.updateBug).toHaveBeenCalledWith('BUG-001', { severity: 'P1' }, '06');
  });

  it('rejects invalid fields with 400', async () => {
    const res = await request(app).patch('/api/bugs/BUG-001').send({ status: 'INVALID_STATUS' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when bug not found', async () => {
    mockStorage.updateBug.mockResolvedValue(false);
    const res = await request(app).patch('/api/bugs/BUG-999').send({ status: 'resolved' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on storage error', async () => {
    mockStorage.updateBug.mockRejectedValue(new Error('fail'));
    const res = await request(app).patch('/api/bugs/BUG-001').send({ status: 'resolved' });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/bugs/:id/close', () => {
  it('closes bug with resolution', async () => {
    mockStorage.closeBug.mockResolvedValue(true);
    const res = await request(app)
      .post('/api/bugs/BUG-001/close')
      .send({ resolution: 'Fixed in commit abc', keepTest: true });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('closed', true);
    expect(res.body).toHaveProperty('bugId', 'BUG-001');
  });

  it('passes sprint query param', async () => {
    mockStorage.closeBug.mockResolvedValue(true);
    await request(app)
      .post('/api/bugs/BUG-001/close?sprint=06')
      .send({ resolution: 'Fixed', keepTest: false });
    expect(mockStorage.closeBug).toHaveBeenCalledWith('BUG-001', 'Fixed', false, '06');
  });

  it('rejects missing resolution', async () => {
    const res = await request(app)
      .post('/api/bugs/BUG-001/close')
      .send({ keepTest: true });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects missing keepTest', async () => {
    const res = await request(app)
      .post('/api/bugs/BUG-001/close')
      .send({ resolution: 'Fixed' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when bug not found', async () => {
    mockStorage.closeBug.mockResolvedValue(false);
    const res = await request(app)
      .post('/api/bugs/BUG-999/close')
      .send({ resolution: 'Fixed', keepTest: true });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on storage error', async () => {
    mockStorage.closeBug.mockRejectedValue(new Error('fail'));
    const res = await request(app)
      .post('/api/bugs/BUG-001/close')
      .send({ resolution: 'Fixed', keepTest: true });
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/features', () => {
  it('returns empty feature list', async () => {
    mockStorage.listFeatures.mockResolvedValue([]);
    const res = await request(app).get('/api/features');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('features');
    expect(res.body).toHaveProperty('count', 0);
  });

  it('returns features with count', async () => {
    mockStorage.listFeatures.mockResolvedValue([makeFeatureFile()]);
    const res = await request(app).get('/api/features');
    expect(res.body.features).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });

  it('passes query params to storage', async () => {
    mockStorage.listFeatures.mockResolvedValue([]);
    await request(app).get('/api/features?sprint=06&status=done');
    expect(mockStorage.listFeatures).toHaveBeenCalledWith('06', 'done', false);
  });

  it('returns 500 on storage error', async () => {
    mockStorage.listFeatures.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/features');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/features/:id', () => {
  it('returns feature by ID', async () => {
    mockStorage.getFeature.mockResolvedValue(makeFeatureFile());
    const res = await request(app).get('/api/features/FEAT-001');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'FEAT-001');
  });

  it('passes sprint query param', async () => {
    mockStorage.getFeature.mockResolvedValue(makeFeatureFile());
    await request(app).get('/api/features/FEAT-001?sprint=06');
    expect(mockStorage.getFeature).toHaveBeenCalledWith('FEAT-001', '06');
  });

  it('returns 404 for unknown feature', async () => {
    mockStorage.getFeature.mockResolvedValue(null);
    const res = await request(app).get('/api/features/FEAT-999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 on storage error', async () => {
    mockStorage.getFeature.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/features/FEAT-001');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /api/sprints', () => {
  it('returns sprint list', async () => {
    mockStorage.listSprints.mockResolvedValue({
      sprints: [{ id: '06', name: 'sprint_06' }, { id: '07', name: 'sprint_07' }],
      current: '07',
    });
    const res = await request(app).get('/api/sprints');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sprints');
    expect(res.body).toHaveProperty('current', '07');
    expect(res.body.sprints).toHaveLength(2);
  });

  it('returns empty sprint list', async () => {
    mockStorage.listSprints.mockResolvedValue({ sprints: [], current: '07' });
    const res = await request(app).get('/api/sprints');
    expect(res.status).toBe(200);
    expect(res.body.sprints).toEqual([]);
  });

  it('returns 500 on storage error', async () => {
    mockStorage.listSprints.mockRejectedValue(new Error('fail'));
    const res = await request(app).get('/api/sprints');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

describe('POST /api/vigil/suggest', () => {
  it('returns mock suggestion in mock mode', async () => {
    const res = await request(app).post('/api/vigil/suggest').send({});
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('suggestion');
    expect(res.body).toHaveProperty('confidence', 0);
    expect(res.body).toHaveProperty('model_used', 'mock');
  });
});

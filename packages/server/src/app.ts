import express from 'express';
import cors from 'cors';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { loadConfig } from './config.js';
import { sessionRouter } from './routes/session.js';
import { sessionsRouter } from './routes/sessions.js';
import { bugsRouter } from './routes/bugs.js';
import { featuresRouter } from './routes/features.js';
import { sprintsRouter } from './routes/sprints.js';
import { suggestRouter } from './routes/suggest.js';
import { projectsRouter } from './routes/projects.js';
import { getStorage } from './storage/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export { initStorage } from './storage/index.js';

// Read version from package.json at startup (single read, not per-request)
const serverPkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8')) as { version: string };
const APP_VERSION = serverPkg.version;

const config = loadConfig();
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging — see all incoming requests
app.use((req, _res, next) => {
  const body = req.method === 'POST' || req.method === 'PATCH'
    ? ` body.id=${(req.body as Record<string, unknown>)?.id ?? '?'} projectId=${(req.body as Record<string, unknown>)?.projectId ?? '?'}`
    : '';
  console.log(`[vigil-server] ${req.method} ${req.originalUrl}${body}`);
  next();
});

// Health check
app.get('/health', (_req, res) => {
  let storageName = 'unknown';
  try {
    storageName = getStorage().name;
  } catch {
    storageName = 'not_initialized';
  }

  res.json({
    status: 'ok',
    version: APP_VERSION,
    storage: storageName,
    llmMode: config.llmMode,
    port: config.serverPort,
  });
});

// API routes
app.use('/api/session', sessionRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/features', featuresRouter);
app.use('/api/sprints', sprintsRouter);
app.use('/api/vigil', suggestRouter);
app.use('/api/projects', projectsRouter);

// Admin: clean orphaned bugs/features
app.post('/api/admin/clean-orphans', async (_req, res) => {
  try {
    const storage = getStorage();
    if (storage.cleanOrphans) {
      const result = await storage.cleanOrphans();
      res.json({ ok: true, cleaned: result });
    } else {
      res.json({ ok: true, cleaned: { bugs: 0, features: 0 }, note: 'Not supported on this storage provider' });
    }
  } catch (err) {
    console.error('[vigil-server] Error cleaning orphans:', err);
    res.status(500).json({ error: 'Failed to clean orphans' });
  }
});

// Admin: backfill normalized bug/feature tables from session JSONB data
app.post('/api/admin/backfill', async (_req, res) => {
  try {
    const storage = getStorage();
    if (storage.backfillFromJsonb) {
      const result = await storage.backfillFromJsonb();
      res.json({ ok: true, ...result });
    } else {
      res.json({ ok: true, bugsCreated: 0, featuresCreated: 0, note: 'Not supported on this storage provider' });
    }
  } catch (err) {
    console.error('[vigil-server] Error running backfill:', err);
    res.status(500).json({ error: 'Failed to run backfill' });
  }
});

// Serve dashboard static files — resolve from compiled dist/ up to public/
const dashboardDir = resolve(__dirname, '..', 'public');
app.use('/dashboard', express.static(dashboardDir, { index: 'index.html' }));
// SPA fallback — serve index.html for /dashboard and /dashboard/* routes
app.get('/dashboard', (_req, res) => {
  res.sendFile(resolve(dashboardDir, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Dashboard not built', dir: dashboardDir });
  });
});
app.get('/dashboard/*', (_req, res) => {
  res.sendFile(resolve(dashboardDir, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Dashboard not built', dir: dashboardDir });
  });
});

export { app };

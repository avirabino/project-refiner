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
import { authMiddleware } from './modules/auth/index.js';
import { billingRouter, subscriptionRouter, webhookRouter, redeemPromoHandler } from './modules/billing/index.js';

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
app.use(express.json({ limit: '50mb' }));

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

// Billing routes (Sprint 09 — Track C)
app.use('/api/billing', billingRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/webhooks', webhookRouter);
// Promo code redemption on auth path (spec: POST /api/auth/redeem-promo)
app.post('/api/auth/redeem-promo', authMiddleware, redeemPromoHandler);

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
app.use(express.static(dashboardDir, { index: false }));

// SPA fallback — serve index.html for all non-API GET routes
// Handles: /, /auth/*, /dashboard/*, /pricing, etc.
const spaFallback = (_req: express.Request, res: express.Response) => {
  res.sendFile(resolve(dashboardDir, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'Dashboard not built', dir: dashboardDir });
  });
};
app.get('/', spaFallback);
app.get('/auth/*', spaFallback);
app.get('/dashboard', spaFallback);
app.get('/dashboard/*', spaFallback);
app.get('/pricing', spaFallback);

export { app };

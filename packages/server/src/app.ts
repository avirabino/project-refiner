import express from 'express';
import cors from 'cors';
import { resolve } from 'node:path';
import { loadConfig } from './config.js';
import { sessionRouter } from './routes/session.js';
import { bugsRouter } from './routes/bugs.js';
import { featuresRouter } from './routes/features.js';
import { sprintsRouter } from './routes/sprints.js';
import { suggestRouter } from './routes/suggest.js';
import { getStorage } from './storage/index.js';

export { initStorage } from './storage/index.js';

const config = loadConfig();
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
    version: '2.0.0',
    storage: storageName,
    llmMode: config.llmMode,
    port: config.serverPort,
  });
});

// API routes
app.use('/api/session', sessionRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/features', featuresRouter);
app.use('/api/sprints', sprintsRouter);
app.use('/api/vigil', suggestRouter);

// Serve dashboard static files
app.use('/dashboard', express.static(resolve(import.meta.dirname, '..', 'public')));

export { app };

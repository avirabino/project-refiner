import { Router } from 'express';
import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getStorage } from '../storage/index.js';

export const sprintsRouter = Router();

// GET /api/sprints → list available sprints (configured project)
sprintsRouter.get('/', async (_req, res) => {
  try {
    const result = await getStorage().listSprints();
    res.json(result);
  } catch (err) {
    console.error('[vigil-server] Error listing sprints:', err);
    res.status(500).json({ error: 'Failed to list sprints' });
  }
});

// GET /api/sprints/project?path=<folder> → list sprints for any project folder (S07-16)
sprintsRouter.get('/project', async (req, res) => {
  const projectPath = req.query.path as string | undefined;
  if (!projectPath) {
    res.status(400).json({ error: 'Missing path query parameter', exists: false, sprints: [] });
    return;
  }

  try {
    // Verify folder exists
    const folderStat = await stat(projectPath).catch(() => null);
    if (!folderStat?.isDirectory()) {
      res.json({ exists: false, sprints: [], current: null });
      return;
    }

    // Try reading docs/sprints/ subdirectory
    const sprintsDir = resolve(projectPath, 'docs', 'sprints');
    const sprintsStat = await stat(sprintsDir).catch(() => null);
    if (!sprintsStat?.isDirectory()) {
      res.json({ exists: true, sprints: [], current: null });
      return;
    }

    const entries = await readdir(sprintsDir, { withFileTypes: true });
    const sprints = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('sprint_'))
      .map((e) => ({ id: e.name.replace('sprint_', ''), name: e.name }))
      .sort((a, b) => a.id.localeCompare(b.id));

    const current = sprints.length > 0 ? sprints[sprints.length - 1].id : null;

    res.json({ exists: true, sprints, current });
  } catch (err) {
    console.error('[vigil-server] Error listing project sprints:', err);
    res.status(500).json({ error: 'Failed to list project sprints', exists: false, sprints: [] });
  }
});

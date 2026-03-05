import { Router } from 'express';
import { VIGILSessionSchema, normalizeSprint } from '@synaptix/vigil-shared';
import { loadConfig } from '../config.js';
import { getStorage } from '../storage/index.js';

export const sessionRouter = Router();

sessionRouter.post('/', async (req, res) => {
  // Validate session schema
  const result = VIGILSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid session payload',
      details: result.error.issues,
    });
    return;
  }

  const session = result.data;
  const config = loadConfig();
  // Use session's own sprint (from extension) — fall back to server config only if absent
  // Normalize to bare number format (e.g. "sprint_10" → "10") for consistency
  const sprint = normalizeSprint(session.sprint ?? config.sprintCurrent);
  const storage = getStorage();

  try {
    // Validate project exists (sessions can't be orphaned)
    const project = await storage.getProject(session.projectId);
    if (!project) {
      res.status(400).json({
        error: `Project '${session.projectId}' does not exist. Create it in the dashboard first.`,
      });
      return;
    }

    // Write raw session JSON
    await storage.writeSessionJson(session);

    // Write bug files
    const bugIds: string[] = [];
    for (const bug of session.bugs) {
      const bugId = await storage.writeBug(bug, sprint);
      bugIds.push(bugId);
    }

    // Write feature files
    const featIds: string[] = [];
    for (const feat of session.features) {
      const featId = await storage.writeFeature(feat, sprint);
      featIds.push(featId);
    }

    res.status(201).json({
      sessionId: session.id,
      bugsWritten: bugIds.length,
      featuresWritten: featIds.length,
      bugIds,
      featIds,
    });
  } catch (err) {
    console.error('[vigil-server] Error processing session:', err);
    res.status(500).json({ error: 'Failed to process session' });
  }
});

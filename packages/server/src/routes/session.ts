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

    // Write raw session JSON (with embedded bugs/features/recordings)
    await storage.writeSessionJson(session);

    // Write individual bug records (each in its own try/catch so
    // one failure doesn't prevent the rest from being written).
    const bugIds: string[] = [];
    const bugErrors: string[] = [];
    for (const bug of session.bugs) {
      try {
        const bugId = await storage.writeBug(bug, sprint);
        bugIds.push(bugId);
      } catch (bugErr) {
        const msg = bugErr instanceof Error ? bugErr.message : String(bugErr);
        console.error(`[vigil-server] writeBug failed for "${bug.title}" (session: ${session.id}, sprint: ${sprint}):`, msg);
        bugErrors.push(msg);
      }
    }

    // Write individual feature records
    const featIds: string[] = [];
    const featErrors: string[] = [];
    for (const feat of session.features) {
      try {
        const featId = await storage.writeFeature(feat, sprint);
        featIds.push(featId);
      } catch (featErr) {
        const msg = featErr instanceof Error ? featErr.message : String(featErr);
        console.error(`[vigil-server] writeFeature failed for "${feat.title}" (session: ${session.id}, sprint: ${sprint}):`, msg);
        featErrors.push(msg);
      }
    }

    const hasErrors = bugErrors.length > 0 || featErrors.length > 0;
    res.status(201).json({
      sessionId: session.id,
      bugsWritten: bugIds.length,
      featuresWritten: featIds.length,
      bugIds,
      featIds,
      ...(hasErrors && {
        warnings: {
          bugErrors: bugErrors.length > 0 ? bugErrors : undefined,
          featErrors: featErrors.length > 0 ? featErrors : undefined,
        },
      }),
    });
  } catch (err) {
    console.error('[vigil-server] Error processing session:', err);
    res.status(500).json({ error: 'Failed to process session' });
  }
});

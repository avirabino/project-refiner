import { Router } from 'express';
import { getStorage } from '../storage/index.js';
import type { VIGILSession } from '@synaptix/vigil-shared';

export const sessionsRouter = Router();

/** Map a VIGILSession to the summary shape expected by the dashboard. */
function toSummary(s: VIGILSession) {
  return {
    id: s.id,
    project: s.projectId,
    sprint: s.sprint ?? '',
    name: s.name,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    recordingCount: s.recordings.length,
    snapshotCount: s.snapshots.length,
    bugCount: s.bugs.length,
    featureCount: s.features.length,
  };
}

/** Map a VIGILSession to the detail shape expected by the dashboard. */
function toDetail(s: VIGILSession) {
  return {
    id: s.id,
    project: s.projectId,
    sprint: s.sprint ?? '',
    description: s.description ?? '',
    name: s.name,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    clock: s.clock,
    recordings: s.recordings.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      rrwebChunks: r.rrwebChunks,
      mouseTracking: r.mouseTracking,
    })),
    snapshots: s.snapshots.map((snap) => ({
      id: snap.id,
      capturedAt: snap.capturedAt,
      screenshotDataUrl: snap.screenshotDataUrl,
      url: snap.url,
      triggeredBy: snap.triggeredBy,
    })),
    bugs: s.bugs.map((b) => ({
      id: b.id,
      sessionId: b.sessionId,
      title: b.title,
      description: b.description,
      priority: b.priority,
      status: b.status,
      url: b.url,
      screenshotId: b.screenshotId,
      timestamp: b.timestamp,
    })),
    features: s.features.map((f) => ({
      id: f.id,
      sessionId: f.sessionId,
      title: f.title,
      description: f.description,
      featureType: f.featureType,
      status: f.status,
      url: f.url,
      timestamp: f.timestamp,
    })),
  };
}

// GET /api/sessions?project=X&sprint=Y
sessionsRouter.get('/', async (req, res) => {
  const project = req.query.project as string | undefined;
  const sprint = req.query.sprint as string | undefined;
  const storage = getStorage();

  try {
    const sessions = await storage.listSessions(project, sprint);
    res.json({ sessions: sessions.map(toSummary) });
  } catch (err) {
    console.error('[vigil-server] Error listing sessions:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/:id
sessionsRouter.get('/:id', async (req, res) => {
  const storage = getStorage();

  try {
    const session = await storage.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ session: toDetail(session) });
  } catch (err) {
    console.error('[vigil-server] Error getting session:', err);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

import { Router } from 'express';
import { getStorage } from '../storage/index.js';

export const featuresRouter = Router();

// GET /api/features?sprint=06&status=open
featuresRouter.get('/', async (req, res) => {
  const sprint = req.query.sprint as string | undefined;
  const status = req.query.status as 'open' | 'done' | undefined;

  try {
    const features = await getStorage().listFeatures(sprint, status);
    res.json({ features, count: features.length });
  } catch (err) {
    console.error('[vigil-server] Error listing features:', err);
    res.status(500).json({ error: 'Failed to list features' });
  }
});

// GET /api/features/:id
featuresRouter.get('/:id', async (req, res) => {
  const featId = req.params.id;
  const sprint = req.query.sprint as string | undefined;

  try {
    const feature = await getStorage().getFeature(featId, sprint);
    if (!feature) {
      res.status(404).json({ error: `Feature ${featId} not found` });
      return;
    }
    res.json(feature);
  } catch (err) {
    console.error('[vigil-server] Error getting feature:', err);
    res.status(500).json({ error: 'Failed to get feature' });
  }
});

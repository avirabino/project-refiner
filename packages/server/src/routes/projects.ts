import { Router } from 'express';
import { getStorage } from '../storage/index.js';

export const projectsRouter = Router();

// GET /api/projects — list all projects
projectsRouter.get('/', async (_req, res) => {
  try {
    const projects = await getStorage().listProjects();
    res.json({ projects });
  } catch (err) {
    console.error('[vigil-server] Error listing projects:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:id — get a single project
projectsRouter.get('/:id', async (req, res) => {
  try {
    const project = await getStorage().getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ project });
  } catch (err) {
    console.error('[vigil-server] Error getting project:', err);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// POST /api/projects — create a new project
projectsRouter.post('/', async (req, res) => {
  const { id, name, description, currentSprint, url } = req.body as {
    id?: string;
    name?: string;
    description?: string;
    currentSprint?: string;
    url?: string;
  };

  if (!id || !name) {
    res.status(400).json({ error: 'id and name are required' });
    return;
  }

  // Validate id is a URL-safe slug
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    res.status(400).json({ error: 'id must be a lowercase slug (letters, numbers, hyphens)' });
    return;
  }

  try {
    // Check for duplicate
    const existing = await getStorage().getProject(id);
    if (existing) {
      res.status(409).json({ error: `Project '${id}' already exists` });
      return;
    }

    await getStorage().createProject({ id, name, description, currentSprint, url });
    const created = await getStorage().getProject(id);
    res.status(201).json({ project: created });
  } catch (err) {
    console.error('[vigil-server] Error creating project:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PATCH /api/projects/:id — update a project
projectsRouter.patch('/:id', async (req, res) => {
  const { name, description, currentSprint, url } = req.body as {
    name?: string;
    description?: string;
    currentSprint?: string;
    url?: string;
  };

  try {
    const updated = await getStorage().updateProject(req.params.id, { name, description, currentSprint, url });
    if (!updated) {
      res.status(404).json({ error: 'Project not found or no fields to update' });
      return;
    }
    const project = await getStorage().getProject(req.params.id);
    res.json({ project });
  } catch (err) {
    console.error('[vigil-server] Error updating project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id — delete a project (cascades to sessions → bugs/features)
projectsRouter.delete('/:id', async (req, res) => {
  const storage = getStorage();
  try {
    // Count what will be cascade-deleted for response
    const sessions = await storage.listSessions(req.params.id);
    const deleted = await storage.deleteProject(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({
      ok: true,
      deletedId: req.params.id,
      cascaded: { sessions: sessions.length },
    });
  } catch (err) {
    console.error('[vigil-server] Error deleting project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

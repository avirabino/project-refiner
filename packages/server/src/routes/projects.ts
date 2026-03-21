import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { getStorage } from '../storage/index.js';

export const projectsRouter = Router();

// ── Auto-detect sprint + description from CLAUDE.md / README.md ──────────────

/**
 * POST /api/projects/detect
 * Reads CLAUDE.md (preferred) or README.md from a local project path and
 * extracts the current sprint number and a one-line description/gist.
 *
 * Body: { path: string }   — absolute path to the project root
 * Returns: { sprint, description, source }
 *
 * Only available in local dev mode (filesystem access required).
 */
projectsRouter.post('/detect', async (req, res) => {
  const { path: projectPath } = req.body as { path?: string };
  if (!projectPath) {
    res.status(400).json({ error: 'path is required' });
    return;
  }

  // Serverless (Vercel) has no filesystem access to user machines
  if (process.env.VERCEL) {
    res.status(400).json({ error: 'Auto-detect requires local dev server (npm run dev:server)' });
    return;
  }

  try {
    const absPath = resolve(projectPath);

    // Try CLAUDE.md first, then README.md
    let content: string | null = null;
    let source = '';
    for (const candidate of ['CLAUDE.md', 'README.md']) {
      try {
        content = await readFile(join(absPath, candidate), 'utf8');
        source = candidate;
        break;
      } catch {
        // next candidate
      }
    }

    if (!content) {
      res.status(404).json({ error: 'No CLAUDE.md or README.md found at the given path' });
      return;
    }

    // ── Parse sprint ──────────────────────────────────────────────────────────
    let sprint: string | null = null;

    // Pattern: | **Current sprint** | sprint_07 |  (CLAUDE.md table)
    const tableSprintMatch = content.match(/\*\*Current sprint\*\*\s*\|\s*sprint[_\s]*(\d+)/i);
    if (tableSprintMatch) sprint = tableSprintMatch[1];

    // Pattern: Current sprint: 07   or   sprint: 07
    if (!sprint) {
      const labelMatch = content.match(/(?:current\s+)?sprint[:\s]+(\d+)/i);
      if (labelMatch) sprint = labelMatch[1];
    }

    // Pattern: (Sprint 10)
    if (!sprint) {
      const parenMatch = content.match(/\(Sprint\s+(\d+)\)/i);
      if (parenMatch) sprint = parenMatch[1];
    }

    // ── Parse description ─────────────────────────────────────────────────────
    let description: string | null = null;

    // Pattern: | **Purpose** | Some description here |  (CLAUDE.md table)
    const purposeMatch = content.match(/\*\*Purpose\*\*\s*\|\s*(.+?)\s*\|/);
    if (purposeMatch) description = purposeMatch[1].trim();

    // Fallback: first non-meta paragraph in the first 30 lines
    if (!description) {
      const lines = content.split('\n');
      for (let i = 0; i < Math.min(lines.length, 30); i++) {
        const line = lines[i].trim();
        if (
          !line ||
          line.startsWith('#') ||
          line.startsWith('---') ||
          line.startsWith('>') ||
          line.startsWith('|') ||
          line.startsWith('```') ||
          line.startsWith('- ') ||
          line.startsWith('* ')
        ) continue;
        description = line.slice(0, 200);
        break;
      }
    }

    // Normalise sprint: strip leading zeros but keep "0"
    const normSprint = sprint ? (sprint.replace(/^0+/, '') || '0') : null;

    res.json({ sprint: normSprint, description, source });
  } catch (err) {
    console.error('[vigil-server] Error detecting project info:', err);
    res.status(500).json({ error: 'Failed to read project files' });
  }
});

// GET /api/projects — list all projects (?archived=true to include archived)
projectsRouter.get('/', async (req, res) => {
  const includeArchived = req.query.archived === 'true';
  try {
    const projects = await getStorage().listProjects(includeArchived);
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
      // If archived, restore and update instead of rejecting
      if (existing.archivedAt) {
        await getStorage().restoreProject(id);
        const updates: Record<string, string> = {};
        if (name) updates.name = name;
        if (description) updates.description = description;
        if (currentSprint) updates.currentSprint = currentSprint;
        if (url) updates.url = url;
        if (Object.keys(updates).length > 0) {
          await getStorage().updateProject(id, updates);
        }
        const restored = await getStorage().getProject(id);
        res.status(200).json({ project: restored, restored: true });
        return;
      }
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

// DELETE /api/projects/:id — archive a project (soft-delete; cascades to sessions → bugs/features)
projectsRouter.delete('/:id', async (req, res) => {
  const storage = getStorage();
  try {
    const archived = await storage.archiveProject(req.params.id);
    if (!archived) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ ok: true, archivedId: req.params.id });
  } catch (err) {
    console.error('[vigil-server] Error archiving project:', err);
    res.status(500).json({ error: 'Failed to archive project' });
  }
});

// PATCH /api/projects/:id/restore — restore an archived project
projectsRouter.patch('/:id/restore', async (req, res) => {
  const storage = getStorage();
  try {
    const restored = await storage.restoreProject(req.params.id);
    if (!restored) {
      res.status(404).json({ error: 'Project not found or not archived' });
      return;
    }
    const project = await storage.getProject(req.params.id);
    res.json({ ok: true, project });
  } catch (err) {
    console.error('[vigil-server] Error restoring project:', err);
    res.status(500).json({ error: 'Failed to restore project' });
  }
});

/**
 * Import existing .vigil/ and docs/sprints/ data into Neon PostgreSQL.
 * Usage: DATABASE_URL=... tsx packages/server/src/db/seed.ts
 *
 * Reads filesystem data and inserts into the database tables.
 * Safe to re-run (uses ON CONFLICT DO NOTHING).
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getPool, isDatabaseConfigured } from './client.js';
import { getProjectRoot, getVigilDataDir, loadConfig } from '../config.js';

function parseBugMd(filename: string, content: string): Record<string, unknown> {
  const id = filename.replace('.md', '');
  const titleMatch = content.match(/^# \S+ — (.+)$/m);
  const statusMatch = content.match(/^## Status: (.+)$/m);
  const severityMatch = content.match(/^## Severity: (.+)$/m);
  const sprintMatch = content.match(/^## Sprint: (.+)$/m);
  const discoveredMatch = content.match(/^## Discovered: (.+)$/m);
  const stepsMatch = content.match(/## Steps to Reproduce\n([\s\S]*?)(?=\n## |$)/);
  const expectedMatch = content.match(/## Expected\n([\s\S]*?)(?=\n## |$)/);
  const actualMatch = content.match(/## Actual\n([\s\S]*?)(?=\n## |$)/);
  const urlMatch = content.match(/## URL\n(.+)/);
  const regressionMatch = content.match(/## Regression Test\n([\s\S]*?)(?=\n## |$)/);
  const resolutionMatch = content.match(/## Resolution\n([\s\S]*?)(?=\n## |$)/);

  return {
    id,
    title: titleMatch?.[1]?.trim() ?? 'Unknown',
    status: statusMatch?.[1]?.trim() ?? 'OPEN',
    severity: severityMatch?.[1]?.trim() ?? 'P2',
    sprint: sprintMatch?.[1]?.trim() ?? 'unknown',
    discovered: discoveredMatch?.[1]?.trim() ?? 'unknown',
    steps_to_reproduce: stepsMatch?.[1]?.trim() ?? null,
    expected: expectedMatch?.[1]?.trim() ?? null,
    actual: actualMatch?.[1]?.trim() ?? null,
    url: urlMatch?.[1]?.trim() ?? null,
    regression_test: regressionMatch?.[1]?.trim() ?? null,
    resolution: resolutionMatch?.[1]?.trim() ?? null,
  };
}

function parseFeatureMd(filename: string, content: string): Record<string, unknown> {
  const id = filename.replace('.md', '');
  const titleMatch = content.match(/^# \S+ — (.+)$/m);
  const statusMatch = content.match(/^## Status: (.+)$/m);
  const priorityMatch = content.match(/^## Priority: (.+)$/m);
  const sprintMatch = content.match(/^## Sprint: (.+)$/m);
  const discoveredMatch = content.match(/^## Discovered: (.+)$/m);
  const descMatch = content.match(/## Description\n([\s\S]*?)(?=\n## |$)/);
  const urlMatch = content.match(/## URL\n(.+)/);

  return {
    id,
    title: titleMatch?.[1]?.trim() ?? 'Unknown',
    status: statusMatch?.[1]?.trim() ?? 'OPEN',
    priority: priorityMatch?.[1]?.trim() ?? 'ENHANCEMENT',
    sprint: sprintMatch?.[1]?.trim() ?? 'unknown',
    discovered: discoveredMatch?.[1]?.trim() ?? 'unknown',
    description: descMatch?.[1]?.trim() ?? null,
    url: urlMatch?.[1]?.trim() ?? null,
  };
}

async function listMdFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
}

async function dirExists(dir: string): Promise<boolean> {
  try {
    const s = await stat(dir);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function seed(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.error('[seed] DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const pool = getPool();
  const projectRoot = getProjectRoot();
  const config = loadConfig();

  // 1. Seed sprints
  const sprintsDir = resolve(projectRoot, 'docs', 'sprints');
  if (await dirExists(sprintsDir)) {
    const entries = await readdir(sprintsDir, { withFileTypes: true });
    const sprintDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('sprint_'));

    for (const d of sprintDirs) {
      const id = d.name.replace('sprint_', '');
      await pool.query(
        'INSERT INTO sprints (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
        [id, d.name],
      );
      console.log(`[seed] Sprint: ${d.name}`);
    }
  }

  // 2. Seed bugs from docs/sprints/sprint_XX/BUGS/{open,fixed}/
  let bugCount = 0;
  if (await dirExists(sprintsDir)) {
    const sprintEntries = await readdir(sprintsDir, { withFileTypes: true });
    for (const sd of sprintEntries.filter((e) => e.isDirectory() && e.name.startsWith('sprint_'))) {
      for (const status of ['open', 'fixed']) {
        const bugDir = resolve(sprintsDir, sd.name, 'BUGS', status);
        const files = await listMdFiles(bugDir);
        for (const file of files) {
          const content = await readFile(resolve(bugDir, file), 'utf8');
          const bug = parseBugMd(file, content);
          await pool.query(
            `INSERT INTO bugs (id, title, status, severity, sprint, discovered, steps_to_reproduce, expected, actual, url, regression_test, resolution)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO NOTHING`,
            [bug.id, bug.title, bug.status, bug.severity, bug.sprint, bug.discovered,
             bug.steps_to_reproduce, bug.expected, bug.actual, bug.url, bug.regression_test, bug.resolution],
          );
          bugCount++;
        }
      }
    }
  }
  console.log(`[seed] Bugs imported: ${bugCount}`);

  // 3. Seed features from docs/sprints/sprint_XX/FEATURES/{open,done}/
  let featCount = 0;
  if (await dirExists(sprintsDir)) {
    const sprintEntries = await readdir(sprintsDir, { withFileTypes: true });
    for (const sd of sprintEntries.filter((e) => e.isDirectory() && e.name.startsWith('sprint_'))) {
      for (const status of ['open', 'done']) {
        const featDir = resolve(sprintsDir, sd.name, 'FEATURES', status);
        const files = await listMdFiles(featDir);
        for (const file of files) {
          const content = await readFile(resolve(featDir, file), 'utf8');
          const feat = parseFeatureMd(file, content);
          await pool.query(
            `INSERT INTO features (id, title, status, priority, sprint, discovered, description, url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [feat.id, feat.title, feat.status, feat.priority, feat.sprint, feat.discovered,
             feat.description, feat.url],
          );
          featCount++;
        }
      }
    }
  }
  console.log(`[seed] Features imported: ${featCount}`);

  // 4. Seed sessions from .vigil/sessions/
  let sessionCount = 0;
  const sessionsDir = resolve(getVigilDataDir(), 'sessions');
  if (await dirExists(sessionsDir)) {
    const files = await readdir(sessionsDir);
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      const content = await readFile(resolve(sessionsDir, file), 'utf8');
      const session = JSON.parse(content);
      await pool.query(
        `INSERT INTO sessions (id, name, project_id, started_at, ended_at, clock, recordings, snapshots, bugs, features)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [
          session.id, session.name, session.projectId ?? config.projectId,
          session.startedAt, session.endedAt ?? null, session.clock ?? 0,
          JSON.stringify(session.recordings ?? []), JSON.stringify(session.snapshots ?? []),
          JSON.stringify(session.bugs ?? []), JSON.stringify(session.features ?? []),
        ],
      );
      sessionCount++;
    }
  }
  console.log(`[seed] Sessions imported: ${sessionCount}`);

  // 5. Sync counter sequences to match imported data
  await pool.query(`
    SELECT setval('bug_counter', COALESCE(
      (SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) FROM bugs), 0
    ))
  `);
  await pool.query(`
    SELECT setval('feature_counter', COALESCE(
      (SELECT MAX(CAST(SUBSTRING(id FROM 6) AS INTEGER)) FROM features), 0
    ))
  `);
  console.log('[seed] Counter sequences synced.');

  await pool.end();
  console.log('[seed] Done.');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});

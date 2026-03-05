import { getPool } from '../db/client.js';
import { loadConfig } from '../config.js';
import { TEST_STATUS } from '../types.js';
import type { StorageProvider, SprintInfo } from './types.js';
import { VIGILSessionSchema } from '../types.js';
import type { Bug, Feature, VIGILSession, BugFile, FeatureFile, BugUpdate } from '../types.js';

function formatDate(ts: number): string {
  return new Date(ts).toISOString().split('T')[0];
}

function rowToBugFile(row: Record<string, unknown>): BugFile {
  const id = row.id as string;
  const title = row.title as string;
  const status = row.status as string;
  const severity = row.severity as string;
  const sprint = row.sprint as string;
  const discovered = (row.discovered as string) ?? 'unknown';
  const stepsToReproduce = row.steps_to_reproduce as string | undefined;
  const expected = row.expected as string | undefined;
  const actual = row.actual as string | undefined;
  const regressionTest = row.regression_test as string | undefined;
  const resolution = row.resolution as string | undefined;

  // Synthesize markdown for .raw field
  const raw = `# ${id} — ${title}

## Status: ${status}
## Severity: ${severity}
## Sprint: ${sprint}
## Discovered: ${discovered}
${stepsToReproduce ? `\n## Steps to Reproduce\n${stepsToReproduce}` : ''}
${expected ? `\n## Expected\n${expected}` : ''}
${actual ? `\n## Actual\n${actual}` : ''}
${regressionTest ? `\n## Regression Test\n${regressionTest}` : ''}
${resolution ? `\n## Resolution\n${resolution}` : ''}`;

  return { id, title, status, severity, sprint, discovered, stepsToReproduce, expected, actual, regressionTest, resolution, raw };
}

function rowToFeatureFile(row: Record<string, unknown>): FeatureFile {
  const id = row.id as string;
  const title = row.title as string;
  const status = row.status as string;
  const priority = row.priority as string;
  const sprint = row.sprint as string;
  const description = row.description as string | undefined;

  const raw = `# ${id} — ${title}

## Status: ${status}
## Priority: ${priority}
## Sprint: ${sprint}
${description ? `\n## Description\n${description}` : ''}`;

  return { id, title, status, priority, sprint, description, raw };
}

const SESSION_SELECT_COLS = 'id, name, project_id, started_at, ended_at, clock, recordings, snapshots, bugs, features, annotations, sprint, description';

function rowToSession(row: Record<string, unknown>): VIGILSession | null {
  const obj = {
    id: row.id as string,
    name: row.name as string,
    projectId: row.project_id as string,
    sprint: (row.sprint as string | null) ?? undefined,
    description: (row.description as string | null) ?? undefined,
    startedAt: Number(row.started_at),
    endedAt: row.ended_at != null ? Number(row.ended_at) : undefined,
    clock: Number(row.clock),
    recordings: typeof row.recordings === 'string' ? JSON.parse(row.recordings) : row.recordings,
    snapshots: typeof row.snapshots === 'string' ? JSON.parse(row.snapshots) : row.snapshots,
    bugs: typeof row.bugs === 'string' ? JSON.parse(row.bugs) : row.bugs,
    features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
    annotations: row.annotations ? (typeof row.annotations === 'string' ? JSON.parse(row.annotations) : row.annotations) : [],
  };
  const parsed = VIGILSessionSchema.safeParse(obj);
  return parsed.success ? parsed.data : null;
}

export class NeonStorage implements StorageProvider {
  readonly name = 'neon';

  async listBugs(sprint?: string, status?: 'open' | 'fixed'): Promise<BugFile[]> {
    const pool = getPool();
    const s = sprint ?? loadConfig().sprintCurrent;
    const statusMap: Record<string, string> = { open: 'OPEN', fixed: 'FIXED' };

    let result;
    if (status) {
      result = await pool.query(
        'SELECT * FROM bugs WHERE sprint = $1 AND UPPER(status) = $2 ORDER BY id',
        [s, statusMap[status]],
      );
    } else {
      result = await pool.query('SELECT * FROM bugs WHERE sprint = $1 ORDER BY id', [s]);
    }

    return result.rows.map(rowToBugFile);
  }

  async getBug(bugId: string, sprint?: string): Promise<BugFile | null> {
    const pool = getPool();

    let result;
    if (sprint) {
      result = await pool.query('SELECT * FROM bugs WHERE id = $1 AND sprint = $2', [bugId, sprint]);
    } else {
      result = await pool.query('SELECT * FROM bugs WHERE id = $1', [bugId]);
    }

    return result.rows.length > 0 ? rowToBugFile(result.rows[0]) : null;
  }

  async writeBug(bug: Bug, sprint?: string): Promise<string> {
    const pool = getPool();
    const s = sprint ?? loadConfig().sprintCurrent;
    const bugId = await this.nextBugId();
    const discovered = `${formatDate(bug.timestamp)} via vigil-session: ${bug.sessionId}`;

    await pool.query(
      `INSERT INTO bugs (id, title, status, severity, sprint, discovered, steps_to_reproduce, expected, actual, url, regression_test, regression_test_status, session_id)
       VALUES ($1, $2, 'OPEN', $3, $4, $5, $6, '_To be filled_', '_To be filled_', $7, $8, $9, $10)`,
      [
        bugId,
        bug.title,
        bug.priority,
        s,
        discovered,
        bug.description,
        bug.url,
        `File: tests/e2e/regression/${bugId}.spec.ts\nStatus: ${TEST_STATUS.PENDING}`,
        TEST_STATUS.PENDING,
        bug.sessionId,
      ],
    );

    return bugId;
  }

  async updateBug(bugId: string, fields: BugUpdate, sprint?: string): Promise<boolean> {
    const pool = getPool();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (fields.status) {
      setClauses.push(`status = $${idx++}`);
      values.push(fields.status.toUpperCase());
    }
    if (fields.severity) {
      setClauses.push(`severity = $${idx++}`);
      values.push(fields.severity);
    }
    if (fields.resolution) {
      setClauses.push(`resolution = $${idx++}`);
      values.push(fields.resolution);
    }

    if (setClauses.length === 0) return false;

    let query = `UPDATE bugs SET ${setClauses.join(', ')} WHERE id = $${idx++}`;
    values.push(bugId);

    if (sprint) {
      query += ` AND sprint = $${idx++}`;
      values.push(sprint);
    }

    const result = await pool.query(query, values);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async closeBug(bugId: string, resolution: string, keepTest: boolean, sprint?: string): Promise<boolean> {
    const pool = getPool();
    const testStatus = keepTest ? TEST_STATUS.PASSING : TEST_STATUS.ARCHIVED;

    let query = `UPDATE bugs SET status = 'FIXED', resolution = $1, regression_test_status = $2 WHERE id = $3 AND UPPER(status) = 'OPEN'`;
    const values: unknown[] = [resolution, testStatus, bugId];

    if (sprint) {
      query += ` AND sprint = $4`;
      values.push(sprint);
    }

    const result = await pool.query(query, values);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async listFeatures(sprint?: string, status?: 'open' | 'done'): Promise<FeatureFile[]> {
    const pool = getPool();
    const s = sprint ?? loadConfig().sprintCurrent;
    const statusMap: Record<string, string> = { open: 'OPEN', done: 'DONE' };

    let result;
    if (status) {
      result = await pool.query(
        'SELECT * FROM features WHERE sprint = $1 AND UPPER(status) = $2 ORDER BY id',
        [s, statusMap[status]],
      );
    } else {
      result = await pool.query('SELECT * FROM features WHERE sprint = $1 ORDER BY id', [s]);
    }

    return result.rows.map(rowToFeatureFile);
  }

  async getFeature(featId: string, sprint?: string): Promise<FeatureFile | null> {
    const pool = getPool();

    let result;
    if (sprint) {
      result = await pool.query('SELECT * FROM features WHERE id = $1 AND sprint = $2', [featId, sprint]);
    } else {
      result = await pool.query('SELECT * FROM features WHERE id = $1', [featId]);
    }

    return result.rows.length > 0 ? rowToFeatureFile(result.rows[0]) : null;
  }

  async writeFeature(feat: Feature, sprint?: string): Promise<string> {
    const pool = getPool();
    const s = sprint ?? loadConfig().sprintCurrent;
    const featId = await this.nextFeatId();
    const discovered = `${formatDate(feat.timestamp)} via vigil-session: ${feat.sessionId}`;

    await pool.query(
      `INSERT INTO features (id, title, status, priority, sprint, discovered, description, url, session_id)
       VALUES ($1, $2, 'OPEN', $3, $4, $5, $6, $7, $8)`,
      [featId, feat.title, feat.featureType, s, discovered, feat.description, feat.url, feat.sessionId],
    );

    return featId;
  }

  async writeSessionJson(session: VIGILSession): Promise<string> {
    const pool = getPool();

    await pool.query(
      `INSERT INTO sessions (id, name, project_id, started_at, ended_at, clock, recordings, snapshots, bugs, features, annotations, sprint, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         ended_at = EXCLUDED.ended_at,
         clock = EXCLUDED.clock,
         recordings = EXCLUDED.recordings,
         snapshots = EXCLUDED.snapshots,
         bugs = EXCLUDED.bugs,
         features = EXCLUDED.features,
         annotations = EXCLUDED.annotations`,
      [
        session.id,
        session.name,
        session.projectId,
        session.startedAt,
        session.endedAt ?? null,
        session.clock,
        JSON.stringify(session.recordings),
        JSON.stringify(session.snapshots),
        JSON.stringify(session.bugs),
        JSON.stringify(session.features),
        JSON.stringify(session.annotations ?? []),
        session.sprint ?? null,
        session.description ?? null,
      ],
    );

    return session.id;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const pool = getPool();
    // Cascade: remove bugs/features linked to this session first
    await pool.query('DELETE FROM bugs WHERE session_id = $1', [sessionId]);
    await pool.query('DELETE FROM features WHERE session_id = $1', [sessionId]);
    const result = await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /** Remove bugs/features whose session_id references a non-existent session */
  async cleanOrphans(): Promise<{ bugs: number; features: number }> {
    const pool = getPool();
    const bugResult = await pool.query(
      'DELETE FROM bugs WHERE session_id IS NOT NULL AND session_id NOT IN (SELECT id FROM sessions)',
    );
    const featResult = await pool.query(
      'DELETE FROM features WHERE session_id IS NOT NULL AND session_id NOT IN (SELECT id FROM sessions)',
    );
    return {
      bugs: bugResult.rowCount ?? 0,
      features: featResult.rowCount ?? 0,
    };
  }

  async nextBugId(): Promise<string> {
    const pool = getPool();
    const result = await pool.query("SELECT nextval('bug_counter') AS val");
    const next = Number(result.rows[0].val);
    return `BUG-${String(next).padStart(3, '0')}`;
  }

  async nextFeatId(): Promise<string> {
    const pool = getPool();
    const result = await pool.query("SELECT nextval('feature_counter') AS val");
    const next = Number(result.rows[0].val);
    return `FEAT-${String(next).padStart(3, '0')}`;
  }

  async currentBugCount(): Promise<number> {
    const pool = getPool();
    const result = await pool.query('SELECT last_value FROM bug_counter');
    return Number(result.rows[0].last_value);
  }

  async currentFeatCount(): Promise<number> {
    const pool = getPool();
    const result = await pool.query('SELECT last_value FROM feature_counter');
    return Number(result.rows[0].last_value);
  }

  async listSessions(project?: string, sprint?: string): Promise<VIGILSession[]> {
    const pool = getPool();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (project) {
      conditions.push(`project_id = $${idx++}`);
      values.push(project);
    }
    if (sprint) {
      conditions.push(`sprint = $${idx++}`);
      values.push(sprint);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT ${SESSION_SELECT_COLS} FROM sessions ${where} ORDER BY started_at DESC`,
      values,
    );

    const sessions: VIGILSession[] = [];
    for (const row of result.rows) {
      const session = rowToSession(row);
      if (session) sessions.push(session);
    }

    return sessions;
  }

  async getSession(sessionId: string): Promise<VIGILSession | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT ${SESSION_SELECT_COLS} FROM sessions WHERE id = $1`,
      [sessionId],
    );

    if (result.rows.length === 0) return null;
    return rowToSession(result.rows[0]);
  }

  async listSprints(): Promise<{ sprints: SprintInfo[]; current: string }> {
    const pool = getPool();
    const result = await pool.query('SELECT id, name FROM sprints ORDER BY id');
    const sprints = result.rows.map((r) => ({ id: r.id as string, name: r.name as string }));
    const current = loadConfig().sprintCurrent;
    return { sprints, current };
  }
}

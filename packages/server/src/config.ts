import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface VigilConfig {
  projectId: string;
  sprintCurrent: string;
  serverPort: number;
  maxFixIterations: number;
  llmMode: 'mock' | 'live';
  agentsApiUrl: string;
}

const CONFIG_FILENAME = 'vigil.config.json';

function findConfigPath(): string | null {
  // Walk up from packages/server/ to find vigil.config.json at project root
  let dir = resolve(import.meta.dirname, '..', '..');
  const maxDepth = 5;
  for (let i = 0; i < maxDepth; i++) {
    const candidate = resolve(dir, CONFIG_FILENAME);
    try {
      readFileSync(candidate, 'utf8');
      return candidate;
    } catch {
      dir = resolve(dir, '..');
    }
  }
  return null;
}

let _config: VigilConfig | null = null;

export function loadConfig(): VigilConfig {
  if (_config) return _config;

  const configPath = findConfigPath();

  if (configPath) {
    const raw = JSON.parse(readFileSync(configPath, 'utf8'));
    _config = {
      projectId: raw.projectId ?? 'unknown',
      sprintCurrent: raw.sprintCurrent ?? '06',
      serverPort: raw.serverPort ?? 7474,
      maxFixIterations: raw.maxFixIterations ?? 3,
      llmMode: raw.llmMode ?? 'mock',
      agentsApiUrl: raw.agentsApiUrl ?? 'http://localhost:8000',
    };
  } else {
    // Env var fallback (Vercel / serverless)
    _config = {
      projectId: process.env.VIGIL_PROJECT_ID ?? 'unknown',
      sprintCurrent: process.env.VIGIL_SPRINT_CURRENT ?? '07',
      serverPort: parseInt(process.env.PORT ?? '7474', 10),
      maxFixIterations: 3,
      llmMode: (process.env.VIGIL_LLM_MODE as 'mock' | 'live') ?? 'mock',
      agentsApiUrl: process.env.VIGIL_AGENTS_API_URL ?? 'http://localhost:8000',
    };
  }

  return _config;
}

export function getProjectRoot(): string {
  const configPath = findConfigPath();
  if (!configPath) {
    throw new Error('Cannot determine project root: vigil.config.json not found (filesystem mode only)');
  }
  return resolve(configPath, '..');
}

export function getVigilDataDir(): string {
  return resolve(getProjectRoot(), '.vigil');
}

export function getSprintDir(sprint?: string): string {
  const s = sprint ?? loadConfig().sprintCurrent;
  return resolve(getProjectRoot(), 'docs', 'sprints', `sprint_${s}`);
}

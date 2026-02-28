import { Pool } from '@neondatabase/serverless';

let _pool: Pool | null = null;

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

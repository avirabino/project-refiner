import type { StorageProvider } from './types.js';
import { isDatabaseConfigured } from '../db/client.js';

let _storage: StorageProvider | null = null;

/**
 * Initialize the storage provider.
 * Must be called once at startup before getStorage().
 *
 * D016 fallback logic:
 * - DATABASE_URL set → Neon provider
 * - DATABASE_URL unset + local → filesystem fallback
 * - DATABASE_URL unset + serverless (Vercel) → throw
 */
export async function initStorage(): Promise<StorageProvider> {
  if (_storage) return _storage;

  if (isDatabaseConfigured()) {
    // Dynamic import so @neondatabase/serverless only loads when needed
    const { NeonStorage } = await import('./neon.js');
    _storage = new NeonStorage();
    console.log('[vigil-server] storage: neon (PostgreSQL)');
  } else if (process.env.VERCEL) {
    throw new Error(
      'DATABASE_URL is required in serverless environments. ' +
      'Set it in your Vercel project environment variables.',
    );
  } else {
    const { FilesystemStorage } = await import('./filesystem.js');
    _storage = new FilesystemStorage();
    console.log('[vigil-server] storage: filesystem (local)');
  }

  return _storage;
}

/**
 * Get the initialized storage provider.
 * Throws if initStorage() has not been called.
 */
export function getStorage(): StorageProvider {
  if (!_storage) {
    throw new Error('Storage not initialized. Call initStorage() first.');
  }
  return _storage;
}

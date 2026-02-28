/**
 * Vercel serverless entry point.
 * Cold-start: initStorage() runs once, then all requests delegate to Express app.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

let handler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

export default async function (req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!handler) {
    const { app, initStorage } = await import('../src/app.js');
    await initStorage();
    handler = app as unknown as (req: VercelRequest, res: VercelResponse) => void;
  }
  handler(req, res);
}

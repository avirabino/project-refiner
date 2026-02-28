import { app, initStorage } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const PORT = config.serverPort;

initStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`[vigil-server] running on http://localhost:${PORT}`);
    console.log(`[vigil-server] health: http://localhost:${PORT}/health`);
    console.log(`[vigil-server] LLM mode: ${config.llmMode}`);
  });
}).catch((err) => {
  console.error('[vigil-server] Failed to initialize storage:', err);
  process.exit(1);
});

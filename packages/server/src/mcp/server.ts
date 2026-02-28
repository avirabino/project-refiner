import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools.js';
import { initStorage } from '../storage/index.js';

const server = new McpServer({
  name: 'vigil-server',
  version: '2.0.0',
});

registerTools(server);

async function main(): Promise<void> {
  await initStorage();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[vigil-mcp] MCP server running on stdio');
}

main().catch((err) => {
  console.error('[vigil-mcp] Fatal error:', err);
  process.exit(1);
});

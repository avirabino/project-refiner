import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getStorage } from '../storage/index.js';
import { BugUpdateSchema } from '@synaptix/vigil-shared';

export function registerTools(server: McpServer): void {
  // 1. vigil_list_bugs
  server.tool(
    'vigil_list_bugs',
    'List bugs for a sprint, optionally filtered by status',
    {
      sprint: z.string().optional().describe('Sprint number (e.g. "06"). Defaults to current sprint.'),
      status: z.enum(['open', 'fixed']).optional().describe('Filter by status'),
    },
    async ({ sprint, status }) => {
      const bugs = await getStorage().listBugs(sprint, status);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ bugs, count: bugs.length }, null, 2),
          },
        ],
      };
    },
  );

  // 2. vigil_get_bug
  server.tool(
    'vigil_get_bug',
    'Get full details of a specific bug by ID',
    {
      bug_id: z.string().describe('Bug ID (e.g. "BUG-001")'),
    },
    async ({ bug_id }) => {
      const bug = await getStorage().getBug(bug_id);
      if (!bug) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Bug ${bug_id} not found` }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(bug, null, 2) }],
      };
    },
  );

  // 3. vigil_update_bug
  server.tool(
    'vigil_update_bug',
    'Update fields on an existing bug (status, severity, resolution)',
    {
      bug_id: z.string().describe('Bug ID (e.g. "BUG-001")'),
      fields: BugUpdateSchema.describe('Fields to update'),
    },
    async ({ bug_id, fields }) => {
      const updated = await getStorage().updateBug(bug_id, fields);
      if (!updated) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Bug ${bug_id} not found` }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ updated: true, bug_id }) }],
      };
    },
  );

  // 4. vigil_close_bug
  server.tool(
    'vigil_close_bug',
    'Close a bug with resolution and decide whether to keep regression test',
    {
      bug_id: z.string().describe('Bug ID (e.g. "BUG-001")'),
      resolution: z.string().describe('Resolution description'),
      keep_test: z.boolean().describe('Whether to keep the regression test'),
    },
    async ({ bug_id, resolution, keep_test }) => {
      const closed = await getStorage().closeBug(bug_id, resolution, keep_test);
      if (!closed) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Bug ${bug_id} not found in open/` }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ closed: true, bug_id }) }],
      };
    },
  );

  // 5. vigil_list_features
  server.tool(
    'vigil_list_features',
    'List features for a sprint, optionally filtered by status',
    {
      sprint: z.string().optional().describe('Sprint number (e.g. "06"). Defaults to current sprint.'),
      status: z.enum(['open', 'done']).optional().describe('Filter by status'),
    },
    async ({ sprint, status }) => {
      const features = await getStorage().listFeatures(sprint, status);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ features, count: features.length }, null, 2),
          },
        ],
      };
    },
  );

  // 6. vigil_get_feature
  server.tool(
    'vigil_get_feature',
    'Get full details of a specific feature by ID',
    {
      feat_id: z.string().describe('Feature ID (e.g. "FEAT-001")'),
    },
    async ({ feat_id }) => {
      const feature = await getStorage().getFeature(feat_id);
      if (!feature) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Feature ${feat_id} not found` }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(feature, null, 2) }],
      };
    },
  );
}

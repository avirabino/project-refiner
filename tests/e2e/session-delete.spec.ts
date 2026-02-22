/**
 * Q205 — E2E: Session Delete (Cascading)
 *
 * Verifies: Delete button in SessionDetail shows a confirmation dialog,
 * deletes the session from the list on confirm, leaves other sessions intact,
 * and cascades to all child records in IndexedDB.
 *
 * Requires DEV to complete: D203 (SessionDetail), D207 (delete with confirm).
 *
 * DEV CONTRACT:
 *   btn-delete-session  — triggers confirmation dialog/prompt
 *   confirm-delete      — confirms the delete action
 *
 * DB_NAME assumed to be 'RefineDB'. Update in helpers/session.ts if different.
 */

import { test, expect } from './fixtures/extension.fixture';
import { createSession, openTargetApp, stopAndOpenDetail, getPopupPage, DB_NAME } from './helpers/session';

test('deleting a session removes it from the list, other sessions remain', async ({ context, extensionId }) => {
  // Create 2 sessions so we can verify only the first is deleted
  const { popupPage: popup1 } = await createSession(context, extensionId, 'Q205 Session To Delete');
  const page1 = await openTargetApp(context);
  await expect(page1.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  const detail1 = await stopAndOpenDetail(page1, popup1, context, extensionId);

  // Open second session while first popup is showing detail
  const { popupPage: popup2 } = await createSession(context, extensionId, 'Q205 Session To Keep');
  const page2 = await openTargetApp(context);
  await expect(page2.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });
  await page2.getByTestId('btn-stop').click();
  await expect(page2.getByTestId('refine-control-bar')).not.toBeVisible({ timeout: 3000 });

  // Return to first detail page and delete
  await detail1.bringToFront();

  // Confirmation dialog must appear before deletion
  await detail1.getByTestId('btn-delete-session').click();
  await expect(detail1.getByTestId('confirm-delete')).toBeVisible({ timeout: 3000 });

  // Confirm delete
  await detail1.getByTestId('confirm-delete').click();

  // Must navigate back to SessionList after delete
  await expect(detail1.getByTestId('session-detail-container')).not.toBeVisible({ timeout: 3000 });

  // Session list must now show the kept session but not the deleted one
  await detail1.waitForLoadState('networkidle');
  const items = await detail1.getByTestId('session-list-item').all();
  expect(items.length).toBeGreaterThanOrEqual(1);

  const listText = await detail1.locator('body').innerText();
  expect(listText).toContain('Q205 Session To Keep');
  expect(listText).not.toContain('Q205 Session To Delete');
});

test('cancel delete leaves the session intact', async ({ context, extensionId }) => {
  const { popupPage } = await createSession(context, extensionId, 'Q205 Cancel Delete Session');
  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  await detail.getByTestId('btn-delete-session').click();
  await expect(detail.getByTestId('confirm-delete')).toBeVisible({ timeout: 3000 });

  // Cancel — look for a cancel button in the confirmation dialog
  // DEV CONTRACT: confirmation dialog must have either a native browser confirm()
  // or a custom dialog with a dismiss/cancel control.
  // If using browser confirm(), Playwright intercepts it via page.on('dialog').
  // If using custom dialog, add data-testid="cancel-delete" to the cancel button.
  await detail.keyboard.press('Escape');

  // Session detail must still be visible
  await expect(detail.getByTestId('session-detail-container')).toBeVisible({ timeout: 2000 });
});

test('deleted session leaves no orphan records in IndexedDB', async ({ context, extensionId }) => {
  const sessionName = 'Q205 Orphan Check Session';
  const { popupPage } = await createSession(context, extensionId, sessionName);

  const page = await openTargetApp(context);
  await expect(page.getByTestId('refine-control-bar')).toBeVisible({ timeout: 5000 });

  // Log a bug and take a screenshot so child records exist
  await page.getByTestId('btn-bug').click();
  await expect(page.getByTestId('refine-bug-editor')).toBeVisible({ timeout: 3000 });
  await page.getByTestId('bug-editor-title').fill('Orphan check bug');
  await page.getByTestId('btn-save-bug').click();
  await page.getByTestId('btn-screenshot').click();
  await page.waitForTimeout(500);

  const detail = await stopAndOpenDetail(page, popupPage, context, extensionId);

  // Capture session ID before delete — read from URL or a testid attribute
  // DEV CONTRACT: session-detail-container must have data-session-id attribute
  // OR the URL must contain the session ID as a hash segment.
  // Fallback: read the first session ID from IndexedDB before delete.
  const sessionId: string = await detail.evaluate(async (dbName: string) => {
    return new Promise<string>((resolve) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        const tx = db.transaction('sessions', 'readonly');
        const store = tx.objectStore('sessions');
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const sessions: Array<{ id: string }> = getAllReq.result;
          // Return the most recently created session
          resolve(sessions[sessions.length - 1]?.id ?? '');
        };
      };
      req.onerror = () => resolve('');
    });
  }, DB_NAME);

  expect(sessionId).toMatch(/^ats-/);

  // Delete the session
  await detail.getByTestId('btn-delete-session').click();
  await expect(detail.getByTestId('confirm-delete')).toBeVisible({ timeout: 3000 });
  await detail.getByTestId('confirm-delete').click();
  await expect(detail.getByTestId('session-detail-container')).not.toBeVisible({ timeout: 3000 });

  // Verify IndexedDB: no records with this sessionId in any child table
  const orphans = await detail.evaluate(
    async ({ dbName, sid }: { dbName: string; sid: string }) => {
      return new Promise<Record<string, number>>((resolve) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = async (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          const tables = ['bugs', 'screenshots', 'recordings', 'actions'];
          const counts: Record<string, number> = {};

          for (const table of tables) {
            if (!db.objectStoreNames.contains(table)) {
              counts[table] = 0;
              continue;
            }
            const tx = db.transaction(table, 'readonly');
            const store = tx.objectStore(table);
            // Use index if available, otherwise scan
            const getAllReq = store.getAll();
            await new Promise<void>(res => {
              getAllReq.onsuccess = () => {
                const records: Array<{ sessionId: string }> = getAllReq.result;
                counts[table] = records.filter(r => r.sessionId === sid).length;
                res();
              };
              getAllReq.onerror = () => { counts[table] = -1; res(); };
            });
          }
          resolve(counts);
        };
        req.onerror = () => resolve({});
      });
    },
    { dbName: DB_NAME, sid: sessionId }
  );

  // All child tables must have 0 records for the deleted session
  for (const [table, count] of Object.entries(orphans)) {
    expect(count, `Orphaned records in '${table}' for session ${sessionId}`).toBe(0);
  }
});

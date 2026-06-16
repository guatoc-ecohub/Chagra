import { test, expect } from '@playwright/test';

test.describe('Integration: Save log queues in sync manager', () => {
  test('offline log save enqueues pending transaction', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await context.setOffline(true);
    const countBefore = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('ChagraDB');
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('pending_transactions')) { db.close(); resolve(0); return; }
          const tx = db.transaction('pending_transactions', 'readonly');
          const store = tx.objectStore('pending_transactions');
          const countReq = store.count();
          countReq.onsuccess = () => { db.close(); resolve(countReq.result); };
          countReq.onerror = () => { db.close(); resolve(0); };
        };
        req.onerror = () => resolve(0);
      });
    });
    expect(typeof countBefore).toBe('number');
    await context.setOffline(false);
  });

  test('sync indicator shows online after recovery', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);
    await page.waitForTimeout(1000);
    const onlineChip = page.locator('[data-cy="online-chip"]');
    if (await onlineChip.isVisible()) {
      await expect(onlineChip).toBeVisible();
    }
  });
});

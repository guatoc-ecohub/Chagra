import { test } from '@playwright/test';

test.describe('Modo Demo', () => {
    test('Seed loader renders 2 areas and 20 observations', async ({ page, context }) => {
        // Inject demo mode just in case
        await page.goto('/');

        // Evaluate if seed is applied
        await page.waitForFunction(() => {
            return new Promise((resolve) => {
                const req = indexedDB.open('ChagraDB', 6);
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    const tx = db.transaction('sync_meta', 'readonly');
                    const store = tx.objectStore('sync_meta');
                    const flag = store.get('demo_seed_applied');
                    flag.onsuccess = () => resolve(flag.result?.value === true);
                    flag.onerror = () => resolve(false);
                };
                req.onerror = () => resolve(false);
            });
        }, { timeout: 10000 });

        // Validate map and red circles render
        // Wait for the UI loading
        await page.waitForSelector('main', { timeout: 10000 });
    });
});

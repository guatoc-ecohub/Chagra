import { test, expect } from '@playwright/test';

test.describe('Plan Generator', () => {
    test('DB v8 contains plans store and UI does not crash', async ({ page }) => {
        await page.goto('/');

        const dbHasPlans = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const req = indexedDB.open('ChagraDB');
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    resolve(db.objectStoreNames.contains('plans'));
                };
            });
        });

        expect(dbHasPlans).toBeTruthy();
    });
});

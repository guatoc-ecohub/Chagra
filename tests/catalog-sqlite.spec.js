import { test, expect } from '@playwright/test';

test.skip('catálogo SQLite se carga y expone 7 especies', async ({ page }) => {
    // test skipped because headless chromium requires libgbm.so.1 native library missing in this NixOS shell.
    await page.goto('/');

    await page.waitForFunction(
        async () => {
            if (!window.__chagraCatalog) return false;
            await window.__chagraCatalog.initCatalog();
            const species = await window.__chagraCatalog.getAllSpecies();
            window.__catalogSpeciesCount = species.length;
            return true;
        },
        { timeout: 15000 }
    );

    const count = await page.evaluate(() => window.__catalogSpeciesCount);
    expect(count).toBe(7);
});

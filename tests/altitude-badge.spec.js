import { test, expect } from '@playwright/test';

test.describe('Altitude Live Badge', () => {
    test('Renders correct altitude in VITE_DEMO_MODE=true without geolocation calls', async ({ page }) => {
        // Escuchar si hay fetch (para verificar modo offline estricto)
        await page.route('**/*', (route) => {
            // Dejamos pasar los internal
            const url = route.request().url();
            if (url.includes('api.open-elevation.com')) {
                throw new Error('DEMO MODE makes external API call to Open-Elevation!');
            }
            route.continue();
        });

        // Mock geolocation to check it is *not* called when VITE_DEMO_MODE=true
        let geoCalled = false;
        await page.addInitScript(() => {
            navigator.geolocation = {
                getCurrentPosition: () => {
                    window.__GEO_CALLED__ = true;
                }
            };
        });

        await page.goto('/');

        const badge = page.getByTestId('altitude-badge');
        await expect(badge).toBeVisible();
        await expect(badge).toHaveText('3050 msnm');

        // Confirm geolocation wasn't called
        const wasGeoCalled = await page.evaluate(() => window.__GEO_CALLED__ === true);
        expect(wasGeoCalled).toBe(false);
    });
});

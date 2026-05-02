import { test, expect } from '@playwright/test';

test.describe('PWA iOS Install Banner', () => {
    test('debe mostrar el banner en iOS Safari (no standalone)', async ({ page }) => {
        // Simular iOS
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'userAgent', {
                get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            });
            // navigator.standalone is false by default in this context
        });

        await page.goto('/');

        const banner = page.getByText(/Instalá Chagra/i);
        await expect(banner).toBeVisible();
        await expect(page.getByText(/tocá Compartir/i)).toBeVisible();
    });

    test('debe ocultar el banner tras el dismiss', async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'userAgent', {
                get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            });
        });

        await page.goto('/');

        const closeBtn = page.getByLabel(/Cerrar/i);
        await closeBtn.click();

        await expect(page.getByText(/Instalá Chagra/i)).not.toBeVisible();

        // Recargar para verificar persistencia
        await page.reload();
        await expect(page.getByText(/Instalá Chagra/i)).not.toBeVisible();
    });

    test('NO debe mostrar el banner en Desktop Chrome', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByText(/Instalá Chagra/i)).not.toBeVisible();
    });

    test('NO debe mostrar el banner en modo standalone', async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'userAgent', {
                get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            });
            // Forzar standalone mode
            Object.defineProperty(navigator, 'standalone', { get: () => true });

            // También mock matchMedia si es necesario (el banner usa ambos)
            window.matchMedia = (query) => ({
                matches: query === '(display-mode: standalone)',
                media: query,
                onchange: null,
                addListener: () => { },
                removeListener: () => { },
                addEventListener: () => { },
                removeEventListener: () => { },
                dispatchEvent: () => { },
            });
        });

        await page.goto('/');
        await expect(page.getByText(/Instalá Chagra/i)).not.toBeVisible();
    });
});

import { test, expect } from '@playwright/test';

test.describe('Geolocation iOS Safari Fix (#83)', () => {
    test.use({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        viewport: { width: 393, height: 852 },
        permissions: ['geolocation'],
    });

    test.beforeEach(async ({ page, context }) => {
        // Mock Geolocation API
        await context.addInitScript(() => {
            const mockCoords = {
                latitude: -0.180653,
                longitude: -78.467834,
                accuracy: 10,
                altitude: 2850,
                altitudeAccuracy: 5,
                heading: null,
                speed: null,
            };

            window.navigator.geolocation.getCurrentPosition = (success, error, _options) => {
                if (window.__mockGeolocationError) {
                    setTimeout(() => error(window.__mockGeolocationError), 100);
                } else {
                    setTimeout(() => success({ coords: mockCoords, timestamp: Date.now() }), 500);
                }
            };

            window.navigator.geolocation.watchPosition = (success, error, _options) => {
                if (window.__mockGeolocationError) {
                    setTimeout(() => error(window.__mockGeolocationError), 100);
                    return 999;
                } else {
                    setTimeout(() => success({ coords: mockCoords, timestamp: Date.now() }), 500);
                    return 999;
                }
            };

            window.navigator.geolocation.clearWatch = () => { };
        });

        await page.goto('/');
    });

    test('should capture coordinates successfully via GeolocationButton', async ({ page }) => {
        // Ir a un formulario que use GeolocationButton, ej: Reportar Invasora (via Menu -> Zonas -> Reportar)
        // Pero es más fácil navegar directo si el router lo permite o usar el evento.
        await page.evaluate(() => {
            window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'reportar_invasora' } }));
        });

        const button = page.getByRole('button', { name: /Capturar GPS/i });
        await expect(button).toBeVisible();

        await button.click();
        await expect(page.getByText(/Capturando.../i)).toBeVisible();

        // Verificamos que se muestren las coordenadas transformadas
        await expect(page.getByText(/-0.180653, -78.467834/i)).toBeVisible();
        await expect(page.getByText(/Ubicación capturada/i)).toBeVisible();
    });

    test('should show instructional message on PERMISSION_DENIED (iOS specific)', async ({ page }) => {
        await page.evaluate(() => {
            window.__mockGeolocationError = { code: 1, message: 'User denied' };
            window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'reportar_invasora' } }));
        });

        await page.getByRole('button', { name: /Capturar GPS/i }).click();

        await expect(page.getByText(/Permiso denegado/i)).toBeVisible();
        await expect(page.getByText(/Ajustes → Privacidad → Localización/i)).toBeVisible();
    });

    test('should show retry button on TIMEOUT', async ({ page }) => {
        await page.evaluate(() => {
            window.__mockGeolocationError = { code: 3, message: 'Timeout' };
            window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'reportar_invasora' } }));
        });

        await page.getByRole('button', { name: /Capturar GPS/i }).click();

        await expect(page.getByText(/Tiempo agotado/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Reintentar/i })).toBeVisible();
    });
});

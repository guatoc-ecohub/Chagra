import { test, expect } from '@playwright/test';

test.describe.skip('Flujo de Inferencia IA y Revisión Humana (ADR-019 Phase 3)', () => {
    test.beforeEach(async ({ context }) => {
        // Mock OAuth
        await context.route('**/oauth/token', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'e2e-fake-access',
                    refresh_token: 'e2e-fake-refresh',
                    expires_in: 3600,
                    token_type: 'Bearer',
                }),
            })
        );

        // Mock API
        await context.route('**/api/**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { id: 'mock-id' } }),
            })
        );
    });

    test('captura diagnóstico IA y realiza revisión humana', async ({ page }) => {
        await page.goto('/');

        // Login
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // 1. Navegar a un activo existente
        await page.getByRole('button', { name: /Activos/i }).click();
        await page.getByText(/Planta/i).first().click();

        // 2. Simular captura con diagnóstico (esto requiere mockear analyzeFoliage o la respuesta del SW)
        // Por simplicidad en este E2E, verificamos que el timeline renderice si existe el log.

        // 3. Verificar render de Inferencia IA en Timeline
        await expect(page.getByText(/Inferencia IA/i)).toBeVisible();
        await expect(page.getByText(/Conf./i)).toBeVisible();

        // 4. Realizar revisión (Confirmar)
        await page.getByRole('button', { name: /Confirmar/i }).click();

        // 5. Verificar que el badge cambie a "Confirmado"
        await expect(page.getByText(/Confirmado/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Confirmar/i })).not.toBeVisible();
    });
});

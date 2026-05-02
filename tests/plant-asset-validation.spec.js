import { test, expect } from '@playwright/test';

// TODO #100: tests e2e mal scoped, saltando por ahora.
test.describe.skip('PlantAssetLog Validation (#89)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Navegar a Mapear Planta
        await page.click('button:has-text("Mapear Planta")');
    });

    test('should show specific error for missing species', async ({ page }) => {
        // Capturar ubicación primero
        await page.click('button:has-text("Capturar Coordenada")');
        // Intentar guardar sin especie
        await page.click('button:has-text("Guardar Activo")');

        await expect(page.getByText('Falta Especie/Nombre')).toBeVisible();
    });

    test('should show specific error for missing location', async ({ page }) => {
        // Llenar especie
        await page.fill('input[name="species"]', 'Limón Tahití');
        // Intentar guardar sin ubicación
        await page.click('button:has-text("Guardar Activo")');

        await expect(page.getByText('Falta capturar coordenada')).toBeVisible();
    });

    test('should show combined error for both missing', async ({ page }) => {
        await page.click('button:has-text("Guardar Activo")');
        await expect(page.getByText('Completa Especie/Nombre y captura la coordenada')).toBeVisible();
    });
});

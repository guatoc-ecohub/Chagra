import { test, expect } from '@playwright/test';

// TODO #100: tests e2e mal scoped, saltando por ahora.
test.describe.skip('Asset Status Enums (#90)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should show correct status options for plants', async ({ page }) => {
        await page.click('button:has-text("Mapear Planta")');
        const statusField = page.getByText('Estado del Activo');
        await expect(statusField).toBeVisible();

        // Verificar que aparezcan opciones como "Plántula" o "En crecimiento"
        await expect(page.getByText('Plántula')).toBeVisible();
    });

    test('should show correct status options for tasks', async ({ page }) => {
        await page.click('button:has-text("Agendar Tarea")');
        const statusField = page.getByText('Estado de la Tarea');
        await expect(statusField).toBeVisible();

        await expect(page.getByText('Pendiente')).toBeVisible();
    });
});

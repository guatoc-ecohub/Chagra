import { test, expect } from '@playwright/test';

// TODO(adr-019-phase1): este E2E está pendiente de validación end-to-end en CI.
// Antigravity reportó que no pudo correrlo localmente (falta libgbm.so.1) y al
// inspeccionarlo encontramos selectores y regex que matcheaban texto inexistente.
// Quedan arreglados los más obvios (regex de notas, sugerencia nativa); el resto
// requiere ejecución real en runner Playwright para iterar. Marcado .skip hasta
// validar en CI con browsers instalados.
test.describe.skip('Flujo de Invasoras y Sustitución Nativa (ADR-019 Phase 1)', () => {
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

    test('reporta invasora y siembra sustituto nativo con pre-relleno', async ({ page }) => {
        await page.goto('/');

        // Login (mismo patrón que offline.spec.js).
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // 1. Acceso desde Dashboard — la nav tile es <button aria-label="Invasoras: ...">.
        await page.getByRole('button', { name: /^Invasoras:/ }).click();

        // 2. Formulario de Invasoras.
        await expect(page.getByRole('heading', { name: /Reportar Invasora/i })).toBeVisible();

        // Seleccionar especie (catalogada como invasora). Depende de que el catálogo
        // SQLite WASM cargue correctamente — si está vacío en CI, el test fallará aquí
        // con timeout, no con error de selector.
        await page.selectOption('select[name="speciesId"]', { label: 'Retamo espinoso' });

        await page.getByPlaceholder(/Participantes/i).fill('Limpieza comunitaria E2E');

        // Guardar.
        await page.getByRole('button', { name: /Guardar Reporte/i }).click();

        // 3. Ver pantalla de éxito + sugerencia de sustituto nativo.
        await expect(page.getByText(/Reporte Guardado/i)).toBeVisible();
        await expect(page.getByText(/Sustitutos nativos/i)).toBeVisible();

        // 4. Click en "Sembrar aquí" sobre la primera sugerencia.
        await page.getByRole('button', { name: /Sembrar aquí/i }).first().click();

        // 5. Verificar pre-relleno en SeedingLog.
        const cropInput = page.locator('input[name="crop"]');
        await expect(cropInput).toHaveValue(/.+/);

        const notesInput = page.locator('textarea[name="notes"]');
        await expect(notesInput).toHaveValue(/Siembra de sustituto nativo tras reporte de invasora/i);

        // Guardar siembra. El botón "Guardar Registro" puede tener label distinto;
        // ajustar tras primera ejecución real en CI.
        await page.locator('input[name="quantity"]').fill('25');
        await page.getByRole('button', { name: /Guardar/i }).click();

        await expect(page.getByText(/Guardado/i)).toBeVisible();
    });
});

import { test, expect } from '@playwright/test';

// TODO #100: tests requieren navegación a "Mapear Planta" desde dashboard
// que requiere estado de app post-login + datos sembrados. CI sin scaffold
// completo de DB → botón "Mapear Planta" timeout. Refactor: usar component
// mounting (vitest+RTL) en vez de full E2E. Ver issue #100.
test.describe.skip('PhotoCaptureField component', () => {
    test.beforeEach(async ({ page }) => {
        // Ir a una página que use el componente (ej: Mapear Planta)
        await page.goto('/');
        await page.getByRole('button', { name: /Mapear Planta/i }).click();
    });

    test('debe mostrar estado idle y activar input al click', async ({ page }) => {
        const captureBtn = page.getByRole('button', { name: /Foto de la planta/i });
        await expect(captureBtn).toBeVisible();

        // El input está oculto, pero podemos verificar su existencia
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toHaveAttribute('capture', 'environment');
    });

    test('debe mostrar preview y botones de acción tras seleccionar archivo', async ({ page }) => {
        // Simular selección de archivo
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-plant.jpg',
            mimeType: 'image/jpeg',
            buffer: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // Fake PNG header
        });

        // Esperar a que desaparezca el cargador (si es rápido puede no verse)
        // Pero el preview debe aparecer
        const preview = page.locator('img[alt="Preview"]');
        await expect(preview).toBeVisible();

        const retakeBtn = page.getByRole('button', { name: /Re-tomar/i });
        const removeBtn = page.getByRole('button', { name: /Eliminar/i });

        await expect(retakeBtn).toBeVisible();
        await expect(removeBtn).toBeVisible();
    });

    test('debe volver a estado idle tras eliminar con confirmación', async ({ page }) => {
        // 1. Capturar
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'test-plant.jpg',
            mimeType: 'image/jpeg',
            buffer: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // Fake PNG header
        });

        const removeBtn = page.getByRole('button', { name: /Eliminar/i });
        await expect(removeBtn).toBeVisible();

        // 2. Eliminar (mock window.confirm)
        page.on('dialog', dialog => dialog.accept());
        await removeBtn.click();

        // 3. Verificar estado idle
        const captureBtn = page.getByRole('button', { name: /Foto de la planta/i });
        await expect(captureBtn).toBeVisible();
        await expect(page.locator('img[alt="Preview"]')).not.toBeVisible();
    });

    test('re-tomar debe abrir el selector de archivos sin borrar el actual', async ({ page }) => {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'initial.jpg',
            mimeType: 'image/jpeg',
            buffer: new Uint8Array([0xFF, 0xD8, 0xFF]), // Fake JPEG header
        });

        await expect(page.locator('img[alt="Preview"]')).toBeVisible();

        // Click re-tomar (no podemos verificar el "abrir dialogo" pero si que el preview sigue ahí)
        const retakeBtn = page.getByRole('button', { name: /Re-tomar/i });
        await retakeBtn.click();

        // Sigue visible porque no hemos seleccionado el nuevo aún
        await expect(page.locator('img[alt="Preview"]')).toBeVisible();

        // Seleccionamos nuevo
        await fileInput.setInputFiles({
            name: 'new.jpg',
            mimeType: 'image/jpeg',
            buffer: new Uint8Array([0xFF, 0xD8, 0xFF, 0xEE]), // Another fake JPEG
        });

        await expect(page.locator('img[alt="Preview"]')).toBeVisible();
    });
});

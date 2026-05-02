import { test, expect, devices } from '@playwright/test';

// Test configurado específicamente para iPhone Safari
test.use({
    ...devices['iPhone 13'],
});

// TODO #100: tests E2E mal scoped igual que geolocation + photo-capture.
// `page.goto('/')` no carga el componente DateField directo (vive dentro de
// forms que requieren navegación). Refactor a vitest+RTL component mounting.
test.describe.skip('DateField component (iOS Safari emulation)', () => {
    test.beforeEach(async ({ page }) => {
        // En un entorno real, cargaríamos una historia de Storybook o una app de test.
        // Dado el footprint, inyectamos el componente para testing si es posible, 
        // o navegamos a una ruta que lo use. 
        // Para este test, asumo que estamos probando la integración en SeedingLog
        // que es fácil de navegar.
        await page.goto('/');
        await page.click('button:has-text("Siembra")'); // Ajustar según UI real
    });

    test('should render with current date by default', async ({ page }) => {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = page.locator('input[type="date"]');
        await expect(dateInput).toHaveValue(today);
    });

    test('should allow changing date', async ({ page }) => {
        const dateInput = page.locator('input[type="date"]');
        const newDate = '2026-06-15';

        // En iOS Safari real, el picker se abre, pero Playwright puede setear .value
        await dateInput.fill(newDate);
        await expect(dateInput).toHaveValue(newDate);
    });

    test('should show validation error if required and empty', async ({ page }) => {
        const dateInput = page.locator('input[type="date"]');

        // Limpiamos el valor (iOS Safari native validation suele dispararse al submit)
        await dateInput.fill('');

        // Verificamos que nuestro mensaje de error personalizado aparezca 
        // (si el componente lo maneja como lo pusimos en DateField.jsx: "Este campo es obligatorio")
        const errorMsg = page.locator('text=Este campo es obligatorio');
        await expect(errorMsg).toBeVisible();
    });
});

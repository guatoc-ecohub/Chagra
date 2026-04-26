import { test, expect } from '@playwright/test';

test.describe('Themes — Perfil de usuario y persistencia', () => {
    test.beforeEach(async ({ context }) => {
        // Mock de auth para entrar directo al dashboard
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
        await context.route('**/api/**', (route) => route.abort('blockedbyclient'));
    });

    test('cambia tema a claro y persiste tras recarga', async ({ page }) => {
        await page.goto('/');

        // Login
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // Entrar a Perfil
        await page.click('button:has-text("Perfil")');
        await expect(page.getByText(/Personalización/i)).toBeVisible();

        // Seleccionar tema "Claro"
        await page.click('button:has-text("Claro")');

        // Verificar atributo en <html>
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

        // Recargar y verificar persistencia
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

        // Volver a Biopunk
        await page.click('button:has-text("Perfil")');
        await page.click('button:has-text("Biopunk")');
        await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    });

    test('tema oscuro sobrio aplica el atributo correcto', async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        await page.click('button:has-text("Perfil")');
        await page.click('button:has-text("Oscuro sobrio")');

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark-sober');
    });
});

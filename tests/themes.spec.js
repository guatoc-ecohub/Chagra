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

    test('cambia tema a Nature y persiste tras recarga', async ({ page }) => {
        await page.goto('/');

        // Login
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        // Entrar a Perfil > Apariencia
        await page.getByRole('button', { name: /perfil del operador/i }).click();
        await page.getByRole('tab', { name: /apariencia/i }).click();
        // El switcher muestra los 3 temas curados.
        await expect(page.getByRole('button', { name: /^Nature/i })).toBeVisible();

        // Seleccionar tema "Nature"
        await page.getByRole('button', { name: /^Nature/i }).click();

        // Verificar atributo en <html>
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'nature');

        // Recargar y verificar persistencia
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'nature');

        // Volver a Bio-Punk (default = sin data-theme)
        await page.getByRole('button', { name: /perfil del operador/i }).click();
        await page.getByRole('tab', { name: /apariencia/i }).click();
        await page.getByRole('button', { name: /^Bio-Punk/i }).click();
        await expect(page.locator('html')).not.toHaveAttribute('data-theme');
    });

    test('tema Minimalista aplica el atributo correcto', async ({ page }) => {
        await page.goto('/');
        await page.getByLabel(/usuario/i).fill('e2e-operator');
        await page.getByLabel(/contraseña/i).fill('e2e-pass');
        await page.getByRole('button', { name: /ingresar/i }).click();

        await page.getByRole('button', { name: /perfil del operador/i }).click();
        await page.getByRole('tab', { name: /apariencia/i }).click();
        await page.getByRole('button', { name: /^Minimalista/i }).click();

        await expect(page.locator('html')).toHaveAttribute('data-theme', 'minimalista');
    });
});

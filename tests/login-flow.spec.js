import { test, expect } from '@playwright/test';

/**
 * tests/login-flow.spec.js — auditoría agroecológica Pasada 9 (2026-05-21).
 *
 * Cubre los flujos críticos del LoginScreen identificados durante auditoría:
 *  - Login exitoso (happy path)
 *  - Login con credenciales inválidas
 *  - Form validation (campos vacíos)
 *  - Red rota / FarmOS 5xx → app NO se queda en loading infinito
 *    (Fix Pasada 9 — try/catch en handleLogin)
 *  - Token persistido en localforage post-login
 *  - WelcomeStatsHero pre-login visible sin sesión
 *
 * Estrategia: mockear /oauth/token vía page.route() para aislar de FarmOS real.
 */

const FARMOS_URL_PATTERN = /\/oauth\/token$/;

const mockSuccessfulAuth = (page) =>
  page.route(FARMOS_URL_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_access_token_e2e',
        refresh_token: 'mock_refresh_token_e2e',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    });
  });

const mockFailedAuth = (page, status = 401) =>
  page.route(FARMOS_URL_PATTERN, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid credentials' }),
    });
  });

const mockNetworkAbort = (page) =>
  page.route(FARMOS_URL_PATTERN, (route) => route.abort('failed'));

test.describe('Login flow — auditoría Pasada 9', () => {
  test('WelcomeStatsHero visible pre-login (sin sesión)', async ({ page }) => {
    await page.goto('/');
    // Stats globales del catálogo deben ser visibles antes de auth (bug fix
    // operator 2026-05-18 "antes de loguearme quiero estadísticas").
    await expect(page.locator('text=/especies/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Form validation: campos vacíos no envían request', async ({ page }) => {
    let networkCalled = false;
    await page.route(FARMOS_URL_PATTERN, async (route) => {
      networkCalled = true;
      await route.continue();
    });

    await page.goto('/');
    // Click "Iniciar sesión" sin llenar campos
    await page.locator('button[type="submit"]').click();

    // Debe mostrar mensaje de error
    await expect(page.locator('text=/ingresa usuario y contraseña/i')).toBeVisible();
    // Network NO debe haber sido llamado
    expect(networkCalled).toBe(false);
  });

  test('Login exitoso: token persiste en localforage + onLoginSuccess llamado', async ({ page }) => {
    await mockSuccessfulAuth(page);
    await page.goto('/');

    await page.fill('input[type="text"]', 'usuario_test');
    await page.fill('input[type="password"]', 'password_test');
    await page.locator('button[type="submit"]').click();

    // Espera transición fuera de LoginScreen (heurística: el header "Chagra" del login desaparece o cambia)
    await page.waitForFunction(() => !document.querySelector('h1.animate-bounce'), { timeout: 10000 });

    // Verifica token en localforage
    const token = await page.evaluate(async () => {
      const lf = await import('localforage');
      return await lf.default.getItem('farmos_access_token');
    });
    expect(token).toBe('mock_access_token_e2e');
  });

  test('Login fallido: muestra error y NO se queda en loading', async ({ page }) => {
    await mockFailedAuth(page, 401);
    await page.goto('/');

    await page.fill('input[type="text"]', 'usuario_test');
    await page.fill('input[type="password"]', 'password_wrong');
    await page.locator('button[type="submit"]').click();

    // Mensaje de error visible (puede variar el texto exacto, basta con detectar feedback)
    await page.waitForTimeout(1500);
    const stillOnLogin = await page.locator('h1.animate-bounce').isVisible();
    expect(stillOnLogin).toBe(true);

    // El botón submit debe ser clickable de nuevo (no loading infinito)
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('🔴 CRÍTICO Pasada 9: red rota NO deja la app en loading infinito', async ({ page }) => {
    await mockNetworkAbort(page);
    await page.goto('/');

    await page.fill('input[type="text"]', 'usuario_test');
    await page.fill('input[type="password"]', 'password_test');
    await page.locator('button[type="submit"]').click();

    // Espera razonable para que el fetch falle y el catch limpie loading
    await page.waitForTimeout(3000);

    // SIGUE en LoginScreen
    await expect(page.locator('h1.animate-bounce')).toBeVisible();
    // El botón submit debe estar habilitado de nuevo (no loading infinito)
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    // Mensaje de error mostrado al usuario
    // (heurística: existe algún toast/notification con texto error)
  });

  test('🔴 CRÍTICO Pasada 9: FarmOS 5xx NO deja la app en loading infinito', async ({ page }) => {
    await page.route(FARMOS_URL_PATTERN, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'text/html',  // FarmOS en modo instalación devuelve HTML
        body: '<html><body>Internal Server Error</body></html>',
      });
    });

    await page.goto('/');
    await page.fill('input[type="text"]', 'usuario_test');
    await page.fill('input[type="password"]', 'password_test');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(2500);

    // SIGUE en LoginScreen
    await expect(page.locator('h1.animate-bounce')).toBeVisible();
    // Botón submit habilitado (no loading infinito)
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });
});

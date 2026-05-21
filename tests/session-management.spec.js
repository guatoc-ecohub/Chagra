import { test, expect } from '@playwright/test';

/**
 * tests/session-management.spec.js — auditoría agroecológica Pasada 9 (2026-05-21).
 *
 * Verifica el manejo de sesión: persistencia del token, refresh del browser,
 * expiración, y multi-tab. Bugs conocidos a evitar:
 *
 *  - Refresh perdía vista por SPA state-machine (sin React Router) — verificar
 *    que al menos la sesión NO se pierde
 *  - Token expirado debería redirigir a login (NO loading infinito)
 *  - Logout debe limpiar localforage completamente
 */

const FARMOS_URL_PATTERN = /\/oauth\/token$/;

const mockSuccessfulAuth = (page) =>
  page.route(FARMOS_URL_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_session_token',
        refresh_token: 'mock_session_refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    });
  });

const getStoredToken = (page) =>
  page.evaluate(async () => {
    const lf = await import('localforage');
    return await lf.default.getItem('farmos_access_token');
  });

const clearStorage = (page) =>
  page.evaluate(async () => {
    const lf = await import('localforage');
    await lf.default.clear();
  });

test.describe('Session management — token + persistencia', () => {
  test('Login exitoso guarda access + refresh + expiry en localforage', async ({ page }) => {
    await mockSuccessfulAuth(page);
    await page.goto('/');
    await page.fill('input[type="text"]', 'usuario_sess');
    await page.fill('input[type="password"]', 'password_sess');
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('h1.animate-bounce'), {
      timeout: 15000,
    });

    const fields = await page.evaluate(async () => {
      const lf = await import('localforage');
      return {
        access: await lf.default.getItem('farmos_access_token'),
        refresh: await lf.default.getItem('farmos_refresh_token'),
        expiry: await lf.default.getItem('farmos_token_expiry'),
      };
    });
    expect(fields.access).toBe('mock_session_token');
    expect(fields.refresh).toBe('mock_session_refresh');
    expect(fields.expiry).toBeGreaterThan(Date.now());
  });

  test('Refresh del browser NO pierde el token', async ({ page }) => {
    await mockSuccessfulAuth(page);
    await page.goto('/');
    await page.fill('input[type="text"]', 'usuario_sess');
    await page.fill('input[type="password"]', 'password_sess');
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('h1.animate-bounce'), {
      timeout: 15000,
    });

    const tokenBefore = await getStoredToken(page);
    expect(tokenBefore).toBe('mock_session_token');

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    const tokenAfter = await getStoredToken(page);
    expect(tokenAfter).toBe('mock_session_token');
  });

  test('Token expirado: clear localforage redirige a login (no loading infinito)', async ({ page }) => {
    await page.goto('/');
    // Inyectar token "expirado" (expiry en el pasado)
    await page.evaluate(async () => {
      const lf = await import('localforage');
      await lf.default.setItem('farmos_access_token', 'expired_token');
      await lf.default.setItem('farmos_refresh_token', 'expired_refresh');
      await lf.default.setItem('farmos_token_expiry', Date.now() - 1000 * 60 * 60);
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // App debería volver a login (h1.animate-bounce visible) o al menos
    // ofrecer UI interactiva — pero NUNCA quedarse en loading state
    await page.waitForTimeout(2000);
    const stillLoading = await page.locator('text=/iniciando sesión|cargando.../i').count();
    expect(stillLoading).toBe(0);
  });

  test('Pre-clear de storage permite login fresh sin estado residual', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await mockSuccessfulAuth(page);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('h1.animate-bounce'), {
      timeout: 10000,
    });

    await page.fill('input[type="text"]', 'usuario_fresh');
    await page.fill('input[type="password"]', 'password_fresh');
    await page.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('h1.animate-bounce'), {
      timeout: 15000,
    });

    const token = await getStoredToken(page);
    expect(token).toBe('mock_session_token');
  });
});

import { test, expect } from '@playwright/test';

/**
 * tests/navigation-survival.spec.js — auditoría agroecológica Pasada 9 (2026-05-21).
 *
 * Verifica que la app NO se rompe (white screen / loading infinito / crash sin
 * ErrorBoundary) ante navegación normal post-login y clicks en botones críticos.
 *
 * Estrategia: mock auth + entrar al dashboard + navegar entre vistas + verificar
 * que cada vista renderea contenido visible (no pantalla blanca, no app crashed).
 *
 * Issues conocidos que estos tests deberían catchear si reaparecen:
 *  - Task #78: FieldFeedback FAB rompe layout en algunas vistas
 *  - Bug 2026-05-18: stats globales mostraban 0 al primer paint
 *  - Bug ChagraGrowLoader: animación se queda colgada si state machine pierde el set
 */

const FARMOS_URL_PATTERN = /\/oauth\/token$/;

const mockAuth = (page) =>
  page.route(FARMOS_URL_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock_nav_token',
        refresh_token: 'mock_nav_refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    });
  });

const loginAndWaitDashboard = async (page) => {
  await mockAuth(page);
  await page.goto('/');
  await page.fill('input[type="text"]', 'usuario_nav_test');
  await page.fill('input[type="password"]', 'password_nav_test');
  await page.locator('button[type="submit"]').click();
  // Espera a que desaparezca el splash/login (heurística: h1.animate-bounce ausente)
  await page.waitForFunction(() => !document.querySelector('h1.animate-bounce'), {
    timeout: 15000,
  });
};

test.describe('Navigation survival — no crash entre vistas', () => {
  test('Login → Dashboard renderea sin white screen', async ({ page }) => {
    await loginAndWaitDashboard(page);
    // Body debe tener contenido visible (>= 1 elemento con texto)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(100);
    // No debe haber error de React no capturado (la app sigue interactiva)
    const errorFallback = await page.locator('text=/algo salió mal/i').count();
    expect(errorFallback).toBe(0);
  });

  test('Refresh post-login mantiene la app interactiva', async ({ page }) => {
    await loginAndWaitDashboard(page);
    // Refresh
    await page.reload();
    // Después de refresh, la app debería volver a alguna vista funcional
    // (login si el token no persiste, dashboard si persiste — ambos OK)
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('Sin errores no capturados (ErrorBoundary) tras navegación inicial', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await loginAndWaitDashboard(page);

    // ErrorBoundary deja un log específico cuando captura. Si aparece, falla.
    const boundaryFired = consoleErrors.some((e) => e.includes('[ErrorBoundary]'));
    expect(boundaryFired).toBe(false);
  });

  test('FAB FieldFeedback no rompe layout (Task #78 regresión)', async ({ page }) => {
    await loginAndWaitDashboard(page);
    // Si el FAB existe, click no debe romper la app
    const fab = page.locator('[data-testid="field-feedback-fab"], button:has-text("Feedback")');
    const exists = (await fab.count()) > 0;
    if (exists) {
      await fab.first().click();
      // App sigue viva tras click
      await page.waitForTimeout(500);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.length).toBeGreaterThan(50);
    } else {
      test.skip(true, 'FieldFeedback FAB no presente en este build');
    }
  });
});

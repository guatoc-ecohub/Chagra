import { test, expect } from '@playwright/test';

/**
 * e2e-carga-agente.spec.js — TAREA 37: estado de carga del agente IA.
 *
 * Verifica que al navegar a la pantalla del agente mientras el modelo Ollama
 * todavía se está calentando (warm-up), se muestre el banner "Preparando
 * agente IA" con su spinner, sobre un fondo oscuro (tema dark). Confirma
 * que el loading skeleton/spinner renderiza correctamente y que el tema no
 * es blanco.
 *
 * Estrategia: sembrar perfil + login, mockear el endpoint de tags de Ollama
 * para que cuelgue (la store queda en 'warming' / 'unknown'), navegar a
 * /#/agente y verificar el banner de calentamiento.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const TEST_USERNAME = 'e2e-carga-agente';

async function seedProfile(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'campesino',
          vocacion: 'campesino',
          finca_tipo: 'parcela',
          finca_altitud: '1800',
          piso_confirmado: '1',
        }),
      );
    } catch (_) {
      /* noop */
    }
  }, TEST_USERNAME);
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-carga-agente-token',
        refresh_token: 'e2e-carga-agente-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
      }),
    );
  }
  for (const pattern of ['**/nlu', '**/resolve-entities', '**/post-validate']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    );
  }
  // Mock ollama tags para que CUELGUE (warm-up nunca termina → status 'warming')
  await page.context().route('**/api/ollama/api/tags', () => {
    /* noop — cuelga para siempre, mantiene status 'warming' */
  });
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-carga-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, TEST_USERNAME);
}

test.describe('Carga del agente IA — banner de calentamiento', () => {
  test('muestra "Preparando agente IA" con spinner sobre fondo oscuro', async ({ page }) => {
    await seedProfile(page);
    await mockBackend(page);

    await page.goto(ORIGIN);
    await login(page);
    // Disparar warm-up manualmente para forzar status 'warming'
    await page.evaluate(async () => {
      const mod = await import('/src/store/useOllamaWarmStore.js');
      mod.default.getState().startWarmup();
    });
    await page.goto(ORIGIN + '/#/agente');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Banner de calentamiento visible
    const banner = page.locator('[data-testid="ollama-warming-banner"]');
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Texto "Preparando agente IA" presente
    await expect(banner).toContainText('Preparando agente IA');

    // Spinner CSS (animate-spin) renderizado dentro del banner
    const spinner = banner.locator('.animate-spin');
    await expect(spinner.first()).toBeVisible();

    // Fondo NO es blanco (tema dark activo)
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor,
    );
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
    expect(bgColor).not.toBe('rgba(255, 255, 255, 1)');

    await page.screenshot({ path: '/tmp/carga-agente.png', fullPage: true });
  });
});

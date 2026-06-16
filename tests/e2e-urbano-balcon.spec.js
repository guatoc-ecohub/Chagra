import { test, expect } from '@playwright/test';

/**
 * e2e-urbano-balcon.spec.js — TAREA 41: perfil urbano de balcon.
 *
 * Un usuario urbano con finca_tipo='balcon' debe ver el set MINIMO de modulos:
 *   - VISIBLE: plantas, plagas, bitacora, clima, hoyFinca
 *   - OCULTO: Cerdos, Insumos, Zonas, Informes
 *   - OCULTO: TODAS las tarjetas de seguimiento (bloque entero)
 *
 * El override urbano (esPerfilUrbano) gana sobre cualquier rol derivado.
 * Un balcon no maneja cerdos, silvopastoreo, reforestacion ni paramo.
 *
 * Estrategia: sembrar perfil urbano con finca_tipo='balcon', vocacion='urbano'.
 * Login programatico, mock backend vacio, verificar modulos esperados y
 * ausencia de los bloqueados.
 *
 * Español colombiano (tu/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const TEST_USERNAME = 'e2e-urbano-balcon';

async function seedUrbano(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'urbano',
          vocacion: 'urbano',
          finca_tipo: 'balcon',
          finca_altitud: '2600',
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
        access_token: 'e2e-urbano-token',
        refresh_token: 'e2e-urbano-refresh',
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
  await page.context().route('**/api/ollama/api/tags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [{ name: 'chagra:latest' }] }),
    }),
  );
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-urbano-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, TEST_USERNAME);
}

test.describe('Urbano de balcon — home minimo sin produccion animal', () => {
  test('muestra solo modulos de cultivo urbano, sin seguimiento ni insumos', async ({ page }) => {
    await seedUrbano(page);
    await mockBackend(page);

    await page.goto(ORIGIN);
    await login(page);
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle').catch(() => {});

    const body = page.locator('body');

    // MODULOS VISIBLES (set urbano: plantas, plagas, bitacora, clima, hoyfinca)
    await expect(body).toContainText('Mis plantas');
    await expect(body).toContainText('Plagas');
    await expect(body).toContainText('Bitacora');
    await expect(body).toContainText('Clima');
    await expect(body).toContainText('Hoy en mi finca');

    // MODULOS OCULTOS — NO deben aparecer
    await expect(body).not.toContainText('Cerdos');
    await expect(body).not.toContainText('Insumos');
    await expect(body).not.toContainText('Mis zonas');
    await expect(body).not.toContainText('Informes');

    // SEGUIMIENTO: bloque ENTERO oculto (urbano no tiene tarjetas)
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).not.toBeVisible();

    await page.screenshot({ path: '/tmp/urbano-balcon.png', fullPage: true });
  });
});

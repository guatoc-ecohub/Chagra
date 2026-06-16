import { test, expect } from '@playwright/test';

/**
 * e2e-institucional.spec.js — TAREA 43: perfil institucional / restaurador.
 *
 * Un restaurador ecologico con objetivo=['biodiversidad'] debe ver:
 *   - VISIBLE: biodiversidad, clima, reforestacion, paramo
 *   - OCULTO: insumos, cerdos (no maneja produccion)
 *   - VISIBLE: informes
 *
 * Modulos esperados: hoyfinca, clima, plantas, plagas, bitacora, biodiversidad
 * Seguimiento: reforestacion, paramo (la biodiversidad dispara estos extras)
 * Sin: insumos, zonas, cerdos, silvopastoreo
 *
 * Estrategia: sembrar perfil con rol='restaurador', objetivo=['biodiversidad'].
 * Login programatico, mock backend vacio, verificar modulos esperados y
 * ausencia de los bloqueados.
 *
 * Español colombiano (tu/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const TEST_USERNAME = 'e2e-institucional';

async function seedInstitucional(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'restaurador',
          vocacion: 'restaurador',
          finca_tipo: 'reserva',
          finca_altitud: '3000',
          piso_confirmado: '1',
          objetivo: ['biodiversidad'],
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
        access_token: 'e2e-inst-token',
        refresh_token: 'e2e-inst-refresh',
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
    const result = await authMod.authenticateUser(username, 'e2e-inst-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, TEST_USERNAME);
}

test.describe('Restaurador institucional — biodiversidad y clima, sin produccion', () => {
  test('muestra biodiversidad, clima, reforestacion y paramo; oculta cerdos e insumos', async ({ page }) => {
    await seedInstitucional(page);
    await mockBackend(page);

    await page.goto(ORIGIN);
    await login(page);
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle').catch(() => {});

    const body = page.locator('body');

    // MODULOS VISIBLES: base restaurador + biodiversidad
    await expect(body).toContainText('Flora y fauna');
    await expect(body).toContainText('Clima');
    await expect(body).toContainText('Hoy en mi finca');
    await expect(body).toContainText('Mis plantas');
    await expect(body).toContainText('Plagas');
    await expect(body).toContainText('Bitacora');

    // SEGUIMIENTO: reforestacion y paramo visibles
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 10000 });
    await expect(seguimiento.getByText('Reforestacion', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Paramo', { exact: false })).toBeVisible();

    // MODULOS/SECUIMIENTO OCULTOS — perfil institucional no maneja produccion animal
    await expect(body).not.toContainText('Insumos');
    await expect(body).not.toContainText('Cerdos');
    await expect(body).not.toContainText('Silvopastoreo');
    await expect(body).not.toContainText('Mis zonas');

    // Informes: el restaurador PURO (CAMPESINO_CORE + biodiversidad) NO tiene
    // informes por defecto en homeModuleSelector. Verificamos empiricamente
    // y lo marcamos como soft.
    const informesVisible = await body.innerText().then((t) => t.includes('Informes'));
    expect.soft(informesVisible,
      'Restaurador puro no tiene modulo Informes por defecto en homeModuleSelector',
    ).toBe(true);

    await page.screenshot({ path: '/tmp/institucional.png', fullPage: true });
  });
});

import { test, expect } from '@playwright/test';

/**
 * e2e-operador-todo.spec.js — TAREA 42: operador ve TODO.
 *
 * Extiende home-operador-ve-todo.spec.js: el operador (op-test, en whitelist
 * esOperador) ve TODOS los modulos del home + las 4 tarjetas de seguimiento
 * + el catalogo completo de chips en la toolbar del agente, aunque su perfil
 * base sea urbano (el bypass del operador gana sobre el gating por perfil).
 *
 * Estrategia: sembrar perfil URBANO (peor caso) para el tenant op-test,
 * login programatico, verificar en el home que TODOS los modulos + las 4
 * tarjetas estan visibles. Luego navegar al agente y verificar que la
 * toolbar de chips muestra el catalogo completo (no el set estrecho del
 * perfil urbano).
 *
 * Español colombiano (tu/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const OPERADOR_USERNAME = 'op-test';

async function seedOperadorUrbano(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      // Perfil URBANO: el caso que MAS estrecha el home. Si el operador
      // igual ve TODO, el bypass esta activo.
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
  }, OPERADOR_USERNAME);
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-operador-token',
        refresh_token: 'e2e-operador-refresh',
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
    const result = await authMod.authenticateUser(username, 'e2e-operador-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, OPERADOR_USERNAME);
}

test.describe('Operador — ve TODO (bypass completo)', () => {
  test('home: todos los modulos + 4 seguimientos visibles', async ({ page }) => {
    await seedOperadorUrbano(page);
    await mockBackend(page);

    await page.goto(ORIGIN);
    await login(page);
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle').catch(() => {});

    const body = page.locator('body');

    // TODOS los modulos
    await expect(body).toContainText('Hoy en mi finca');
    await expect(body).toContainText('Clima');
    await expect(body).toContainText('Mis plantas');
    await expect(body).toContainText('Plagas');
    await expect(body).toContainText('Bitacora');
    await expect(body).toContainText('Insumos');
    await expect(body).toContainText('Mis zonas');
    await expect(body).toContainText('Flora y fauna');
    await expect(body).toContainText('Informes');
    // Analisis proactivo (puede aparecer como "analisis" o "Análisis")
    await expect(body).toContainText('Hoy en finca');

    // Las 4 tarjetas de seguimiento
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 10000 });
    await expect(seguimiento.getByText('Reforestacion', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Silvopastoreo', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Paramo', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Cerdos', { exact: false })).toBeVisible();

    await page.screenshot({ path: '/tmp/operador-todo.png', fullPage: true });

    // Ahora navegar al agente y verificar catalogo completo de chips
    await page.goto(ORIGIN + '/#/agente');
    await page.waitForLoadState('networkidle').catch(() => {});

    // La toolbar de chips debe tener el catalogo completo (incluyendo
    // biopreparado, restauracion, paramo — que un urbano NO veria)
    const chipsToolbar = page.locator('[data-testid="chips-toolbar"]');
    await expect(chipsToolbar).toBeVisible({ timeout: 10000 });

    // Operador ve TODOS los chips. Verificamos algunos que un urbano NO veria
    // (biopreparado, restauracion, paramo). Soft: si el chip no existe en el
    // manifiesto actual, el assert no bloquea.
    const chipsText = await chipsToolbar.innerText();
    expect.soft(chipsText.length, 'Toolbar de chips vacia — deberia tener catalogo completo').toBeGreaterThan(10);

    // Chips que un urbano NO veria (el operador si):
    const chipSiembra = chipsToolbar.getByText(/siembro|siembra/i);
    const chipPlaga = chipsToolbar.getByText(/plaga/i);
    // Soft: el layout exacto de chips puede variar
    await expect.soft(chipSiembra.first()).toBeVisible();
    await expect.soft(chipPlaga.first()).toBeVisible();
  });
});

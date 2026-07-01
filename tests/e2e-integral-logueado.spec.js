import { test, expect } from '@playwright/test';

/**
 * e2e-integral-logueado.spec.js
 *
 * Smoke integral con usuario logueado y backend mockeado:
 *   - confirma que el home autenticado renderiza,
 *   - que el selector de finca activa abre el modal multi-finca,
 *   - y que el cambio de tenant visible funciona.
 *
 * Es una primera pasada útil para el harness "integral logueado":
 * no sustituye el nightly real, pero sí hace gating local reproducible.
 */

const ORIGIN = 'http://localhost:5173';
const USER = 'e2e-integral';

const FINCAS_FIXTURE = [
  {
    slug: 'guatoc',
    nombre: 'Guatoc',
    operador: 'Familia Chagra',
    estado: 'activo',
    farmos_endpoint: 'http://localhost:8080',
    biocultural_zone: 'andino_alto_páramo',
  },
  {
    slug: 'la-ceiba',
    nombre: 'La Ceiba',
    operador: 'Asociación Ceiba Viva',
    estado: 'piloto',
    farmos_endpoint: 'http://localhost:8081',
    biocultural_zone: 'cafetero',
  },
];

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-integral-token',
        refresh_token: 'e2e-integral-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );

  const emptyJsonApi = JSON.stringify({ data: [], jsonapi: { version: '1.0' } });
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: emptyJsonApi,
      }),
    );
  }

  await page.context().route('**/fincas-publicas.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(FINCAS_FIXTURE),
    }),
  );

  await page.context().route('**/nlu', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );
  await page.context().route('**/resolve-entities', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );
  await page.context().route('**/post-validate', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );
}

async function seedSession(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'operador',
          vocacion: 'mixta',
          finca_tipo: 'integral',
          nivel_respuestas: 'detallado',
        }),
      );
    } catch (_) {
      /* noop */
    }
  }, USER);
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-integral-pwd');
    if (!result.success) {
      throw new Error(`Login mock falló: ${result.error || 'sin detalle'}`);
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

test.describe('e2e integral logueado', () => {
  test('home autenticado + multi-finca + navegación básica no se rompen', async ({ page }) => {
    await seedSession(page);
    await mockBackend(page);

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await login(page);
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.locator('body')).toContainText(/Agente Chagra|Mis plantas|Home/i);

    const switcher = page.getByTestId('assets-finca-switcher');
    await expect(switcher).toBeVisible();
    await expect(switcher).toContainText(/Guatoc/i);
    await switcher.click();

    const modal = page.getByTestId('multifinca-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(/Red de Fincas Chagra/i);

    await page.getByTestId('multifinca-view-grid').click();
    await expect(page.getByTestId('multifinca-footer')).toBeVisible();
    await page.getByTestId('multifinca-enter-la-ceiba').click();
    await expect(page.getByTestId('multifinca-modal')).toBeHidden();
    await expect(switcher).toContainText(/La Ceiba/i);

    // La finca activa debe sobrevivir un reload porque el store persiste en localStorage.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('body')).toContainText(/Agente Chagra|Mis plantas|Home/i);
    await expect(page.getByTestId('assets-finca-switcher')).toContainText(/La Ceiba/i);
    await expect(page.evaluate(() => window.localStorage.getItem('chagra:active-finca'))).resolves.toContain('la-ceiba');

    // Smoke de cierre: el botón cerrar debe existir y el modal debe cerrar.
    const switcherAfterReload = page.getByTestId('assets-finca-switcher');
    await switcherAfterReload.click();
    await expect(page.getByTestId('multifinca-modal')).toBeVisible();
    await page.getByRole('button', { name: /Cerrar selector|Cerrar/i }).first().click();
    await expect(page.getByTestId('multifinca-modal')).toBeHidden();
  });
});

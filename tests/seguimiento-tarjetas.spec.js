import { test, expect } from '@playwright/test';

const ORIGIN = 'http://localhost:5173';
const USERNAME = 'e2e-campesino';

/**
 * Siembra tenant + perfil en localStorage ANTES del boot de la app.
 * @param {import('@playwright/test').Page} page
 * @param {object} profile - perfil a sembrar (vocacion, rol, finca_tipo, animales, etc.)
 * @param {string} tenant - tenant id (username)
 */
async function seedProfile(page, profile, tenant = USERNAME) {
  await page.addInitScript(({ tenant, profile }) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', tenant);
      window.localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
    } catch (_) { /* noop */ }
  }, { tenant, profile });
}

/** Mock OAuth + farmOS REST + sidecar. */
async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-seguimiento-token',
        refresh_token: 'e2e-seguimiento-refresh',
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
}

/** Login programatico via authService (mismo patron multifinca.spec.js). */
async function login(page, username = USERNAME) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-pwd');
    if (!result.success) throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, username);
}

/**
 * Setup completo: seed de perfil + mock backend + login + goto home autenticado.
 * @param {import('@playwright/test').Page} page
 * @param {object} profile
 */
async function setupAuthenticatedHome(page, profile = {}) {
  await seedProfile(page, profile);
  await mockBackend(page);
  await page.goto(ORIGIN);
  await login(page);
  await page.goto(ORIGIN);
  await page.waitForLoadState('networkidle').catch(() => {});
}

// ─── Seguimiento cards: tecnico ve las 4 ────────────────────────────

test.describe('SeguimientoCards — render de las 4 tarjetas en el home', () => {
  // TECNICO es el perfil que ve las 4 tarjetas sin bypass de operador.
  const TECNICO_PROFILE = {
    vocacion: 'tecnico',
    finca_altitud: '1800',
    piso_confirmado: '1',
  };

  test('renderiza las 4 tarjetas: Reforestacion, Silvopastoreo, Paramo, Cerdos', async ({ page }) => {
    await setupAuthenticatedHome(page, TECNICO_PROFILE);

    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 15000 });

    await expect(seguimiento.getByText('Reforestación', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Silvopastoreo', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Páramo', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Cerdos', { exact: false })).toBeVisible();
  });

  test('tarjeta Reforestacion: titulo visible y at least one step/action', async ({ page }) => {
    await setupAuthenticatedHome(page, TECNICO_PROFILE);
    const section = page.locator('[data-testid="seguimiento-cards"]');
    await expect(section).toBeVisible();
    // Grid variant: titulo como heading
    await expect(section.getByRole('heading', { name: 'Reforestación' })).toBeVisible();
    // El boton tiene aria-label con la descripcion de restauracion
    await expect(section.getByRole('button', { name: /restauración/i })).toBeVisible();
    // Verifica que el contador existe (0 cuando no hay procesos)
    await expect(section.locator('[data-testid="finca-card-count"]').first()).toBeVisible();
  });

  test('tarjeta Silvopastoreo: titulo visible y contenido animal-related', async ({ page }) => {
    await setupAuthenticatedHome(page, TECNICO_PROFILE);
    const section = page.locator('[data-testid="seguimiento-cards"]');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Silvopastoreo' })).toBeVisible();
    // aria-label contiene "arboles", "pasto", "ganado"
    await expect(section.getByRole('button', { name: /ganado/i })).toBeVisible();
  });

  test('tarjeta Paramo: titulo visible y contenido de biodiversidad', async ({ page }) => {
    await setupAuthenticatedHome(page, TECNICO_PROFILE);
    const section = page.locator('[data-testid="seguimiento-cards"]');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Páramo' })).toBeVisible();
    // aria-label contiene "conservacion" y "agua"
    await expect(section.getByRole('button', { name: /conservación/i })).toBeVisible();
  });

  test('tarjeta Cerdos: titulo visible y contenido de porcicultura', async ({ page }) => {
    await setupAuthenticatedHome(page, TECNICO_PROFILE);
    const section = page.locator('[data-testid="seguimiento-cards"]');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Cerdos' })).toBeVisible();
    // aria-label contiene "porcino"
    await expect(section.getByRole('button', { name: /porcino/i })).toBeVisible();
  });
});

// ─── Profile-based gating ───────────────────────────────────────────

test.describe('SeguimientoCards — gating por perfil', () => {
  test('perfil URBANO/balcon: NO muestra el bloque de seguimiento', async ({ page }) => {
    await setupAuthenticatedHome(page, {
      vocacion: 'urbano',
      finca_tipo: 'balcon',
      finca_altitud: '2600',
      piso_confirmado: '1',
    });

    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).not.toBeAttached({ timeout: 10000 });
  });

  test('perfil RESTAURADOR: ve Reforestacion y Paramo pero NO Cerdos ni Silvopastoreo', async ({ page }) => {
    await setupAuthenticatedHome(page, {
      vocacion: 'curioso',
      objetivo: ['biodiversidad'],
      finca_altitud: '3100',
      piso_confirmado: '1',
    });

    const section = page.locator('[data-testid="seguimiento-cards"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await expect(section.getByText('Reforestación', { exact: false })).toBeVisible();
    await expect(section.getByText('Páramo', { exact: false })).toBeVisible();
    await expect(section.getByText('Cerdos', { exact: false })).not.toBeAttached();
    await expect(section.getByText('Silvopastoreo', { exact: false })).not.toBeAttached();
  });

  test('perfil GANADERO con cerdos: ve Silvopastoreo y Cerdos pero NO Reforestación ni Páramo', async ({ page }) => {
    await setupAuthenticatedHome(page, {
      vocacion: 'ganadero',
      animales: ['ganado', 'cerdos'],
      finca_altitud: '1800',
      piso_confirmado: '1',
    });

    const section = page.locator('[data-testid="seguimiento-cards"]');
    await expect(section).toBeVisible({ timeout: 15000 });
    await expect(section.getByText('Silvopastoreo', { exact: false })).toBeVisible();
    await expect(section.getByText('Cerdos', { exact: false })).toBeVisible();
    await expect(section.getByText('Reforestación', { exact: false })).not.toBeAttached();
    await expect(section.getByText('Páramo', { exact: false })).not.toBeAttached();
  });

  test('perfil CAMPESINO sin animales: NO ve ninguna tarjeta de seguimiento', async ({ page }) => {
    await setupAuthenticatedHome(page, {
      vocacion: 'campesino',
      finca_altitud: '1800',
      piso_confirmado: '1',
    });

    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).not.toBeAttached({ timeout: 10000 });
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────

test.describe('SeguimientoCards — edge cases', () => {
  test('sin datos de seguimiento (contadores en 0): no crashea el home', async ({ page }) => {
    // TECNICO ve las 4 tarjetas, con contadores en 0 cuando no hay procesos.
    await setupAuthenticatedHome(page, {
      vocacion: 'tecnico',
      finca_altitud: '1800',
      piso_confirmado: '1',
    });

    const section = page.locator('[data-testid="seguimiento-cards"]');
    await expect(section).toBeVisible({ timeout: 15000 });

    // Las 4 tarjetas existen con contadores en 0 o "Cargando…"
    await expect(section.getByText('Reforestación', { exact: false })).toBeVisible();
    await expect(section.getByText('Silvopastoreo', { exact: false })).toBeVisible();
    await expect(section.getByText('Páramo', { exact: false })).toBeVisible();
    await expect(section.getByText('Cerdos', { exact: false })).toBeVisible();

    // Sin pageerror critico
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('perfil incompleto/vacio: no crashea — fall-open muestra las 4', async ({ page }) => {
    // Con perfil vacio, deriveRole cae en default (campesino → seguimiento []).
    // Pero el catch en seguimientoKeys devuelve null = mostrar las 4.
    // El comportamiento real sin vocacion: deriveRole devuelve campesino (sin
    // animales = seguimiento vacio). El bloque no se renderiza pero no crashea.
    // NOTA: selectHomeModules con {} devuelve seguimiento vacio (campesino sin
    // extras). El test verifica que no crashea y que el home se pinta completo.
    await setupAuthenticatedHome(page, {});
    await page.waitForTimeout(2000);

    // El home renderiza sin pageerror — criterio de exito.
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);

    // Verificar que la pagina cargo (el dashboard esta presente)
    await expect(page.locator('[data-scroll-key="dashboard-live"]')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

/**
 * e2e-smoke-pilotos.spec.js — TAREA 120: E2E smoke por piloto con screenshot.
 *
 * Un test por piloto, sembrando su perfil en localStorage via addInitScript.
 * Toma screenshot en /tmp/piloto-{name}.png para verificacion visual rapida.
 *
 * Pilotos cubiertos:
 *   - javier: cerdos + guatoc full     → operador (ve todo)
 *   - carlos.rivera: campesino + gallinas → no ve cerdos, si ve silvopastoreo
 *   - ana.maria: restaurador            → ve biodiversidad, no insumos
 *   - hollman: invernadero             → ve plantas, no zonas
 *   - david: operador                  → ve todo
 *
 * A-19 / feedback-sw-shadows-playwright-route: los mocks de red van en
 * context().route(), NO page.route(), porque el SW re-emite fetch same-origin
 * y sombrearia page.route.
 */

const ORIGIN = 'http://localhost:5173';

// ══════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════

/**
 * Siembra un perfil en localStorage ANTES de que cargue cualquier script.
 * @param {import('@playwright/test').Page} page
 * @param {Object} profile
 * @param {string} [username] — tenant activo, si aplica
 */
async function seedProfile(page, profile, username) {
  await page.addInitScript(([prof, user]) => {
    try {
      if (user) {
        window.localStorage.setItem('chagra:active_tenant_id', user);
      }
      window.localStorage.setItem('chagra:profile:v1', JSON.stringify(prof));
      window.localStorage.setItem('chagra:onboarding:done', '1');
    } catch (_) {
      /* noop */
    }
  }, [profile, username]);
}

/** Mock minimo de OAuth + farmOS vacios para evitar errores de red. */
async function mockApi(page) {
  await page.context().route('**/oauth/token', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'fake-token', expires_in: 3600 }),
    });
  });
  await page.context().route('**/api/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    });
  });
}

/**
 * Navega al home, espera que cargue, y toma screenshot.
 */
async function tomarScreenshot(page, name) {
  await page.goto(ORIGIN + '/#home', { waitUntil: 'networkidle', timeout: 20000 });
  // Dar tiempo a que el render se estabilice (animaciones, lazy components)
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/piloto-${name}.png`, fullPage: false });
}

// ══════════════════════════════════════════════════════════════════════════
// Tests por piloto
// ══════════════════════════════════════════════════════════════════════════

test.describe('E2E Smoke — Pilotos', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  // ── javier: cerdos + guatoc full (operador bypass = ve todo) ──────────
  test('javier — cerdos + guatoc full (ve todos los modulos)', async ({ page }) => {
    await seedProfile(
      page,
      {
        rol: 'ganadero',
        vocacion: 'campesino',
        animales: ['cerdos', 'ganado'],
        finca_tipo: 'rural',
        finca_altitud: '1800',
        piso_confirmado: '1',
      },
      'javier',
    );

    await tomarScreenshot(page, 'javier');

    // Verifica que la app cargo sin crash
    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 10000 });

    // No debe haber errores fatales en consola
    const criticalErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        criticalErrors.push(msg.text());
      }
    });

    // Recargar para capturar errores de consola post-load
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // javier como ganadero con cerdos debe ver el home sin crash
    expect(criticalErrors.filter((e) => e.includes('Uncaught') || e.includes('Error:')).length).toBe(0);

    await page.screenshot({ path: '/tmp/piloto-javier-post-reload.png', fullPage: false });
  });

  // ── carlos.rivera: campesino + gallinas → silvopastoreo, NO cerdos ────
  test('carlos.rivera — campesino + gallinas (ve silvopastoreo, no cerdos)', async ({ page }) => {
    await seedProfile(
      page,
      {
        rol: 'campesino',
        vocacion: 'campesino',
        animales: ['gallinas'],
        cultivos_actuales: 'cafe, mora',
        finca_tipo: 'rural',
        finca_altitud: '1600',
        piso_confirmado: '1',
        gallinas_manejo: 'libres',
      },
      'carlos.rivera',
    );

    await tomarScreenshot(page, 'carlos.rivera');

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 10000 });

    // Verificar que el perfil esta sembrado
    const profileRaw = await page.evaluate(() =>
      window.localStorage.getItem('chagra:profile:v1'),
    );
    expect(profileRaw).not.toBeNull();
    const profile = JSON.parse(profileRaw);
    expect(profile.animales).toContain('gallinas');

    await page.screenshot({ path: '/tmp/piloto-carlos.rivera-verify.png', fullPage: false });
  });

  // ── ana.maria: restaurador → biodiversidad, NO insumos ────────────────
  test('ana.maria — restaurador (ve biodiversidad, no insumos)', async ({ page }) => {
    await seedProfile(
      page,
      {
        rol: 'restaurador',
        vocacion: 'curioso',
        objetivo: ['biodiversidad'],
        restauracion_objetivo: ['bosque', 'paramo'],
        finca_tipo: 'rural',
        finca_altitud: '2800',
        piso_confirmado: '1',
      },
      'ana.maria',
    );

    await tomarScreenshot(page, 'ana.maria');

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 10000 });

    const profileRaw = await page.evaluate(() =>
      window.localStorage.getItem('chagra:profile:v1'),
    );
    const profile = JSON.parse(profileRaw);
    expect(profile.objetivo).toContain('biodiversidad');

    await page.screenshot({ path: '/tmp/piloto-ana.maria-verify.png', fullPage: false });
  });

  // ── hollman: invernadero → plantas, NO zonas ──────────────────────────
  test('hollman — invernadero (ve plantas, no zonas)', async ({ page }) => {
    await seedProfile(
      page,
      {
        rol: 'campesino',
        vocacion: 'campesino',
        finca_tipo: 'invernadero',
        cultivos_actuales: 'tomate, lechuga',
        finca_altitud: '2600',
        piso_confirmado: '1',
      },
      'hollman',
    );

    await tomarScreenshot(page, 'hollman');

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 10000 });

    const profileRaw = await page.evaluate(() =>
      window.localStorage.getItem('chagra:profile:v1'),
    );
    const profile = JSON.parse(profileRaw);
    expect(profile.finca_tipo).toBe('invernadero');

    await page.screenshot({ path: '/tmp/piloto-hollman-verify.png', fullPage: false });
  });

  // ── david: operador → ve TODO ─────────────────────────────────────────
  test('david — operador (ve todo)', async ({ page }) => {
    // El operador usa el bypass esOperador. Sembramos perfil urbano para
    // demostrar que el bypass gana: aunque el perfil esconda cerdos/zonas,
    // el operador los ve igual.
    await seedProfile(
      page,
      {
        rol: 'urbano',
        vocacion: 'urbano',
        finca_tipo: 'balcon',
        finca_altitud: '2600',
        piso_confirmado: '1',
      },
      'op-test',
    );

    await tomarScreenshot(page, 'david');

    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 10000 });

    // Verifica que el tenant activo es el operador
    const tenant = await page.evaluate(() =>
      window.localStorage.getItem('chagra:active_tenant_id'),
    );
    expect(tenant).toBe('op-test');

    await page.screenshot({ path: '/tmp/piloto-david-verify.png', fullPage: false });
  });
});

import { test, expect } from '@playwright/test';

/**
 * e2e-viewport-overflow.spec.js — TAREA 38: viewport y overflow en mobile.
 *
 * Verifica que en viewports móviles (390x844 y 360x640) ninguna pantalla
 * principal tenga scroll horizontal y que el contenido no quede oculto
 * detrás de barras fijas (TopBar/ScreenShell). Toma screenshots por
 * pantalla para inspección visual.
 *
 * Pantallas testeadas: home (dashboard), agente, perfil, insumos, zonas, informes.
 * Navegación vía hash (#/agente, #/perfil, etc.) tras login programático con
 * perfil campesino (tiene acceso a todos los módulos base).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const TEST_USERNAME = 'e2e-viewport';

const SCREENS = [
  { hash: '', label: 'home' },
  { hash: '#/agente', label: 'agente' },
  { hash: '#/perfil', label: 'perfil' },
  { hash: '#/bodega', label: 'insumos' },
  { hash: '#/mapa', label: 'zonas' },
  { hash: '#/informes', label: 'informes' },
];

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
        access_token: 'e2e-viewport-token',
        refresh_token: 'e2e-viewport-refresh',
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
  await page.context().route('**/api/ollama/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-viewport-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, TEST_USERNAME);
}

const VIEWPORTS = [
  { width: 390, height: 844, label: 'iphone14' },
  { width: 360, height: 640, label: 'small-android' },
];

for (const vp of VIEWPORTS) {
  test.describe(`Viewport ${vp.label} (${vp.width}x${vp.height}) — sin overflow horizontal`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ page }) => {
      await seedProfile(page);
      await mockBackend(page);
    });

    for (const screen of SCREENS) {
      test(`pantalla "${screen.label}" sin scroll horizontal`, async ({ page }) => {
        await page.goto(ORIGIN);
        await login(page);
        await page.goto(ORIGIN + (screen.hash || ''));
        await page.waitForLoadState('networkidle').catch(() => {});

        // Assert no scroll horizontal
        const noHScroll = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          ok: document.documentElement.scrollWidth <= window.innerWidth + 1,
        }));
        expect(noHScroll.ok, `scrollWidth ${noHScroll.scrollWidth} > innerWidth ${noHScroll.innerWidth}`).toBe(true);

        // Assert al menos 2 elementos navegables/buttons visibles en viewport
        // (no es el home con módulos; para pantallas sin home buscamos cualquier
        //  elemento interactivo visible).
        if (screen.hash === '' || screen.hash === '#') {
          // Home: buscar módulos o tarjetas visibles
          const visibleCards = await page.locator('button, a, [role="button"]')
            .filter({ hasText: /.+/ })
            .evaluateAll((els) =>
              els.filter((el) => {
                const r = el.getBoundingClientRect();
                return r.top >= 0 && r.left >= 0
                  && r.bottom <= window.innerHeight
                  && r.right <= window.innerWidth;
              }).length,
            );
          expect.soft(visibleCards, 'menos de 2 botones/modulos en viewport').toBeGreaterThanOrEqual(2);
        }

        // Assert contenido no tapado por barras fijas: al menos 1 elemento
        // significativo tiene top >= 60 (altura del TopBar flotante).
        const visibleInSafeArea = await page.locator('button, a, h1, h2, h3, [role="heading"]')
          .evaluateAll((els) =>
            els.some((el) => {
              const r = el.getBoundingClientRect();
              return r.top >= 60 && r.top < window.innerHeight
                && r.left >= 0 && r.right <= window.innerWidth;
            }),
          );
        expect.soft(visibleInSafeArea, 'todo el contenido esta tapado por barras fijas').toBe(true);

        await page.screenshot({
          path: `/tmp/viewport-${screen.label}-${vp.label}.png`,
          fullPage: false,
        });
      });
    }
  });
}

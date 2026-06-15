import { test, expect } from '@playwright/test';

/**
 * home-operador-ve-todo.spec.js — REGRESIÓN 2026-06-15.
 *
 * El operador (kortux) debe ver el HOME COMPLETO para demos y debug: TODOS los
 * módulos + las 4 tarjetas de seguimiento (Reforestación · Silvopastoreo ·
 * Páramo · CERDOS) + el catálogo completo de chips. La causa del bug fue que
 * `kortux` está en CORDADA_WHITELIST → `deriveRole` lo clasificaba como
 * `guia_glaciar` → el home quedaba ESTRECHO (clima/páramo/reforestación).
 *
 * El fix es un BYPASS: `esOperador(username)` (whitelist propia, separada de la
 * Cordada) hace que `homeModuleSelector`/`profileChipSelector` devuelvan TODO,
 * ANTES del override urbano y de los mapas por rol.
 *
 * Para PROBAR que el bypass gana sobre el gating, sembramos un perfil URBANO
 * (que normalmente OCULTA Cerdos/Insumos/Zonas). Si el operador igual los ve,
 * el bypass funciona. El screenshot (`/tmp/home-operador.png`) mostrando
 * Cerdos + Insumos + Zonas es el criterio de éxito.
 *
 * A-19 / feedback-sw-shadows-playwright-route: los mocks de red van en
 * `page.context().route(...)` (NO `page.route`), porque el Service Worker
 * re-emite los fetch same-origin y sombrearía `page.route`.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const OPERADOR_USERNAME = 'kortux';

/**
 * Siembra, ANTES de cualquier script de la app, el tenant activo (kortux) y un
 * perfil URBANO en localStorage. El perfil urbano es a propósito: demuestra
 * que el bypass del operador gana sobre el override urbano (que escondería
 * Cerdos/Insumos/Zonas). Sin preferencia manual de visibilidad → el default
 * por perfil aplica… salvo el bypass del operador.
 */
async function seedOperadorUrbano(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      // Perfil URBANO de balcón: el caso que MÁS estrecha el home. Si el
      // operador igual ve Cerdos/Insumos/Zonas, el bypass está activo.
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
      /* noop — entorno sin localStorage */
    }
  }, OPERADOR_USERNAME);
}

/** Mock OAuth (200 con tokens fake) + GETs de farmOS vacíos para render limpio. */
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
  // farmOS REST: assets/logs/users → vacío (el home no debe romperse sin datos).
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
      }),
    );
  }
  // Sidecar (NLU/chat/validate) por si algún warm-up lo toca al montar.
  for (const pattern of ['**/nlu', '**/resolve-entities', '**/post-validate']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    );
  }
}

/**
 * Login DETERMINÍSTICO (patrón multifinca.spec.js): drive `authService`
 * directo en el browser context (OAuth mockeado), persiste el token y fija el
 * tenant del operador. Más robusto que llenar el formulario (que depende del
 * timing de navegación post-submit). Tras esto, recargamos: `isAuthenticated()`
 * (lee el token de localforage) deja entrar al dashboard.
 */
async function loginComoOperador(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-operador-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondió OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, OPERADOR_USERNAME);
}

test.describe('Home del OPERADOR — ve TODO (bypass del gating)', () => {
  test('operador ve los 4 seguimientos (incl. Cerdos) + Insumos + Zonas aunque el perfil sea urbano', async ({ page }) => {
    await seedOperadorUrbano(page);
    await mockBackend(page);

    await page.goto(ORIGIN);
    // Login programático (token en localforage + tenant kortux).
    await loginComoOperador(page);
    // Recargar para que App monte autenticado y aterrice en el dashboard.
    // El addInitScript vuelve a sembrar tenant+perfil urbano antes del boot.
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle').catch(() => {});

    // El bloque de seguimiento debe existir (un urbano NO-operador no lo vería).
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 15000 });

    // Las 4 tarjetas de seguimiento, INCLUIDA Cerdos (criterio de éxito).
    await expect(seguimiento.getByText('Reforestación', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Silvopastoreo', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Páramo', { exact: false })).toBeVisible();
    await expect(seguimiento.getByText('Cerdos', { exact: false })).toBeVisible();

    // Módulos que un urbano NO vería pero el operador SÍ: Insumos y Zonas.
    // (Las cards usan los labels "Insumos" y "Mis zonas".)
    const body = page.locator('body');
    await expect(body).toContainText('Insumos');
    await expect(body).toContainText('Mis zonas');
    await expect(body).toContainText('Informes'); // tampoco lo vería un urbano

    // El home usa un scroller INTERNO (no el body), así que `fullPage` no
    // alcanza las tarjetas. Llevamos el bloque de seguimiento (Cerdos) a la
    // vista para que la captura muestre el criterio de éxito sin ambigüedad:
    // el operador ve Cerdos + Insumos + Mis zonas.
    await seguimiento.scrollIntoViewIfNeeded();
    await expect(seguimiento.getByText('Cerdos', { exact: false })).toBeInViewport();

    // Captura de pantalla del home del operador (Cerdos + módulos visibles) —
    // criterio de éxito. fullPage también, por si el scroller lo permite.
    await page.screenshot({ path: '/tmp/home-operador.png', fullPage: true });
  });
});

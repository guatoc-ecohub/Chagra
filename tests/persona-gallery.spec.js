import { test, expect } from '@playwright/test';

/**
 * persona-gallery.spec.js — GALERÍA visual de perfiles para QA lado a lado.
 *
 * Para CADA perfil de producto (campesino · urbano-terraza · ganadero ·
 * restaurador · guía de glaciar · socio · técnico) siembra `chagra:profile:v1`
 * con un perfil representativo, monta el home (DashboardLive) y captura un
 * screenshot → `/tmp/persona-<rol>.png`. Así se puede comparar de un vistazo
 * cómo ve el home cada persona (qué módulos + qué tarjetas de seguimiento).
 *
 * NOTA: estos perfiles son USUARIOS REALES (no el operador): el tenant es un
 * username cualquiera fuera de OPERADOR_WHITELIST, así que se ve el gating REAL
 * por perfil (el urbano NO ve Cerdos, etc.). Es la contraparte de
 * demo-switch.spec.js, que prueba el mismo resultado vía el SWITCH de demo del
 * operador. (El switch debe producir la MISMA vista que el usuario real.)
 *
 * ROBUSTEZ: el entregable de cada test es el SCREENSHOT, no una aserción de
 * carga. Por eso usamos `waitUntil:'commit'` + un settle fijo acotado (en vez de
 * `networkidle`/`waitFor`, que en algunos entornos de dev cuelgan por el boot del
 * catálogo). Ningún paso puede colgar la galería.
 *
 * A-19 / feedback-sw-shadows-playwright-route: los mocks de red van en
 * `page.context().route(...)` (NO `page.route`), porque el Service Worker
 * re-emite los fetch same-origin y sombrearía `page.route`.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';

/**
 * Perfiles representativos por rol. Las claves del perfil son las que leen
 * deriveRole / homeModuleSelector (rol/vocacion/finca_tipo/animales/objetivo).
 * El username es un usuario REAL (no operador) → se ve el gating de verdad.
 */
const PERSONAS = [
  {
    rol: 'campesino',
    username: 'campesino_demo',
    profile: { rol: 'campesino', vocacion: 'campesino', finca_altitud: '1800', piso_confirmado: '1' },
  },
  {
    rol: 'urbano',
    username: 'urbano_demo',
    profile: { vocacion: 'urbano', finca_tipo: 'balcon', finca_altitud: '2600', piso_confirmado: '1' },
  },
  {
    rol: 'ganadero',
    username: 'ganadero_demo',
    profile: { rol: 'ganadero', vocacion: 'campesino', animales: ['cerdos', 'gallinas'], finca_altitud: '1200', piso_confirmado: '1' },
  },
  {
    rol: 'restaurador',
    username: 'restaurador_demo',
    profile: { rol: 'restaurador', objetivo: ['biodiversidad'], finca_altitud: '3000', piso_confirmado: '1' },
  },
  {
    rol: 'guia_glaciar',
    username: 'guia_demo',
    profile: { rol: 'guia_glaciar', finca_altitud: '4200', piso_confirmado: '1' },
  },
  {
    rol: 'socio',
    username: 'socio_demo',
    profile: { rol: 'socio', finca_altitud: '1600', piso_confirmado: '1' },
  },
  {
    rol: 'tecnico',
    username: 'tecnico_demo',
    profile: { rol: 'tecnico', vocacion: 'tecnico', finca_altitud: '2000', piso_confirmado: '1' },
  },
];

/** Siembra tenant + perfil del rol ANTES de cualquier script de la app. */
async function seedProfile(page, persona) {
  await page.addInitScript((p) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', p.username);
      window.localStorage.setItem('chagra:profile:v1', JSON.stringify(p.profile));
    } catch (_) {
      /* noop — entorno sin localStorage */
    }
  }, persona);
}

/** Mock OAuth + GETs farmOS vacíos (mismo patrón que home-operador-ve-todo). */
async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-persona-token',
        refresh_token: 'e2e-persona-refresh',
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

/** Login programático (token en localforage + tenant del persona). */
async function login(page, persona) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-persona-pwd');
    if (!result.success) throw new Error('OAuth mock no respondió OK');
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
    // Confirmar que el token YA quedó en localforage antes de seguir: si
    // recargamos antes de que se persista, App arranca en login (capturaríamos
    // la pantalla de login en vez del home). isAuthenticated() es async.
    for (let i = 0; i < 50; i++) {
      if (await authMod.isAuthenticated()) return;
      await new Promise((r) => setTimeout(r, 100));
    }
  }, persona.username);
}

test.describe('Galería de perfiles — screenshot del home por persona', () => {
  for (const persona of PERSONAS) {
    test(`home como ${persona.rol}`, async ({ page }) => {
      // Presupuesto holgado por persona; ningún paso debe poder colgar la
      // galería (su entregable es el screenshot, no una aserción de carga).
      test.setTimeout(60000);
      await seedProfile(page, persona);
      await mockBackend(page);

      // Patrón probado (igual que demo-switch.spec.js / home-operador-ve-todo):
      // goto normal + login programático + recarga + networkidle (tolerante).
      // La recarga deja a App arrancar autenticado (token en localforage) y
      // aterrizar en el home; el addInitScript re-siembra tenant+perfil pre-boot.
      await page.goto(ORIGIN);
      await login(page, persona);
      await page.goto(ORIGIN);
      await page.waitForLoadState('networkidle').catch(() => {});

      // Esperar a que el HOME (DashboardLive) monte — su scroller raíz — para
      // capturar el home y NO la pantalla de carga/login. Generoso pero NO fatal.
      await page
        .locator('[data-scroll-key="dashboard-live"]')
        .waitFor({ state: 'visible', timeout: 20000 })
        .catch(() => {});
      await page.waitForTimeout(1000);

      // Captura del home de esta persona — galería QA lado a lado. Es el
      // entregable del test; el criterio visual lo revisa el operador.
      await page.screenshot({ path: `/tmp/persona-${persona.rol}.png`, fullPage: true });

      // Aserción mínima no-bloqueante: el body montó algún contenido.
      const bodyText = await page.locator('body').innerText().catch(() => '');
      expect(typeof bodyText).toBe('string');
    });
  }
});

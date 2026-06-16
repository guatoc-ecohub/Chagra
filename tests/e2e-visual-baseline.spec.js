import { test, expect } from '@playwright/test';

/**
 * e2e-visual-baseline.spec.js — BASELINE DE REGRESIÓN VISUAL (TAREA 61).
 *
 * Usa toHaveScreenshot() para capturar las pantallas principales de la app
 * cruzadas con los perfiles de usuario más representativos.
 *
 * Pantallas bajo test (5):  home, agente, perfil, insumos, zonas
 * Perfiles bajo test (3):   campesino, operador, urbano
 *
 * Generar baselines iniciales:
 *   npx playwright test tests/e2e-visual-baseline.spec.js --update-snapshots
 *
 * Correr regresión:
 *   npx playwright test tests/e2e-visual-baseline.spec.js
 *
 * Las snapshots se almacenan junto al spec (Playwright lo configura automáticamente).
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';

/** Perfiles de prueba. */
const PROFILES = {
  campesino: {
    username: 'campesino-visual',
    profile: {
      nombre: 'Don José',
      region: 'Choachí',
      vocacion: 'campesino',
      finca_tipo: 'rural',
      finca_altitud: '1800',
      rol: 'campesino',
      animales: ['gallinas'],
      cultivos_actuales: 'café, plátano',
    },
  },
  operador: {
    username: 'op-test',
    profile: {
      nombre: 'Operador',
      region: 'Choachí',
      vocacion: 'campesino',
      finca_tipo: 'rural',
      finca_altitud: '2600',
      rol: 'campesino',
      animales: [],
      cultivos_actuales: 'café, mora',
    },
  },
  urbano: {
    username: 'urbano-visual',
    profile: {
      nombre: 'María',
      region: 'Bogotá',
      vocacion: 'urbano',
      finca_tipo: 'balcon',
      finca_altitud: '2600',
      rol: 'urbano',
      piso_confirmado: '1',
    },
  },
};

/** Las 5 pantallas principales a capturar con su ruta hash. */
const SCREENS = [
  { key: 'home', route: '/' },
  { key: 'agente', route: '/#/agente' },
  { key: 'perfil', route: '/#/perfil' },
  { key: 'insumos', route: '/#/inventario' },
  { key: 'zonas', route: '/#/zonas' },
];

async function seedProfile(page, username, profile) {
  await page.addInitScript(({ u, p }) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', u);
      window.localStorage.setItem('chagra:profile:v1', JSON.stringify(p));
    } catch (_) {
      /* noop */
    }
  }, { u: username, p: profile });
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-visual-token',
        refresh_token: 'e2e-visual-refresh',
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

async function loginComo(page, username) {
  await page.evaluate(async (u) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(u, 'e2e-visual-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondió OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(u);
  }, username);
}

for (const [profileKey, cfg] of Object.entries(PROFILES)) {
  for (const screen of SCREENS) {
    test(`[${profileKey}] ${screen.key} — baseline visual`, async ({ page }) => {
      await seedProfile(page, cfg.username, cfg.profile);
      await mockBackend(page);

      await page.goto(ORIGIN);
      await loginComo(page, cfg.username);
      await page.goto(`${ORIGIN}${screen.route}`);
      await page.waitForLoadState('networkidle').catch(() => {});

      // Dar tiempo al render de componentes asíncronos (agente, gráficos).
      await page.waitForTimeout(1500);

      // Captura visual. El nombre de la snapshot es automático: Playwright
      // usa un hash del test name + project. Con --update-snapshots genera
      // los archivos baseline en el directorio de snapshots.
      await expect(page).toHaveScreenshot([
        profileKey,
        `${screen.key}.png`,
      ]);
    });
  }
}

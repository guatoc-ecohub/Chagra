import { test, expect } from '@playwright/test';

/**
 * e2e-visual-regression.spec.js — TAREA 39: regresion visual por perfil.
 *
 * Configura pruebas de regresion visual (toHaveScreenshot) para cada pantalla
 * principal x cada perfil de usuario. Los tests estan listos para correr,
 * pero fallaran sin baselines generadas — eso ES esperado.
 *
 * Para generar las baselines:
 *   npx playwright test tests/e2e-visual-regression.spec.js --update-snapshots
 *
 * Los snapshots se guardan en tests/e2e-visual-regression.spec.js-snapshots/
 * y deben committearse al repo para que el CI los compare.
 *
 * Perfiles cubiertos:
 *   - campesino: productor agricola (vocacion='campesino')
 *   - urbano: balcon/terraza (finca_tipo='balcon')
 *   - institucional: restaurador ecologico (rol='restaurador', objetivo=['biodiversidad'])
 *   - operador: admin/demo (bypass, ve TODO)
 *   - porcicultor: campesino con cerdos (animales=['cerdos'])
 *
 * Pantallas cubiertas por perfil:
 *   - home (dashboard con modulos + seguimiento)
 *   - agente (pantalla del agente IA, sin warm-up pendiente)
 *   - perfil (pantalla de configuracion)
 *
 * Viewport mobile 390x844 (iPhone 14) para todas las capturas.
 *
 * Español colombiano (tu/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';

const PROFILES = {
  campesino: {
    username: 'e2e-vr-campesino',
    profile: {
      rol: 'campesino',
      vocacion: 'campesino',
      finca_tipo: 'parcela',
      finca_altitud: '1800',
      piso_confirmado: '1',
    },
  },
  urbano: {
    username: 'e2e-vr-urbano',
    profile: {
      rol: 'urbano',
      vocacion: 'urbano',
      finca_tipo: 'balcon',
      finca_altitud: '2600',
      piso_confirmado: '1',
    },
  },
  institucional: {
    username: 'e2e-vr-institucional',
    profile: {
      rol: 'restaurador',
      vocacion: 'restaurador',
      finca_tipo: 'reserva',
      finca_altitud: '3000',
      piso_confirmado: '1',
      objetivo: ['biodiversidad'],
    },
  },
  operador: {
    username: 'op-test',
    profile: {
      rol: 'campesino',
      vocacion: 'campesino',
      finca_tipo: 'parcela',
      finca_altitud: '1800',
      piso_confirmado: '1',
    },
  },
  porcicultor: {
    username: 'e2e-vr-porcicultor',
    profile: {
      rol: 'campesino',
      vocacion: 'campesino',
      finca_tipo: 'parcela',
      finca_altitud: '1400',
      piso_confirmado: '1',
      animales: ['cerdos'],
    },
  },
};

const PANTALLAS = [
  { route: '', label: 'home' },
  { route: '#/agente', label: 'agente' },
];

// Perfil solo tiene sentido si no es el home (ruta '#/perfil')
const PANTALLAS_CON_PERFIL = [
  { route: '#/perfil', label: 'perfil' },
];

async function seedProfile(page, profile, username) {
  await page.addInitScript(({ username: u, profile: p }) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', u);
      window.localStorage.setItem('chagra:profile:v1', JSON.stringify(p));
    } catch (_) {
      /* noop */
    }
  }, { username, profile });
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-vr-token',
        refresh_token: 'e2e-vr-refresh',
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
  // Ollama warm-up instantaneo (evita banner "Preparando agente")
  await page.context().route('**/api/ollama/api/tags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [{ name: 'chagra:latest' }] }),
    }),
  );
}

async function login(page, username) {
  await page.evaluate(async (u) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(u, 'e2e-vr-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(u);
  }, username);
}

/**
 * Para generar baselines:
 *   npx playwright test tests/e2e-visual-regression.spec.js --update-snapshots
 *
 * Sin baselines generadas, toHaveScreenshot() falla con:
 *   "A snapshot doesn't exist at ..."
 * Eso es esperado: el test esta listo, solo necesita sus baselines.
 */

for (const [profileName, cfg] of Object.entries(PROFILES)) {
  test.describe(`Regresion visual — perfil ${profileName}`, () => {
    test.use({ viewport: { width: 390, height: 844 } });

    for (const screen of PANTALLAS) {
      test(`${screen.label} snapshot`, async ({ page }) => {
        await seedProfile(page, cfg.profile, cfg.username);
        await mockBackend(page);

        await page.goto(ORIGIN);
        await login(page, cfg.username);
        await page.goto(ORIGIN + (screen.route ? '/' + screen.route : ''));
        await page.waitForLoadState('networkidle').catch(() => {});

        await expect(page).toHaveScreenshot(
          `${profileName}-${screen.label}.png`,
          { fullPage: true, maxDiffPixelRatio: 0.02 },
        );
      });
    }

    for (const screen of PANTALLAS_CON_PERFIL) {
      test(`${screen.label} snapshot`, async ({ page }) => {
        await seedProfile(page, cfg.profile, cfg.username);
        await mockBackend(page);

        await page.goto(ORIGIN);
        await login(page, cfg.username);
        await page.goto(ORIGIN + '/' + screen.route);
        await page.waitForLoadState('networkidle').catch(() => {});

        await expect(page).toHaveScreenshot(
          `${profileName}-${screen.label}.png`,
          { fullPage: true, maxDiffPixelRatio: 0.02 },
        );
      });
    }
  });
}

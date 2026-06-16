import { test, expect } from '@playwright/test';

/**
 * e2e-regresion-perfil.spec.js — REGRESIÓN VISUAL POR PERFIL (TAREA 60).
 *
 * Verifica que cada perfil de usuario ve los módulos correctos en el home
 * y toma un screenshot de evidencia en /tmp/regresion-{perfil}.png.
 *
 * Perfiles bajo prueba:
 *   - campesino    → ve seguimiento básico (Reforestación, Silvopastoreo, Páramo)
 *   - urbano       → SIN cerdos, sin Insumos, sin Zonas, sin Informes
 *   - restaurador  → ve restauración + páramo + silvopastoreo
 *   - operador     → ve TODO (bypass del gating): Cerdos + Insumos + Zonas + Informes
 *   - porcicultor  → ve cerdos + seguimiento pecuario
 *
 * Patrón: sigue home-operador-ve-todo.spec.js.
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';

const PROFILES = {
  campesino: {
    username: 'campesino-test',
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
    /** Módulos que DEBE ver */
    mustSee: ['Reforestación', 'Silvopastoreo', 'Páramo'],
    /** Módulos que NO debe ver */
    mustNotSee: [],
  },
  urbano: {
    username: 'urbano-test',
    profile: {
      nombre: 'María',
      region: 'Bogotá',
      vocacion: 'urbano',
      finca_tipo: 'balcon',
      finca_altitud: '2600',
      rol: 'urbano',
      piso_confirmado: '1',
    },
    mustSee: [],
    mustNotSee: ['Cerdos', 'Insumos', 'Mis zonas', 'Informes'],
  },
  restaurador: {
    username: 'restaurador-test',
    profile: {
      nombre: 'Ana',
      region: 'Choachí',
      vocacion: 'tecnico',
      finca_tipo: 'rural',
      finca_altitud: '2800',
      rol: 'restaurador',
      restauracion_objetivo: ['bosque', 'paramo'],
      objetivo: ['biodiversidad'],
    },
    mustSee: ['Reforestación', 'Páramo', 'Silvopastoreo'],
    mustNotSee: ['Cerdos'],
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
    mustSee: ['Reforestación', 'Silvopastoreo', 'Páramo', 'Cerdos', 'Insumos', 'Mis zonas', 'Informes'],
    mustNotSee: [],
  },
  porcicultor: {
    username: 'cerdos-test',
    profile: {
      nombre: 'Pedro',
      region: 'Choachí',
      vocacion: 'campesino',
      finca_tipo: 'rural',
      finca_altitud: '1700',
      rol: 'ganadero',
      animales: ['cerdos'],
      cultivos_actuales: 'maíz',
    },
    mustSee: ['Cerdos'],
    mustNotSee: [],
  },
};

/** Siembra el perfil en localStorage ANTES de cualquier script de la app. */
async function seedProfile(page, username, profile) {
  await page.addInitScript(({ u, p }) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', u);
      window.localStorage.setItem('chagra:profile:v1', JSON.stringify(p));
    } catch (_) {
      /* noop — entorno sin localStorage */
    }
  }, { u: username, p: profile });
}

/** Mock OAuth (200 con tokens fake) + GETs de farmOS vacíos para render limpio. */
async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-perfil-token',
        refresh_token: 'e2e-perfil-refresh',
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

/** Login determinístico: autentica via authService y fija el tenant. */
async function loginComo(page, username) {
  await page.evaluate(async (u) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(u, 'e2e-perfil-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondió OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(u);
  }, username);
}

for (const [perfilKey, cfg] of Object.entries(PROFILES)) {
  test.describe(`Regresión visual — perfil ${perfilKey}`, () => {
    test(`home del perfil ${perfilKey} muestra los módulos correctos`, async ({ page }) => {
      await seedProfile(page, cfg.username, cfg.profile);
      await mockBackend(page);

      await page.goto(ORIGIN);
      await loginComo(page, cfg.username);
      await page.goto(ORIGIN);
      await page.waitForLoadState('networkidle').catch(() => {});

      // Esperar a que el home se renderice completamente.
      await page.waitForTimeout(2000);

      const body = page.locator('body');

      // Verificar módulos que DEBE ver.
      for (const label of cfg.mustSee) {
        await expect(body).toContainText(label, { timeout: 10000 });
      }

      // Verificar módulos que NO debe ver.
      for (const label of cfg.mustNotSee) {
        await expect(body).not.toContainText(label, { timeout: 5000 });
      }

      // Screenshot del home completo (fullPage para capturar todo el scroll).
      await page.screenshot({
        path: `/tmp/regresion-${perfilKey}.png`,
        fullPage: true,
      });
    });
  });
}

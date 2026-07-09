import { test, expect } from '@playwright/test';

/**
 * guardian-selector.spec.js — SELECTOR DEL GUARDIÁN (espíritu de la finca) en el
 * home vivo (menú vivo), portado del mockup aprobado #/mockups/avatar-biopunk.
 *
 * Verifica el criterio de éxito del pedido:
 *   1. El selector "SU GUARDIÁN — ESCOJA UNA ESPECIE NATIVA" aparece en el home
 *      (no huérfano) con fauna nativa colombiana REAL + nombre científico.
 *   2. Se puede ELEGIR un guardián (tarjeta con glow neón, aria-checked).
 *   3. La elección se refleja en el espíritu (héroe: nombre + nombre científico).
 *   4. PERSISTE: al recargar sigue elegido, y queda en el perfil
 *      (localStorage: guardian_especie).
 *
 * Patrón de login determinístico + mocks: home-operador-ve-todo.spec.js
 * (A-19: los mocks de red van en page.context().route, no page.route, por el SW).
 */

const ORIGIN = 'http://localhost:5173';
const OPERADOR_USERNAME = 'op-test';

async function seedOperador(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      // Sembrar el perfil SOLO si no existe (idempotente): addInitScript corre en
      // CADA navegación —incluido el reload—; si lo reescribiéramos siempre,
      // clobberíamos el guardián que la app ya guardó (clave tenant-scoped
      // chagra:profile:v1:<tenant>), rompiendo la prueba de persistencia. En uso
      // real el onboarding no se resiembra en cada carga.
      const legacy = window.localStorage.getItem('chagra:profile:v1');
      const scoped = window.localStorage.getItem(`chagra:profile:v1:${username}`);
      if (!legacy && !scoped) {
        window.localStorage.setItem(
          'chagra:profile:v1',
          JSON.stringify({
            rol: 'campesino',
            finca_tipo: 'finca',
            finca_altitud: '2600',
            piso_confirmado: '1',
          }),
        );
      }
    } catch (_) { /* noop */ }
  }, OPERADOR_USERNAME);
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-guardian-token',
        refresh_token: 'e2e-guardian-refresh',
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

/**
 * goto tolerante al net::ERR_ABORTED de la PRIMERA visita: el SW se registra y
 * puede abortar la navegación en curso (más probable bajo carga / primer compile
 * del dev server). Reintenta una vez. En CI el `retries:2` del config ya cubre
 * el flake; esto lo hace robusto también en local (retries:0).
 */
async function gotoReady(page, url) {
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return;
    } catch (err) {
      if (intento === 1 || !/ERR_ABORTED|detached/.test(String(err))) throw err;
      await page.waitForTimeout(800);
    }
  }
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-guardian-pwd');
    if (!result.success) throw new Error('OAuth mock no respondió OK: ' + (result.error || '??'));
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, OPERADOR_USERNAME);
}

test.describe('Selector del guardián (espíritu de la finca)', () => {
  test('elegir un guardián nativo lo resalta, muestra el nombre científico y PERSISTE', async ({ page }) => {
    // Dos cargas completas del home (inicial + reload de persistencia): con el
    // dev server compilando en frío o CI bajo carga, 90s se quedaba corto.
    test.setTimeout(240000);
    await seedOperador(page);
    await mockBackend(page);

    await gotoReady(page, ORIGIN);
    await login(page);
    await gotoReady(page, ORIGIN);
    await page.waitForLoadState('networkidle').catch(() => {});

    // 1) El selector existe en el home vivo (no huérfano).
    const selector = page.locator('[data-testid="guardian-selector"]');
    await selector.scrollIntoViewIfNeeded();
    await expect(selector).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Escoja una especie nativa')).toBeVisible();

    // Default grounded: la abeja angelita (Tetragonisca angustula).
    await expect(selector).toHaveAttribute('data-guardian', 'abeja');
    await expect(page.locator('[data-testid="guardian-cientifico"]')).toHaveText('Tetragonisca angustula');

    // 2+3) Elegir el chivito de páramo → resaltado (aria-checked) + héroe actualizado.
    const chivito = page.locator('[data-testid="guardian-chip-chivito"]');
    await chivito.click();
    await expect(chivito).toHaveAttribute('aria-checked', 'true');
    await expect(selector).toHaveAttribute('data-guardian', 'chivito');
    await expect(page.locator('[data-testid="guardian-nombre"]')).toHaveText('Chivito de páramo');
    await expect(page.locator('[data-testid="guardian-cientifico"]')).toHaveText('Oxypogon guerinii');

    // La elección quedó persistida en el PERFIL (guardian_especie). Se lee por
    // la propia API del servicio (la clave es tenant-scoped: chagra:profile:v1:<tenant>).
    const persisted = await page.evaluate(async () => {
      const mod = await import('/src/services/userProfileService.js');
      return mod.getGuardianEspecie();
    });
    expect(persisted).toBe('chivito');

    // 4) Recargar → el guardián elegido SOBREVIVE (persistencia real, no de sesión).
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    const dbg = await page.evaluate(async () => {
      const prof = await import('/src/services/userProfileService.js');
      const ten = await import('/src/services/tenantContext.js');
      const keys = {};
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k && k.includes('profile')) keys[k] = window.localStorage.getItem(k);
      }
      return {
        tenant: ten.getActiveTenantId(),
        guardian: prof.getGuardianEspecie(),
        profile: prof.getProfile(),
        keys,
      };
    });
    console.log('DBG_RELOAD', JSON.stringify(dbg));
    const selector2 = page.locator('[data-testid="guardian-selector"]');
    await selector2.scrollIntoViewIfNeeded();
    await expect(selector2).toHaveAttribute('data-guardian', 'chivito', { timeout: 15000 });
    await expect(page.locator('[data-testid="guardian-chip-chivito"]')).toHaveAttribute('aria-checked', 'true');

    await selector2.scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/guardian-selector.png', fullPage: true });
  });
});

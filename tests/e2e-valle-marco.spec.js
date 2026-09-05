import { test, expect } from '@playwright/test';

/**
 * e2e-valle-marco.spec.js — contrato del "marco de entrada" (valle 3D
 * vanilla, ver src/components/ValleMarcoScreen.jsx, ADR marco3d):
 *
 *   1. Sin sesión, aunque `marco3d=true` esté guardado en el perfil, la app
 *      NUNCA monta el iframe del valle — aterriza en login (gate de auth).
 *   2. Con sesión y `marco3d=false` (default), la entrada es la simple de
 *      siempre (dashboard clásico), sin iframe.
 *   3. Con sesión y `marco3d=true`, la entrada es el iframe a pantalla
 *      completa `src="/valle/index.html?compai=<slug>"` (el compai elegido
 *      viaja como querystring — task #42, ver ValleMarcoScreen.jsx), y
 *      "Entrada simple" apaga la preferencia y vuelve al dashboard.
 *
 * Backend mockeado igual que tests/e2e-integral-logueado.spec.js (mismo
 * patrón: seedSession + mockBackend + login vía authService real contra
 * fetch interceptado).
 *
 * NOTA sobre `waitForLoadState('networkidle')`: el caso marco3d=true monta
 * un <iframe> con el valle 3D (three.js, animación continua) — su tráfico de
 * red / actividad en curso puede no "asentarse" nunca dentro de la ventana
 * de networkidle (antipatrón conocido de Playwright para páginas con
 * actividad continua, ver docs). Ese caso espera por el elemento concreto
 * (`toBeVisible` con timeout explícito), no por networkidle.
 */

const ORIGIN = 'http://localhost:5173';
const USER = 'e2e-valle-marco';

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-valle-marco-token',
        refresh_token: 'e2e-valle-marco-refresh',
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
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }),
  );
}

async function seedSession(page, { marco3d } = {}) {
  await page.addInitScript(
    ({ username, marco3dPref }) => {
      try {
        window.localStorage.setItem('chagra:active_tenant_id', username);
        const profile = {
          rol: 'operador',
          vocacion: 'mixta',
          finca_tipo: 'integral',
          nivel_respuestas: 'detallado',
        };
        if (typeof marco3dPref === 'boolean') profile.marco3d = marco3dPref;
        // userProfileService.getProfileKey() namespacea el perfil por usuario
        // (`chagra:profile:v1:<tenant>`, ver getUserKey/getActiveTenantId) una
        // vez hay sesión. Se semilla en AMBAS claves: la plana (por si algo
        // lee antes de que el tenant esté activo) y la namespaceada (la que
        // realmente lee getMarco3DPreference() tras login).
        window.localStorage.setItem('chagra:profile:v1', JSON.stringify(profile));
        window.localStorage.setItem(`chagra:profile:v1:${username}`, JSON.stringify(profile));
      } catch (_) {
        /* noop */
      }
    },
    { username: USER, marco3dPref: marco3d },
  );
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-valle-marco-pwd');
    if (!result.success) {
      throw new Error(`Login mock falló: ${result.error || 'sin detalle'}`);
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USER);
}

test.describe('marco de entrada — valle 3D vanilla (iframe)', () => {
  test('sin sesión: marco3d=true en localStorage NO monta el iframe (gate de login)', async ({ page }) => {
    await seedSession(page, { marco3d: true });
    await mockBackend(page);
    // Sin login(): nunca hay token válido.

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.getByTestId('valle-marco-screen')).toHaveCount(0);
    await expect(page.locator('iframe[src="/valle/index.html"]')).toHaveCount(0);
  });

  test('con sesión y marco3d=false (default): entrada simple, sin iframe', async ({ page }) => {
    await seedSession(page, { marco3d: false });
    await mockBackend(page);

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await login(page);
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    await expect(page.getByTestId('valle-marco-screen')).toHaveCount(0);
    await expect(page.locator('body')).toContainText(/Agente Chagra|Mis plantas|Home/i);
  });

  test('con sesión y marco3d=true: iframe a pantalla completa src=/valle/index.html, "Entrada simple" vuelve al dashboard', async ({ page }) => {
    test.setTimeout(150000); // ver nota de timeouts largos abajo (congestión de hilo principal)
    await seedSession(page, { marco3d: true });
    await mockBackend(page);

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await login(page);
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });

    // Sin networkidle en este caso (ver nota arriba): el valle dentro del iframe puede
    // mantener actividad de red en curso. Se espera directo por el elemento,
    // con margen generoso para la primera compilación en frío de vite dev.
    const marco = page.getByTestId('valle-marco-screen');
    await expect(marco).toBeVisible({ timeout: 20000 });
    const iframe = marco.locator('iframe');
    // `?compai=<slug>` viaja siempre (leerCompanero() trae su propio default
    // 'angelita' — nunca vacío), así que el match es por prefijo, no exacto.
    await expect(iframe).toHaveAttribute('src', /^\/valle\/index\.html\?compai=/);

    await page.getByTestId('valle-marco-salir').click();
    // Timeout generoso (default 5000ms no alcanza): CONFIRMADO por
    // instrumentación directa (dispatchEvent + listener + setState, ver
    // discusión del PR) que `volverASimple` funciona de inmediato — el
    // perfil se persiste con marco3d=false y el handler de
    // `chagra:profile-changed` re-renderiza con el valor correcto en el
    // MISMO tick. El retraso real es que, con el valle real renderizando 3D
    // por software (sin GPU en este entorno de pruebas — swiftshader), el
    // hilo principal del navegador queda congestionado varios segundos
    // seguidos (confirmado: un solo `page.evaluate()` tardó 2.5s+ en
    // resolver), y recién libre monta DashboardLiveView por PRIMERA VEZ en
    // esta sesión (chunk lazy pesado, ~240 kB, sin bundlear bajo `vite dev`).
    // Mientras tanto se ve el fallback de Suspense ("Preparando tu
    // chagra…", ver App.jsx) — no es un cuelgue del código, es contención
    // real de CPU por falta de GPU en la máquina que corre el test. Con GPU
    // real (producción) este paso es prácticamente instantáneo.
    await expect(page.getByTestId('valle-marco-screen')).toHaveCount(0, { timeout: 120000 });
    await expect(page.locator('body')).toContainText(/Agente Chagra|Mis plantas|Home/i, { timeout: 20000 });
  });
});

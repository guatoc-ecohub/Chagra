import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

// BUG-09 — Mitad B (2026-09-04): el onboarding NO se repite al volver a entrar.
// Carril: dc-A-onboarding-no-se-repite-20260904.
//
// Mitad A (el onboarding aparece solo en el primer ingreso) ya la verificó el
// carril anterior en headed (canal-dc-bugs08-09.spec.js). Esta spec prueba la
// complementaria con DOS entradas seguidas en la MISMA sesión de navegador:
//   1. Entrada 1 (usuario nuevo)  → el onboarding aparece.
//   2. Entrada 2 (mismo usuario)  → el onboarding NO aparece.
//
// Cómo se sostiene la sesión (el bloqueo que tumbó al intento anterior):
//   - Sin credenciales reales de chagra-dev.guatoc.co a la vista, un token fake
//     contra el farmOS real devuelve 401/redirect → `expireSession()` expulsaba
//     al harness ~1-2 s después del login. Verificado hoy: `farmos.guatoc.co`
//     responde 302 (Cloudflare Access) desde este host, o sea no hay camino de
//     sesión real viable sin credenciales (no se fabrican tokens).
//   - Solución (camino conservador del encargo): mock del lado de la sesión.
//     El tráfico `**/api/**` (todo lo que va a farmOS JSON:API) se BLOQUEA,
//     mismo patrón de tests/offline.spec.js (verde en CI): la sesión con token
//     fake nunca recibe un 401/403 → nunca dispara expireSession, y el dashboard
//     offline-first renderiza igual (contrato del producto). Es un bloqueo de
//     red, NO un 401: apiService solo expira sesión ante 401/403.
//   - Canario por contenido: el árbol servido por :5173 DEBE traer el fix
//     (resolveDestinoPostLogin en App.jsx), o el harness mide una rama vieja.
//
// Decisor (estado que decide cada entrada): resolveDestinoPostLogin() +
// hasSeenProfileOnboarding() en src/services/userProfileService.js, que leen
// localStorage `chagra:profile:{done|skipped}:v1:<tenant>` donde <tenant> es el
// username farmOS activo (chagra:active_tenant_id). Se registra en crudo en la
// evidencia textual.

const SHOTS = '/home/kortux/Workspace/chagra/_gate/capturas-canal-dc';
const USER = 'e2e-operator';
const BASE = 'http://localhost:5173';

test.setTimeout(300_000);

async function estadoQueDecide(page) {
  return page.evaluate(async () => {
    const flags = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && (k.includes('chagra:profile:') || k === 'chagra:active_tenant_id')) {
        flags[k] = localStorage.getItem(k);
      }
    }
    let decision = null;
    let seen = null;
    try {
      const m = await import('/src/services/userProfileService.js');
      seen = m.hasSeenProfileOnboarding();
      decision = m.resolveDestinoPostLogin();
    } catch (err) {
      decision = `ERROR_IMPORT: ${err.message}`;
    }
    return { hash: window.location.hash, flags, seen, decision };
  });
}

async function ingresar(page) {
  await expect(page.getByPlaceholder('Su usuario')).toBeVisible({ timeout: 90_000 });
  await page.getByPlaceholder('Su usuario').fill(USER);
  await page.getByPlaceholder('Su contraseña').fill('e2e-pass');
  await page.getByRole('button', { name: /ingresar/i }).click();
}

// "Volver a entrar" es un arranque NUEVO de la app. page.goto con cambio de
// hash SOLO hace navegación same-document (sin reboot de la SPA), así que hay
// que forzar el reload del documento para que corra el boot real.
async function entrarDeNuevoEn(page, url) {
  await page.goto(url);
  await page.reload({ waitUntil: 'load' });
}

test('BUG-09 Mitad B: el onboarding NO se repite en la segunda entrada', async ({ context, page }, testInfo) => {
  const consoleErrors = [];
  const apiRequests = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`);
  });

  // ── Canario por contenido: el :5173 sirve la rama CON el fix BUG-09 ─────
  const appSrc = await (await context.request.get(`${BASE}/src/App.jsx`)).text();
  expect(appSrc, 'canario: App.jsx servido debe traer resolveDestinoPostLogin').toContain('resolveDestinoPostLogin');
  const profileSrc = await (await context.request.get(`${BASE}/src/services/userProfileService.js`)).text();
  expect(profileSrc, 'canario: userProfileService servido debe traer resolveDestinoPostLogin').toContain('resolveDestinoPostLogin');

  // ── Mocks de sesión ──────────────────────────────────────────────────────
  // oauth/token: token fake (mismo body de tests/offline.spec.js).
  await context.route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-fake-access',
        refresh_token: 'e2e-fake-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    })
  );
  // farmOS JSON:API: bloqueado (no 401 → la sesión fake nunca expira). Mismo
  // patrón que tests/offline.spec.js (CI verde). Ver docstring arriba.
  await context.route('**/api/**', async (route) => {
    apiRequests.push(`${route.request().method()} ${route.request().url()}`);
    await route.abort('blockedbyclient');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ENTRADA 1 — usuario nuevo → el onboarding DEBE aparecer.
  // ═══════════════════════════════════════════════════════════════════════
  await page.goto('/#login');
  const antesDeEntrar = await estadoQueDecide(page);
  // Usuario nuevo: no debe existir ningún flag done/skipped ni tenant previo.
  const flagsNuevo = Object.keys(antesDeEntrar.flags).filter((k) =>
    k.includes('chagra:profile:done') || k.includes('chagra:profile:skipped'));
  expect(flagsNuevo, 'usuario nuevo: sin flags done/skipped antes de entrar').toEqual([]);

  await ingresar(page);

  // El onboarding se dispara SOLO (sin tocar ninguna tarjeta opt-in).
  const saltar = page.getByTestId('onb2-saltar-todo');
  await expect(saltar).toBeVisible({ timeout: 90_000 });
  const enOnboarding = await estadoQueDecide(page);
  expect(enOnboarding.seen, 'primera entrada: aun no ha visto el onboarding').toBe(false);
  expect(enOnboarding.decision, 'primera entrada: decide onboarding-perfil').toBe('onboarding-perfil');
  // El tenant activo debe estar puesto: si la sesión se hubiera caído (el 401
  // del farmOS real → expireSession), el hash iría a #login y el onboarding
  // desaparecería — ya lo garantiza el expect de arriba (saltar visible).
  expect(enOnboarding.flags['chagra:active_tenant_id'],
    'primera entrada: tenant activo = e2e-operator').toBe(USER);
  await page.screenshot({ path: `${SHOTS}/bug09-mitadB-entrada1-onboarding.png`, fullPage: true });

  // "Saltar todo" escribe el flag skipped → NO se repetirá en el próximo ingreso.
  await saltar.click({ force: true });
  await expect(page.getByText('Tareas pendientes').first()).toBeVisible({ timeout: 90_000 });
  const trasSaltar = await estadoQueDecide(page);
  const skippedKeys = Object.keys(trasSaltar.flags).filter((k) => k.includes('chagra:profile:skipped'));
  expect(skippedKeys.length, 'saltar todo debe escribir la bandera skipped del tenant').toBeGreaterThan(0);
  for (const k of skippedKeys) {
    expect(trasSaltar.flags[k], `flag ${k} debe quedar en '1'`).toBe('1');
  }
  expect(trasSaltar.seen, 'tras saltar: hasSeenProfileOnboarding()=true').toBe(true);
  expect(trasSaltar.decision, 'tras saltar: decide dashboard').toBe('dashboard');
  await page.screenshot({ path: `${SHOTS}/bug09-mitadB-entrada1-dashboard-tras-saltar.png`, fullPage: true });

  // ═══════════════════════════════════════════════════════════════════════
  // ENTRADA 2a — vuelve a entrar reabriendo la app (sesión viva, sin login).
  // ═══════════════════════════════════════════════════════════════════════
  await entrarDeNuevoEn(page, '/');
  await expect(page.getByText('Tareas pendientes').first()).toBeVisible({ timeout: 90_000 });
  expect(await page.getByTestId('onb2-saltar-todo').count(),
    'reabrir con sesión viva: el onboarding NO debe reaparecer').toBe(0);
  const trasReabrir = await estadoQueDecide(page);
  expect(trasReabrir.decision).toBe('dashboard');
  await page.screenshot({ path: `${SHOTS}/bug09-mitadB-entrada2a-reabrir-dashboard.png`, fullPage: true });

  // ═══════════════════════════════════════════════════════════════════════
  // ENTRADA 2b — cerrar sesión y volver a entrar (pasa por resolveDestinoPostLogin
  // en el login real). Esta es la segunda entrada del reporte BUG-09.
  // ═══════════════════════════════════════════════════════════════════════
  await page.evaluate(async () => {
    const { logoutUser } = await import('/src/services/authService.js');
    await logoutUser();
  });
  await entrarDeNuevoEn(page, '/#login');
  await expect(page.getByPlaceholder('Su usuario')).toBeVisible({ timeout: 90_000 });
  await ingresar(page);

  await expect(page.getByText('Tareas pendientes').first()).toBeVisible({ timeout: 90_000 });
  const onboardingEnSegunda = await page.getByTestId('onb2-saltar-todo').count();
  expect(onboardingEnSegunda,
    'segunda entrada (re-login): el onboarding NO debe reaparecer').toBe(0);
  const trasSegunda = await estadoQueDecide(page);
  expect(trasSegunda.seen, 'segunda entrada: hasSeenProfileOnboarding()=true').toBe(true);
  expect(trasSegunda.decision, 'segunda entrada: decide dashboard, no onboarding').toBe('dashboard');
  await page.screenshot({ path: `${SHOTS}/bug09-mitadB-entrada2b-relogin-dashboard.png`, fullPage: true });

  // ── Evidencia textual ────────────────────────────────────────────────────
  const evidencia = [
    '=== ENTRADA 1 (antes de entrar) ===',
    JSON.stringify(antesDeEntrar, null, 2),
    '=== ENTRADA 1 (onboarding visible) ===',
    JSON.stringify(enOnboarding, null, 2),
    '=== ENTRADA 1 (tras "Saltar todo" → dashboard) ===',
    JSON.stringify(trasSaltar, null, 2),
    '=== ENTRADA 2a (reabrir con sesión viva → dashboard) ===',
    JSON.stringify(trasReabrir, null, 2),
    '=== ENTRADA 2b (logout + re-login → dashboard) ===',
    JSON.stringify(trasSegunda, null, 2),
    '=== peticiones farmOS bloqueadas por el mock ===',
    apiRequests.length ? apiRequests.slice(0, 40).join('\n') : '(ninguna: sin llamadas a farmOS en el flujo)',
    '=== errores de consola ===',
    consoleErrors.length ? consoleErrors.join('\n') : 'sin errores de consola',
  ].join('\n');
  testInfo.attach('evidencia-textual', { body: evidencia });
  // Persistir la evidencia en disco aunque el test pase (los attachments de
  // Playwright solo sobreviven en test-results cuando hay fallo).
  writeFileSync(`${SHOTS}/bug09-mitadB-evidencia.txt`, evidencia);
});

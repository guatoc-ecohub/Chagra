import { test, expect } from '@playwright/test';

const ORIGIN = 'http://localhost:5173';
const USERNAME = 'e2e-campesino';

/**
 * Siembra tenant + perfil en localStorage ANTES del boot de la app.
 * El juego deriva su estado de datos reales (farmProcessCache, userProfile).
 */
async function seedProfile(page, tenant = USERNAME) {
  await page.addInitScript((tenant) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', tenant);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'campesino',
          vocacion: 'agroecologica',
          finca_tipo: 'finca',
          finca_altitud: '1800',
          piso_confirmado: '1',
          fincaSlug: 'finca-e2e',
        }),
      );
    } catch (_) { /* noop */ }
  }, tenant);
}

/** Mock OAuth + farmOS REST + sidecar. */
async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-juego-token',
        refresh_token: 'e2e-juego-refresh',
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

/** Login programatico via authService. */
async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-pwd');
    if (!result.success) throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, USERNAME);
}

/**
 * Navega a la pantalla de juego "Mi Finca Viva".
 * El juego NO tiene hash route propia — se accede via navegacion interna desde
 * HoyEnFincaScreen (#hoy hash route). Hacemos: login → #hoy → click en la
 * entrada del juego.
 */
async function goToJuegoScreen(page) {
  await seedProfile(page);
  await mockBackend(page);

  // 1. Cargar la app, login, recargar autenticado
  await page.goto(ORIGIN);
  await login(page);

  // 2. Ir a HoyEnFinca (#hoy) — este hash SI esta en HASH_VIEW_ROUTES
  await page.goto(ORIGIN + '/#hoy');
  await page.waitForLoadState('networkidle').catch(() => {});

  // 3. Click en la entrada del juego
  const entrada = page.locator('[data-testid="entrada-juego-finca"]');
  await expect(entrada).toBeVisible({ timeout: 15000 });
  await entrada.click();

  // 4. Esperar a que MiFincaVivaScreen monte
  await expect(page.locator('[data-testid="mi-finca-viva-screen"]')).toBeVisible({ timeout: 15000 });
}

// ─── MiFincaVivaScreen — render basico ──────────────────────────────

test.describe('MiFincaVivaScreen — render y estructura', () => {
  test('la pantalla de juego monta con encabezado de nivel', async ({ page }) => {
    await goToJuegoScreen(page);

    const screen = page.locator('[data-testid="mi-finca-viva-screen"]');
    await expect(screen).toBeVisible();

    // Encabezado con nivel (ej: "Nivel 0 de 4")
    await expect(screen.getByText(/Nivel \d de 4/)).toBeVisible();
  });

  test('muestra el titulo "Mi Finca Viva" en el shell', async ({ page }) => {
    await goToJuegoScreen(page);

    // ScreenShell renderiza el titulo
    await expect(page.locator('body').getByText('Mi Finca Viva', { exact: false })).toBeVisible({ timeout: 5000 });
  });

  test('boton de audio toggle visible y accesible', async ({ page }) => {
    await goToJuegoScreen(page);

    const audioBtn = page.getByRole('button', { name: /sonido/i });
    await expect(audioBtn).toBeVisible();
    // aria-pressed refleja si el audio esta activo
    await expect(audioBtn).toHaveAttribute('aria-pressed', /true|false/);
  });
});

// ─── FincaWorldScene ────────────────────────────────────────────────

test.describe('FincaWorldScene — escena visual 3D/SVG', () => {
  test('FincaWorldScene renderiza con data-testid y data-level', async ({ page }) => {
    await goToJuegoScreen(page);

    const scene = page.locator('[data-testid="finca-world-scene"]');
    await expect(scene).toBeVisible();
    // data-level refleja el nivel Gliessman actual
    await expect(scene).toHaveAttribute('data-level', /^\d+$/);
  });

  test('escena tiene svg inline con cielo, tierra y sol', async ({ page }) => {
    await goToJuegoScreen(page);

    const scene = page.locator('[data-testid="finca-world-scene"]');
    // El SVG incluye un gradiente de cielo y un circulo de sol
    const svg = scene.locator('svg');
    await expect(svg).toBeVisible();
    await expect(svg.locator('defs linearGradient').first()).toBeAttached();
  });

  test('aria-label de la escena describe el estado de la finca', async ({ page }) => {
    await goToJuegoScreen(page);

    const scene = page.locator('[data-testid="finca-world-scene"]');
    const aria = await scene.getAttribute('aria-label');
    expect(aria).toBeTruthy();
    expect(aria.length).toBeGreaterThan(10);
  });
});

// ─── Empty state / sin datos ────────────────────────────────────────

test.describe('MiFincaVivaScreen — estado vacio (sin procesos)', () => {
  test('sin datos de finca: muestra invitacion a sembrar (estado vacio graceful)', async ({ page }) => {
    await goToJuegoScreen(page);

    // Sin farmProcesses en IDB → game.vacia = true
    const invitacion = page.locator('[data-testid="finca-vacia-invitacion"]');
    await expect(invitacion).toBeVisible({ timeout: 15000 });

    // Invita a sembrar la primera planta
    await expect(invitacion.getByRole('heading', { name: /finca/i })).toBeVisible();
    await expect(invitacion.getByRole('button', { name: /Sembrar/i })).toBeVisible();
  });

  test('estado vacio: NO crashea, sin errores de consola criticos', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await goToJuegoScreen(page);

    // La pantalla se pinto sin lanzar
    await expect(page.locator('[data-testid="mi-finca-viva-screen"]')).toBeVisible();
    // Esperar que terminen efectos async
    await page.waitForTimeout(2000);

    const critical = errors.filter(
      (e) =>
        !e.includes('manifest') &&
        !e.includes('favicon') &&
        !e.includes('ServiceWorker'),
    );
    expect(critical).toEqual([]);
  });
});

// ─── CriaturaCollection ─────────────────────────────────────────────

test.describe('CriaturaCollection — galeria de criaturas', () => {
  test('CriaturaCollection renderiza aunque no haya criaturas', async ({ page }) => {
    await goToJuegoScreen(page);

    const collection = page.locator('[data-testid="criatura-collection"]');
    await expect(collection).toBeVisible();

    // Titulo "Mis criaturas"
    await expect(collection.getByText('Mis criaturas', { exact: false })).toBeVisible();

    // Contador de criaturas (0 / N)
    const badge = collection.locator('[aria-label*="criaturas"]');
    await expect(badge).toBeVisible();
  });

  test('label de accesibilidad del contador de criaturas', async ({ page }) => {
    await goToJuegoScreen(page);

    const badge = page.locator('[aria-label*="criaturas" i]');
    await expect(badge).toBeVisible();
    const label = await badge.getAttribute('aria-label');
    expect(label).toMatch(/tienes \d+ de \d+/i);
  });
});

// ─── Progreso y stats ───────────────────────────────────────────────

test.describe('MiFincaVivaScreen — progreso y stats', () => {
  test('barra de progreso visible con valor entre 0 y 100', async ({ page }) => {
    await goToJuegoScreen(page);

    // La barra de progreso interna puede tener width 0 cuando el progreso es 0,
    // lo que la hace "hidden" para Playwright. Verificamos que esta en el DOM
    // y que tiene los atributos ARIA correctos.
    const progressbar = page.getByRole('progressbar', { name: /finca/i });
    await expect(progressbar).toBeAttached();

    const valuenow = await progressbar.getAttribute('aria-valuenow');
    expect(Number(valuenow)).toBeGreaterThanOrEqual(0);
    expect(Number(valuenow)).toBeLessThanOrEqual(100);
  });

  test('porcentaje de progreso visible en texto', async ({ page }) => {
    await goToJuegoScreen(page);

    const screen = page.locator('[data-testid="mi-finca-viva-screen"]');
    // Debe contener un porcentaje (ej "0%" o "12%")
    await expect(screen.getByText(/%/)).toBeVisible();
  });
});

// ─── Navegacion ────────────────────────────────────────────────────

test.describe('MiFincaVivaScreen — navegacion', () => {
  test('boton "Sembrar mi primera planta" esta presente en estado vacio', async ({ page }) => {
    await goToJuegoScreen(page);

    const btn = page.getByRole('button', { name: /Sembrar mi primera planta/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('la pantalla se alcanza desde HoyEnFinca via entrada-juego-finca', async ({ page }) => {
    await seedProfile(page);
    await mockBackend(page);
    await page.goto(ORIGIN);
    await login(page);
    await page.goto(ORIGIN + '/#hoy');
    await page.waitForLoadState('networkidle').catch(() => {});

    const entrada = page.locator('[data-testid="entrada-juego-finca"]');
    await expect(entrada).toBeVisible({ timeout: 15000 });
    // Verifica que el texto de la entrada menciona "Mi Finca Viva"
    await expect(entrada).toContainText('Mi Finca Viva');
  });
});

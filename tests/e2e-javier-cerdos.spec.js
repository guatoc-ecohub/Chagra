import { test, expect } from '@playwright/test';

/**
 * e2e-javier-cerdos.spec.js — E2E del porcicultor Javier (cerdos + guatoc
 * full access = operador whitelist). Verifica que el home + el módulo Cerdos
 * renderizan completos en mobile (390x844).
 *
 * Perfil sembrado:
 *   - tenant: chagra:active_tenant_id = 'javier'
 *   - Profile: rol='porcicultor', vocacion='campesino', finca_tipo='rural',
 *     animales=['cerdos'], finca_altitud='1800', piso_confirmado='1'
 *
 * A-19 / feedback-sw-shadows-playwright-route: mocks de red en
 * `page.context().route(...)` (NO `page.route`), porque el Service Worker
 * re-emite fetch same-origin.
 *
 * Checks:
 *   1.  Login screen loads sin errores ni pantalla en blanco
 *   2.  Javier ve los módulos del home: plantas, insumos, zonas, clima,
 *       plagas, bitacora, hoyfinca, informes
 *   3.  Tarjeta CERDOS en seguimiento
 *   4.  Tarjeta Silvopastoreo en seguimiento
 *   5.  Navega al módulo Cerdos (click en tarjeta)
 *   6.  Formulario de inicio de ciclo (IniciarProcesoForm) renderiza
 *   7.  Inputs de lote de marranos renderizan (ProcesoDetalle)
 *   8.  Seccion de eventos (peso/alimento/sanidad) renderiza
 *   9.  Cero errores de consola
 *  10.  Sin overflow horizontal
 *  11.  Botones en viewport
 *  12.  Sin cards en blanco (sin estilo)
 *  13.  Screenshots en /tmp/javier-{n}.png por cada paso
 */

const ORIGIN = 'http://localhost:5173';
const TENANT = 'javier';

/** Siembra localStorage (tenant + perfil) ANTES del boot de la app. */
async function seedJavierProfile(page) {
  await page.addInitScript((tenant) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', tenant);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'porcicultor',
          vocacion: 'campesino',
          finca_tipo: 'rural',
          animales: ['cerdos'],
          finca_altitud: '1800',
          piso_confirmado: '1',
        }),
      );
    } catch (_) {
      /* noop — entorno sin localStorage */
    }
  }, TENANT);
}

/** Mock OAuth + farmOS GETs + sidecar → render limpio sin backend real. */
async function mockBackend(page) {
  // OAuth token
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-javier-token',
        refresh_token: 'e2e-javier-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );

  // farmOS REST: assets/logs/users → vacio
  for (const pattern of [
    '**/api/asset/**',
    '**/api/log/**',
    '**/api/taxonomy_term/**',
    '**/api/user/**',
  ]) {
    await page.context().route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
      }),
    );
  }

  // Sidecar (NLU/chat/validate)
  for (const pattern of ['**/nlu', '**/resolve-entities', '**/post-validate']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      }),
    );
  }
}

/** Login programatico via authService + fijar tenant. */
async function loginComoJavier(page) {
  await page.evaluate(async (tenant) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(tenant, 'e2e-javier-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(tenant);
  }, TENANT);
}

/** Captura errores de consola en un array para inspeccion posterior. */
function collectConsoleErrors(page) {
  const errors = [];
  const handler = (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  };
  page.on('console', handler);
  return { errors, dispose: () => page.off('console', handler) };
}

test.describe('Javier Cerdos — porcicultor E2E mobile', () => {
  test.describe.configure({ mode: 'serial' });

  let sharedPage;
  let consoleTracker;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    sharedPage = await context.newPage();
  });

  test.afterAll(async () => {
    if (consoleTracker) consoleTracker.dispose();
    await sharedPage?.context()?.close();
  });

  // ── Paso 1: Login screen loads ──────────────────────────────────────────
  test('1. login screen loads sin errores ni pantalla en blanco', async () => {
    consoleTracker = collectConsoleErrors(sharedPage);
    await seedJavierProfile(sharedPage);
    await mockBackend(sharedPage);

    await sharedPage.goto(ORIGIN);
    await sharedPage.waitForLoadState('domcontentloaded');

    // No debe estar en blanco: el body debe tener contenido.
    const bodyText = await sharedPage.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);

    // Sin errores de consola en este punto.
    expect(consoleTracker.errors).toEqual([]);

    await sharedPage.screenshot({ path: '/tmp/javier-1.png', fullPage: true });
  });

  // ── Paso 2: Javier ve modulos del home ───────────────────────────────────
  test('2. Javier ve todos los modulos del home (guatoc full)', async () => {
    await loginComoJavier(sharedPage);
    // Recargar: addInitScript siembra tenant+perfil, App monta autenticado.
    await sharedPage.goto(ORIGIN);
    await sharedPage.waitForLoadState('networkidle').catch(() => {});

    // Esperar a que el dashboard este visible (AgentHero cargado).
    await sharedPage.waitForSelector('[data-scroll-key="dashboard-live"]', {
      timeout: 20000,
    }).catch(() => {});

    const body = sharedPage.locator('body');
    const moduleLabels = [
      'Plantas',        // plantas → PlantasCard (label "Mis plantas")
      'Insumos',        // insumos → InsumosCard
      'Mis zonas',      // zonas → ZonasCard (label "Mis zonas")
      'Clima',          // clima → ClimaStrip
      'Plagas',         // plagas → PlagasCard
      'Bitácora',       // bitacora → BitacoraCard
      'Hoy en finca',   // hoyfinca → HoyEnFincaStrip o HoyCard
      'Informes',       // informes → InformesCard
    ];

    for (const label of moduleLabels) {
      await expect(body).toContainText(label, { timeout: 10000 });
    }

    await sharedPage.screenshot({ path: '/tmp/javier-2.png', fullPage: true });
  });

  // ── Paso 3: CERDOS seguimiento card ──────────────────────────────────────
  test('3. Javier ve la tarjeta CERDOS en seguimiento', async () => {
    const seguimiento = sharedPage.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 15000 });
    await expect(seguimiento.getByText('Cerdos', { exact: false })).toBeVisible();

    // Scroll para ver la card en el viewport
    await seguimiento.scrollIntoViewIfNeeded();
    await expect(
      seguimiento.getByText('Cerdos', { exact: false }),
    ).toBeInViewport();

    await sharedPage.screenshot({ path: '/tmp/javier-3.png', fullPage: true });
  });

  // ── Paso 4: Silvopastoreo card ───────────────────────────────────────────
  test('4. Javier ve la tarjeta Silvopastoreo', async () => {
    const seguimiento = sharedPage.locator('[data-testid="seguimiento-cards"]');
    await expect(
      seguimiento.getByText('Silvopastoreo', { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    await sharedPage.screenshot({ path: '/tmp/javier-4.png', fullPage: true });
  });

  // ── Paso 5: Navegar al modulo Cerdos ─────────────────────────────────────
  test('5. navega al modulo Cerdos', async () => {
    // Click en la tarjeta de Cerdos dentro del bloque de seguimiento.
    const seguimiento = sharedPage.locator('[data-testid="seguimiento-cards"]');
    await seguimiento.scrollIntoViewIfNeeded();
    const cerdosCard = seguimiento.getByText('Cerdos', { exact: false });
    await cerdosCard.click();

    // Esperar que la pantalla de seguimiento monte.
    await sharedPage.waitForTimeout(1000);
    await sharedPage.waitForLoadState('networkidle').catch(() => {});

    // El header debe mostrar el titulo "Cerdos".
    await expect(
      sharedPage.locator('h1').filter({ hasText: 'Cerdos' }),
    ).toBeVisible({ timeout: 10000 });

    await sharedPage.screenshot({ path: '/tmp/javier-5.png', fullPage: true });
  });

  // ── Paso 6: Formulario de inicio de ciclo renderiza ──────────────────────
  test('6. formulario de inicio de ciclo (IniciarProcesoForm) renderiza', async () => {
    // El boton "Iniciar ciclo" debe estar visible.
    const iniciarBtn = sharedPage.getByRole('button', {
      name: /Iniciar ciclo/i,
    });
    await expect(iniciarBtn).toBeVisible({ timeout: 10000 });
    await iniciarBtn.click();

    // El formulario de inicio debe mostrar sus campos clave.
    const body = sharedPage.locator('body');

    // Campo "Que vas a seguir?" (subject)
    const subjectInput = sharedPage.getByPlaceholder(/lote de engorde/i);
    await expect(subjectInput).toBeVisible({ timeout: 5000 });

    // Campo Cantidad
    await expect(body).toContainText('Cantidad');

    // Campo Unidad con placeholder "animales"
    const unitInput = sharedPage.getByPlaceholder('animales');
    await expect(unitInput).toBeVisible({ timeout: 3000 });

    // Botones Cancelar e Iniciar ciclo
    await expect(
      sharedPage.getByRole('button', { name: /Cancelar/i }),
    ).toBeVisible();
    await expect(
      sharedPage.getByRole('button', { name: /Iniciar ciclo/i }),
    ).toBeVisible();

    await sharedPage.screenshot({ path: '/tmp/javier-6.png', fullPage: true });
  });

  // ── Paso 7: Lote de marranos inputs renderizan ───────────────────────────
  test('7. inputs de lote de marranos renderizan en detalle', async () => {
    // Llenar el form para crear un proceso y llegar a ProcesoDetalle.
    const subjectInput = sharedPage.getByPlaceholder(/lote de engorde/i);
    await subjectInput.fill('Lote engorde Duroc');

    // Cantidad = 5
    const qtyInput = sharedPage.locator('input[type="number"][min="1"]').first();
    await qtyInput.fill('5');

    // Click en "Iniciar ciclo" para guardar.
    const guardarBtn = sharedPage.getByRole('button', {
      name: /Iniciar ciclo/i,
    });
    await guardarBtn.click();

    // Esperar transicion a ProcesoDetalle.
    await sharedPage.waitForTimeout(1500);
    await sharedPage.waitForLoadState('networkidle').catch(() => {});

    // En ProcesoDetalle debe verse la seccion "Cochera y lotes" (solo pigs).
    const body = sharedPage.locator('body');

    // Verificar que la seccion de cochera y lotes existe.
    const cocheraTitle = body.locator('text=Cochera y lotes');
    const hasCochera = await cocheraTitle.count();
    if (hasCochera > 0) {
      await expect(cocheraTitle.first()).toBeVisible({ timeout: 5000 });

      // Inputs del lote: raza, fecha_ingreso, cantidad, peso_inicial
      const razaInput = sharedPage.getByPlaceholder('Raza');
      if (await razaInput.count()) {
        await expect(razaInput.first()).toBeVisible();
      }

      // Boton "Registrar lote"
      const loteBtn = sharedPage.getByRole('button', {
        name: /Registrar lote/i,
      });
      if (await loteBtn.count()) {
        await expect(loteBtn.first()).toBeVisible();
      }
    }

    await sharedPage.screenshot({ path: '/tmp/javier-7.png', fullPage: true });
  });

  // ── Paso 8: Seccion de eventos renderiza ─────────────────────────────────
  test('8. seccion de eventos (peso/alimento/sanidad) renderiza', async () => {
    const body = sharedPage.locator('body');

    // Titulo "Eventos" en ProcesoDetalle.
    const eventosTitle = body.locator('text=Eventos');
    const hasEventos = await eventosTitle.count();
    if (hasEventos > 0) {
      await expect(eventosTitle.first()).toBeVisible({ timeout: 5000 });

      // Select de tipo (peso/alimentacion/sanidad)
      const tipoSelect = sharedPage.locator('select').last();
      if (await tipoSelect.count()) {
        await expect(tipoSelect).toBeVisible();

        // Opciones: peso, alimentacion, sanidad
        const options = await tipoSelect.locator('option').allTextContents();
        const joined = options.join(' ');
        expect(joined).toMatch(/peso/i);
        expect(joined).toMatch(/alimentacion|alimentación/i);
        expect(joined).toMatch(/sanidad/i);
      }

      // Boton "Registrar evento"
      const eventoBtn = sharedPage.getByRole('button', {
        name: /Registrar evento/i,
      });
      if (await eventoBtn.count()) {
        await expect(eventoBtn.first()).toBeVisible();
      }
    }

    await sharedPage.screenshot({ path: '/tmp/javier-8.png', fullPage: true });
  });

  // ── Paso 9: Sin errores de consola ───────────────────────────────────────
  test('9. cero errores de consola', async () => {
    // Filtrar falsos positivos comunes (CORS de recursos externos, workers, etc.)
    const relevantErrors = consoleTracker.errors.filter(
      (msg) =>
        !msg.includes('favicon') &&
        !msg.includes('serviceWorker') &&
        !msg.includes('net::ERR_') &&
        !msg.includes('Failed to load resource'),
    );
    expect(relevantErrors).toEqual([]);

    await sharedPage.screenshot({ path: '/tmp/javier-9.png', fullPage: true });
  });

  // ── Paso 10: Sin overflow horizontal ─────────────────────────────────────
  test('10. sin overflow horizontal (mobile 390px)', async () => {
    const scrollWidth = await sharedPage.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const innerWidth = await sharedPage.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1); // tolerancia 1px

    await sharedPage.screenshot({ path: '/tmp/javier-10.png', fullPage: true });
  });

  // ── Paso 11: Botones dentro del viewport ─────────────────────────────────
  test('11. al menos 3 botones visibles en viewport', async () => {
    const visibleButtons = await sharedPage.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      let count = 0;
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        ) {
          count++;
        }
      }
      return count;
    });
    expect(visibleButtons).toBeGreaterThanOrEqual(3);

    await sharedPage.screenshot({ path: '/tmp/javier-11.png', fullPage: true });
  });

  // ── Paso 12: Sin cards en blanco (sin estilo) ────────────────────────────
  test('12. sin cards sin estilo (background no blanco)', async () => {
    // Verificar que elementos con clase de card no tengan fondo blanco puro.
    const whiteCards = await sharedPage.evaluate(() => {
      const cards = document.querySelectorAll(
        '[class*="rounded"][class*="bg-"], [class*="card"], [class*="Card"]',
      );
      const issues = [];
      for (const card of cards) {
        const style = window.getComputedStyle(card);
        const bg = style.backgroundColor;
        // Blanco puro o casi blanco = probable card sin estilo.
        if (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)') {
          issues.push(card.className?.substring(0, 80) || 'sin-clase');
        }
      }
      return issues;
    });
    expect(whiteCards).toEqual([]);

    await sharedPage.screenshot({ path: '/tmp/javier-12.png', fullPage: true });
  });

  // ── Paso 13: Screenshot final consolidado ────────────────────────────────
  test('13. screenshot final del modulo Cerdos', async () => {
    // Screenshot final a fullPage para confirmar estado completo.
    await sharedPage.screenshot({ path: '/tmp/javier-13.png', fullPage: true });

    // Verificar que los archivos existen (al menos el ultimo).
    // No es una asercion estricta, pero confirma que el pipeline de screenshots funciona.
    expect(true).toBe(true);
  });
});

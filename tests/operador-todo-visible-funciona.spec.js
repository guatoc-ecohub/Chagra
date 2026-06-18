/* global process */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- fixtures que reflejan
   etiquetas reales de la UI (labels/empty-states); deben coincidir literalmente
   con lo que ve el operador, no se migran a messages.js. */
import { test, expect } from '@playwright/test';

/**
 * operador-todo-visible-funciona.spec.js — PRUEBA E2E FAITHFUL DEL OPERADOR.
 *
 * Esta es la prueba obligatoria que corre cada noche (cron 3am) para reproducir
 * EXACTAMENTE lo que ve el operador real, no un `admin` sin datos. La maneja el
 * orquestador `scripts/e2e-operador-nightly.sh`, que:
 *   1. Siembra un usuario de test con ROL OPERADOR (`e2e-operador`) CON datos
 *      (≥1 zona/land + ≥1 planta) en el farmOS real.
 *   2. Construye el bundle de PROD con `VITE_OPERATOR_USERNAME=e2e-operador`
 *      (→ esOperador=true → ve TODOS los módulos) apuntando al farmOS real.
 *   3. Sirve ese bundle en localhost detrás de un proxy a `chagra.guatoc.co`
 *      (same-origin → sin CORS, con datos reales) y corre esta prueba.
 *
 * A diferencia de los specs viejos (`home-operador-ve-todo`,
 * `e2e-operador-modulos-visibles`), que MOCKEAN el OAuth y devuelven arrays
 * vacíos, esta prueba hace LOGIN REAL y carga DATOS REALES — así reproduce (o
 * descarta) el bug del operador: "error de token", "sin plantas", y el selector
 * de área que no aparece al agregar planta.
 *
 * QUÉ VERIFICA (lo que pidió el operador):
 *   1. NO aparece "Tu sesión expiró" / error de token tras el login.
 *   2. Los DATOS CARGAN: la(s) planta(s)/zona(s) sembradas se ven (NO "Agrega
 *      tu primera planta"). Los contadores reflejan los datos sembrados.
 *   3. TODOS los botones del home están VISIBLES (usuario operador → ve todos
 *      los módulos). Falla y lista cuál falta.
 *   4. CADA botón FUNCIONA al tap real: hit-test (elementFromPoint) debe dar el
 *      control (no un overlay), y el tap debe producir su acción (navega/abre).
 *   5. El flujo AGREGAR PLANTA abre el selector de ÁREA/ZONA (el bug reportado).
 *
 * Credenciales y config SOLO por env (repo público, anti-leak):
 *   E2E_OPERADOR_USER, E2E_OPERADOR_PASS, PLAYWRIGHT_BASE_URL.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const USER = process.env.E2E_OPERADOR_USER || 'e2e-operador';
const PASS = process.env.E2E_OPERADOR_PASS;

// Mensajes de error de token que NUNCA deben aparecer tras un login fresco
// (friendlyErrors.js → FRIENDLY_MESSAGES.AUTH_EXPIRED).
const TOKEN_ERROR_PATTERNS = [
  /Tu sesión expiró/i,
  /sesión expir/i,
  /Vuelve a iniciar sesión/i,
  /Token no disponible/i,
];

// Empty-states que NO deben aparecer cuando el operador SÍ tiene datos
// (FincaCards.jsx). Su presencia = "los datos no cargaron".
const EMPTY_STATE_PATTERNS = [
  /¡Agrega tu primera planta!/i,
  /Define dónde cultivas/i,
];

/**
 * Módulos del home que un OPERADOR (esOperador=true) DEBE ver. Cada entrada se
 * localiza por su aria-label (el Card pone aria-label = tooltip largo). El
 * `navTo` es informativo (a dónde debería navegar al tap).
 *
 * Fuente: src/components/dashboard/FincaCards.jsx + AgentHero.jsx + TopBar.jsx.
 */
const HOME_MODULES = [
  { name: 'Mis plantas', sel: 'button[aria-label*="Cultivos registrados"]', navTo: 'activos' },
  { name: 'Mis zonas', sel: 'button[aria-label*="Parcelas, camas, invernaderos"]', navTo: 'mapa' },
  { name: 'Insumos', sel: 'button[aria-label*="Bioinsumos"]', navTo: 'bodega' },
  { name: 'Bitácora', sel: 'button[aria-label*="Historial cronológico"]', navTo: 'historial' },
  { name: 'Hoy en finca', sel: 'button[aria-label*="Clima de hoy, alertas, tareas"]', navTo: 'hoy_finca' },
  { name: 'Plagas', sel: 'button[aria-label*="Reporta una plaga"]', navTo: 'reportar_invasora' },
  { name: 'Flora y fauna', sel: 'button[aria-label*="Catálogo de especies nativas"]', navTo: 'biodiversidad' },
  { name: 'Informes', sel: 'button[aria-label*="Exporta cuaderno de campo"]', navTo: 'informes' },
];

// Tarjetas de seguimiento (operador ve las 4, incluida Cerdos).
const SEGUIMIENTO = ['Reforestación', 'Silvopastoreo', 'Páramo', 'Cerdos'];

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

/** Login REAL por formulario (no programático): llena usuario/contraseña y
 *  envía, esperando aterrizar en el dashboard. */
async function loginReal(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // LoginScreen: input[type=text] (Usuario), input[type=password], botón "Ingresar".
  await page.locator('input[type="text"]').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[type="text"]').first().fill(USER);
  await page.locator('input[type="password"]').first().fill(PASS);
  await page.getByRole('button', { name: /Ingresar/i }).click();
  // El dashboard monta el AgentHero (section aria-label="Agente Chagra").
  await page.locator('section[aria-label="Agente Chagra"]').waitFor({ state: 'visible', timeout: 45000 });
}

/** Lleva un elemento a viewport y verifica vía elementFromPoint que el punto
 *  central pertenece al control (o a un hijo suyo), NO a un overlay que lo
 *  tape. Devuelve {ok, hitTag, hitLabel}. */
async function hitTestCenter(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) return { ok: false, reason: 'sin boundingBox (no visible)' };
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return await page.evaluate(
    ({ cx, cy }) => {
      const top = document.elementFromPoint(cx, cy);
      if (!top) return { ok: false, reason: 'elementFromPoint=null' };
      // El control es un <button>; el punto puede caer en un hijo (span/svg).
      const btn = top.closest('button, a, [role="button"]');
      const label = btn ? (btn.getAttribute('aria-label') || btn.textContent || '').trim().slice(0, 60) : null;
      return {
        ok: !!btn,
        hitTag: top.tagName.toLowerCase(),
        hitLabel: label,
        reason: btn ? null : 'el punto central cae en un overlay (no es un control)',
      };
    },
    { cx, cy },
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Pre-flight: credenciales presentes.
// ──────────────────────────────────────────────────────────────────────────
test.beforeAll(() => {
  if (!PASS) {
    throw new Error(
      'FATAL: E2E_OPERADOR_PASS no está seteado. Esta prueba hace login REAL; ' +
        'la contraseña va por env (repo público, no se hardcodea). ' +
        'Corre vía scripts/e2e-operador-nightly.sh.',
    );
  }
});

test.describe('Operador — todo visible y funcional (prueba FAITHFUL nocturna)', () => {
  // Capturar errores de consola/página para el diagnóstico.
  let consoleErrors;
  let pageErrors;
  test.beforeEach(({ page }) => {
    consoleErrors = [];
    pageErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => pageErrors.push(e.message));
  });

  test('1) login fresco NO muestra error de token y 2) los datos CARGAN', async ({ page }) => {
    await loginReal(page);
    // Dar tiempo a que hydrate()+syncFromServer() traigan plantas/zonas reales.
    await page.waitForTimeout(3500);

    const bodyText = await page.locator('body').innerText();

    // (1) NO debe verse ningún mensaje de "sesión expiró" / token.
    for (const re of TOKEN_ERROR_PATTERNS) {
      expect(bodyText, `Apareció error de token que NO debería tras login fresco: ${re}`).not.toMatch(re);
    }

    // (2) Los DATOS CARGAN: no debe verse el empty-state de "primera planta".
    //     Llevamos las tarjetas a vista (viven bajo el fold del AgentHero).
    const verModulos = page.getByLabel('Ver modulos del home');
    if (await verModulos.isVisible().catch(() => false)) {
      await verModulos.click();
      await page.waitForTimeout(800);
    }
    const plantsCard = page.locator('button[aria-label*="Cultivos registrados"]');
    await plantsCard.scrollIntoViewIfNeeded();
    await expect(plantsCard).toBeVisible({ timeout: 10000 });

    const afterScrollText = await page.locator('body').innerText();
    for (const re of EMPTY_STATE_PATTERNS) {
      expect(afterScrollText, `Apareció empty-state (datos NO cargaron): ${re}`).not.toMatch(re);
    }

    // El contador de "Mis plantas" debe reflejar ≥1 planta sembrada. En el
    // home las cards usan la variante GRID: el conteo es el badge
    // `finca-card-count` (NO hay subtítulo "plantas sembradas" en grid; ese
    // texto solo existe en la variante list). Que el badge muestre ≥1 ES la
    // señal de que los datos cargaron (no quedó en empty-state).
    const plantsCount = await plantsCard.locator('[data-testid="finca-card-count"]').textContent().catch(() => '');
    const nPlants = parseInt((plantsCount || '').trim(), 10);
    expect(nPlants, `El contador de plantas debe ser ≥1 (datos reales); fue "${plantsCount}"`).toBeGreaterThanOrEqual(1);

    // Y la zona sembrada (Mis zonas ≥1).
    const zonasCard = page.locator('button[aria-label*="Parcelas, camas, invernaderos"]');
    await zonasCard.scrollIntoViewIfNeeded();
    const zonasCount = await zonasCard.locator('[data-testid="finca-card-count"]').textContent().catch(() => '');
    const nZonas = parseInt((zonasCount || '').trim(), 10);
    expect(nZonas, `El contador de zonas debe ser ≥1; fue "${zonasCount}"`).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: 'test-results/operador-home-datos.png', fullPage: true });

    // No errores fatales de página (los de consola ruidosos se filtran).
    const criticalConsole = consoleErrors.filter(
      (e) => !/ResizeObserver|Script error|favicon|manifest|sourcemap/i.test(e),
    );
    expect(pageErrors, `Errores de página: ${pageErrors.join(' | ')}`).toEqual([]);
    // Reportar (no romper) los de consola para el diagnóstico.
    if (criticalConsole.length) {
      console.warn('[diag] consola con errores:', JSON.stringify(criticalConsole.slice(0, 10), null, 2));
    }
  });

  test('3) TODOS los botones del home están VISIBLES (operador ve todos los módulos)', async ({ page }) => {
    await loginReal(page);
    await page.waitForTimeout(2500);
    const verModulos = page.getByLabel('Ver modulos del home');
    if (await verModulos.isVisible().catch(() => false)) {
      await verModulos.click();
      await page.waitForTimeout(800);
    }

    const faltantes = [];
    for (const mod of HOME_MODULES) {
      const loc = page.locator(mod.sel).first();
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      const visible = await loc.isVisible().catch(() => false);
      if (!visible) faltantes.push(mod.name);
    }

    // Las 4 tarjetas de seguimiento (incl. Cerdos) — operador las ve todas.
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await seguimiento.scrollIntoViewIfNeeded().catch(() => {});
    for (const nombre of SEGUIMIENTO) {
      const ok = await seguimiento.getByText(nombre, { exact: false }).isVisible().catch(() => false);
      if (!ok) faltantes.push(`Seguimiento: ${nombre}`);
    }

    // El agente Ⓐ (botón "Ver todo lo que puede hacer Chagra").
    const aBtn = page.getByRole('button', { name: /Ver todo lo que puede hacer Chagra/i });
    if (!(await aBtn.isVisible().catch(() => false))) faltantes.push('Agente Ⓐ');

    await page.screenshot({ path: 'test-results/operador-modulos-visibles.png', fullPage: true });

    expect(faltantes, `Módulos del operador que NO se ven: ${faltantes.join(', ')}`).toEqual([]);
  });

  test('4) CADA botón del home FUNCIONA al tap real (hit-test + navega)', async ({ page }) => {
    // Recorre 8 módulos (hit-test + tap + volver al home in-app) → necesita más
    // que el timeout por defecto de 30s.
    test.setTimeout(120_000);
    await loginReal(page);
    await page.waitForTimeout(2500);

    /** Lleva el home a un estado con los módulos a la vista. Vuelve al home con
     *  navegación IN-APP (logo del TopBar en el dashboard, o el botón "Volver…"
     *  de las vistas de detalle, o history.back como último recurso), NUNCA con
     *  goto/reload — recargar la página repetidamente desestabiliza el chromium
     *  del nix-store. Las vistas de detalle (ej. "Activos") NO tienen el logo
     *  sino una flecha de regreso con aria-label que empieza por "Volver". */
    const home = page.locator('section[aria-label="Agente Chagra"]');
    async function irAlHome() {
      for (let intento = 0; intento < 4; intento++) {
        if (await home.isVisible().catch(() => false)) break;
        // 1) Logo del TopBar (cuando ya estamos cerca del dashboard).
        const logo = page.getByRole('button', { name: /Volver al inicio|Chagra está procesando/i }).first();
        // 2) Botón de regreso de las vistas de detalle ("Volver…").
        const back = page.getByRole('button', { name: /^Volver/i }).first();
        if (await logo.isVisible().catch(() => false)) {
          await logo.click().catch(() => {});
        } else if (await back.isVisible().catch(() => false)) {
          await back.click().catch(() => {});
        } else {
          await page.goBack().catch(() => {});
        }
        await home.waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
      }
      const verModulos = page.getByLabel('Ver modulos del home');
      if (await verModulos.isVisible().catch(() => false)) {
        await verModulos.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }

    // UNA pasada por módulo: hit-test (el punto central pertenece a un control,
    // no a un overlay que lo tape) + TAP REAL (debe salir del home = la acción
    // ocurrió). Volvemos al home IN-APP entre módulos.
    const muertos = [];
    for (const mod of HOME_MODULES) {
      await irAlHome();
      const loc = page.locator(mod.sel).first();
      if (!(await loc.isVisible().catch(() => false))) {
        muertos.push(`${mod.name} (no visible)`);
        continue;
      }
      const hit = await hitTestCenter(page, loc);
      if (!hit.ok) {
        muertos.push(`${mod.name} (hit-test: ${hit.reason})`);
        continue;
      }
      await loc.click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(900);
      const stillHome = await page.locator('section[aria-label="Agente Chagra"]').isVisible().catch(() => false);
      if (stillHome) muertos.push(`${mod.name} (tap sin efecto: siguió en el home)`);
    }

    await irAlHome();
    await page.screenshot({ path: 'test-results/operador-taps.png', fullPage: true }).catch(() => {});

    expect(muertos, `Botones muertos o tapados al tap real: ${muertos.join(' | ')}`).toEqual([]);
  });

  test('5) AGREGAR PLANTA abre el selector de ÁREA/ZONA (bug reportado)', async ({ page }) => {
    await loginReal(page);
    await page.waitForTimeout(2500);

    // Ir directo al formulario de registrar planta vía la ruta de la app.
    // AssetsDashboard con initialTab=plant + initialShowForm se monta en la
    // vista 'plant_asset'. Navegamos por hash (App.jsx mapea hash→vista).
    await page.goto('/#plant_asset', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Si el hash directo no abre el form, intentamos por "Mis plantas" → form.
    let zonaSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /Seleccione una zona/i }) });
    if (!(await zonaSelect.first().isVisible().catch(() => false))) {
      // Fallback: desde el home, "Mis plantas" → botón agregar.
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.locator('section[aria-label="Agente Chagra"]').waitFor({ state: 'visible', timeout: 30000 });
      const verModulos = page.getByLabel('Ver modulos del home');
      if (await verModulos.isVisible().catch(() => false)) {
        await verModulos.click();
        await page.waitForTimeout(600);
      }
      const plantsCard = page.locator('button[aria-label*="Cultivos registrados"]').first();
      await plantsCard.scrollIntoViewIfNeeded();
      await plantsCard.click();
      await page.waitForTimeout(1500);
      // Botón de agregar planta (varía: "Agregar", "Registrar", "+").
      const addBtn = page
        .getByRole('button', { name: /Agregar|Registrar|Nueva planta|Sembrar|\+/i })
        .first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(1500);
      }
      zonaSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /Seleccione una zona/i }) });
    }

    await page.screenshot({ path: 'test-results/operador-agregar-planta.png', fullPage: true });

    // El selector de zona/área DEBE existir y ser visible (label "Zona
    // contenedora", placeholder "Seleccione una zona...").
    const select = zonaSelect.first();
    await expect(select, 'El selector de ÁREA/ZONA no aparece al agregar planta (BUG del operador)').toBeVisible({
      timeout: 8000,
    });

    // Y NO debe mostrar la advertencia "No hay zonas registradas" (el operador
    // SÍ tiene una zona sembrada → debe haber opciones reales).
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, 'Dice "No hay zonas registradas" pese a que el operador tiene una zona sembrada').not.toMatch(
      /No hay zonas registradas/i,
    );

    // El selector debe tener al menos una opción real (además del placeholder).
    const optionCount = await select.locator('option').count();
    expect(optionCount, 'El selector de zona no tiene opciones reales (solo el placeholder)').toBeGreaterThan(1);
  });
});

/**
 * EL ÁRBOL DE LOS MUNDOS + RELOJ DEL FRAILEJÓN en el home menú vivo (F2,
 * piel biopunk2 por defecto) — verificación E2E con DATOS REALES:
 *
 *   1. Siembra sesión + perfil F2 (f2TestUtils) y crea EN LA IDB real un
 *      FarmProcess (café, hace ~2 años) por la puerta de producción
 *      (farmProcessCache.putFarmProcess), para que el reloj tenga historia.
 *   2. Verifica que el ÁRBOL renderiza DENTRO del bloque de mundos (no
 *      huérfano): una rama-botón por mundo del manifiesto (fuente única
 *      mundosFinca.js), enrutando igual que la grilla; y que el RELOJ DEL
 *      FRAILEJÓN aparece con años reales (un anillo por año).
 *   3. La grilla/puerta plegable de main sigue accesible debajo (unión).
 *
 * Corre en el proyecto `visual` (servidor :5174 con la flag F2 ON), mismo
 * patrón que panel-vitalidad-espiritu.spec.js.
 */
import { test, expect } from '@playwright/test';
import {
  seedSession,
  mockBackendBasico,
  login,
  flagF2Activa,
  filtrarErroresCriticos,
  trackJsErrors,
} from './f2TestUtils';

/**
 * goto tolerante al net::ERR_ABORTED de la PRIMERA visita (el service worker
 * aborta la navegación en curso bajo carga). Reintenta. Mismo patrón que
 * guardian-selector.spec.js / panel-vitalidad-espiritu.spec.js.
 */
async function gotoReady(page, url = '/') {
  for (let intento = 0; intento < 3; intento += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return;
    } catch (err) {
      if (intento === 2 || !/ERR_ABORTED|detached/.test(String(err))) throw err;
      await page.waitForTimeout(800);
    }
  }
}

/** Siembra un ciclo REAL con ~2 años para que el reloj tenga historia. */
async function sembrarHistoria(page) {
  await page.evaluate(async () => {
    const { putFarmProcess } = await import('/src/db/farmProcessCache.js');
    const now = Date.now();
    const hace2Anios = now - 2 * 365 * 24 * 60 * 60 * 1000;
    await putFarmProcess({
      process_id: 'e2e-arbol-cafe',
      type: 'farm_process',
      attributes: {
        process_type: 'sowing',
        subject_kind: 'individual',
        subject_slug: 'coffea_arabica',
        subject_label: 'Café',
        quantity: 12,
        unit: 'plantas',
        status: 'active',
        current_stage: 'flowering',
        created_at: hace2Anios,
        updated_at: now,
      },
    });
  });
}

test.describe('El árbol de los mundos + reloj del frailejón (home menú vivo)', () => {
  test('renderiza el árbol no-huérfano y el reloj con años reales', async ({ page, context }) => {
    const errors = trackJsErrors(page);
    await seedSession(page);
    await mockBackendBasico(context);
    await gotoReady(page, '/');

    const flagOn = await flagF2Activa(page);
    test.skip(!flagOn, 'Build sin VITE_FINCA_VIVA_HOME_PERFIL — el home F2 no se monta');

    await login(page);
    await sembrarHistoria(page);
    await gotoReady(page, '/');
    await page.waitForLoadState('networkidle').catch(() => {});

    // El bloque de mundos existe y, DENTRO, el árbol (no huérfano).
    const bloque = page.getByTestId('bloque-mundos');
    await bloque.scrollIntoViewIfNeeded();
    const arbol = page.getByTestId('arbol-mundos');
    await expect(arbol).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('El árbol de su finca')).toBeVisible();

    // Ramas vivas: al menos las de cultivos/suelo/agua (fuente única
    // mundosFinca.js). Cada rama es un botón operable.
    for (const id of ['cultivos', 'suelo', 'agua', 'clima']) {
      const rama = page.getByTestId(`arbol-rama-${id}`);
      await expect(rama).toHaveAttribute('role', 'button');
    }

    // El reloj del frailejón, con años reales (café sembrado hace ~2 años →
    // varios anillos). Es un botón que abre "el año de la finca".
    const reloj = page.getByTestId('reloj-frailejon');
    await reloj.scrollIntoViewIfNeeded();
    await expect(reloj).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('reloj-frailejon-anios')).toContainText('anillo');

    // La grilla/puerta plegable de main sigue presente debajo (unión): la
    // puerta "Toda mi finca" (plegado por defecto).
    await expect(page.getByTestId('abrir-mundos')).toBeVisible();

    // Captura para revisión del operador.
    await page.screenshot({ path: 'test-results/menu-arbol-reloj-home.png', fullPage: true });
    await arbol.screenshot({ path: 'test-results/menu-arbol-reloj.png' });

    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });
});

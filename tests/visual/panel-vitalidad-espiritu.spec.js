/**
 * PANEL DE VITALIDAD DEL ESPÍRITU en el home menú vivo (F2, Finca Organismo)
 * — verificación E2E con DATOS REALES de un perfil sembrado:
 *
 *   1. Siembra sesión + perfil integral (f2TestUtils) y crea EN LA IDB real
 *      dos FarmProcess (café en floración, maíz en cosecha) por la puerta
 *      autorizada (farmProcessCache.putFarmProcess) + un log--harvest real
 *      (logCache.put), el MISMO camino de producción.
 *   2. Verifica que el panel renderiza DENTRO del hero (no huérfano) con los
 *      números que salen de esos registros: vitalidad > 0, "2 sp." vivas,
 *      4 barras (💧🪱🦋🔥), contadores de especies/cosechas/anillos.
 *   3. Verifica la honestidad: el eje suelo (sin diagnóstico persistido)
 *      queda "—" con la nota "dato en camino" — nunca un número inventado.
 *
 * Corre en el proyecto `visual` (servidor :5174 con la flag F2 ON). Mismo
 * patrón de sesión/mocks que click-through-completo.spec.js.
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

/** Siembra ciclos + cosecha REALES en IndexedDB (la puerta de producción). */
async function sembrarFincaReal(page) {
  await page.evaluate(async () => {
    const { putFarmProcess } = await import('/src/db/farmProcessCache.js');
    const { logCache } = await import('/src/db/logCache.js');
    const now = Date.now();
    const hace8Meses = now - 8 * 30 * 24 * 60 * 60 * 1000;

    await putFarmProcess({
      process_id: 'e2e-pve-cafe',
      type: 'farm_process',
      attributes: {
        process_type: 'sowing',
        subject_kind: 'individual',
        subject_slug: 'coffea_arabica',
        subject_label: 'Café',
        quantity: 20,
        unit: 'plantas',
        status: 'active',
        current_stage: 'flowering',
        created_at: hace8Meses,
        updated_at: now,
      },
    });
    await putFarmProcess({
      process_id: 'e2e-pve-maiz',
      type: 'farm_process',
      attributes: {
        process_type: 'sowing',
        subject_kind: 'individual',
        subject_slug: 'zea_mays',
        subject_label: 'Maíz',
        quantity: 40,
        unit: 'plantas',
        status: 'active',
        current_stage: 'harvest',
        created_at: now - 3 * 24 * 60 * 60 * 1000,
        updated_at: now,
      },
    });
    // Cosecha real anotada (log--harvest, shape de producción).
    await logCache.put({
      id: 'e2e-pve-cosecha-1',
      type: 'log--harvest',
      name: 'Cosecha: Maíz',
      timestamp: Math.floor(now / 1000),
      status: 'done',
      quantity: [{ measure: 'weight', value: { decimal: '12' }, units: 'kg' }],
    });
  });
}

test.describe('Panel de vitalidad del espíritu (home menú vivo)', () => {
  test('renderiza con los datos reales del perfil sembrado, sin inventar', async ({ page, context }) => {
    const errors = trackJsErrors(page);
    await seedSession(page);
    await mockBackendBasico(context);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const flagOn = await flagF2Activa(page);
    test.skip(!flagOn, 'Build sin VITE_FINCA_VIVA_HOME_PERFIL — el hero F2 no se monta');

    await login(page);
    await sembrarFincaReal(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // El hero F2 y, DENTRO de él, el panel (no huérfano).
    const hero = page.getByTestId('finca-viva-hero');
    await expect(hero).toBeVisible({ timeout: 20000 });
    const panel = hero.getByTestId('panel-vitalidad-espiritu');
    await expect(panel).toBeVisible({ timeout: 20000 });
    await expect(panel).toContainText('VITALIDAD DEL ESPÍRITU');

    // Medidor circular con vitalidad REAL (café floreciendo + maíz en
    // cosecha → calcularVitalidad > 0, nunca "—").
    const vital = panel.getByTestId('pve-vitalidad');
    await expect(vital).toHaveAttribute('data-estado', 'ok');
    const vitalidadNum = Number((await vital.innerText()).trim());
    expect(vitalidadNum).toBeGreaterThan(0);
    expect(vitalidadNum).toBeLessThanOrEqual(100);

    // Badge: 2 especies vivas (café + maíz sembrados en la IDB).
    const vivas = panel.getByTestId('pve-especies-vivas');
    await expect(vivas).toContainText('2');
    await expect(vivas).toContainText('ESPECIES VIVAS');

    // Las 4 barras del mockup, en orden, con su ícono.
    const ejes = panel.locator('.pve-eje');
    await expect(ejes).toHaveCount(4);
    for (const [i, id] of ['clima', 'suelo', 'biodiversidad', 'energia'].entries()) {
      await expect(ejes.nth(i)).toHaveAttribute('data-eje', id);
    }
    await expect(panel).toContainText('💧');
    await expect(panel).toContainText('🪱');
    await expect(panel).toContainText('🦋');
    await expect(panel).toContainText('🔥');

    // Biodiversidad sale de las especies reales (2 de 6 → 33).
    await expect(ejes.nth(2)).toHaveAttribute('data-estado', 'ok');
    await expect(ejes.nth(2)).toContainText('33');

    // Contadores con los registros reales.
    await expect(panel.getByTestId('pve-conteo-especies')).toContainText('2');
    await expect(panel.getByTestId('pve-conteo-especies')).toContainText('especies registradas');
    await expect(panel.getByTestId('pve-conteo-cosechas')).toContainText('1');
    await expect(panel.getByTestId('pve-conteo-cosechas')).toContainText('cosechas anotadas');
    // Anillos: primer registro hace ~8 meses → 2 temporadas cumplidas + 1.
    const anillos = panel.getByTestId('pve-conteo-anillos');
    await expect(anillos).toHaveAttribute('data-estado', 'ok');
    await expect(anillos).toContainText('anillos del frailejón');
    await expect(anillos.locator('b')).toHaveText('3');

    // HONESTIDAD: suelo sin diagnóstico persistido → "—" + nota, cero inventos.
    await expect(ejes.nth(1)).toHaveAttribute('data-estado', 'pendiente');
    await expect(ejes.nth(1)).toContainText('—');
    await expect(panel.getByTestId('pve-nota-pendiente')).toContainText('dato en camino');

    // Captura para revisión visual del operador.
    await panel.screenshot({ path: 'test-results/panel-vitalidad-espiritu.png' });
    await page.screenshot({ path: 'test-results/panel-vitalidad-espiritu-home.png', fullPage: false });

    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });

  test('finca vacía: el panel no fabrica números (todo "—" o no aparece)', async ({ page, context }) => {
    await seedSession(page, { user: 'e2e-pve-vacia' });
    await mockBackendBasico(context);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const flagOn = await flagF2Activa(page);
    test.skip(!flagOn, 'Build sin VITE_FINCA_VIVA_HOME_PERFIL — el hero F2 no se monta');

    await login(page, { user: 'e2e-pve-vacia' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('finca-viva-hero')).toBeVisible({ timeout: 20000 });

    const panel = page.getByTestId('panel-vitalidad-espiritu');
    if (await panel.count()) {
      // Con el panel visible, NINGÚN contador puede traer un número inventado.
      await expect(panel.getByTestId('pve-vitalidad')).toHaveAttribute('data-estado', 'pendiente');
      await expect(panel.getByTestId('pve-conteo-especies').locator('b')).toHaveText('—');
      await expect(panel.getByTestId('pve-nota-pendiente')).toContainText('dato en camino');
    }
  });
});

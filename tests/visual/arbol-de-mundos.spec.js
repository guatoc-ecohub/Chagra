/**
 * EL ÁRBOL DE SU FINCA + EL RELOJ DEL FRAILEJÓN en el home menú vivo (F2,
 * tema biopunk2) — verificación E2E con DATOS REALES de un perfil sembrado:
 *
 *   1. Siembra sesión + perfil integral (f2TestUtils) con el tema biopunk2
 *      explícito y crea EN LA IDB real un FarmProcess con created_at de hace
 *      dos años (la puerta de producción: farmProcessCache.putFarmProcess).
 *   2. Verifica que el ÁRBOL renderiza en el bloque de mundos (no huérfano):
 *      una rama-vaina por mundo real (fuente única mundosFinca.js), corazón
 *      vivo y ramas de raíz (suelo/abono).
 *   3. Verifica el RELOJ DEL FRAILEJÓN con años REALES: el primer registro es
 *      de hace 2 años → 3 anillos (uno por año), nunca historia inventada.
 *   4. Verifica que una rama ENRUTA de verdad (cultivos → mundo Cultivos),
 *      exactamente igual que su tarjeta de la grilla.
 *
 * Corre en el proyecto `visual` (servidor :5174 con la flag F2 ON). Mismo
 * patrón de sesión/mocks que panel-vitalidad-espiritu.spec.js.
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

/** Tema biopunk2 explícito (la piel default; el árbol solo vive en biopunk). */
async function sembrarTemaBiopunk2(page) {
  await page.addInitScript(() => {
    try { window.localStorage.setItem('chagra:theme', 'biopunk2'); } catch (_) { /* noop */ }
  });
}

/** Siembra un ciclo REAL con fecha de hace 2 años (la puerta de producción). */
async function sembrarCicloViejo(page) {
  await page.evaluate(async () => {
    const { putFarmProcess } = await import('/src/db/farmProcessCache.js');
    const now = new Date();
    const hace2Anios = new Date(now.getFullYear() - 2, now.getMonth(), 15).getTime();
    await putFarmProcess({
      process_id: 'e2e-adm-cafe',
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
        updated_at: Date.now(),
      },
    });
  });
}

test.describe('Árbol de mundos + reloj del frailejón (home biopunk2)', () => {
  test('el árbol enruta a los mundos reales y el reloj cuenta los años reales', async ({ page, context }) => {
    const errors = trackJsErrors(page);
    await seedSession(page);
    await sembrarTemaBiopunk2(page);
    await mockBackendBasico(context);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const flagOn = await flagF2Activa(page);
    test.skip(!flagOn, 'Build sin VITE_FINCA_VIVA_HOME_PERFIL — el hero F2 no se monta');

    await login(page);
    await sembrarCicloViejo(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByTestId('finca-viva-hero')).toBeVisible({ timeout: 20000 });

    // 1) EL ÁRBOL vive dentro del bloque de mundos (no huérfano).
    const bloque = page.getByTestId('bloque-mundos');
    const arbol = bloque.getByTestId('arbol-mundos');
    await arbol.scrollIntoViewIfNeeded();
    await expect(arbol).toBeVisible({ timeout: 20000 });
    await expect(arbol).toContainText('El árbol de su finca');

    // Una rama-vaina por mundo del manifiesto (perfil con animales → todas).
    for (const id of ['cultivos', 'suelo', 'agua', 'sanidad', 'clima', 'mercado', 'animales', 'abono']) {
      await expect(arbol.getByTestId(`arbol-rama-${id}`)).toBeVisible();
    }

    // 2) EL RELOJ DEL FRAILEJÓN: primer registro hace 2 años → 3 anillos
    //    (p. ej. 2024·2025·2026), un anillo por año REAL.
    const reloj = arbol.getByTestId('reloj-frailejon');
    await reloj.scrollIntoViewIfNeeded();
    await expect(reloj).toBeVisible({ timeout: 20000 });
    await expect(reloj.getByTestId('reloj-frailejon-anios')).toContainText('3 anillos');
    const anioActual = new Date().getFullYear();
    await expect(reloj).toContainText(`desde ${anioActual - 2}`);

    // Captura para revisión visual del operador (árbol completo + reloj).
    await arbol.screenshot({ path: 'test-results/arbol-de-mundos.png' });

    // 3) Una rama ENRUTA igual que su tarjeta: cultivos → el mundo Cultivos.
    await arbol.getByTestId('arbol-rama-cultivos').click();
    await expect(page.getByTestId('finca-viva-hero')).toHaveCount(0, { timeout: 15000 });

    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });
});

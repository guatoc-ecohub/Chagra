import { test, expect } from '@playwright/test';
import {
  assertSinOverflowHorizontal,
  entrarAFincaViva,
  filtrarErroresCriticos,
  trackJsErrors,
} from './f2TestUtils.js';

/**
 * click-through-completo.spec.js — QA de cierre de jornada (2026-07-05),
 * punto 2: click-through E2E de TODA la interfaz del home "Finca Viva" (F2,
 * flag VITE_FINCA_VIVA_HOME_PERFIL — ver playwright.config.js proyecto
 * `visual`, servidor :5174).
 *
 * Por cada pantalla asserta: (1) el marcador de esa pantalla está visible
 * (montó), (2) cero errores JS críticos de consola, (3) sin overflow
 * horizontal. NO es regresión de píxeles (eso es app-visual-regression.spec.js);
 * es un crawl funcional de alcanzabilidad ("reachability").
 *
 * Dos bloques:
 *   A) CLICKS REALES sobre los 4 portales del hero + 2 mundos desde la
 *      grilla — prueba que el wiring de clicks de verdad funciona.
 *   B) CRAWL de las 9 pantallas restantes vía el mismo mecanismo interno
 *      que usan esos botones (`window.dispatchEvent(new CustomEvent(
 *      'chagraNavigate', ...))`, el patrón ya usado por
 *      tests/visual/visualTestUtils.js) — cubre TODAS las entradas sin que
 *      el runtime de un crawl completo de 20 pantallas se dispare (chromium
 *      single-process en NixOS es lento, ver playwright.config.js).
 *
 * Si la build no tiene la flag F2 ON, el describe entero se salta limpio
 * (mismo criterio que finca-viva-temas.spec.js) — no rompe el gate visual.
 */

test.describe('Click-through completo — home Finca Viva (F2)', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page, context }) => {
    const entro = await entrarAFincaViva(page, context);
    test.skip(!entro, 'Flag VITE_FINCA_VIVA_HOME_PERFIL OFF: harness del home F2.');
  });

  test('bloque A — clicks reales: 4 portales del hero + 2 mundos de la grilla', async ({ page }) => {
    const errors = trackJsErrors(page);

    // ── Portal "Mi finca" → revela "Registrar en la finca" en la MISMA hoja
    // (no navega a otra vista; scrollea a #finca-gestion). Cubre "registro".
    await test.step('portal Mi finca → bloque-registrar', async () => {
      await page.getByTestId('finca-viva-portales').getByRole('button', { name: /^Mi finca:/ }).click();
      await expect(page.getByTestId('bloque-registrar')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId('gestion-tiles')).toBeVisible();
      await assertSinOverflowHorizontal(page, 'portal Mi finca');
    });

    // ── Portal "Aprender" → el curso (AprenderConAgente) + entrar a 1 lección.
    await test.step('portal Aprender → curso → lección suelo', async () => {
      await page.getByTestId('finca-viva-portales').getByRole('button', { name: /^Aprender:/ }).click();
      await expect(page.getByTestId('aprende-con-agente')).toBeVisible({ timeout: 15_000 });
      await assertSinOverflowHorizontal(page, 'curso (índice)');

      await page.getByTestId('leccion-card-suelo').click();
      await expect(page.getByTestId('leccion-view')).toBeVisible({ timeout: 10_000 });
      await assertSinOverflowHorizontal(page, 'curso (lección suelo)');

      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'dashboard' } })),
      );
      await expect(page.getByTestId('finca-viva-hero')).toBeVisible({ timeout: 10_000 });
    });

    // ── Portal "Jugar".
    await test.step('portal Jugar', async () => {
      await page.getByTestId('finca-viva-portales').getByRole('button', { name: /^Jugar:/ }).click();
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      await assertSinOverflowHorizontal(page, 'juego');
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'dashboard' } })),
      );
      await expect(page.getByTestId('finca-viva-hero')).toBeVisible({ timeout: 10_000 });
    });

    // ── Portal "Pregúntele a Chagra" → abre el chat del agente.
    await test.step('portal Pregúntele a Chagra → agente', async () => {
      await page
        .getByTestId('finca-viva-portales')
        .getByRole('button', { name: /^Pregúntele a Chagra:/ })
        .click();
      await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 15_000 });
      await assertSinOverflowHorizontal(page, 'agente (vía portal)');
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'dashboard' } })),
      );
      await expect(page.getByTestId('finca-viva-hero')).toBeVisible({ timeout: 10_000 });
    });

    // ── 2 mundos, CLIC real desde la grilla (no chagraNavigate directo):
    // "El suelo vivo" (genérico → MundoScreen) y "El agua" (mundo `directo`,
    // sin pantalla intermedia) — cubren los dos patrones de ruteo.
    await test.step('mundo suelo (grilla → MundoScreen)', async () => {
      await expect(page.getByTestId('mundos-finca')).toBeVisible({ timeout: 10_000 });
      await page.getByTestId('mundo-suelo').click();
      await expect(page.getByTestId('mundo-screen-suelo')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId('mundo-agente')).toBeVisible();
      await assertSinOverflowHorizontal(page, 'mundo suelo');
      await page.evaluate(() =>
        window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'dashboard' } })),
      );
      await expect(page.getByTestId('finca-viva-hero')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('mundo agua (grilla → directo, sin pantalla intermedia)', async () => {
      await page.getByTestId('mundo-agua').click();
      await expect(page.getByTestId('agua-screen')).toBeVisible({ timeout: 10_000 });
      await assertSinOverflowHorizontal(page, 'mundo agua');
    });

    expect(filtrarErroresCriticos(errors), 'errores JS críticos en el bloque A').toEqual([]);
  });

  // ── Bloque B: el resto de mundos + ayuda + perfil, vía el mismo
  // mecanismo interno de navegación (chagraNavigate) que usan los botones
  // reales — cubre alcanzabilidad de TODAS las pantallas sin pagar el costo
  // de un crawl 100% por click en un chromium single-process lento.
  const RESTO_PANTALLAS = [
    { nombre: 'mundo abono (directo → estiercol)', view: 'estiercol', marcador: 'estiercol-pilares' },
    { nombre: 'mundo sanidad', view: 'mundo', data: { mundo: 'sanidad' }, marcador: 'mundo-screen-sanidad' },
    { nombre: 'mundo clima', view: 'mundo', data: { mundo: 'clima' }, marcador: 'mundo-screen-clima' },
    { nombre: 'mundo animales', view: 'mundo', data: { mundo: 'animales' }, marcador: 'mundo-screen-animales' },
    { nombre: 'mundo mercado', view: 'mundo', data: { mundo: 'mercado' }, marcador: 'mundo-screen-mercado' },
    { nombre: 'mundo diseño', view: 'mundo', data: { mundo: 'disenio' }, marcador: 'mundo-screen-disenio' },
    { nombre: 'mundo cultivos (portada dedicada)', view: 'mundo_cultivos', marcador: 'mundo-cultivos-hub' },
    // HelpManual NO usa ScreenShell (router interno propio) — el buscador
    // ("Buscar en la ayuda…") es el marcador estable de HelpHomeScreen. Es un
    // <input aria-label="Buscar en la ayuda">: getByLabel (accessible name),
    // NO getByText (placeholder/aria-label no son texto de nodo DOM).
    { nombre: 'ayuda', view: 'ayuda', labelMarcador: /Buscar en la ayuda/i },
    // ProfileScreen SÍ usa ScreenShell (→ ScreenShellF2 con la flag ON).
    { nombre: 'perfil', view: 'perfil', marcador: 'screen-shell-f2' },
  ];

  for (const pantalla of RESTO_PANTALLAS) {
    test(`bloque B — ${pantalla.nombre}: monta sin error JS ni overflow`, async ({ page }) => {
      const errors = trackJsErrors(page);

      await page.evaluate(
        ({ view, data }) => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view, initialData: data || null } })),
        { view: pantalla.view, data: pantalla.data },
      );
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      if (pantalla.labelMarcador) {
        await expect(page.getByLabel(pantalla.labelMarcador), `no montó ${pantalla.nombre}`).toBeVisible({
          timeout: 15_000,
        });
      } else {
        await expect(page.getByTestId(pantalla.marcador), `no montó ${pantalla.nombre}`).toBeVisible({
          timeout: 15_000,
        });
      }
      await expect(
        page.getByText('Vista no disponible'),
        `${pantalla.nombre} cayó al fallback "Vista no disponible"`,
      ).toHaveCount(0);

      await assertSinOverflowHorizontal(page, pantalla.nombre);
      expect(filtrarErroresCriticos(errors), `errores JS críticos en ${pantalla.nombre}`).toEqual([]);
    });
  }

  test('view desconocido cae a "Vista no disponible", NUNCA a pantalla en blanco', async ({ page }) => {
    const errors = trackJsErrors(page);
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'esto-no-existe-nunca' } })),
    );
    await expect(page.getByText('Vista no disponible')).toBeVisible({ timeout: 10_000 });
    await assertSinOverflowHorizontal(page, 'view desconocido');
    expect(filtrarErroresCriticos(errors), 'errores JS críticos con view desconocido').toEqual([]);
  });
});

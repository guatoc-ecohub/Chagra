/* global process */
import { test, expect } from '@playwright/test';

/**
 * e2e-espiritu-entrada.spec.js — la entrada visible al AVATAR-ESPÍRITU
 * (#/espiritu) en el home, GATED por capability Pro.
 *
 * Contexto: el módulo avatar-espiritu-pro estaba montado y sirviendo pero
 * HUÉRFANO (cero entradas en la UI — feedback-features-ui-huerfanas-sin-
 * cablear). La entrada nueva vive bajo la grilla de LOS MUNDOS DE MI FINCA
 * (MundosDeMiFinca, banda .mf-espiritu) y SOLO se renderiza cuando el
 * registry tiene un módulo con capability 'avatar-espiritu'.
 *
 * Pro SIMULADO: el dev server corre en modo DEV, donde main.jsx expone
 * window.__chagraRegistry. Registramos un módulo fake con la capability y el
 * mount devolviendo un componente marcador (los componentes React pueden
 * devolver string — cero dependencia del React del bundle). Esto ejercita el
 * MISMO camino que loadProModules en prod: registry.register() → suscripción
 * (useSyncExternalStore) → la banda aparece sin recargar.
 *
 * Patrones de la suite: mock OAuth/API en context.route, ORIGIN 5173,
 * data-testid como selectores.
 */

// Servidor 5174 (webServer segundo de playwright.config.js): corre con
// VITE_FINCA_VIVA_HOME_PERFIL=true — la realidad de prod/stg. La grilla de
// mundos (y con ella esta entrada) SOLO existe en el home F2; en el 5173
// legacy (flag OFF) el bloque no se renderiza.
const ORIGIN = 'http://localhost:5174';

const REGISTRAR_MODULO_FAKE = () => {
  window.__chagraRegistry.register({
    id: 'avatar-espiritu-pro',
    version: '0.0.0-e2e',
    capabilities: ['avatar-espiritu'],
    mount: async () => ({ default: () => 'AVATAR ESPIRITU PRO MONTADO (E2E)' }),
  });
};

test.describe('Entrada visible al avatar-espíritu (gate Pro)', () => {
  test.beforeEach(async ({ context }) => {
    // Mock OAuth — sin FarmOS real.
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-espiritu-fake-token',
          refresh_token: 'e2e-espiritu-fake-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      }),
    );
    // Mock API — offline-first.
    for (const pattern of ['**/api/**', '**/jsonapi/**']) {
      await context.route(pattern, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        }),
      );
    }
    // Silenciar sidecar / NLU (el grafo live está OFF y no dependemos de él).
    await context.route('**/nlu**', (route) => route.abort('blockedbyclient'));
    await context.route('**/resolve-entities**', (route) => route.abort('blockedbyclient'));
  });

  // Saltar onboarding + wizard de perfil (mismo patrón de e2e-smoke-pilotos):
  // sin perfil sembrado, el wizard "Esta chagra es suya" tapa el home.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('chagra:onboarding:done', '1');
        window.localStorage.setItem('chagra:bienvenida-vista:v1', '1');
        window.localStorage.setItem(
          'chagra:profile:v1',
          JSON.stringify({
            rol: 'agricultor',
            vocacion: 'campesino',
            animales: [],
            finca_tipo: 'rural',
            finca_altitud: '1800',
            piso_confirmado: '1',
          }),
        );
      } catch (_) {
        /* noop */
      }
    });
  });

  test('sin Pro no hay rastro; con Pro aparece, navega y monta el avatar', async ({ page }) => {
    // ── Login ──────────────────────────────────────────────────────────
    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-espiritu');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByTestId('mundos-finca')).toBeVisible({ timeout: 20_000 });

    // ── 1. SIN módulo Pro: cero rastro (ni botón muerto ni teaser) ─────
    await expect(page.getByTestId('entrada-espiritu')).toHaveCount(0);

    // ── 2. Simular Pro: registrar el módulo fake (camino real de
    //       loadProModules). La banda debe aparecer SOLA (suscripción). ──
    await page.waitForFunction(() => !!window.__chagraRegistry);
    await page.evaluate(REGISTRAR_MODULO_FAKE);
    const entrada = page.getByTestId('entrada-espiritu');
    await expect(entrada).toBeVisible({ timeout: 5_000 });
    await expect(entrada).toContainText(/el espíritu de su finca/i);

    // ── 3. Click → navega a la vista espiritu_pro y monta el avatar ────
    await entrada.scrollIntoViewIfNeeded();
    // Captura opcional para revisión del operador (ESPIRITU_SHOTS=dir).
    if (process.env.ESPIRITU_SHOTS) {
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${process.env.ESPIRITU_SHOTS}/espiritu-entrada-home.png` });
    }
    await entrada.click();
    await expect(page.getByText('AVATAR ESPIRITU PRO MONTADO (E2E)')).toBeVisible({
      timeout: 10_000,
    });
    // La grilla del home ya no está: navegó de verdad.
    await expect(page.getByTestId('mundos-finca')).toHaveCount(0);
    if (process.env.ESPIRITU_SHOTS) {
      await page.screenshot({ path: `${process.env.ESPIRITU_SHOTS}/espiritu-vista-montada.png` });
    }
  });

  test('la ruta #/espiritu (alias hash) monta la misma vista con Pro', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.getByLabel(/usuario/i).fill('e2e-espiritu');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByTestId('mundos-finca')).toBeVisible({ timeout: 20_000 });

    await page.waitForFunction(() => !!window.__chagraRegistry);
    await page.evaluate(REGISTRAR_MODULO_FAKE);

    // Deep-link por hash (listener hashchange de App.jsx).
    await page.evaluate(() => {
      window.location.hash = '#/espiritu';
    });
    await expect(page.getByText('AVATAR ESPIRITU PRO MONTADO (E2E)')).toBeVisible({
      timeout: 10_000,
    });
  });
});

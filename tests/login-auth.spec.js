import { test, expect } from '@playwright/test';

/**
 * login-auth.spec.js — cobertura E2E del flujo de login y onboarding inicial.
 *
 * El componente vive en src/components/LoginScreen.jsx. El login pega a
 * OAuth password grant del backend farmOS. Stats globales (especies,
 * biopreparados, etc.) son visibles pre-auth via WelcomeStatsHero.
 *
 * NO testea credenciales reales — usa mocks de auth para los happy paths.
 */

const ORIGIN = 'http://localhost:5173';

test.describe('LoginScreen — paint inicial', () => {
  test('muestra hero stats pre-login con valores reales (no zeros)', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');

    // El componente WelcomeStatsHero mode=pre-login debe traer cifras
    // del catálogo seed (especies, biopreparados, fichas pedagógicas).
    // Bug 2026-05-23: si arranca con `useState({species: 0})` muestra "0
    // especies" al primer paint — fix #1015 inicializa con seed real.
    const heroText = await page.locator('body').innerText();
    expect(heroText).not.toMatch(/^0 especies/m);
    expect(heroText.length).toBeGreaterThan(50);
  });

  test('formulario expone campos usuario y contraseña accesibles', async ({ page }) => {
    await page.goto(ORIGIN);
    const usuario = page.getByRole('textbox', { name: /Usuario/i });
    const password = page.locator('input[type="password"]');
    const submit = page.getByRole('button', { name: /Ingresar/i });

    await expect(usuario).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
  });

  test('autocomplete username está desactivado (autoCapitalize none + autoCorrect off)', async ({ page }) => {
    await page.goto(ORIGIN);
    const usuario = page.getByRole('textbox', { name: /Usuario/i });
    await expect(usuario).toHaveAttribute('autocapitalize', 'none');
    await expect(usuario).toHaveAttribute('autocorrect', 'off');
  });
});

test.describe('LoginScreen — submit y errores', () => {
  test('credenciales inválidas muestran error sin lanzar a otra pantalla', async ({ page }) => {
    // Interceptar OAuth backend para devolver 401.
    // A-19 (2026-05-30): context.route (NO page.route). authService hace
    // fetch(`${FARMOS_URL}/oauth/token`) que es same-origin → el Service
    // Worker (public/sw.js, POST passthrough) lo re-emite con fetch() y
    // sombrea page.route. Con page.route el mock NO aplicaba: la app pegaba
    // a la red real (404) y el test "pasaba en falso" porque solo asertaba
    // que el botón seguía visible (cierto con 401 mockeado O con 404 real).
    // Ver feedback-sw-shadows-playwright-route.
    await page.context().route('**/oauth/token', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant' }),
      });
    });

    await page.goto(ORIGIN);
    await page.getByRole('textbox', { name: /Usuario/i }).fill('usuario-fake');
    await page.locator('input[type="password"]').fill('clave-mala');
    await page.getByRole('button', { name: /Ingresar/i }).click();

    // Assert reforzado A-19: el mock 401 SÍ se ejerce. authService lanza
    // "Error de Autenticación: 401" → handleLogin lo captura → toast de error
    // (role="alert"). El toast auto-dismiss a 4s, por eso se asserta primero.
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });

    // Y debe seguir en LoginScreen (no navegar al dashboard).
    await expect(page.getByRole('button', { name: /Ingresar/i })).toBeVisible({ timeout: 5000 });
  });

  test.skip('botón Ingresar muestra loader cuando submit en curso', async () => {
    // Skipped — el botón tiene disabled={loading} pero `loading` se setea
    // al wrappear el handleLogin; los hooks de React no son síncronos así
    // que en headless el assert es flaky. Si se reescribe con
    // `data-testid="login-loader"` que aparece en lugar del texto, este
    // test se puede volver determinístico.
  });
});

test.describe('LoginScreen — legal + privacidad', () => {
  test('muestra enlaces legales o footer con info legal', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    // LegalLinks puede usar diferentes labels. Aceptamos cualquier
    // mención a términos, privacidad, condiciones, política, chagra.bio
    const legal = (await page.locator('body').innerText()).toLowerCase();
    const hasLegal =
      /términos|privacidad|legal|condiciones|política|política/.test(legal) ||
      // Si LegalLinks usa links externos, el href puede contener legal/privacy
      (await page.locator('a[href*="legal"], a[href*="privacy"], a[href*="terms"], a[href*="chagra.bio"]').count()) > 0;
    expect(hasLegal).toBe(true);
  });
});

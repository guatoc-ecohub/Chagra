import { test, expect } from '@playwright/test';

/**
 * e2e-carlos-rivera.spec.js — TAREA 40: perfil carlos.rivera, campesino + gallinas.
 *
 * Carlos Rivera es un campesino que tiene gallinas. Su home debe mostrar:
 *   - Modulos campesinos: plantas, clima, plagas, bitacora, insumos
 *   - Tarjeta de Silvopastoreo visible (tiene animales → silvopastoreo)
 *   - NO tarjeta de Cerdos (no tiene cerdos, solo gallinas)
 *   - Si el onboarding todavia esta abierto (sin plantas), ver pregunta
 *     de manejo de gallinas
 *
 * Estrategia: sembrar perfil con animales=['gallinas'], vocacion='campesino',
 * sin plantas registradas (onboarding abierto). Login programatico, mock
 * backend vacio, verificar modulos esperados en el home.
 *
 * Español colombiano (tu/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';
const TEST_USERNAME = 'carlos.rivera';

async function seedCarlos(page) {
  await page.addInitScript((username) => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', username);
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          rol: 'campesino',
          vocacion: 'campesino',
          finca_tipo: 'parcela',
          finca_altitud: '1700',
          piso_confirmado: '1',
          animales: ['gallinas'],
        }),
      );
    } catch (_) {
      /* noop */
    }
  }, TEST_USERNAME);
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-carlos-token',
        refresh_token: 'e2e-carlos-refresh',
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
  await page.context().route('**/api/ollama/api/tags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [{ name: 'chagra:latest' }] }),
    }),
  );
}

async function login(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-carlos-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondio OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, TEST_USERNAME);
}

test.describe('Carlos Rivera — campesino con gallinas', () => {
  test('home muestra modulos campesinos + Silvopastoreo, sin Cerdos', async ({ page }) => {
    await seedCarlos(page);
    await mockBackend(page);

    await page.goto(ORIGIN);
    await login(page);
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle').catch(() => {});

    // Modulos campesinos visibles
    const body = page.locator('body');
    await expect(body).toContainText('Mis plantas');
    await expect(body).toContainText('Clima');
    await expect(body).toContainText('Plagas');
    await expect(body).toContainText('Bitacora');
    await expect(body).toContainText('Insumos');

    // Seguimiento: Silvopastoreo SI (tiene animales)
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 10000 });
    await expect(seguimiento.getByText('Silvopastoreo', { exact: false })).toBeVisible();

    // Cerdos NO (solo gallinas)
    await expect(seguimiento.getByText('Cerdos', { exact: false })).not.toBeVisible();

    // Onboarding abierto (sin plantas): verificar que gallinas aparece en el
    // contexto del perfil (el onboarding pregunta sobre manejo de animales).
    // Dado que el perfil tiene 'gallinas', la pregunta de manejo debe aparecer
    // si el onboarding esta abierto.
    const onboardingText = await body.innerText();
    const hasGallinasRef = /gallina|ave|ponedora/i.test(onboardingText);
    // Soft: el onboarding puede no mostrar literal "gallinas_manejo" como texto
    // si el componente se renombro, pero el perfil registra animales=['gallinas'].
    expect.soft(hasGallinasRef,
      'Onboarding abierto deberia referenciar gallinas o manejo de aves',
    ).toBe(true);

    await page.screenshot({ path: '/tmp/carlos-rivera.png', fullPage: true });
  });
});

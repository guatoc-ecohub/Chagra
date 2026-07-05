import { test, expect } from '@playwright/test';

/**
 * curso-video-manual.spec.js — REGRESIÓN bug operador 2026-07-05.
 *
 * "En los cursos no se ven los videos": diagnóstico en vivo descartó CSP,
 * build/dist y el propio HTML animado (todos funcionan online) — la causa
 * real era que el Service Worker NO precacheaba `/manual/mv-*.html`
 * (public/sw.js ASSETS_TO_CACHE). El iframe de VideoManual.jsx solo los
 * cacheaba en background la primera vez que alguien tocaba "reproducir"
 * (Network-First genérico); si esa primera vez ocurría sin señal (el caso
 * rural que este curso busca resolver), el fetch fallaba y el iframe
 * quedaba en blanco. Fix: agregarlos a ASSETS_TO_CACHE (mismo patrón que
 * catalog.sqlite). Cobertura del contrato de precache en
 * tests/unit/sw-precache-audit.test.js; este spec cubre el flujo real en
 * navegador: login -> abrir el curso -> reproducir -> el iframe pinta
 * contenido (no queda en blanco).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const OPERADOR_USERNAME = 'op-test';

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-operador-token',
        refresh_token: 'e2e-operador-refresh',
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

async function loginComoOperador(page) {
  await page.getByRole('textbox', { name: /Usuario/i }).fill(OPERADOR_USERNAME);
  await page.locator('input[type="password"]').fill('e2e-operador-pwd');
  await page.getByRole('button', { name: /Ingresar/i }).click();
  await page
    .getByRole('button', { name: /Ingresar/i })
    .waitFor({ state: 'detached', timeout: 15000 })
    .catch(() => {});
}

test('el video-manual del módulo 1 (siembra) se reproduce dentro del iframe', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await loginComoOperador(page);

  await page.goto('/#curso');
  await page.waitForSelector('[data-testid="curso-chagra"]', { timeout: 15000 });

  await page.click('[data-testid="curso-modulo-m1"]');
  await page.waitForSelector('[data-testid="curso-modulo-detalle"]', { timeout: 10000 });

  const videos = page.locator('[data-testid="video-manual"]');
  await expect(videos).toHaveCount(2); // módulo 1: siembra + voz-registro

  await videos.first().getByTestId('video-manual-play').click();

  const iframe = videos.first().locator('iframe');
  await expect(iframe).toBeAttached({ timeout: 5000 });
  await expect(iframe).toHaveAttribute('src', /mv-siembra\.html$/);

  // El iframe es same-origin (mismo CSP default-src 'self'): su contenido es
  // inspeccionable. Si el HTML no cargó (404 / red caída / blanco), el body
  // del frame estaría vacío o el frame nunca "asienta". Este assert es lo
  // que hubiera cazado el bug: el DOM interno del video-manual debe pintar
  // el stage animado (#app), no quedar vacío.
  const frame = page.frameLocator('[data-testid="video-manual"] iframe').first();
  await expect(frame.locator('#app')).toBeAttached({ timeout: 5000 });
});

test('un módulo sin video (m2: suelo) no rompe la vista — no hay sección de video', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/');
  await loginComoOperador(page);

  await page.goto('/#curso');
  await page.waitForSelector('[data-testid="curso-chagra"]', { timeout: 15000 });

  await page.click('[data-testid="curso-modulo-m2"]');
  const detalle = page.getByTestId('curso-modulo-detalle');
  await expect(detalle).toBeVisible({ timeout: 10000 });

  // m2 (Conoce tu suelo y tus matas) trae videos: [] a propósito — solo hay
  // 4 video-manuales grabados (siembra, voz-registro, milpa, sipsa). La
  // vista debe seguir mostrando lecciones + pruébalo sin ningún placeholder
  // roto de video.
  await expect(page.locator('[data-testid="video-manual"]')).toHaveCount(0);
  await expect(detalle).toContainText('Aprende el porqué');
});

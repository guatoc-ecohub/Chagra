import { test, expect } from '@playwright/test';

/**
 * ubicacion-auto.spec.js — feature ubicación automática del agente.
 *
 * Backend ya mergeado (PRs #75 cliente reverse-geocoding, #76 MCP tool
 * get_ubicacion_actual, #77 sidecar /resolve-ubicacion).
 *
 * Este spec cubre la cascade en el PWA (cuando se mergee el PR 4/4):
 *   Tier 1 — si finca activa → usar coordenadas de la finca
 *   Tier 2 — si no hay finca → geolocation del browser
 *
 * Muchos tests están skipped hasta que el PR 4/4 esté en main. Los activos
 * cubren lo que ya está en producción: sidecar accesible + payload shape.
 */

const ORIGIN = 'http://localhost:5173';
const CHOACHI = { lat: 4.5266, lng: -73.923 };

test.describe('Feature ubicación — sidecar accesible (smoke)', () => {
  test('mock /resolve-ubicacion responde con payload válido', async ({ page }) => {
    await page.route('**/resolve-ubicacion', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          source: 'browser_geolocation',
          lat: CHOACHI.lat,
          lng: CHOACHI.lng,
          municipio: 'Choachí',
          departamento: 'Cundinamarca',
          pais: 'CO',
          altitud_msnm: 1931,
          piso_termico: 'templado',
          sources_used: ['nominatim', 'open-meteo'],
        }),
      });
    });
    await page.goto(ORIGIN);
    const result = await page.evaluate(async ({ lat, lng }) => {
      const r = await fetch('/resolve-ubicacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, source: 'browser_geolocation' }),
      });
      return r.json();
    }, CHOACHI);
    expect(result.available).toBe(true);
    expect(result.municipio).toBe('Choachí');
    expect(result.piso_termico).toBe('templado');
  });

  test('mock graceful degrade cuando sidecar devuelve no_match', async ({ page }) => {
    await page.route('**/resolve-ubicacion', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: false,
          source: 'manual',
          lat: 0,
          lng: 0,
          reason: 'no_match',
        }),
      });
    });
    await page.goto(ORIGIN);
    const result = await page.evaluate(async () => {
      const r = await fetch('/resolve-ubicacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 0, lng: 0, source: 'manual' }),
      });
      return r.json();
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe('no_match');
  });
});

test.describe.skip('Feature ubicación — cascade PWA (skipped hasta PR 4/4 mergeado)', () => {
  test('tier 1: usuario con finca activa usa coordenadas de la finca', async ({ page, context }) => {
    await context.addInitScript(({ lat, lng }) => {
      window.localStorage.setItem('finca-activa-coords', JSON.stringify({ lat, lng }));
    }, CHOACHI);

    await page.route('**/resolve-ubicacion', async route => {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.source).toBe('finca_registrada');
      expect(body.lat).toBeCloseTo(CHOACHI.lat, 3);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          source: 'finca_registrada',
          municipio: 'Choachí',
          altitud_msnm: 1931,
          piso_termico: 'templado',
        }),
      });
    });
    await page.goto(ORIGIN);
  });

  test('tier 2: usuario sin finca usa geolocation del browser', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(CHOACHI);

    await page.route('**/resolve-ubicacion', async route => {
      const body = JSON.parse(route.request().postData() || '{}');
      expect(body.source).toBe('browser_geolocation');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          source: 'browser_geolocation',
          municipio: 'Choachí',
          altitud_msnm: 1931,
          piso_termico: 'templado',
        }),
      });
    });
    await page.goto(ORIGIN);
  });

  test('cuando usuario está fuera de Colombia (Alemania), app degrada elegante', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ lat: 52.52, lng: 13.405 });

    await page.route('**/resolve-ubicacion', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          source: 'browser_geolocation',
          municipio: 'Berlin',
          departamento: 'Berlin',
          pais: 'DE',
          altitud_msnm: 34,
          piso_termico: 'cálido',
        }),
      });
    });
    await page.goto(ORIGIN);
    await expect(page.locator('text=/fuera de Colombia|no personalizada/i')).toBeVisible({ timeout: 5000 });
  });

  test('si el usuario rechaza geolocation, agente responde genéricamente con banner', async ({ page, context }) => {
    await context.clearPermissions();
    await page.goto(ORIGIN);
    await expect(page.locator('text=/permití ubicación|agregá tu finca/i')).toBeVisible({ timeout: 5000 });
  });
});

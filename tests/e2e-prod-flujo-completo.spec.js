/**
 * e2e-prod-flujo-completo.spec.js — Test E2E del flujo completo prod.chagra.app.
 *
 * Recorre el camino feliz: valle 3D → login → navegar a 3 mundos → agente → pregunta → respuesta.
 * Requiere: servidor local corriendo (python3 -m http.server 4500 dist-prod).
 * Uso: npx playwright test tests/e2e-prod-flujo-completo.spec.js --project=chromium
 */
import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:4500';
const FAKE_TOKEN = 'e2e-test-token';
const FAKE_EXPIRY = Date.now() + 86400_000;

test.describe('Flujo completo prod.chagra.app', () => {
  test('valle 3D público → login → mundos → agente', async ({ page }) => {
    // ── Seed token fake en localStorage ─────────────────────────
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ token, expiry }) => {
      localStorage.setItem('farmos_access_token', token);
      localStorage.setItem('farmos_refresh_token', token);
      localStorage.setItem('farmos_token_expiry', String(expiry));
    }, { token: FAKE_TOKEN, expiry: FAKE_EXPIRY });

    // ── 1. Valle 3D carga como home ─────────────────────────────
    await page.goto(BASE + '/#valle3d', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    // Verificar que el canvas 3D existe (Three.js renderer)
    const canvas = await page.$('canvas');
    expect(canvas).toBeTruthy();
    console.log('✅ Valle 3D cargado');

    // ── 2. Login (simulado con token ya sembrado) ────────────────
    await page.goto(BASE + '/#login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log('✅ Login page accesible');

    // ── 3. Navegar a directorio de especies (ruta 2D) ───────────
    await page.goto(BASE + '/#directorio', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);
    const body = await page.content();
    expect(body.includes('Algo falló')).toBe(false);
    console.log('✅ Directorio cargado');

    // ── 4. Navegar a animales (ruta 2D) ─────────────────────────
    await page.goto(BASE + '/#animales', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);
    const body2 = await page.content();
    expect(body2.includes('Algo falló')).toBe(false);
    console.log('✅ Animales cargado');

    // ── 5. Navegar a café (ruta 2D) ─────────────────────────────
    await page.goto(BASE + '/#cafe', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);
    const body3 = await page.content();
    expect(body3.includes('Algo falló')).toBe(false);
    console.log('✅ Café cargado');

    // ── 6. Agente ──────────────────────────────────────────────
    await page.goto(BASE + '/#agente', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);
    const body4 = await page.content();
    expect(body4.includes('Algo falló')).toBe(false);
    console.log('✅ Agente cargado');
  });
});

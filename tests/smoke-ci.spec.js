/**
 * T41 — Smoke test automatizado para CI.
 *
 * 5 rutas críticas (valle3d, agente, directorio, animales, cafe).
 * Si alguna crashea, el job falla y bloquea el PR.
 * Uso: npx vitest run tests/smoke-ci.spec.js
 */

import { chromium } from 'playwright';
import { expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://127.0.0.1:4500';
const CHROMIUM = '/run/current-system/sw/bin/chromium';
const TOKEN = 'ci-smoke-' + Date.now();

const RUTAS_CRITICAS = [
  { path: 'valle3d', label: 'Valle 3D' },
  { path: 'agente', label: 'Agente' },
  { path: 'directorio', label: 'Directorio' },
  { path: 'animales', label: 'Animales' },
  { path: 'cafe', label: 'Café' },
];

let browser, page;

beforeAll(async () => {
  browser = await chromium.launch({ executablePath: CHROMIUM, headless: true,
    args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-gpu'] });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(({ t, e }) => { localStorage.setItem('farmos_access_token', t); localStorage.setItem('farmos_token_expiry', String(e)); },
    { t: TOKEN, e: Date.now() + 86400000 });
});

afterAll(async () => { await browser?.close(); });

for (const { path, label } of RUTAS_CRITICAS) {
  it(`${label} — sin ErrorBoundary`, { timeout: 45000 }, async () => {
    await page.goto(`${BASE}/#${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(8000);
    const body = await page.content().then(c => c.toLowerCase());
    expect(body.includes('algo falló')).toBe(false);
    expect(body.includes('error inesperado')).toBe(false);
  });
}

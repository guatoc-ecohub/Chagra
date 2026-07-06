/* eslint-disable */
/**
 * biopreparados-fichas.spec.js — VOLCADOR de capturas (no baseline de regresión).
 *
 * Renderiza la vista de fichas ilustradas de biopreparados (#biopreparados) en
 * varios temas y viewports, y expande la preparación paso a paso, para revisión
 * visual del operador. No usa toHaveScreenshot: escribe PNGs a disco.
 *
 * Correr:
 *   BPF_OUT=/ruta/salida npx playwright test tests/visual/biopreparados-fichas.spec.js --project=visual
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT = process.env.BPF_OUT || path.resolve(process.cwd(), 'screenshots/biopreparados');

const TEMAS = [
  { id: 'biopunk2', label: 'biopunk2' },
  { id: 'nature', label: 'nature' },
  { id: 'minimalista', label: 'minimalista' },
  { id: 'verde-vivo', label: 'verde-vivo' },
];

test.describe('Biopreparados — fichas ilustradas (volcado de capturas)', () => {
  // Boot completo (login + WASM del catálogo + fetch del grafo) en chromium
  // single-process de NixOS es lento; 30s no alcanza.
  test.setTimeout(150_000);

  test.beforeEach(async ({ context }) => {
    // Auth fake: nunca tocamos FarmOS real.
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'e2e-fake-access',
          refresh_token: 'e2e-fake-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      }),
    );
  });

  for (const tema of TEMAS) {
    test(`tema ${tema.label}`, async ({ page }) => {
      // Fijar el tema ANTES del boot (persistencia localStorage `chagra:theme`).
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('chagra:theme', t);
        } catch {}
      }, tema.id);

      // Login
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.getByLabel(/usuario/i).fill('e2e-operator');
      await page.getByRole('textbox', { name: /contraseña/i }).fill('e2e-pass');
      await page.getByRole('button', { name: /ingresar/i }).click();
      await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 20_000 });

      // Ir a la vista de biopreparados por hash-route.
      await page.evaluate(() => {
        window.location.hash = '#/biopreparados';
      });

      // Esperar a que monten la vista y al menos una ficha.
      await expect(page.getByTestId('biopreparados-view')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId('ficha-caldo_bordeles')).toBeVisible({ timeout: 20_000 });
      // Que los cultivos del grafo hayan cargado (fetch a /grafo-relations.json).
      await expect(page.getByText(/Se usa en/i).first()).toBeVisible({ timeout: 10_000 });

      // ── Móvil (uso en campo, legible al sol) ──────────────────────────────
      await page.setViewportSize({ width: 420, height: 920 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `biopreparados-${tema.label}-movil.png`), fullPage: true });

      // ── Escritorio (grilla 2 columnas) ────────────────────────────────────
      await page.setViewportSize({ width: 1180, height: 900 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `biopreparados-${tema.label}-escritorio.png`), fullPage: true });

      // ── Preparación paso a paso expandida (una ficha) ─────────────────────
      await page.setViewportSize({ width: 420, height: 920 });
      const toggle = page.getByTestId('toggle-preparacion-caldo_bordeles');
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      await expect(page.getByTestId('biopreparado-diagrama').first()).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `biopreparados-${tema.label}-pasoapaso.png`), fullPage: true });
    });
  }
});

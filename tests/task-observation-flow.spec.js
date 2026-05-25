import { test, expect } from '@playwright/test';

/**
 * task-observation-flow.spec.js — registro tareas + observaciones de campo.
 *
 * Componentes:
 *   - TaskScreen.jsx       (crear tarea agronómica)
 *   - TaskLogScreen.jsx    (ver histórico tareas)
 *   - ObservationScreen.jsx (registrar observación de planta)
 *   - AssetDetailView.jsx  (ficha de planta con su histórico)
 *
 * Complementa tests/task-log.spec.js + tests/photo-capture-field.spec.js
 * cubriendo el flow end-to-end de "ver inventario → abrir planta → crear
 * observación → ver en log".
 */

const ORIGIN = 'http://localhost:5173';

test.describe('Task/Observation — stores expuestos (smoke)', () => {
  test('useLogStore tiene API mínima', async ({ page }) => {
    await page.goto(ORIGIN);
    const api = await page.evaluate(async () => {
      const mod = await import('/src/store/useLogStore.js');
      return typeof mod.useLogStore === 'function';
    });
    expect(api).toBe(true);
  });

  test('useAssetStore expone CRUD asset (default export)', async ({ page }) => {
    await page.goto(ORIGIN);
    const api = await page.evaluate(async () => {
      const mod = await import('/src/store/useAssetStore.js');
      return typeof (mod.default || mod.useAssetStore) === 'function';
    });
    expect(api).toBe(true);
  });
});

test.describe.skip('Task/Observation — flow E2E (skipped — requiere login + finca)', () => {
  test('crear tarea desde TaskScreen aparece en TaskLog', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/tareas/nueva`);
    await page.locator('input[name*="title" i], input[placeholder*="tarea" i]').first().fill('Regar tomates E2E');
    await page.getByRole('button', { name: /guardar|crear/i }).click();
    await page.goto(`${ORIGIN}/#/tareas`);
    await expect(page.locator('text=/Regar tomates E2E/')).toBeVisible({ timeout: 5000 });
  });

  test('registrar observación en planta crea entry con timestamp + foto opcional', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/inventario`);
    const firstAsset = page.locator('[data-testid="asset-card"], article').first();
    await firstAsset.click();
    await page.getByRole('button', { name: /observar|registrar/i }).click();
    await page.locator('textarea[name*="nota" i], textarea[placeholder*="observ" i]').first().fill('Hoja amarilla E2E');
    await page.getByRole('button', { name: /guardar/i }).click();
    await expect(page.locator('text=/Hoja amarilla E2E/')).toBeVisible({ timeout: 5000 });
  });

  test('AssetDetailView muestra histórico de tareas + observaciones de esa planta', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/inventario`);
    const firstAsset = page.locator('[data-testid="asset-card"], article').first();
    await firstAsset.click();
    const text = await page.locator('body').innerText();
    expect(text.toLowerCase()).toMatch(/histórico|historia|log|registro/);
  });
});

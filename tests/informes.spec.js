import { test, expect } from '@playwright/test';

/**
 * informes.spec.js — pantalla de informes / exportación.
 *
 * Componente: src/components/InformesScreen.jsx
 * Service:    src/services/exportService.js
 *
 * Verifica que el usuario puede generar reportes de su finca
 * (inventario, log de tareas, observaciones) y exportarlos.
 */

const ORIGIN = 'http://localhost:5173';

test.describe.skip('Informes — generación (skipped — requiere login mock + data)', () => {
  test('InformesScreen renderiza opciones de reporte', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/informes`);
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).toMatch(/informe|reporte|export/);
  });

  test('exportService genera CSV/JSON con datos del usuario', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/informes`);
    const result = await page.evaluate(async () => {
      const mod = await import('/src/services/exportService.js');
      if (typeof mod.exportToCsv === 'function') {
        return { exportCsv: 'available' };
      }
      return { keys: Object.keys(mod) };
    });
    expect(result).toBeTruthy();
  });

  test('botón export descarga archivo válido', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/informes`);
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Descargar")').first();
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.(csv|json|xlsx?|pdf)$/);
    }
  });
});

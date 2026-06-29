import { test, expect } from '@playwright/test';

const ORIGIN = 'http://localhost:5173';

const TILES = [
  { route: '/#/suelo', label: 'Suelo' },
  { route: '/#/germinacion', label: 'Semilleros' },
  { route: '/#/toxicologia', label: 'Seguridad' },
];

test.describe('Home tiles — smoke', () => {
  for (const tile of TILES) {
    test(`ruta ${tile.route} (${tile.label}) monta sin errores críticos`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(`${ORIGIN}${tile.route}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const critical = errors.filter(
        e =>
          !e.includes('manifest') &&
          !e.includes('favicon') &&
          !e.includes('ServiceWorker') &&
          !e.toLowerCase().includes('preload') &&
          !e.toLowerCase().includes('mixed content') &&
          !e.includes('401') &&
          !e.includes('403'),
      );
      expect.soft(critical, `errores JS críticos en ${tile.route}`).toEqual([]);
    });
  }
});

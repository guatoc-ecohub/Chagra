/**
 * tests/e2e-a11y-axe-completo.spec.js
 *
 * TAREA 98 — a11y axe-core scan on ALL screens.
 *
 * SKIPPED: @axe-core/playwright no esta instalado.
 *
 * Verificacion: `npm ls @axe-core/playwright` devuelve (empty).
 *
 * Para habilitar este test en el futuro:
 *   1. npm i -D @axe-core/playwright
 *   2. Ajustar axe-core/playwright para integrarse con @playwright/test
 *      (axe-core/playwright usa expect.extend, compatible pero requiere
 *       configuracion adicional en playwright.config.js).
 *   3. Descomentar el bloque de abajo.
 *
 * Pantallas a escanear (hash-based routing en Chagra):
 *   - home:       # (DashboardLiveView)
 *   - agent:      #agente (AgentScreen)
 *   - profile:    #perfil (ProfileScreen)
 *   - insumos:    #bodega (InventoryDashboard)
 *   - zonas:      #activos (AssetsDashboard)
 *   - informes:   #informes (InformesScreen)
 *   - seguimiento:#hoy-en-finca (HoyEnFincaScreen)
 *   - ayuda:      #ayuda (HelpManual / HelpHomeScreen)
 *   - juego:      MiFincaVivaScreen (via NAV_TILES 'MiFincaVivaScreen' — no tiene hash dedicado,
 *                  se navega desde evolucion o desde el hero dash)
 *
 * Ejemplo de integracion cuando axe-core este instalado:
 *
 *   import { test, expect } from '@playwright/test';
 *   import AxeBuilder from '@axe-core/playwright';
 *
 *   const SCREENS = [
 *     { name: 'home', hash: '' },
 *     { name: 'agente', hash: '#agente' },
 *     { name: 'perfil', hash: '#perfil' },
 *     { name: 'insumos', hash: '#bodega' },
 *     { name: 'zonas', hash: '#activos' },
 *     { name: 'informes', hash: '#informes' },
 *     { name: 'seguimiento', hash: '#hoy-en-finca' },
 *     { name: 'ayuda', hash: '#ayuda' },
 *   ];
 *
 *   for (const { name, hash } of SCREENS) {
 *     test(`a11y scan: ${name}`, async ({ page }) => {
 *       await page.goto(hash ? `/${hash}` : '/');
 *       const results = await new AxeBuilder({ page }).analyze();
 *       const critical = results.violations.filter(v => v.impact === 'critical');
 *       const serious = results.violations.filter(v => v.impact === 'serious');
 *       expect(critical).toEqual([]);
 *       expect(serious).toEqual([]);
 *     });
 *   }
 */

import { test } from '@playwright/test';

test.skip('a11y axe scan — @axe-core/playwright no instalado (ver TAREA 98)', () => {
  // No-op: dependencia no disponible en el arbol de dependencias actual.
});

/**
 * tests/e2e-a11y-axe-completo.spec.js
 *
 * TAREA 98 — a11y axe-core scan on ALL screens.
 *
 * ACTIVADO: @axe-core/playwright instalado (2026-06-19).
 *
 * Pantallas a escanear (hash-based routing en Chagra):
 *   - home:       # (DashboardLiveView)
 *   - agent:      #agente (AgentScreen) - OMITIDO por task #i18n-a11y-2026-06-19
 *   - profile:    #perfil (ProfileScreen)
 *   - insumos:    #bodega (InventoryDashboard)
 *   - zonas:      #activos (AssetsDashboard)
 *   - informes:   #informes (InformesScreen)
 *   - seguimiento:#hoy-en-finca (HoyEnFincaScreen)
 *   - ayuda:      #ayuda (HelpManual / HelpHomeScreen)
 *   - juego:      MiFincaVivaScreen (via NAV_TILES 'MiFincaVivaScreen' — no tiene hash dedicado,
 *                  se navega desde evolucion o desde el hero dash)
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SCREENS = [
  { name: 'home', hash: '' },
  // { name: 'agente', hash: '#agente' }, // OMITIDO por task #i18n-a11y-2026-06-19 (otros agentes lo están tocando)
  { name: 'perfil', hash: '#perfil' },
  { name: 'insumos', hash: '#bodega' },
  { name: 'zonas', hash: '#activos' },
  { name: 'informes', hash: '#informes' },
  { name: 'seguimiento', hash: '#hoy-en-finca' },
  { name: 'ayuda', hash: '#ayuda' },
];

for (const { name, hash } of SCREENS) {
  test(`a11y scan: ${name}`, async ({ page }) => {
    await page.goto(hash ? `/${hash}` : '/');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(v => v.impact === 'critical');
    const serious = results.violations.filter(v => v.impact === 'serious');
    expect(critical).toEqual([]);
    expect(serious).toEqual([]);
  });
}

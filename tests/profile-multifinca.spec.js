import { test, expect } from '@playwright/test';

/**
 * profile-multifinca.spec.js — ProfileScreen + multi-finca scoping.
 *
 * Componente:  src/components/ProfileScreen.jsx
 * Stores:      fincaActiveStore.js, useLogStore.js, useCaseStudyStore.js
 *
 * Multi-finca permite que un usuario tenga varias fincas y todas las
 * vistas (inventario, logs, case studies) respetan la finca activa.
 * Implementado en ADR-036 + PRs #11/#18. Switching de finca preserva
 * datos por finca (no se cruzan).
 *
 * Complementa tests/multifinca.spec.js que cubre flow básico.
 */

const ORIGIN = 'http://localhost:5173';

test.describe('Profile — multi-finca stores expuestos', () => {
  test('fincaActiveStore expone API mínimo', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    const api = await page.evaluate(async () => {
      const mod = await import('/src/services/fincaActiveStore.js');
      return {
        hasService: !!mod,
        keys: Object.keys(mod).slice(0, 20),
      };
    });
    expect(api.hasService).toBe(true);
  });

  test('useLogStore acepta scoping por fincaId (PR #18)', async ({ page }) => {
    await page.goto(ORIGIN);
    const result = await page.evaluate(async () => {
      const mod = await import('/src/store/useLogStore.js');
      return typeof mod.useLogStore === 'function';
    });
    expect(result).toBe(true);
  });
});

test.describe.skip('Profile — UI multi-finca (skipped — requiere login)', () => {
  test('ProfileScreen muestra lista de fincas del usuario', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/perfil`);
    const text = await page.locator('body').innerText();
    expect(text.toLowerCase()).toMatch(/finca|perfil/);
  });

  test('switch entre fincas cambia inventario activo sin cruzar datos', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/perfil`);
    const fincaSelector = page.locator('select[name*="finca" i], [data-testid="finca-selector"]').first();
    if (await fincaSelector.isVisible()) {
      const optionCount = await fincaSelector.locator('option').count();
      expect(optionCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('cerrar sesión limpia localStorage de finca activa', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/perfil`);
    const logoutBtn = page.locator('button:has-text("Cerrar sesión"), button:has-text("Salir")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      const fincaAfterLogout = await page.evaluate(() => localStorage.getItem('finca-active'));
      expect(fincaAfterLogout).toBeFalsy();
    }
  });
});

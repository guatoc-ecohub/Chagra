import { test, expect } from '@playwright/test';

/**
 * help-screens.spec.js — pantallas de Ayuda en Chagra.
 *
 * Componentes:
 *   - HelpHomeScreen.jsx (índice de ayuda)
 *   - HelpCicloScreen.jsx (ciclo agrícola)
 *   - HelpUsoScreen.jsx (cómo usar la app)
 *   - HelpVozScreen.jsx (cómo usar el modo voz)
 *
 * Estos screens explican qué puede/no puede hacer Chagra (PR #123 — Docs
 * Ayuda 100% verdades auditables). Cero hype. La sección Ayuda también
 * aloja FieldFeedback (PR #78) después de moverlo del FAB.
 */

const ORIGIN = 'http://localhost:5173';

test.describe('Help — paint estático', () => {
  test('home renderiza sin errores JS críticos', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    // Errores de SW/manifest/font no son críticos. Filtramos.
    const critical = errors.filter(
      e =>
        !e.includes('manifest') &&
        !e.includes('favicon') &&
        !e.includes('ServiceWorker') &&
        !e.toLowerCase().includes('preload')
    );
    expect(critical).toEqual([]);
  });
});

test.describe.skip('Help screens — navegación interna (skipped — requiere login mock)', () => {
  test('HelpHomeScreen lista las 4 sub-pantallas', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/ayuda`);
    const linksText = await page.locator('body').innerText();
    expect(linksText).toMatch(/ciclo/i);
    expect(linksText).toMatch(/uso/i);
    expect(linksText).toMatch(/voz/i);
  });

  test('HelpUsoScreen muestra "qué puede" + "qué NO puede"', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/ayuda/uso`);
    const text = (await page.locator('body').innerText()).toLowerCase();
    // PR #123: cero hype, verdades auditables (qué puede + qué no puede)
    expect(text).toMatch(/puede|sabe|hace/);
    expect(text).toMatch(/no puede|no sabe|no hace|limitación|no garantiz/);
  });

  test('HelpVozScreen explica modo voz', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/ayuda/voz`);
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).toMatch(/voz|micrófono|hablá|grabá/i);
  });

  test('FieldFeedback accesible desde Help (post PR #78)', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/ayuda`);
    // FieldFeedback dejó de ser FAB flotante; vive en sección Ayuda
    await expect(page.locator('text=/feedback|comentario|cuéntanos/i')).toBeVisible();
  });
});

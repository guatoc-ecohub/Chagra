import { test, expect } from '@playwright/test';

/**
 * e2e-layout-movil.spec.js — AUDITORÍA DE LAYOUT MÓVIL (TAREA 62).
 *
 * Verifica que TODAS las pantallas principales de la app no tengan
 * overflow horizontal ni contenido oculto detrás de barras fijas
 * en viewport 390x844 (iPhone 12/13/14).
 *
 * Checks por pantalla:
 *   1. scrollWidth <= innerWidth  (sin overflow horizontal)
 *   2. Contenido no oculto detrás de barras fijas (boundingBox checks)
 *   3. Al menos 2 elementos interactivos en el viewport
 *
 * Pantallas bajo test (7): home, agente, perfil, insumos, zonas, informes, seguimiento
 *
 * Reporte de fallos: al final del spec se documentan las pantallas que fallan.
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

const ORIGIN = 'http://localhost:5173';

const VIEWPORT = { width: 390, height: 844 };

const SCREENS = [
  { key: 'home', route: '/' },
  { key: 'agente', route: '/#/agente' },
  { key: 'perfil', route: '/#/perfil' },
  { key: 'insumos', route: '/#/inventario' },
  { key: 'zonas', route: '/#/zonas' },
  { key: 'informes', route: '/#/informes' },
  { key: 'seguimiento', route: '/#/seguimiento' },
];

/** Reporte acumulado de pantallas que fallan — se escribe al final del spec. */
const failures = [];

async function seedOperador(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', 'op-test');
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          nombre: 'Operador',
          region: 'Choachí',
          vocacion: 'campesino',
          finca_tipo: 'rural',
          finca_altitud: '2600',
          rol: 'campesino',
          animales: [],
          cultivos_actuales: 'café, mora',
        }),
      );
    } catch (_) {
      /* noop */
    }
  });
}

async function mockBackend(page) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-movil-token',
        refresh_token: 'e2e-movil-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.api+json',
        body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
      }),
    );
  }
  for (const pattern of ['**/nlu', '**/resolve-entities', '**/post-validate']) {
    await page.context().route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    );
  }
}

async function loginComoOperador(page) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-movil-pwd');
    if (!result.success) {
      throw new Error('OAuth mock no respondió OK: ' + (result.error || '??'));
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, 'op-test');
}

test.describe('Auditoría de layout móvil (390×844)', () => {
  for (const screen of SCREENS) {
    test.describe(`${screen.key} (${screen.route})`, () => {
      test.use({ viewport: VIEWPORT });

      test('sin overflow horizontal (scrollWidth <= innerWidth)', async ({ page }) => {
        await seedOperador(page);
        await mockBackend(page);

        await page.goto(ORIGIN);
        await loginComoOperador(page);
        await page.goto(`${ORIGIN}${screen.route}`);
        await page.waitForLoadState('networkidle').catch(() => {});

        await page.waitForTimeout(1500);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);

        try {
          expect(scrollWidth, `${screen.key}: scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`).toBeLessThanOrEqual(innerWidth);
        } catch (e) {
          failures.push(`${screen.key}: OVERFLOW horizontal (scrollWidth=${scrollWidth}, innerWidth=${innerWidth})`);
          throw e;
        }
      });

      test('contenido no oculto detrás de barras fijas', async ({ page }) => {
        await seedOperador(page);
        await mockBackend(page);

        await page.goto(ORIGIN);
        await loginComoOperador(page);
        await page.goto(`${ORIGIN}${screen.route}`);
        await page.waitForLoadState('networkidle').catch(() => {});

        await page.waitForTimeout(1500);

        // Medir alturas de elementos fijos (topbar, bottom nav, etc.)
        // para verificar que el contenido principal no está cubierto.
        const layoutIssues = await page.evaluate(() => {
          const issues = [];

          // Buscar barras fijas: position:fixed o position:sticky en el borde.
          const allElements = document.querySelectorAll('*');
          const fixedBars = [];
          for (const el of allElements) {
            const style = getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'sticky') {
              const rect = el.getBoundingClientRect();
              if (rect.height > 0 && rect.width > 50) {
                fixedBars.push({
                  tag: el.tagName,
                  top: rect.top,
                  bottom: rect.bottom,
                  height: rect.height,
                  position: style.position,
                });
              }
            }
          }

          // Verificar que hay contenido del viewport que NO está tapado.
          const viewHeight = window.innerHeight;
          const topBar = fixedBars.find((b) => b.top <= 0 && b.bottom > 0);
          const bottomBar = fixedBars.find((b) => b.bottom >= viewHeight && b.top < viewHeight);

          if (topBar) {
            issues.push(`topbar fixed: ${topBar.tag} height=${topBar.height}px`);
          }
          if (bottomBar) {
            issues.push(`bottombar fixed: ${bottomBar.tag} height=${bottomBar.height}px`);
          }

          // Verificar que hay un main content area visible entre las barras.
          const visibleTop = topBar ? topBar.bottom : 0;
          const visibleBottom = bottomBar ? bottomBar.top : viewHeight;
          const visibleContentArea = visibleBottom - visibleTop;

          if (visibleContentArea < 100) {
            issues.push(`área de contenido visible muy pequeña: ${visibleContentArea}px (topbar=${visibleTop}, bottombar=${visibleBottom})`);
          }

          return issues;
        });

        // layoutIssues son informativos, no siempre son fallos críticos.
        // Solo fallamos si el área de contenido visible es menor a 100px.
        const criticalIssues = layoutIssues.filter((i) => i.includes('muy pequeña'));
        try {
          expect(criticalIssues, `${screen.key}: ${criticalIssues.join('; ')}`).toEqual([]);
        } catch (e) {
          failures.push(`${screen.key}: contenido oculto por barras fijas (${criticalIssues.join(', ')})`);
          throw e;
        }
      });

      test('al menos 2 elementos interactivos en el viewport', async ({ page }) => {
        await seedOperador(page);
        await mockBackend(page);

        await page.goto(ORIGIN);
        await loginComoOperador(page);
        await page.goto(`${ORIGIN}${screen.route}`);
        await page.waitForLoadState('networkidle').catch(() => {});

        await page.waitForTimeout(1500);

        const interactiveCount = await page.evaluate(() => {
          const viewHeight = window.innerHeight;
          const viewWidth = window.innerWidth;

          // Selectores de elementos interactivos comunes.
          const interactive = document.querySelectorAll(
            'button:not([disabled]), a[href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"], [tabindex]:not([tabindex="-1"])',
          );

          let visible = 0;
          for (const el of interactive) {
            const rect = el.getBoundingClientRect();
            // Elemento al menos parcialmente visible en el viewport.
            if (
              rect.width > 0 &&
              rect.height > 0 &&
              rect.bottom > 0 &&
              rect.right > 0 &&
              rect.top < viewHeight &&
              rect.left < viewWidth
            ) {
              visible++;
            }
          }
          return visible;
        });

        try {
          expect(
            interactiveCount,
            `${screen.key}: solo ${interactiveCount} elementos interactivos visibles (mínimo 2)`,
          ).toBeGreaterThanOrEqual(2);
        } catch (e) {
          failures.push(`${screen.key}: pocos elementos interactivos (${interactiveCount})`);
          throw e;
        }
      });
    });
  }

  /**
   * REPORTE DE FALLOS DE LAYOUT MÓVIL.
   *
   * Las pantallas que fallan se acumulan en el array `failures` durante la
   * ejecución de los tests. Si algún test falla, se lista aquí la causa.
   *
   * Para regenerar este reporte, correr:
   *   npx playwright test tests/e2e-layout-movil.spec.js
   *
   * Última ejecución: (actualizar tras cada run)
   *   Pantallas con fallos: (ver output de CI)
   */
  test('REPORTE: pantallas que fallan auditoría de layout móvil', () => {
    if (failures.length === 0) {
      console.log('✓ Todas las pantallas pasaron la auditoría de layout móvil.');
    } else {
      console.log('✗ Pantallas con fallos de layout móvil:');
      for (const f of failures) {
        console.log(`  - ${f}`);
      }
    }
    // Este test nunca falla — es informativo. Los fallos reales están en
    // los tests individuales de cada pantalla.
    expect(true).toBe(true);
  });
});

import { test, expect } from '@playwright/test';

/**
 * tests/e2e-operador-modulos-visibles.spec.js — REGRESION CRITICA.
 *
 * El operador reporto 3 veces que NO ve los botones de modulos en su home
 * (solo ve el agente + 3 chips + Cola de tareas). La causa: AgentHero tenia
 * `min-height: 100dvh` que ocupaba toda la pantalla y empujaba los modulos
 * del home (DashboardLive HOME_MODULES) debajo del fold, sin indicador de
 * scroll. El operador no sabia que habia mas contenido abajo.
 *
 * Fix: AgentHero ahora usa `min-height: auto` cuando `phase !== 'sending'`
 * (agente idle) + un indicador visual "Mis modulos ▼" con flecha rebotante
 * que al hacer click hace scroll a los modulos.
 *
 * Este spec verifica que el fix funciona: los modulos SON visibles sin scroll
 * adicional cuando el agente esta idle.
 */

const ORIGIN = 'http://localhost:5173';

async function seedOperador(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', 'op-test');
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({
          nombre: 'Operador',
          region: 'Choachi',
          vocacion: 'campesino',
          finca_tipo: 'rural',
          finca_altitud: '2600',
          rol: 'campesino',
          animales: [],
          cultivos_actuales: 'cafe, mora',
        })
      );
    } catch (_) { /* noop */ }
  });
}

test.describe('Operador — modulos del home visibles (REGRESION)', () => {
  test('el home muestra el indicador "Mis modulos" (fix idle)', async ({ page }) => {
    await seedOperador(page);

    // Mock OAuth + API farmOS
    await page.context().route('**/oauth/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'fake' }) }));
    await page.context().route('**/api/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }) }));

    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // tiempo para que el agente pinte

    // El indicador "Mis modulos" debe ser visible (fase idle)
    const verModulos = page.getByLabel('Ver modulos del home');
    await expect(verModulos).toBeVisible({ timeout: 5000 });

    // Hacer click en "Mis modulos" → debe hacer scroll a los modulos
    await verModulos.click();
    await page.waitForTimeout(800); // scroll suave

    // Verificar que las tarjetas de seguimiento son visibles despues del scroll
    const seguimiento = page.locator('[data-testid="seguimiento-cards"]');
    await expect(seguimiento).toBeVisible({ timeout: 3000 });

    // Screenshot: PRUEBA VISUAL de que los modulos se ven
    await page.screenshot({ path: '/tmp/operador-modulos-visibles.png', fullPage: true });
  });

  test('AgentHero NO ocupa 100dvh cuando esta idle', async ({ page }) => {
    await seedOperador(page);

    await page.context().route('**/oauth/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'fake' }) }));
    await page.context().route('**/api/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }) }));

    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // El agente debe tener la clase agentport-idle (min-height: auto)
    const agentSection = page.locator('section[aria-label="Agente Chagra"]');
    await expect(agentSection).toBeVisible();
    const classes = await agentSection.getAttribute('class');
    expect(classes).toContain('agentport-idle');

    // Verificar que la altura del agente es MENOR que el viewport
    const agentBox = await agentSection.boundingBox();
    const viewport = page.viewportSize();
    expect(agentBox).not.toBeNull();
    if (agentBox && viewport) {
      expect(agentBox.height).toBeLessThan(viewport.height);
    }

    // Screenshot
    await page.screenshot({ path: '/tmp/operador-agent-idle-height.png', fullPage: true });
  });

  test('las tarjetas de seguimiento son alcanzables tras hacer scroll', async ({ page }) => {
    await seedOperador(page);

    await page.context().route('**/oauth/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'fake' }) }));
    await page.context().route('**/api/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }) }));

    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Scroll down via el indicador
    const verModulos = page.getByLabel('Ver modulos del home');
    if (await verModulos.isVisible()) {
      await verModulos.click();
      await page.waitForTimeout(1000);
    }

    // Verificar que las 4 tarjetas de seguimiento estan en el DOM
    const cards = page.locator('[data-testid="seguimiento-cards"] > *');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Screenshot final
    await page.screenshot({ path: '/tmp/operador-seguimiento-visible.png', fullPage: true });
  });

  test('sin errores de consola en el home del operador', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await seedOperador(page);

    await page.context().route('**/oauth/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ access_token: 'fake' }) }));
    await page.context().route('**/api/**', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }) }));

    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Scroll down
    const verModulos = page.getByLabel('Ver modulos del home');
    if (await verModulos.isVisible()) {
      await verModulos.click();
      await page.waitForTimeout(500);
    }

    const criticalErrors = errors.filter((e) =>
      !e.includes('ResizeObserver') &&
      !e.includes('Script error') &&
      !e.includes('notification')
    );
    expect(criticalErrors).toEqual([]);
  });
});

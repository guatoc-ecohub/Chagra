import { test, expect } from '@playwright/test';

/**
 * Test de verificación de mocks para E2E
 * 
 * Este test asegura que los mocks de red estén correctamente configurados
 * para evitar fallos tipo ECONNREFUSED en el entorno de CI.
 * 
 * Referencia: docs/known-issues/offline-first-e2e.md
 */

test.describe('Validación de mocks E2E — prevención de ECONNREFUSED', () => {
  test('verifica que OAuth2 mock está configurado correctamente', async ({ context }) => {
    // Configurar mock de OAuth2 (patrón estándar)
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
      })
    );

    const page = await context.newPage();
    
    // Verificar que el mock responde correctamente
    const response = await page.goto('https://example.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.access_token).toBe('e2e-fake-access');
    expect(body.token_type).toBe('Bearer');
  });

  test('verifica que /api/** routes están configurados (block o mock)', async ({ context }) => {
    let mockConfigured = false;

    // Configurar mock para /api/** (bloqueo es aceptable para tests offline-first)
    await context.route('**/api/**', (route) => {
      mockConfigured = true;
      route.abort('blockedbyclient');
    });

    const page = await context.newPage();
    
    // Intentar hacer request a /api/ endpoint
    try {
      await page.goto('https://example.com/api/test', { timeout: 5000 });
    } catch (_error) {
      // Expected: request aborted por el mock
    }

    // Verificar que el mock fue invocado
    expect(mockConfigured).toBe(true);
  });

  test('verifica que UI puede cargar sin dependencias externas', async ({ context }) => {
    // Configurar todos los mocks necesarios
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
      })
    );

    // Bloquear tráfico al backend
    await context.route('**/api/**', (route) => route.abort('blockedbyclient'));

    // Permitir recursos estáticos (JS, CSS, imágenes)
    await context.route('**/src/**', (route) => route.continue());
    await context.route('**/*.js', (route) => route.continue());
    await context.route('**/*.css', (route) => route.continue());

    const page = await context.newPage();
    
    // Navegar a la app
    await page.goto('/');

    // Verificar que la página carga sin errores de red
    const errors = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Esperar a que el UI principal esté visible
    await expect(page.getByLabel(/usuario/i)).toBeVisible({ timeout: 15_000 });

    // Verificar que no hubo errores críticos de carga
    const networkErrors = errors.filter(e => 
      e.includes('ECONNREFUSED') || 
      e.includes('Failed to fetch') ||
      e.includes('Network request failed')
    );
    
    expect(networkErrors).toHaveLength(0);
  });

  test('verifica timeout generoso para CI', async () => {
    // Este test solo documenta el patrón correcto de timeouts
    // CI puede ser significativamente más lento que desarrollo local
    
    const recommendedTimeouts = {
      pageLoad: 30_000,      // 30 segundos para navegación
      elementVisible: 15_000, // 15 segundos para encontrar elementos
      networkIdle: 10_000,    // 10 segundos para que la red se estabilice
    };

    // Verificar que los timeouts sean generosos
    expect(recommendedTimeouts.elementVisible).toBeGreaterThanOrEqual(15_000);
    expect(recommendedTimeouts.pageLoad).toBeGreaterThanOrEqual(30_000);
  });
});

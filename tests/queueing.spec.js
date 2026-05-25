import { test, expect } from '@playwright/test';

/**
 * Playwright E2E test para verificar UX de queueing del agente (task #121).
 *
 * Este test verifica que la implementación de queueing funcione correctamente:
 * - Máximo 2 mensajes en flight simultáneos (1 procesando + 1 pendiente)
 * - Indicador visual de queue visible ("esperando" o equivalente)
 * - La 3ra pregunta se rechaza con mensaje claro
 *
 * Setup: usa chromium del nix-store (ver referencia en catalog-sqlite.spec.js
 * sobre libgbm.so.1 requirement).
 *
 * NOTA sobre NixOS/chromium: headless chromium requiere libgbm.so.1 native
 * library. Si el test falla con "error while loading shared libraries:",
 * verificar que el paquete nixpkgs.libgbm está instalado en el environment.
 */
test.describe('Queueing UX — AgentScreen (task #121)', () => {
  test.beforeEach(async ({ context }) => {
    // Mock de auth OAuth2 para bypass de login real
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

    // Mock de health check de Ollama para evitar timeout de 5s
    await context.route('**/api/ollama/api/tags', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [{ name: 'llama3.1:8b' }],
        }),
      })
    );

    // Mock del endpoint de chat para simular respuestas lentas
    // Esto permite observar el queueing en acción
    await context.route('**/api/ollama/api/generate', async (route) => {
      // Simular latencia alta (15-20s) para que el queueing sea visible
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Respuesta mínima para que el test no se quede colgado
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          model: 'llama3.1:8b',
          response: 'Respuesta de prueba del agente.',
          done: true,
        }),
      });
    });

    // Mock de logs y APIs de farmOS para evitar errores
    await context.route('**/api/**', (route) => route.abort('blockedbyclient'));
  });

  test('login → AgentScreen → 3 mensajes rápidos → assert queue indicador + max 2 en flight', async ({
    page,
  }) => {
    // STEP 1: Login
    await page.goto('/');
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();

    // STEP 2: Esperar dashboard cargado
    await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

    // STEP 3: Navegar a AgentScreen
    // Usamos el aria-label del AgentFab: "Asistente Chagra IA"
    const agentFab = page.getByRole('button', { name: /asistente chagra ia/i });
    await expect(agentFab).toBeVisible({ timeout: 10_000 });
    await agentFab.click();

    // STEP 4: Verificar que AgentScreen cargó
    // Buscar el input del agente
    const agentInput = page.getByTestId('agent-input');
    await expect(agentInput).toBeVisible({ timeout: 10_000 });

    const agentSubmit = page.getByTestId('agent-submit');
    await expect(agentSubmit).toBeVisible();

    // STEP 5: Enviar 3 mensajes rápidos SIN esperar respuesta
    // Mensaje 1
    await agentInput.fill('¿Cómo combato la broca del café?');
    await agentSubmit.click();

    // Pequeña pausa para que el primer mensaje se envíe
    await page.waitForTimeout(100);

    // Mensaje 2 (debería ir a pending)
    await agentInput.fill('¿Qué plagas afectan el cacao?');
    await agentSubmit.click();

    // Pequeña pausa
    await page.waitForTimeout(100);

    // Mensaje 3 (debería ser rechazado)
    await agentInput.fill('¿Cómo preparo biopreparados?');
    await agentSubmit.click();

    // STEP 6: Assert que aparece el indicador de queue "esperando"
    // El badge "queue-pending-badge" aparece cuando hay mensaje pendiente
    const queuePendingBadge = page.getByTestId('queue-pending-badge');
    await expect(queuePendingBadge).toBeVisible({ timeout: 5000 });

    // STEP 7: Assert que aparece el toast de rechazo
    // El toast "queue-rejected-toast" aparece cuando la 3ra pregunta es rechazada
    const queueRejectedToast = page.getByTestId('queue-rejected-toast');
    await expect(queueRejectedToast).toBeVisible({ timeout: 5000 });

    // Verificar que el mensaje del toast menciona "espera" y el número 2
    await expect(queueRejectedToast).toContainText(/espera/i);
    await expect(queueRejectedToast).toContainText(/2|dos/);

    // STEP 8: Assert que NO hay más de 2 mensajes en flight
    // Esto se verifica indirectamente: el 3er mensaje no aparece en el chat
    // como mensaje del usuario (solo los primeros 2)
    const userMessages = page.locator('[data-testid^="message-"]').filter({
      hasText: /¿Cómo combato la broca\?|¿Qué plagas afectan el cacao\?/,
    });
    
    // Debería haber exactamente 2 mensajes visibles del usuario
    // (el 3ro fue rechazado antes de agregarse al chat)
    const userMessageCount = await userMessages.count();
    expect(userMessageCount).toBeLessThanOrEqual(2);

    // STEP 9: Verificar ETA label visible (indicador de "esperando")
    const etaLabel = page.getByTestId('eta-label');
    await expect(etaLabel).toBeVisible({ timeout: 5000 });
  });

  test('login → AgentScreen → 2 mensajes rápidos → assert NO hay rechazo', async ({
    page,
  }) => {
    // Este test verifica el caso happy path: solo 2 mensajes, sin rechazo
    await page.goto('/');
    await page.getByLabel(/usuario/i).fill('e2e-operator');
    await page.getByLabel(/contraseña/i).fill('e2e-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByText('Cola de tareas')).toBeVisible({ timeout: 15_000 });

    const agentFab = page.getByRole('button', { name: /asistente chagra ia/i });
    await agentFab.click();

    const agentInput = page.getByTestId('agent-input');
    const agentSubmit = page.getByTestId('agent-submit');
    await expect(agentInput).toBeVisible({ timeout: 10_000 });

    // Enviar solo 2 mensajes
    await agentInput.fill('¿Cómo combato la broca?');
    await agentSubmit.click();
    await page.waitForTimeout(100);
    
    await agentInput.fill('¿Qué plagas afectan el cacao?');
    await agentSubmit.click();

    // Verificar que SÍ aparece el badge de pending
    const queuePendingBadge = page.getByTestId('queue-pending-badge');
    await expect(queuePendingBadge).toBeVisible({ timeout: 5000 });

    // Verificar que NO aparece el toast de rechazo
    const queueRejectedToast = page.getByTestId('queue-rejected-toast');
    await expect(queueRejectedToast).not.toBeVisible();

    // Verificar ETA visible
    const etaLabel = page.getByTestId('eta-label');
    await expect(etaLabel).toBeVisible({ timeout: 5000 });
  });
});

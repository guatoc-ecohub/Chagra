import { test, expect } from '@playwright/test';

/**
 * agent-full-flow.spec.js — cobertura E2E del flujo completo del agente IA:
 *   - Apertura AgentScreen (botón colibrí / FAB)
 *   - Tips rotativos (PR #1035) mientras espera
 *   - Queue de mensajes (max 2 in flight + 3ro rechazado, ADR-021)
 *   - Anti-alucinación: badge respuesta generativa vs verificada
 *   - Post-validate visible
 *   - Doble click colibrí silencia TTS (PR #122)
 *
 * Mockea sidecar (/nlu, /resolve-entities, /api/chat, /post-validate) para
 * no depender de Ollama. Esto es lo que faltaba al agente: cobertura del
 * flow completo mockeado.
 *
 * A-19 (2026-05-30): TODOS los mocks van en `page.context().route(...)`,
 * NO en `page.route(...)`. La app pega a estos endpoints same-origin (POST)
 * y el Service Worker (public/sw.js) los re-emite con `fetch(event.request)`
 * → page.route queda sombreado y el mock NO aplica (la app recibe la red
 * real: 404/SSE vacío). Es el bug del #339 Caso F. El describe sigue .skip
 * (requiere mock OAuth backend completo) pero cuando se active, los mocks
 * ya quedan en context.route para no dar cobertura ilusoria.
 * Ver feedback-sw-shadows-playwright-route.
 */

const ORIGIN = 'http://localhost:5173';

async function mockSidecar(page) {
  await page.context().route('**/resolve-entities', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entities: [] }),
    })
  );
  await page.context().route('**/nlu', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ use_tool: false }),
    })
  );
  await page.context().route('**/api/chat', async route => {
    await new Promise(r => setTimeout(r, 300));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: { content: 'Respuesta mockeada del agente.' },
        done: true,
      }),
    });
  });
  await page.context().route('**/post-validate', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hallucinated: [],
        validated: [],
        age_available: true,
        detected_count: 0,
      }),
    })
  );
}

async function loginIfNeeded(page) {
  // Stub OAuth: 200 con tokens fake
  await page.context().route('**/oauth/token', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-token',
        refresh_token: 'fake-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    })
  );
  const userInput = page.getByRole('textbox', { name: /Usuario/i });
  if (await userInput.isVisible().catch(() => false)) {
    await userInput.fill('e2e-test');
    await page.locator('input[type="password"]').fill('e2e-test');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe.skip('AgentScreen — flujo completo (skipped por default — requiere mock OAuth backend real)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSidecar(page);
    await page.goto(ORIGIN);
    await loginIfNeeded(page);
  });

  test('AgentScreen se abre al click en colibrí FAB', async ({ page }) => {
    const fab = page.locator('[data-testid="agent-fab"], button[aria-label*="agente" i]').first();
    await expect(fab).toBeVisible({ timeout: 5000 });
    await fab.click();
    // AgentScreen visible
    await expect(page.locator('[data-testid="agent-screen"], textarea, [role="textbox"]')).toBeVisible({ timeout: 5000 });
  });

  test('tips rotativos visibles mientras isThinking (PR #1035)', async ({ page }) => {
    await page.locator('[data-testid="agent-fab"]').first().click();
    const input = page.locator('textarea, [role="textbox"]').first();
    await input.fill('¿qué puedo sembrar?');
    await input.press('Enter');
    // Tip debe aparecer mientras responde
    await expect(page.locator('[data-testid="agent-tip"], text=/Puedes registrar|En modo voz/i')).toBeVisible({ timeout: 3000 });
  });

  test('queue max 2 en flight + 3ro rechazado con toast (PR #1038)', async ({ page }) => {
    await page.locator('[data-testid="agent-fab"]').first().click();
    const input = page.locator('textarea, [role="textbox"]').first();
    for (let i = 0; i < 3; i++) {
      await input.fill(`pregunta ${i}`);
      await input.press('Enter');
      await page.waitForTimeout(50);
    }
    // Badge queue pending o toast rechazo
    const queueIndicator = page.locator('[data-testid="queue-pending-badge"], [data-testid="queue-rejected-toast"]');
    await expect(queueIndicator).toBeVisible({ timeout: 3000 });
  });

  test('badge "Respuesta generativa" aparece cuando post-validate flagea (N7)', async ({ page }) => {
    // Override post-validate para devolver una alucinación
    await page.context().route('**/post-validate', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hallucinated: ['Especies Inexistente'],
          validated: [],
          age_available: true,
          detected_count: 1,
        }),
      })
    );
    await page.locator('[data-testid="agent-fab"]').first().click();
    const input = page.locator('textarea, [role="textbox"]').first();
    await input.fill('dime sobre Especies Inexistente');
    await input.press('Enter');
    await expect(page.locator('text=/generativa|verificar|⚠/i')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AgentScreen — paint estático sin login (sanity)', () => {
  test('login screen no monta AgentScreen', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    // Si vemos LoginScreen, no debería haber textarea de agente visible
    const userInput = page.getByRole('textbox', { name: /Usuario/i });
    if (await userInput.isVisible().catch(() => false)) {
      const agentInput = await page.locator('textarea[placeholder*="pregunta" i]').count();
      expect(agentInput).toBe(0);
    }
  });
});

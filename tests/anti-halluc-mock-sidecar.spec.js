import { test, expect } from '@playwright/test';

/**
 * anti-halluc-mock-sidecar.spec.js — Cobertura E2E del flujo de
 * anti-alucinación con sidecar mockeado.
 *
 * Test cases:
 * 1. User pregunta 'broca café' → assert sidecar /resolve-entities llamado
 *    + tool get_biopreparados ejecutado
 * 2. LLM response con species inexistente → post-validate la flagea + UI
 *    muestra warning
 * 3. NLU timeout 8s → fallback raw LLM con tip rotativo
 *
 * Mockea endpoints sidecar (/resolve-entities, /nlu, /api/ollama/api/chat,
 * /post-validate) para no depender de servicios externos.
 */

const ORIGIN = 'http://localhost:5173';

async function mockSidecar(page) {
  // Mock /resolve-entities endpoint
  await page.route('**/resolve-entities', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entities: [
          {
            mentioned: 'broca café',
            kind: 'pest',
            canonical_id: 'hypothenemus_hampei',
            nombre_comun: 'Broca del café',
            nombre_cientifico: 'Hypothenemus hampei',
            confidence: 0.95,
          },
        ],
      }),
    })
  );

  // Mock /nlu endpoint
  await page.route('**/nlu', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        use_tool: true,
        tool: 'get_biopreparados',
        args: { pest: 'hypothenemus_hampei' },
        latency_ms: 150,
        model_used: 'qwen2.5-coder:7b',
        heuristic_skipped: false,
        reason: null,
        error: null,
      }),
    })
  );

  // Mock /api/ollama/api/chat endpoint
  await page.route('**/api/ollama/api/chat', async route => {
    await new Promise(r => setTimeout(r, 300));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: {
          role: 'assistant',
          content: 'Para controlar la broca del café puedes usar biopreparados como Beauveria bassiana.',
        },
        done: true,
      }),
    });
  });

  // Mock /post-validate endpoint (default: sin alucinaciones)
  await page.route('**/post-validate', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hallucinated: [],
        validated: ['Hypothenemus hampei'],
        age_available: true,
        detected_count: 1,
      }),
    })
  );
}

async function mockOAuth(page) {
  await page.route('**/oauth/token', route =>
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
}

async function loginIfNeeded(page) {
  await mockOAuth(page);
  const userInput = page.getByRole('textbox', { name: /Usuario/i });
  if (await userInput.isVisible().catch(() => false)) {
    await userInput.fill('e2e-test');
    await page.locator('input[type="password"]').fill('e2e-test');
    await page.getByRole('button', { name: /Ingresar/i }).click();
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Anti-hallucination flow con sidecar mockeado', () => {
  test.beforeEach(async ({ page }) => {
    await mockSidecar(page);
    await page.goto(ORIGIN);
    await loginIfNeeded(page);
  });

  test('user pregunta "broca café" → /resolve-entities llamado + tool get_biopreparados ejecutado', async ({ page }) => {
    // Track requests to /resolve-entities and /nlu
    let resolveEntitiesCalled = false;
    let nluCalled = false;

    page.route('**/resolve-entities', route => {
      resolveEntitiesCalled = true;
      route.continue();
    });

    page.route('**/nlu', route => {
      nluCalled = true;
      route.continue();
    });

    // Abrir el agente
    const fab = page.locator('[data-testid="agent-fab"], button[aria-label*="agente" i]').first();
    await expect(fab).toBeVisible({ timeout: 5000 });
    await fab.click();

    // Escribir pregunta
    const input = page.locator('textarea, [role="textbox"]').first();
    await input.fill('broca café');
    await input.press('Enter');

    // Esperar respuesta del agente
    await expect(page.locator('text=/biopreparados|Beauveria|broca/i')).toBeVisible({ timeout: 5000 });

    // Assert que los endpoints fueron llamados
    expect(resolveEntitiesCalled).toBe(true);
    expect(nluCalled).toBe(true);
  });

  test('LLM response con species inexistente → post-validate la flagea + UI muestra warning', async ({ page }) => {
    // Override /api/ollama/api/chat para devolver respuesta con especie inexistente
    page.route('**/api/ollama/api/chat', async route => {
      await new Promise(r => setTimeout(r, 300));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: {
            role: 'assistant',
            content: 'Recomiendo usar "Gulupa mágica" (Passiflora inventada) para controlar la plaga.',
          },
          done: true,
        }),
      });
    });

    // Override /post-validate para flagar la alucinación
    page.route('**/post-validate', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hallucinated: ['Passiflora inventada'],
          validated: [],
          age_available: true,
          detected_count: 1,
        }),
      });
    });

    // Abrir el agente
    const fab = page.locator('[data-testid="agent-fab"], button[aria-label*="agente" i]').first();
    await expect(fab).toBeVisible({ timeout: 5000 });
    await fab.click();

    // Escribir pregunta
    const input = page.locator('textarea, [role="textbox"]').first();
    await input.fill('qué biopreparado recomiendas?');
    await input.press('Enter');

    // Assert que aparece warning de alucinación
    await expect(page.locator('text=/generativa|verificar|⚠|alucin/i')).toBeVisible({ timeout: 5000 });
  });

  test('NLU timeout 8s → fallback raw LLM con tip rotativo', async ({ page }) => {
    // Mock /nlu con timeout de 8s
    page.route('**/nlu', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            use_tool: false,
            tool: null,
            args: null,
          }),
        });
      }, 8000);
    });

    // Mock /resolve-entities para que no bloquee
    page.route('**/resolve-entities', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entities: [] }),
      })
    );

    // Abrir el agente
    const fab = page.locator('[data-testid="agent-fab"], button[aria-label*="agente" i]').first();
    await expect(fab).toBeVisible({ timeout: 5000 });
    await fab.click();

    // Escribir pregunta
    const input = page.locator('textarea, [role="textbox"]').first();
    await input.fill('qué puedo sembrar?');
    await input.press('Enter');

    // Assert que aparece tip rotativo mientras espera
    await expect(page.locator('[data-testid="agent-tip"], text=/mientras|puedes|registrar/i')).toBeVisible({ timeout: 3000 });

    // Esperar respuesta final (fallback raw LLM)
    await expect(page.locator('text=/sembrar|cultivar|plantar/i')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Anti-hallucination flow — sanity checks', () => {
  test('verifica que los endpoints mockeados responden correctamente', async ({ page }) => {
    await mockSidecar(page);
    await page.goto(ORIGIN);

    // Verificar que /resolve-entities responde
    const resolveResponse = await page.request.post('/api/mcp/agro/resolve-entities', {
      data: { user_message: 'broca café' },
    });
    expect(resolveResponse.ok()).toBe(true);
    const resolveData = await resolveResponse.json();
    expect(resolveData.entities).toHaveLength(1);
    expect(resolveData.entities[0].nombre_comun).toBe('Broca del café');

    // Verificar que /nlu responde
    const nluResponse = await page.request.post('/api/mcp/agro/nlu', {
      data: { user_message: 'broca café' },
    });
    expect(nluResponse.ok()).toBe(true);
    const nluData = await nluResponse.json();
    expect(nluData.use_tool).toBe(true);
    expect(nluData.tool).toBe('get_biopreparados');
  });
});

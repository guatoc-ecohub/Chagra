/* global process */
import { test, expect } from '@playwright/test';

/**
 * agent-anti-halluc.spec.js — Pipeline anti-alucinación + queue UX (task #171).
 *
 * Valida el comportamiento end-to-end del AgentScreen frente a respuestas
 * "tóxicas" del LLM (binomios inventados, plagas inexistentes, agroquímicos
 * defensivos) y frente al UX de queueing de 2-max (task #121).
 *
 * Estrategia general:
 *   1. context.route deja pasar SOLO los endpoints relevantes (oauth + ollama
 *      chat + sidecar agro + warm-up). El resto cae a un catch-all 200 vacío
 *      para que la app no quede esperando red real.
 *   2. El endpoint Ollama OpenAI-compat (`/api/ollama/v1/chat/completions`) es
 *      mockeado por test con la respuesta SSE deseada — el spec controla qué
 *      "alucinaría" el LLM y verifica el comportamiento defensivo del front.
 *   3. Los endpoints sidecar (`/api/mcp/agro/*`) son mockeados pero la mayoría
 *      de pruebas que dependen del pipeline sidecar son `test.skip()` si la
 *      flag `VITE_USE_SIDECAR_AGRO_MCP` no está activa en build-time (Vite
 *      la resuelve en serve, no se puede setear desde runtime).
 *   4. Selectors: `data-testid` cuando existe (`agent-input`, `agent-submit`,
 *      `source-badge`, `queue-pending-badge`).
 *      Para detectar el badge "fuente" usamos `data-source` que es
 *      explícitamente el contrato visual (catalog / tool-no-match / generative).
 *
 * NO se invoca Ollama real ni el sidecar live. Todo es mock determinístico.
 */

// ============================================================================
// Helpers — mocks reutilizables.
// ============================================================================

const SIDECAR_FLAG_ON =
  process.env.VITE_USE_SIDECAR_AGRO_MCP === 'true' ||
  process.env.VITE_USE_SIDECAR_AGRO_MCP === '1';

/**
 * Construye un payload SSE OpenAI-compat con la respuesta completa del LLM
 * en un único chunk. El front (streamOpenAI) procesa SSE chunk-a-chunk; un
 * solo chunk con todo el contenido + finish_reason es suficiente y rápido.
 */
function buildSSEResponse(content) {
  const chunk = {
    choices: [
      {
        delta: { content },
        finish_reason: 'stop',
      },
    ],
    model: 'mock-llm',
    usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
  };
  return `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
}

/**
 * Mock OAuth + bloqueo agresivo de tráfico externo. Igual patrón que
 * offline.spec.js / multifinca.spec.js pero deja pasar:
 *   - /cycle-content/manifest.json (corpus RAG estático servido por Vite)
 *   - /api/ollama/v1/chat/completions (LLM principal — overrideado por cada test)
 *   - /api/mcp/agro/** (sidecar wrappers — overrideado por cada test)
 *   - /api/ollama/api/generate (warm-up pre-fetch)
 *   - /api/ollama/api/tags (gpu telemetry probe)
 *   - /api/kokoro/health (TTS health check, devuelve 503 para que no se active)
 *
 * El resto de `/api/**` cae a un catch-all que devuelve [] para que stores
 * que esperan colecciones (taxonomy_term, asset, log) no fallen.
 */
async function mockBaseRoutes(context) {
  // ORDEN CRÍTICO: Playwright evalúa rutas en orden inverso al registro
  // (last-added wins). Por eso registramos el catch-all PRIMERO (más viejo,
  // menos prioridad) y los handlers específicos DESPUÉS (más nuevos, ganan).
  // Las rutas que cada test agregue luego con page.route() tienen prioridad
  // aún mayor (page.route gana sobre context.route con misma URL si se
  // registra después).

  // Catch-all defensivo. Cualquier request a /api/** que no haya sido
  // override-ada por un mock más específico cae acá con un payload JSONAPI
  // vacío. Evita que la app quede esperando red real.
  await context.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
    })
  );

  // OAuth — fuera del prefijo /api/, no matchea el catch-all anterior, pero
  // igual lo registramos explícito por simetría con offline.spec.js.
  await context.route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-anti-halluc-token',
        refresh_token: 'e2e-anti-halluc-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    })
  );

  // Warm-up de Ollama dispara fire-and-forget al login — devolvemos OK
  // para que no contamine la telemetría con errores ruidosos.
  await context.route('**/api/ollama/api/generate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: 'ready', done: true }),
    })
  );

  // gpuTelemetryService consulta /api/ollama/api/tags — devolvemos vacío
  // para que la telemetría no falle al detectar `processor` de cada modelo.
  await context.route('**/api/ollama/api/tags', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [] }),
    })
  );

  // Kokoro TTS health → fingimos no disponible para que el AgentScreen no
  // intente cargar voz y caiga a Web Speech (que tampoco se ejecuta en
  // headless chromium). Evita ruido en console.
  await context.route('**/api/kokoro/**', (route) =>
    route.fulfill({ status: 503, body: '' })
  );
}

/**
 * Mock del endpoint LLM principal. Devuelve `content` como respuesta SSE.
 * Acepta `delayMs` para simular latencia (útil para los tests que necesitan
 * que la 1ra siga procesando mientras observamos UX intermedio del queue).
 *
 * IMPORTANTE — Service Worker (#339): la PWA registra `sw.js`, que en su
 * handler `fetch` re-emite las requests POST con `fetch(event.request)`.
 * Las requests originadas DENTRO del Service Worker NO son interceptadas
 * por `page.route()` (Playwright solo aplica page routes al contexto de la
 * página, no al del SW); SÍ las intercepta `context.route()`. Si registramos
 * este mock como page route, el catch-all de api en mockBaseRoutes (context
 * route) gana y la app recibe `{ data: [] }` en vez del SSE →
 * `streamOpenAI` parsea 0 tokens → la burbuja del assistant queda VACÍA.
 * Por eso el mock del LLM se registra en el CONTEXT y, al ser el último
 * context route en registrarse con esta URL, gana sobre el catch-all.
 */
async function mockLLM(page, { content, delayMs = 0 }) {
  await page.context().route('**/api/ollama/v1/chat/completions', async (route) => {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: buildSSEResponse(content),
    });
  });
}

/**
 * Mock genérico del sidecar agro-mcp. Cualquier subset puede sobreescribirse
 * con `opts`. Si no se provee algo, default null/empty para que el AgentScreen
 * caiga al flow RAG-only sin tool grounding.
 */
async function mockSidecar(page, opts = {}) {
  // #339: igual que mockLLM, los endpoints del sidecar son POST que pasan
  // por el Service Worker (`sw.js`). Registramos en CONTEXT para que el
  // catch-all `**/api/**` no se los coma cuando la flag sidecar esté activa.
  const ctx = page.context();
  // /resolve-entities — pre-validation AGE.
  await ctx.route('**/api/mcp/agro/resolve-entities', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entities: opts.entities ?? [],
      }),
    })
  );

  // /nlu — planner de tools.
  await ctx.route('**/api/mcp/agro/nlu', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        opts.nlu ?? {
          use_tool: false,
          tool: null,
          args: null,
          latency_ms: 50,
          model_used: 'mock',
          heuristic_skipped: false,
          reason: 'no_tool',
          error: null,
        }
      ),
    })
  );

  // /tools/<name> — devuelve lo que opts.toolResults[<name>] indique, o
  // `{ found: false }` si no está mockeado (el caller queda sin grounding).
  await ctx.route('**/api/mcp/agro/tools/*', (route) => {
    const url = route.request().url();
    const toolName = url.split('/').pop();
    const result = opts.toolResults?.[toolName];
    if (result === undefined) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ found: false }),
      });
      return;
    }
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    });
  });
}

/**
 * Login + navegación al AgentScreen. Reutilizable en todos los tests.
 */
async function gotoAgentScreen(page) {
  await page.goto('/');
  await page.getByLabel(/usuario/i).fill('e2e-anti-halluc');
  await page.getByLabel(/contraseña/i).fill('e2e-pwd');
  await page.getByRole('button', { name: /ingresar/i }).click();

  // El AgentFab es global pero solo aparece fuera de login/loading/voz/agente.
  // aria-label exacto: "Asistente Chagra IA" (o "Chagra IA tiene respuesta
  // nueva" si responseReady=true — no debería al primer login).
  const fab = page.getByRole('button', { name: /Asistente Chagra IA/i });
  await expect(fab).toBeVisible({ timeout: 15_000 });
  await fab.click();

  // Confirmar que el AgentScreen ya renderizó el input.
  await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 10_000 });
}

/**
 * Helper para escribir una pregunta y enviarla.
 */
async function askAgent(page, question) {
  const input = page.getByTestId('agent-input');
  const submit = page.getByTestId('agent-submit');
  await input.fill(question);
  await submit.click();
}

// ============================================================================
// Tests sin dependencia del flag sidecar — siempre corren.
// ============================================================================

test.describe('AgentScreen — pipeline anti-halluc + queue UX (task #171)', () => {
  test.beforeEach(async ({ context }) => {
    test.setTimeout(45_000);
    await mockBaseRoutes(context);
  });

  test('Caso A — input/submit deshabilitados al alcanzar 2 en cola', async ({ page }) => {
    // El front previene la 3ra pregunta deshabilitando input y submit cuando
    // queuePending.length >= 1. El test de "3ra rechazada → toast" vive en
    // vitest (AgentScreen.queue.test.jsx caso 3, ya cubierto). Aquí en e2e
    // el contrato observable es: tras 2 enqueue, ambos controles quedan
    // disabled — eso es lo que protege la UX en el path normal del usuario.
    await mockSidecar(page);
    await mockLLM(page, { content: 'Respuesta mock A', delayMs: 3000 });
    await gotoAgentScreen(page);

    const input = page.getByTestId('agent-input');
    const submit = page.getByTestId('agent-submit');

    await input.fill('pregunta uno sobre tomate');
    await submit.click();
    await expect(input).toBeEnabled({ timeout: 5_000 });

    await input.fill('pregunta dos sobre maíz');
    await submit.click();

    // Ahora queue full → input deshabilitado, submit deshabilitado.
    await expect(input).toBeDisabled({ timeout: 5_000 });
    await expect(submit).toBeDisabled();
  });

  test('Caso B — placeholder cambia con queue activo', async ({ page }) => {
    await mockSidecar(page);
    await mockLLM(page, { content: 'Respuesta mock B', delayMs: 3000 });
    await gotoAgentScreen(page);

    const input = page.getByTestId('agent-input');
    const submit = page.getByTestId('agent-submit');

    // Estado inicial: placeholder default.
    await expect(input).toHaveAttribute('placeholder', 'Escribe tu pregunta...');

    // 1ra pregunta — processing arranca, placeholder cambia.
    await input.fill('primera');
    await submit.click();
    await expect(input).toHaveAttribute(
      'placeholder',
      'Adelanta otra pregunta (cola: 1 más)',
      { timeout: 5_000 }
    );

    // 2da pregunta — queue full, input disabled, placeholder "Espera".
    await input.fill('segunda');
    await submit.click();
    await expect(input).toHaveAttribute(
      'placeholder',
      'Espera — ya hay una en cola',
      { timeout: 5_000 }
    );
  });

  test('Caso C — pending badge visible cuando hay 1 en cola', async ({ page }) => {
    await mockSidecar(page);
    await mockLLM(page, { content: 'Respuesta mock C', delayMs: 3000 });
    await gotoAgentScreen(page);

    const input = page.getByTestId('agent-input');
    const submit = page.getByTestId('agent-submit');

    await input.fill('primera C');
    await submit.click();
    await expect(input).toBeEnabled({ timeout: 5_000 });
    await input.fill('segunda C');
    await submit.click();

    // El badge data-testid="queue-pending-badge" aparece bajo el ETA.
    const badge = page.getByTestId('queue-pending-badge');
    await expect(badge).toBeVisible({ timeout: 5_000 });
    await expect(badge).toContainText(/1 pregunta en cola/i);
  });

  test('Caso D — respuesta sin tool grounding muestra badge "Respuesta generativa · verifica"', async ({ page }) => {
    // Si el LLM responde algo "razonable" pero NO hubo tool MCP que lo
    // groundee, la bubble debe mostrar badge gris "generativa" con
    // disclaimer "verifica" — defensa anti-falsa-autoridad.
    await mockSidecar(page);
    await mockLLM(page, {
      content:
        'No tengo evidencia documentada sobre la presencia del "chorcho" en cultivos de tomate. Si tienes síntomas concretos podríamos identificarlo por descripción.',
    });
    await gotoAgentScreen(page);
    await askAgent(page, '¿qué es el chorcho del tomate?');

    // Esperar a que el ChatBubble del assistant renderice + badge.
    const badge = page.getByTestId('source-badge');
    // Puede haber múltiples mensajes assistant en theory (history, recovery);
    // filtramos por el último visible.
    await expect(badge.last()).toBeVisible({ timeout: 30_000 });
    await expect(badge.last()).toHaveAttribute('data-source', 'generative');
    await expect(badge.last()).toContainText(/verifica/i);
  });

  test('Caso E — respuesta sobre paraquat sin evidence queda como generativa (defensa anti-autoridad falsa)', async ({ page }) => {
    // El LLM puede tener tendencia a inventar prohibiciones específicas
    // ("paraquat fue prohibido en 2021 por la Resolución X") — sin un tool
    // ICA real groundeando la respuesta, el badge debe quedar "generativa"
    // (con disclaimer "verifica") para que el operador no tome la cita como
    // dato autoritativo.
    await mockSidecar(page);
    await mockLLM(page, {
      content:
        'El paraquat es un herbicida regulado por el ICA. Para datos actuales del registro de ingredientes activos, consulta el ICA directamente — no tengo acceso a la resolución vigente en este momento.',
    });
    await gotoAgentScreen(page);
    await askAgent(page, '¿está prohibido el paraquat en Colombia?');

    const badge = page.getByTestId('source-badge');
    await expect(badge.last()).toBeVisible({ timeout: 30_000 });
    // Sin tool ICA invocado, NO debe aparecer "Catálogo verificado".
    await expect(badge.last()).not.toHaveAttribute('data-source', 'catalog');
  });

  // Caso F — des-skipeado (#339). La causa del skip NO era voseo ni
  // streaming del LLM: era fidelidad del mock. La PWA registra un Service
  // Worker (`sw.js`) que re-emite los POST con `fetch(event.request)`.
  // Playwright NO aplica `page.route()` a las requests originadas en el SW
  // (sólo `context.route()`), así que el mock del LLM (antes page route)
  // quedaba sombreado por el catch-all `**/api/**` y la app recibía
  // `{ data: [] }` → `streamOpenAI` parseaba 0 tokens → burbuja del assistant
  // VACÍA. Los casos D/E "pasaban" porque sólo asertan el badge (que se
  // renderiza con o sin contenido), nunca el texto. Fix: `mockLLM` ahora
  // registra el mock en el CONTEXT (ver mockLLM). Este caso valida el camino
  // real end-to-end: el contenido del LLM llega al render.
  test('Caso F — voseo argentino del LLM se renderiza pero sin enriquecimiento (no hay flag tone aún)', async ({ page }) => {
    // No existe (todavía) una feature que detecte voseo argentino y emita
    // toast warning. Documentamos el comportamiento esperado actual: el
    // output se muestra tal cual (con el filtro anti-voseo aplicado por
    // agentService), sin badge especial de tono. Si más adelante se
    // implementa la feature, este test debe actualizarse para assertear el
    // toast. Por ahora lo importante es que la respuesta NO crashee el
    // render aunque venga con voseo (caso degradado del modelo) y que el
    // texto efectivamente llegue a la burbuja.
    await mockSidecar(page);
    await mockLLM(page, {
      // El filtro de voseo (agentService.applyVoseoFilter) corrige "Mirá, vos
      // tenés" → "Mire, usted tiene"; asertamos la parte SIN voseo que NO
      // cambia y que confirma que el contenido del LLM llegó al render.
      content: 'Mirá, vos tenés que aplicar el biopreparado en la tarde, así no se quema.',
    });
    await gotoAgentScreen(page);
    await askAgent(page, '¿cuándo aplico el bioles?');

    // La respuesta llegó y se renderizó: el texto del LLM (post-filtro) es
    // visible en la burbuja del assistant. Esto prueba que el contenido NO
    // queda vacío (regresión #339) y que el render no crashea con voseo.
    await expect(
      page.getByText(/aplicar el biopreparado en la tarde/)
    ).toBeVisible({ timeout: 30_000 });

    // El filtro anti-voseo corrigió el voseo argentino: NO debe quedar
    // "Mirá" ni "vos tenés" visibles en la UI (DR-LANG-1 / español
    // colombiano). Verificamos la sustitución a usted colombiano.
    await expect(page.getByText(/Mire, usted tiene/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/vos tenés/)).toHaveCount(0);
  });
});

// ============================================================================
// Tests con dependencia del flag sidecar — skipean si VITE_USE_SIDECAR_AGRO_MCP
// no está activa en build-time del webServer Vite.
//
// La flag se resuelve en `import.meta.env` durante Vite serve y NO es runtime-
// overridable desde Playwright. Para correrlos localmente:
//
//   VITE_USE_SIDECAR_AGRO_MCP=true npm run test:e2e -- tests/agent-anti-halluc.spec.js
//
// En CI estos casos quedan skipped hasta que el workflow setee la env var.
// Eso requiere editar `.github/workflows/playwright.yml` — fuera del scope
// task #171 (el brief prohibe tocarlo).
// ============================================================================

test.describe('AgentScreen — sidecar pipeline (flag-dependent)', () => {
  test.beforeEach(async ({ context }) => {
    test.skip(
      !SIDECAR_FLAG_ON,
      'Requiere VITE_USE_SIDECAR_AGRO_MCP=true al arrancar Vite (build-time flag, no runtime).'
    );
    test.setTimeout(45_000);
    await mockBaseRoutes(context);
  });

  test('Caso G — resolve-entities inyecta binomio canónico (grounding pre-LLM)', async ({ page }) => {
    // El sidecar /resolve-entities devuelve gulupa → Passiflora edulis. El
    // pipeline debe llamar el LLM con system prompt enriquecido y la bubble
    // muestra el contenido del LLM. NO verificamos el contenido exacto del
    // system prompt (eso es vitest territory, ya cubierto en
    // aiService.grounded.test.js); aquí verificamos que el flow E2E no
    // crashea y que el LLM efectivamente recibe la llamada.
    let llmSeen = false;
    // #339: registrar en context (SW re-emite los POST; page.route no los ve).
    await page.context().route('**/api/ollama/v1/chat/completions', (route) => {
      llmSeen = true;
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildSSEResponse('La gulupa (Passiflora edulis) se siembra entre 1500 y 2000 msnm.'),
      });
    });
    await mockSidecar(page, {
      entities: [
        {
          mentioned: 'gulupa',
          kind: 'species',
          canonical_id: 'passiflora_edulis',
          nombre_comun: 'Gulupa',
          nombre_cientifico: 'Passiflora edulis',
          confidence: 0.95,
        },
      ],
    });

    await gotoAgentScreen(page);
    await askAgent(page, '¿a qué altura siembro gulupa?');

    await expect(page.getByText(/Passiflora edulis/)).toBeVisible({ timeout: 30_000 });
    expect(llmSeen).toBe(true);
  });

  test('Caso G2 — tomate de árbol inyecta Solanum betaceum y NUNCA el cherry inventado (incidente prod 2026-05-30)', async ({ page }) => {
    // Regresión del bug de grounding muerto: el sidecar /resolve-entities
    // devolvía entities:[] y el LLM inventaba "tomate de árbol = Solanum
    // lycopersicum var. cerasiforme" (eso es tomate CHERRY). Lo correcto es
    // Solanum betaceum. Con el grounding arreglado, el sidecar resuelve
    // betaceum y el pipeline DEBE inyectarlo en el system prompt del LLM.
    //
    // Verificación fuerte: interceptamos el body de la request al LLM y
    // asertamos que el binomio CANÓNICO (Solanum betaceum) viaja en el
    // grounding, y que el binomio FALSO (cerasiforme) NO está presente.
    let systemPromptSeen = '';
    await page.context().route('**/api/ollama/v1/chat/completions', (route) => {
      try {
        const body = JSON.parse(route.request().postData() || '{}');
        const sys = (body.messages || [])
          .filter((m) => m.role === 'system')
          .map((m) => m.content)
          .join('\n');
        systemPromptSeen = sys;
      } catch {
        // body no-parseable: dejamos systemPromptSeen vacío, las aserciones
        // de abajo fallarán con un mensaje claro.
      }
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildSSEResponse(
          'El tomate de árbol (Solanum betaceum) se siembra entre 1800 y 2800 msnm.'
        ),
      });
    });
    await mockSidecar(page, {
      entities: [
        {
          mentioned: 'tomate de arbol',
          kind: 'species',
          canonical_id: 'solanum_betaceum',
          nombre_comun: 'Tomate de árbol / Tamarillo',
          nombre_cientifico: 'Solanum betaceum Cav.',
          confidence: 1.0,
        },
      ],
    });

    await gotoAgentScreen(page);
    await askAgent(page, 'dame consejos para sembrar tomate de árbol');

    // La respuesta correcta (betaceum) llega y se renderiza.
    await expect(page.getByText(/Solanum betaceum/)).toBeVisible({ timeout: 30_000 });

    // El grounding inyectó el binomio canónico al system prompt…
    expect(systemPromptSeen).toContain('Solanum betaceum');
    expect(systemPromptSeen).toContain('solanum_betaceum');
    // …y JAMÁS el binomio cherry que el LLM alucinó en el incidente.
    expect(systemPromptSeen).not.toContain('cerasiforme');
  });

  test('Caso H — tool MCP grounded produce badge "Catálogo verificado"', async ({ page }) => {
    // NLU devuelve use_tool=true tool=get_species. Tool result trae
    // matches_count=1 → computeSourceMetadata pone grounded=true →
    // ChatBubble renderiza badge verde con data-source="catalog".
    await mockLLM(page, {
      content: 'La papa criolla (Solanum tuberosum grupo Phureja) crece bien sobre 2400 msnm.',
    });
    await mockSidecar(page, {
      nlu: {
        use_tool: true,
        tool: 'get_species',
        args: { query: 'papa criolla' },
        latency_ms: 80,
        model_used: 'qwen2.5-coder:7b',
        heuristic_skipped: false,
        reason: null,
        error: null,
      },
      toolResults: {
        get_species: {
          found: true,
          matches_count: 1,
          canonical_id: 'solanum_tuberosum_phureja',
          nombre_cientifico: 'Solanum tuberosum grupo Phureja',
        },
      },
    });

    await gotoAgentScreen(page);
    await askAgent(page, '¿qué altura le va a la papa criolla?');

    const badge = page.getByTestId('source-badge');
    await expect(badge.last()).toBeVisible({ timeout: 30_000 });
    await expect(badge.last()).toHaveAttribute('data-source', 'catalog');
    await expect(badge.last()).toContainText(/Catálogo verificado/i);
  });

  test('Caso I — tool sin match → badge amber "Tool sin match"', async ({ page }) => {
    // El NLU dispara el tool, pero el catálogo no tiene match. La bubble
    // debe mostrar badge amber con data-source="tool-no-match" — el
    // operador ve que SE consultó el catálogo pero no se halló nada.
    await mockLLM(page, {
      content: 'No tengo esta plaga en el catálogo Chagra todavía. Si me describes los síntomas te ayudo.',
    });
    await mockSidecar(page, {
      nlu: {
        use_tool: true,
        tool: 'get_pest_controllers',
        args: { pest: 'neolepidopteron-inventado' },
        latency_ms: 80,
        model_used: 'mock',
        heuristic_skipped: false,
        reason: null,
        error: null,
      },
      toolResults: {
        get_pest_controllers: { found: false },
      },
    });

    await gotoAgentScreen(page);
    await askAgent(page, '¿cómo controlo el neolepidopteron daquila?');

    const badge = page.getByTestId('source-badge');
    await expect(badge.last()).toBeVisible({ timeout: 30_000 });
    await expect(badge.last()).toHaveAttribute('data-source', 'tool-no-match');
  });

  // ──────────────────────────────────────────────────────────────────────
  // CHIPS DE MODO (A3/A4, decisión operador 2026-06-02) — el chip fuerza la
  // intención y rutea DIRECTO al tool determinístico, SALTANDO el NLU. Estos
  // tests prueban el contrato observable: con un chip activo, el front llama
  // el tool correcto y NUNCA toca el endpoint /nlu del sidecar.
  // ──────────────────────────────────────────────────────────────────────

  test('Caso L — chip Plaga rutea a get_pest_controllers SIN llamar /nlu', async ({ page }) => {
    let nluCalled = false;
    let pestToolCalled = false;
    // Interceptamos ANTES de mockSidecar para contar los hits (last-added wins
    // por URL exacta, así que registramos el counter en page.route que gana).
    await page.context().route('**/api/mcp/agro/nlu', (route) => {
      nluCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ use_tool: false, tool: null, args: null }),
      });
    });
    await page.context().route('**/api/mcp/agro/tools/get_pest_controllers', (route) => {
      pestToolCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          found: true,
          pest: 'broca del café',
          controllers: [{ id: 'beauveria_bassiana', nombre: 'Beauveria bassiana' }],
        }),
      });
    });
    await mockSidecar(page);
    await mockLLM(page, {
      content: 'Para la broca del café usa Beauveria bassiana, un hongo entomopatógeno.',
    });

    await gotoAgentScreen(page);
    // Activar el chip Plaga y enviar.
    await page.getByRole('button', { name: /Plaga/i }).click();
    await askAgent(page, 'broca del café');

    await expect(page.getByText(/Beauveria bassiana/)).toBeVisible({ timeout: 30_000 });
    expect(pestToolCalled).toBe(true);
    expect(nluCalled).toBe(false); // ← el contrato clave: el chip SALTA el NLU.
  });

  test('Caso M — chip ¿Qué siembro? rutea a get_species SIN llamar /nlu', async ({ page }) => {
    let nluCalled = false;
    let speciesToolCalled = false;
    await page.context().route('**/api/mcp/agro/nlu', (route) => {
      nluCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ use_tool: false, tool: null, args: null }),
      });
    });
    await page.context().route('**/api/mcp/agro/tools/get_species', (route) => {
      speciesToolCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          found: true,
          matches_count: 1,
          nombre_cientifico: 'Persea americana Mill.',
        }),
      });
    });
    await mockSidecar(page);
    await mockLLM(page, {
      content: 'El aguacate (Persea americana Mill.) crece bien entre 1000 y 2000 msnm.',
    });

    await gotoAgentScreen(page);
    await page.getByRole('button', { name: /Qué siembro/i }).click();
    await askAgent(page, 'aguacate');

    await expect(page.getByText(/Persea americana/)).toBeVisible({ timeout: 30_000 });
    expect(speciesToolCalled).toBe(true);
    expect(nluCalled).toBe(false);
  });

  test('Caso N — chip Precio responde stub honesto SIN llamar /nlu ni LLM', async ({ page }) => {
    let nluCalled = false;
    let llmCalled = false;
    await page.context().route('**/api/mcp/agro/nlu', (route) => {
      nluCalled = true;
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.context().route('**/api/ollama/v1/chat/completions', (route) => {
      llmCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: buildSSEResponse('respuesta del LLM que NO debería aparecer'),
      });
    });
    await mockSidecar(page);

    await gotoAgentScreen(page);
    await page.getByRole('button', { name: /Precio/i }).click();
    await askAgent(page, 'papa');

    // El stub responde con un mensaje honesto "no disponible" sin tocar red.
    await expect(page.getByText(/no está disponible/i)).toBeVisible({ timeout: 15_000 });
    expect(nluCalled).toBe(false);
    expect(llmCalled).toBe(false);
  });
});

// ============================================================================
// Tests con dependencias adicionales — feature aún NO implementada en main.
//
// Estos casos cubren features mencionadas en el brief que NO existen todavía
// en el código del PWA. Quedan marcados con `.skip` permanente + comentario
// para que cuando se implementen, se reactiven cambiando `.skip` por nada.
// ============================================================================

test.describe('AgentScreen — features pendientes (skip permanente hasta implementar)', () => {
  test.skip('Caso J — /post-validate detecta binomio inventado y muestra flag visual', async () => {
    // El sidecar `/post-validate` NO existe todavía en sidecarClient.js (al
    // 2026-05-24 solo hay /nlu, /resolve-entities, /tools/*). Cuando se
    // implemente la pasada post-LLM que extrae binomios del output y los
    // valida contra AGE devolviendo `{ hallucinated: [...] }`, este test
    // debe quitar el `.skip` y mockear el endpoint con el array no-vacío.
    //
    // Verificación esperada: la bubble del assistant debe mostrar un badge
    // visual "Alucinación detectada · Neolepidopteron daquila" o similar
    // (selector pendiente del diseño).
  });

  test.skip('Caso K — voseo argentino dispara toast warning de tono no-colombiano', async () => {
    // No existe (al 2026-05-24) un detector de voseo en AgentScreen.jsx ni
    // un componente que emita toast warning cuando el LLM responda con
    // "vos tenés / mirá / dale". Si se implementa, este test debe verificar
    // un `data-testid="tone-warning-toast"` con texto que contenga "tono"
    // o "argentino" o "español de Colombia". Por ahora documentamos la
    // expectativa para que quede pista del feature pendiente.
  });
});

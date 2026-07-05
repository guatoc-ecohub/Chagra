import { expect } from '@playwright/test';

/**
 * f2TestUtils.js — helpers compartidos para los specs NUEVOS del QA de
 * cierre de jornada (2026-07-05): click-through-completo.spec.js y
 * agente-responde-desde-todas-partes.spec.js.
 *
 * Corren en el proyecto `visual` de playwright.config.js, que apunta al
 * servidor dedicado :5174 con VITE_FINCA_VIVA_HOME_PERFIL=true (la MISMA
 * flag que deploy.yml/dev-deploy.yml ya sirven en prod/stg) — el puerto
 * 5173 (proyectos chromium/mobile-*, ~50 specs legacy) queda intacto con la
 * flag OFF para no romper esa suite.
 *
 * Patrón de sesión/login: el MISMO de tests/visual/finca-viva-temas.spec.js
 * (siembra localStorage + login programático vía authService/tenantContext,
 * sin pasar por el formulario de LoginScreen) — más rápido y determinista
 * que un login por UI, y ya validado en este mismo harness F2.
 *
 * Patrón de mocks backend: el MISMO de tests/agent-anti-halluc.spec.js
 * (context.route — el Service Worker re-emite los POST del LLM/sidecar y
 * page.route no los ve, bug #339).
 */

export const F2_USER = 'e2e-f2-qa';

/** Filtro estándar del repo para errores de consola no-críticos (ruido conocido). */
export function filtrarErroresCriticos(errors) {
  return errors.filter(
    (e) =>
      !e.includes('manifest') &&
      !e.includes('favicon') &&
      !e.includes('ServiceWorker') &&
      !e.toLowerCase().includes('preload') &&
      !e.toLowerCase().includes('mixed content') &&
      !e.includes('401') &&
      !e.includes('403') &&
      !e.includes('Failed to load resource') &&
      !/sqlite|wasm|content security policy|csp|webgl|arraybuffer instantiation|error obteniendo tareas de farmos|error obteniendo tareas pendientes/i.test(
        e,
      ),
  );
}

/** Instala los listeners de consola/página y devuelve el array acumulador. */
export function trackJsErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Sin overflow horizontal (mismo criterio que finca-viva-temas.spec.js). */
export async function assertSinOverflowHorizontal(page, contexto = '') {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `overflow horizontal ${contexto}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

/**
 * Backend mockeado — deja pasar SOLO lo relevante, catch-all vacío para el
 * resto. Debe llamarse ANTES de goto('/') (usa context.route).
 */
export async function mockBackendBasico(context) {
  await context.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], jsonapi: { version: '1.0' } }),
    }),
  );
  await context.route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'f2-qa-token',
        refresh_token: 'f2-qa-refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    }),
  );
  await context.route('**/api/ollama/api/generate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ response: 'ready', done: true }),
    }),
  );
  await context.route('**/api/ollama/api/tags', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [] }) }),
  );
  await context.route('**/api/kokoro/**', (route) => route.fulfill({ status: 503, body: '' }));
  await context.route('**/fincas-publicas.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
}

function buildSSEResponse(content) {
  const chunk = {
    choices: [{ delta: { content }, finish_reason: 'stop' }],
    model: 'mock-llm',
    usage: { prompt_tokens: 20, completion_tokens: 20, total_tokens: 40 },
  };
  return `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
}

/** Mock del LLM principal (Ollama OpenAI-compat, SSE). Ver bug #339 (context.route). */
export async function mockLLM(page, content) {
  await page.context().route('**/api/ollama/v1/chat/completions', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: buildSSEResponse(content) }),
  );
}

/**
 * Mock del sidecar agro-mcp (resolve-entities + nlu + tools/<name> +
 * piso-termico-guard). `opts.grounding` simula el semáforo #2074
 * (grounding_semaphore/policy/reason) que resolveEntities ahora reenvía.
 */
export async function mockSidecar(page, opts = {}) {
  const ctx = page.context();
  await ctx.route('**/api/mcp/agro/resolve-entities', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entities: opts.entities ?? [], grounding: opts.grounding ?? null }),
    }),
  );
  await ctx.route('**/api/mcp/agro/nlu', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        opts.nlu ?? {
          use_tool: false,
          tool: null,
          args: null,
          latency_ms: 20,
          model_used: 'mock',
          heuristic_skipped: false,
          reason: 'no_tool',
          error: null,
        },
      ),
    }),
  );
  await ctx.route('**/api/mcp/agro/tools/*', (route) => {
    const toolName = route.request().url().split('/').pop();
    const result = opts.toolResults?.[toolName];
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result === undefined ? { found: false } : result),
    });
  });
  await ctx.route('**/piso-termico-guard', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(opts.pisoTermico ?? { has_mismatch: false }),
    }),
  );
}

/**
 * Siembra sesión + PERFIL de finca INTEGRAL (rol campesino, con ubicación) —
 * garantiza escala 'finca' y que el hero F2 no caiga en el estado "vacío".
 * `mostrarAnimales` gatea la tarjeta Animales de MundosDeMiFinca.
 */
export async function seedSession(page, { user = F2_USER, nivelRespuestas = 'simple' } = {}) {
  await page.addInitScript(
    ({ username, nivel }) => {
      try {
        window.localStorage.setItem('chagra:active_tenant_id', username);
        window.localStorage.setItem('chagra:bienvenida-vista:v1', '1');
        window.localStorage.setItem(
          'chagra:profile:v1',
          JSON.stringify({
            rol: 'campesino',
            vocacion: 'mixta',
            finca_tipo: 'integral',
            nivel_respuestas: nivel,
            vereda: 'El Volador',
            municipio: 'Guatavita',
            departamento: 'Cundinamarca',
            finca_altitud: 2680,
            piso_termico: 'frio',
            piso_confirmado: '1',
            animales: ['gallinas'],
          }),
        );
        window.localStorage.setItem('chagra:profile:done:v1', '1');
        window.localStorage.setItem('chagra:onboarding:done', '1');
      } catch (_) {
        /* noop */
      }
    },
    { username: user, nivel: nivelRespuestas },
  );
}

/** Login programático (mismo patrón que finca-viva-temas.spec.js:130-140). */
export async function login(page, { user = F2_USER } = {}) {
  await page.evaluate(async (username) => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser(username, 'e2e-f2-qa-pwd');
    if (!result.success) {
      throw new Error(`Login mock falló: ${result.error || 'sin detalle'}`);
    }
    const tenantMod = await import('/src/services/tenantContext.js');
    tenantMod.setActiveTenantId(username);
  }, user);
}

/** ¿La build bajo prueba tiene la flag F2 ON? Igual criterio que finca-viva-temas.spec.js. */
export async function flagF2Activa(page) {
  try {
    return await page.evaluate(async () => {
      const mod = await import('/src/config/fincaVivaHomeFlag.js');
      return mod.fincaVivaHomePerfilActivo();
    });
  } catch (_) {
    return false;
  }
}

/**
 * Flujo completo: mockea backend, siembra sesión+perfil, entra y hace login,
 * espera el hero F2 visible. Se salta limpio si la build no tiene la flag ON
 * (mismo criterio que finca-viva-temas.spec.js — no rompe si algún día el
 * default cambia).
 */
export async function entrarAFincaViva(page, context, { nivelRespuestas = 'simple' } = {}) {
  await seedSession(page, { nivelRespuestas });
  await mockBackendBasico(context);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const flagOn = await flagF2Activa(page);
  if (!flagOn) return false;

  await login(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.getByTestId('finca-viva-hero')).toBeVisible({ timeout: 20000 });
  return true;
}

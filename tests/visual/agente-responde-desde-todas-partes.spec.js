import { test, expect } from '@playwright/test';
import {
  entrarAFincaViva,
  filtrarErroresCriticos,
  mockLLM,
  mockSidecar,
  trackJsErrors,
} from './f2TestUtils.js';

/**
 * agente-responde-desde-todas-partes.spec.js — QA de cierre de jornada
 * (2026-07-05), punto 3: verifica que el chat del agente se abre Y RESPONDE
 * desde cada punto de la interfaz que lo invoca, con backend (LLM + sidecar
 * agro-mcp) mockeado — nunca red real, nunca 404/pantalla en blanco.
 *
 * Entradas cubiertas:
 *   1. Botón "A" del header (fvh-brand-agente).
 *   2. Tarjeta "Pregúntele a Chagra" (uno de los 4 portales del home).
 *   3. El botón "Pregúntele a Chagra sobre …" al pie de un MUNDO.
 *   4. El deep-link de ayuda groundeada DENTRO del chat («Chagra enseña a
 *      usar Chagra», #2050) — pregunta meta → botón `ayuda-deeplink` → navega.
 *   5. Modo de respuesta: "Claro y corto" (campesino) vs "Con detalle"
 *      (experto) — el agente responde en ambos.
 *   6. Con grounding (tool MCP con match → badge "Catálogo verificado") y
 *      SIN grounding (tool sin match / 0 entidades → el agente igual
 *      responde, sin quedarse en blanco ni tronar).
 *
 * NOTA IMPORTANTE (verificado en el código de esta rama, 2026-07-05): el
 * "semáforo" de confianza (#2074, `grounding_semaphore` verde/ámbar/rojo) hoy
 * es SOLO metadata interna del mensaje (AgentScreen expone
 * `sourceMetadata.grounding_semaphore/policy/reason`) — el badge visual
 * (`SemaphoreBadge`, testid `semaphore-badge`) vive en una rama aparte
 * (`feat/semaforo-confianza-ui`) que todavía NO está mergeada a `main`. Este
 * spec por eso NO busca un badge de semáforo en el DOM (no existe aún) — usa
 * `source-badge`/`confianza-badge` (sí mergeados) como evidencia visible de
 * que la respuesta trae grounding. La cobertura de que `resolveEntities`
 * pasa el campo `grounding` de punta a punta vive en
 * tests/unit/coverage-jornada-48h.test.js.
 *
 * Si la build no tiene la flag F2 ON, el describe se salta limpio.
 */

const PREGUNTA_GENERICA = 'hola chagra';

async function esperarRespuesta(page, { timeout = 30_000 } = {}) {
  const scroll = page.getByTestId('chat-scroll');
  await expect(scroll).toBeVisible({ timeout });
  // El input vuelve al placeholder default cuando la cola queda ociosa — señal
  // de que la respuesta terminó de procesarse (mismo criterio que
  // tests/agent-anti-halluc.spec.js).
  await expect(page.getByTestId('agent-input')).toHaveAttribute('placeholder', 'Escribe tu pregunta...', {
    timeout,
  });
}

test.describe('El agente responde desde TODAS las entradas de la interfaz (F2)', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page, context }) => {
    const entro = await entrarAFincaViva(page, context);
    test.skip(!entro, 'Flag VITE_FINCA_VIVA_HOME_PERFIL OFF: harness del home F2.');
  });

  test('1) botón "A" del header → responde con grounding (Catálogo verificado)', async ({ page }) => {
    const errors = trackJsErrors(page);
    await mockLLM(page, 'La papa criolla crece bien sobre 2400 msnm en clima frío.');
    await mockSidecar(page, {
      nlu: {
        use_tool: true,
        tool: 'get_species',
        args: { query: 'papa criolla' },
        latency_ms: 60,
        model_used: 'mock',
        heuristic_skipped: false,
        reason: null,
        error: null,
      },
      toolResults: {
        get_species: { found: true, matches_count: 1, canonical_id: 'solanum_tuberosum_phureja', nombre_cientifico: 'Solanum tuberosum grupo Phureja' },
      },
    });

    await page.getByTestId('fvh-brand-agente').click();
    await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('agent-input').fill('¿qué altura le va a la papa criolla?');
    await page.getByTestId('agent-submit').click();
    await esperarRespuesta(page);

    const badge = page.getByTestId('source-badge');
    await expect(badge.last()).toBeVisible({ timeout: 15_000 });
    await expect(badge.last()).toHaveAttribute('data-source', 'catalog');
    await expect(page.getByTestId('chat-scroll')).toContainText(/papa criolla/i);

    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });

  test('2) tarjeta "Pregúntele a Chagra" del home → responde', async ({ page }) => {
    const errors = trackJsErrors(page);
    await mockLLM(page, 'Puede sembrar frijol asociado con maíz sin problema.');
    await mockSidecar(page); // sin tool — flujo RAG-only.

    await page.getByTestId('finca-viva-portales').getByRole('button', { name: /^Pregúntele a Chagra:/ }).click();
    await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('agent-input').fill(PREGUNTA_GENERICA);
    await page.getByTestId('agent-submit').click();
    await esperarRespuesta(page);

    await expect(page.getByTestId('chat-scroll')).toContainText(/frijol/i);
    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });

  test('3) botón "Pregúntele a Chagra" al pie de un MUNDO → responde', async ({ page }) => {
    const errors = trackJsErrors(page);
    await mockLLM(page, 'El suelo vivo mejora con materia orgánica y sin arar en exceso.');
    await mockSidecar(page);

    await page.getByTestId('mundo-suelo').click();
    await expect(page.getByTestId('mundo-screen-suelo')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('mundo-agente').click();
    await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('agent-input').fill('¿cómo mejoro el suelo de mi finca?');
    await page.getByTestId('agent-submit').click();
    await esperarRespuesta(page);

    await expect(page.getByTestId('chat-scroll')).toContainText(/suelo/i);
    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });

  test('4) deep-link de ayuda groundeada dentro del chat («Chagra enseña a usar Chagra») navega', async ({ page }) => {
    const errors = trackJsErrors(page);
    // La respuesta de ayuda es DETERMINÍSTICA (ayudaAgentResponder, sin LLM) —
    // igual mockeamos LLM/sidecar por si algún guard los toca antes del
    // short-circuit de detectMetaAyudaIntent.
    await mockLLM(page, 'no debería usarse — la respuesta de ayuda es determinística');
    await mockSidecar(page);

    await page.getByTestId('fvh-brand-agente').click();
    await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 15_000 });

    // «dónde veo mis plantas» → matchAyudaFuncion resuelve función 'plantas',
    // accion tipo 'nav' view 'activos' (src/data/__tests__/ayudaFunciones.test.js).
    await page.getByTestId('agent-input').fill('¿dónde veo mis plantas?');
    await page.getByTestId('agent-submit').click();
    await esperarRespuesta(page);

    const deeplink = page.getByTestId('ayuda-deeplink');
    await expect(deeplink.last()).toBeVisible({ timeout: 15_000 });
    await deeplink.last().click();

    // tipo:'nav' → onNavigate(view) — sale del chat hacia la pantalla real.
    await expect(page.getByTestId('agent-input')).toHaveCount(0);

    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });

  for (const modo of [
    { nombre: 'Claro y corto (campesino)', label: 'Claro y corto' },
    { nombre: 'Con detalle (experto)', label: 'Con detalle' },
  ]) {
    test(`5) modo "${modo.nombre}" → el agente igual responde`, async ({ page }) => {
      const errors = trackJsErrors(page);
      await mockLLM(page, 'Respuesta de prueba para verificar el modo de nivel de respuestas.');
      await mockSidecar(page);

      await expect(page.getByTestId('finca-viva-nivel-respuestas')).toBeVisible({ timeout: 10_000 });
      await page.getByTestId('finca-viva-nivel-respuestas').getByRole('radio', { name: modo.label }).click();
      await expect(page.getByTestId('finca-viva-nivel-respuestas').getByRole('radio', { name: modo.label })).toHaveAttribute(
        'aria-checked',
        'true',
      );

      await page.getByTestId('fvh-brand-agente').click();
      await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 15_000 });
      await page.getByTestId('agent-input').fill(PREGUNTA_GENERICA);
      await page.getByTestId('agent-submit').click();
      await esperarRespuesta(page);

      await expect(page.getByTestId('chat-scroll')).toContainText(/Respuesta de prueba/i);
      expect(filtrarErroresCriticos(errors)).toEqual([]);
    });
  }

  test('6) SIN grounding (tool sin match) → el agente igual responde, sin blanco ni 404', async ({ page }) => {
    const errors = trackJsErrors(page);
    await mockLLM(page, 'No tengo un dato verificado de esa especie, pero le puedo orientar en general.');
    await mockSidecar(page, {
      nlu: {
        use_tool: true,
        tool: 'get_species',
        args: { query: 'especie rarísima inventada' },
        latency_ms: 60,
        model_used: 'mock',
        heuristic_skipped: false,
        reason: null,
        error: null,
      },
      toolResults: { get_species: { found: false } },
    });

    await page.getByTestId('fvh-brand-agente').click();
    await expect(page.getByTestId('agent-input')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('agent-input').fill('¿qué tal le va a la especie rarísima inventada?');
    await page.getByTestId('agent-submit').click();
    await esperarRespuesta(page);

    // Responde de verdad (no queda vacío/errante) — el badge, si aparece,
    // debe reflejar que NO hubo match (nunca "catalog").
    await expect(page.getByTestId('chat-scroll')).not.toBeEmpty();
    const badge = page.getByTestId('source-badge');
    if (await badge.count()) {
      await expect(badge.last()).not.toHaveAttribute('data-source', 'catalog');
    }
    expect(filtrarErroresCriticos(errors)).toEqual([]);
  });
});

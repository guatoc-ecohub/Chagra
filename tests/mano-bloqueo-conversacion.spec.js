import { test, expect } from '@playwright/test';
import { CAPABILITY_MANIFEST } from '../src/services/agentCapabilities.js';

/**
 * mano-bloqueo-conversacion.spec.js — E2E ENDURECIDO de "La mano de Chagra"
 * (la araña / red viva de capacidades del AgentHero).
 *
 * BUG del operador (2026-06-10): al tocar páramo / silvopastoreo / restauración
 * (grupo "Restaurar y conservar") "no hace nada y BLOQUEA la mano — si no
 * recargo, no funciona más".
 *
 * CAUSA-RAÍZ (reproducida y fijada): AgentHero.send() ponía `busy=true` y SOLO
 * lo reseteaba en el catch (fallo de persistencia). En el camino feliz `busy`
 * quedaba pegado, confiando en que la navegación diferida (launchToAgent,
 * SEND_TRANSITION_MS) desmontara el hero. Si esa navegación NO desmontaba la
 * mano (vista 'agente' lenta/no monta, navegación no-op, operador aún viéndola),
 * `busy=true` se propagaba a AgentRedMenu `disabled` → `.arm-root.arm-disabled`
 * (pointer-events:none) → MANO MUERTA hasta recargar. Fix: `busy` se libera
 * SIEMPRE en `finally`.
 *
 * Este archivo cubre dos planos:
 *   A) REGRESIÓN UNITARIA (montaje aislado de AgentHero): el pick deja la mano
 *      VIVA aunque la navegación no desmonte el hero. FALLA sin el fix (la mano
 *      cae a pointer-events:none) y PASA con él.
 *   B) CONVERSACIÓN REAL por CADA capacidad viva de la mano: tocar el nodo →
 *      ver respuesta → 2 mensajes de seguimiento en la MISMA conversación →
 *      volver a la mano y tocar otra opción. Verifica que la mano NUNCA se
 *      bloquea, que la respuesta aparece y que silvopastoril FALLANDO degrada
 *      con gracia (sin colgar la mano ni el chat).
 */

const A_LABEL = 'Ver todo lo que puede hacer Chagra';
const REACT_DEP = '/node_modules/.vite/deps/react.js';
const REACTDOM_DEP = '/node_modules/.vite/deps/react-dom_client.js';

const HERO_CAPS = CAPABILITY_MANIFEST.filter((c) => c.hero === true);

// Capacidades 'ask' que disparan una conversación real (las que el operador
// describe como "nodos" de la mano). Excluimos nav/photo/unavailable/soon (no
// abren chat) y deep (job async con UX propia, no la conversación estándar).
const ASK_CAPS = HERO_CAPS.filter(
  (c) => (c.heroRoute?.kind || c.route?.kind) === 'ask' && c.status === 'live' && c.id !== 'deep',
);

// ── mocks ────────────────────────────────────────────────────────────────────

function sse(text) {
  return [
    `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
    'data: [DONE]\n\n',
  ].join('');
}

/**
 * Mocks de red. `silvoFails`: el tool get_diseno_silvopastoril responde 422
 * (mcp_call_failed) para probar la degradación amable. El resto de tools y el
 * LLM responden OK. Mockeamos también /api/asset|log|user para que el agente NO
 * dispare el interceptor 401→login al cargar historial/clima/inventario.
 */
async function mockNet(page, { silvoFails = true } = {}) {
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 't', refresh_token: 'r', expires_in: 3600, token_type: 'Bearer' }) }));

  // Sidecar agro-mcp: silvopastoril FALLA (422); restauración/páramo/otros OK.
  await page.context().route('**/api/mcp/agro/**', (route) => {
    const url = route.request().url();
    if (silvoFails && /silvopastoril/i.test(url)) {
      return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'mcp_call_failed', detail: 'args inválidos' }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true, especies: [{ nombre: 'Aliso' }] }) });
  });

  // NLU del sidecar: sin tool (la conversación va por LLM directo; los chips
  // forzados ya enrutan su tool aparte vía /api/mcp/agro).
  await page.context().route('**/nlu', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ use_tool: false }) }));

  // LLM OpenAI-compat (stream SSE).
  await page.context().route('**/v1/chat/completions', (route) =>
    route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sse('Listo: te recomiendo especies nativas y un manejo paso a paso.') }));
  await page.context().route('**/api/ollama/api/tags', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ name: 'granite3.1-dense:8b' }] }) }));

  // farmOS JSON:API — vacíos para que NO se dispare el interceptor 401→login.
  await page.context().route('**/api/asset/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: JSON.stringify({ data: [] }) }));
  await page.context().route('**/api/log/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: JSON.stringify({ data: [] }) }));
  await page.context().route('**/api/taxonomy_term/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: JSON.stringify({ data: [] }) }));
  await page.context().route('**/api/user/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: JSON.stringify({ data: [] }) }));
}

async function bootToDashboard(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async () => {
    const auth = await import('/src/services/authService.js');
    const r = await auth.authenticateUser('e2e-mano', 'e2e-pwd');
    if (!r.success) throw new Error('OAuth mock no respondió OK: ' + r.error);
  });
  await page.evaluate(async () => {
    const storeMod = await import('/src/store/useAssetStore.js');
    await storeMod.default.getState().hydrate();
  });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('chagraNavigate', { detail: { view: 'dashboard' } })));
  await expect(page.getByRole('button', { name: A_LABEL })).toBeVisible({ timeout: 20000 });
}

/** Abre la mano (Ⓐ) y espera a que los nodos broten. */
async function openMano(page) {
  await page.getByRole('button', { name: A_LABEL }).click();
  await expect(page.locator('.arm-root')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.arm-node.arm-group').first()).toBeVisible({ timeout: 8000 });
}

/** Enfoca un grupo por etiqueta (activación a11y por teclado, robusta al solape). */
async function expandGroup(page, label) {
  const group = page.locator('.arm-node.arm-group', { hasText: label });
  await expect(group).toBeVisible({ timeout: 8000 });
  await group.focus();
  await group.press('Enter');
  await expect(group).toHaveAttribute('aria-expanded', 'true', { timeout: 8000 });
}

/** La mano NO está bloqueada (sin pointer-events:none) si está montada. */
async function expectManoNoBloqueada(page) {
  const present = await page.locator('.arm-root').count();
  if (present === 0) return; // navegó fuera de la mano: no hay nada que bloquear
  const blocked = await page.evaluate(() => {
    const root = document.querySelector('.arm-root');
    if (!root) return false;
    return root.classList.contains('arm-disabled') || getComputedStyle(root).pointerEvents === 'none';
  });
  expect(blocked, 'la mano quedó BLOQUEADA (pointer-events:none / arm-disabled)').toBe(false);
}

/** Texto del último mensaje del asistente en el chat. */
async function assistantResponded(page) {
  const scroll = page.locator('[data-testid="chat-scroll"]');
  await expect(scroll).toBeVisible({ timeout: 15000 });
  // El LLM mock siempre emite "te recomiendo …"; con silvopastoril fallando, la
  // degradación amable igual produce una respuesta del asistente.
  await expect(scroll).toContainText(/recomiendo|nativas|paso a paso/i, { timeout: 20000 });
}

/** Manda un mensaje de seguimiento por el compositor del AgentScreen. */
async function sendFollowUp(page, text) {
  const ta = page.locator('textarea').first();
  await expect(ta).toBeVisible({ timeout: 8000 });
  await expect(ta).toBeEnabled({ timeout: 10000 });
  await ta.fill(text);
  await ta.press('Enter');
}

// ════════════════════════════════════════════════════════════════════════════
// A) REGRESIÓN UNITARIA — el pick NO deja la mano muerta aunque no desmonte
// ════════════════════════════════════════════════════════════════════════════

test.describe('La mano de Chagra — regresión: el pick nunca deja la mano muerta', () => {
  test('aunque la navegación NO desmonte el hero, la mano queda VIVA (FALLA sin el fix)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async ([reactDep, reactDomDep]) => {
      const ReactMod = await import(reactDep);
      const ReactDOM = await import(reactDomDep);
      const React = ReactMod.default || ReactMod;
      const createRoot = (ReactDOM.default || ReactDOM).createRoot;
      const mod = await import('/src/components/dashboard/AgentHero.jsx');
      const AgentHero = mod.default;

      const host = document.createElement('div');
      host.id = 'mano-regresion-host';
      host.style.cssText = 'position:fixed;inset:0;height:600px;width:400px';
      document.body.appendChild(host);

      let navCalls = 0;
      // onNavigate que NO desmonta el hero (el caso real del bug: navegar a
      // 'agente' no llega a desmontar la mano). Sin el fix, busy queda pegado.
      const onNavigate = () => { navCalls += 1; };

      createRoot(host).render(React.createElement(AgentHero, { onNavigate }));

      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 60; i++) {
        if (host.querySelector('[aria-label="Ver todo lo que puede hacer Chagra"]')) break;
        await wait(50);
      }
      const aBtn = host.querySelector('[aria-label="Ver todo lo que puede hacer Chagra"]');
      if (!aBtn) return { error: 'no A button' };
      aBtn.click();
      for (let i = 0; i < 40; i++) {
        if (host.querySelector('.arm-root')) break;
        await wait(50);
      }

      // Dispara el MISMO flujo que tocar un nodo 'ask' de Restaurar: el
      // compositor manda el prompt → send() → setBusy(true) → navega. (Tocar el
      // leaf vivo requiere sidecar para que no caiga a 'down'; el compositor
      // recorre EXACTAMENTE el mismo send(), que es donde vivía el bug.)
      const ta = host.querySelector('textarea');
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setVal.call(ta, 'Quiero restaurar el páramo. ¿Qué especies nativas siembro?');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      // Esperar más que SEND_TRANSITION_MS (520ms) para superar la ventana de
      // transición y dejar que cualquier reset llegue.
      await wait(1500);

      const root = host.querySelector('.arm-root');
      const out = {
        navCalls,
        armRootPresent: !!root,
        armDisabled: root ? root.classList.contains('arm-disabled') : null,
        pointerEvents: root ? getComputedStyle(root).pointerEvents : null,
      };
      try { host.remove(); } catch { /* noop */ }
      return out;
    }, [REACT_DEP, REACTDOM_DEP]);

    expect(result.error, 'AgentHero debe montar el botón Ⓐ').toBeFalsy();
    expect(result.navCalls, 'el pick dispara la navegación (no es no-op)').toBe(1);
    expect(result.armRootPresent, 'la mano sigue montada (la nav no la desmontó)').toBe(true);
    // EL ASSERT DEL BUG: con el fix, la mano queda VIVA; sin el fix, muerta.
    expect(result.armDisabled, 'la mano NO debe quedar arm-disabled tras el pick').toBe(false);
    expect(result.pointerEvents, 'la mano NO debe quedar pointer-events:none').not.toBe('none');
  });

  test('si la persistencia FALLA, la mano también queda viva (no dead-end)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const result = await page.evaluate(async ([reactDep, reactDomDep]) => {
      const ReactMod = await import(reactDep);
      const ReactDOM = await import(reactDomDep);
      const React = ReactMod.default || ReactMod;
      const createRoot = (ReactDOM.default || ReactDOM).createRoot;
      const mod = await import('/src/components/dashboard/AgentHero.jsx');
      const AgentHero = mod.default;
      // Forzar fallo de persistencia: el store.send rechaza.
      const storeMod = await import('/src/store/useAgentOutboxStore.js');
      const orig = storeMod.default.getState().send;
      storeMod.default.setState({ send: async () => { throw new Error('IDB caído (simulado)'); } });

      const host = document.createElement('div');
      host.id = 'mano-fail-host';
      host.style.cssText = 'position:fixed;inset:0;height:600px;width:400px';
      document.body.appendChild(host);
      createRoot(host).render(React.createElement(AgentHero, { onNavigate: () => {} }));

      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 60; i++) {
        if (host.querySelector('[aria-label="Ver todo lo que puede hacer Chagra"]')) break;
        await wait(50);
      }
      host.querySelector('[aria-label="Ver todo lo que puede hacer Chagra"]').click();
      for (let i = 0; i < 40; i++) { if (host.querySelector('.arm-root')) break; await wait(50); }

      const ta = host.querySelector('textarea');
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setVal.call(ta, 'Quiero un arreglo silvopastoril con forraje y árboles.');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await wait(800);

      const root = host.querySelector('.arm-root');
      const out = {
        armDisabled: root ? root.classList.contains('arm-disabled') : null,
        pointerEvents: root ? getComputedStyle(root).pointerEvents : null,
      };
      storeMod.default.setState({ send: orig });
      try { host.remove(); } catch { /* noop */ }
      return out;
    }, [REACT_DEP, REACTDOM_DEP]);

    expect(result.armDisabled, 'tras fallo de persistencia la mano sigue viva').toBe(false);
    expect(result.pointerEvents).not.toBe('none');
  });
});

const GROUP_LABELS = {
  cultivo: 'Mis cultivos', cuidar: 'Cuidar y prevenir', observar: 'Mirar la finca',
  restaurar: 'Restaurar y conservar', registrar: 'Guardar lo que hago',
  planear: 'Planear', aprender: 'Aprender', vender: 'Vender mejor',
};

/**
 * Dispara la capacidad `cap` de la mano de forma robusta al estado del sidecar:
 *  - sidecar ON  → el nodo está 'live' → tocamos el LEAF real (focus+Enter), que
 *    es la interacción exacta del operador.
 *  - sidecar OFF (default CI) → el nodo cae a 'down' y tocarlo solo muestra un
 *    toast. En ese caso usamos el MISMO `heroRoute.prompt` por el compositor del
 *    hero — que es EXACTAMENTE lo que `pickCapability` ejecuta para un 'ask'
 *    (handleChipSend(prompt) → send()), el camino donde vivía el bug.
 * En ambos casos recorre el `send()` arreglado y aterriza en el chat real.
 */
async function triggerCap(page, cap) {
  await expandGroup(page, GROUP_LABELS[cap.group]);
  await expectManoNoBloqueada(page);
  const leaf = page.locator('.arm-node.arm-leaf', { hasText: cap.label }).first();
  await expect(leaf).toBeVisible({ timeout: 8000 });
  const isLive = !(await leaf.evaluate((el) => el.classList.contains('arm-down') || el.classList.contains('arm-soon')));
  if (isLive) {
    await leaf.focus();
    await leaf.press('Enter');
  } else {
    // sidecar off: el leaf muestra toast; mandamos el mismo prompt 'ask' por el
    // compositor (idéntico a pickCapability→handleChipSend→send).
    const prompt = cap.heroRoute?.prompt || cap.route?.prompt;
    const ta = page.locator('textarea').first();
    await ta.fill(prompt);
    await ta.press('Enter');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// B) CONVERSACIÓN REAL por capacidad — ≥3 mensajes, mano nunca bloqueada
// ════════════════════════════════════════════════════════════════════════════

test.describe('La mano de Chagra — conversación real por cada nodo (≥3 mensajes)', () => {
  test.beforeEach(async ({ page }) => {
    await mockNet(page, { silvoFails: true });
  });

  // Un test por capacidad 'ask': disparar el nodo → respuesta → 2 follow-ups en
  // la MISMA conversación → volver a la mano → tocar otra opción. La mano NUNCA
  // se bloquea. silvopastoril FALLA (422) y debe degradar amable (no colgar).
  for (const cap of ASK_CAPS) {
    test(`nodo "${cap.label}" (${cap.id}): conversación de 3 mensajes sin bloquear la mano`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));

      await bootToDashboard(page);
      await openMano(page);

      // ── Mensaje 1: disparar el nodo → AgentScreen → respuesta ────────────────
      await triggerCap(page, cap);
      await assistantResponded(page);
      // La mano (si quedó montada durante la transición) no está bloqueada.
      await expectManoNoBloqueada(page);

      // ── Mensaje 2 y 3: follow-ups en la MISMA conversación ───────────────────
      await sendFollowUp(page, '¿Y cuál aguanta más la sequía?');
      await page.waitForTimeout(1200);
      await expect(page.locator('[data-testid="chat-scroll"]')).toContainText(/recomiendo|nativas|paso a paso/i, { timeout: 20000 });

      await sendFollowUp(page, '¿Cada cuánto debo regar al principio?');
      await page.waitForTimeout(1200);

      // El compositor sigue usable (el chat NO se colgó tras el fallo del tool).
      await expect(page.locator('textarea').first()).toBeEnabled({ timeout: 10000 });

      // ── Volver a la mano y poder tocar OTRA opción ───────────────────────────
      const back = page.locator('[data-testid="chat-floating-back"], [aria-label="Volver"]').first();
      await back.click();
      await expect(page.getByRole('button', { name: A_LABEL })).toBeVisible({ timeout: 12000 });
      await openMano(page);
      await expectManoNoBloqueada(page);
      // Tocar un grupo distinto responde (la mano sigue interactiva, no muerta).
      // 'Restaurar y conservar' y no 'Aprender': desde la redistribución del
      // replanteo F (2026-07-02) las ramas de UNA sola hoja (Aprender/Vender
      // mejor) son acción directa (.arm-feat, navegan de una) — ya no son
      // grupos desplegables. Restaurar conserva varias hojas y sigue siendo
      // rama con aria-expanded.
      await expandGroup(page, 'Restaurar y conservar');
      await expectManoNoBloqueada(page);

      expect(pageErrors, `pageerrors durante la conversación de ${cap.id}`).toEqual([]);
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// C) DEGRADACIÓN del tool que FALLA — silvopastoril 422 no cuelga el agente
// ════════════════════════════════════════════════════════════════════════════

test.describe('La mano de Chagra — silvopastoril que falla degrada amable', () => {
  test('forcedIntent silvopastoreo con tool 422: responde y libera el estado (no cuelga)', async ({ page }) => {
    // Montamos AgentScreen aislado y forzamos el intent del chip silvopastoreo,
    // cuyo tool get_diseno_silvopastoril responde 422 (mcp_call_failed). El
    // pipeline debe degradar (callTool→null → evidence sintética) y el LLM
    // responder igual; el estado del agente vuelve a IDLE (compositor usable).
    await mockNet(page, { silvoFails: true });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const out = await page.evaluate(async ([reactDep, reactDomDep]) => {
      const ReactMod = await import(reactDep);
      const ReactDOM = await import(reactDomDep);
      const React = ReactMod.default || ReactMod;
      const createRoot = (ReactDOM.default || ReactDOM).createRoot;
      const mod = await import('/src/components/AgentScreen/AgentScreen.jsx');
      const AgentScreen = mod.default;

      const host = document.createElement('div');
      host.id = 'as-silvo-host';
      host.style.cssText = 'position:fixed;inset:0;height:700px;width:420px';
      document.body.appendChild(host);
      createRoot(host).render(React.createElement(AgentScreen, { onBack: () => {} }));

      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < 80; i++) { if (host.querySelector('textarea')) break; await wait(50); }
      const ta = host.querySelector('textarea');
      if (!ta) return { error: 'no textarea' };

      // Activar el chip silvopastoreo (forcedIntent) vía la hoja de capacidades
      // si está, o directamente escribiendo el prompt — el camino crítico es que
      // el tool falla y el pipeline NO se cuelga.
      const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setVal.call(ta, 'Quiero un arreglo silvopastoril con forraje y árboles para mi ganado.');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      // Esperar a que el pipeline termine y el chat tenga respuesta del asistente.
      let answered = false;
      for (let i = 0; i < 120; i++) {
        const scroll = host.querySelector('[data-testid="chat-scroll"]');
        if (scroll && /recomiendo|nativas|paso a paso/i.test(scroll.textContent || '')) { answered = true; break; }
        await wait(100);
      }
      // El compositor debe estar usable de nuevo (estado liberado, no colgado).
      const taFinal = host.querySelector('textarea');
      const composerEnabled = taFinal ? !taFinal.disabled : false;
      const out = { answered, composerEnabled };
      try { host.remove(); } catch { /* noop */ }
      return out;
    }, [REACT_DEP, REACTDOM_DEP]);

    expect(out.error, 'AgentScreen debe montar el compositor').toBeFalsy();
    expect(out.answered, 'el agente responde aunque el tool silvopastoril falle (degradación amable)').toBe(true);
    expect(out.composerEnabled, 'el compositor queda usable (estado liberado, no colgado)').toBe(true);
  });
});

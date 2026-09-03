import { test, expect } from '@playwright/test';

/**
 * agent-bug01-nlu-persiste.spec.js — regresión E2E del BUG-01 del hard-test
 * David/Cata (2026-08-31, P1).
 *
 * El bug medido: el mensaje verbatim de ingesta multi-entidad («sembré 10 tomate
 * Cherry… surco 12 hace 3 meses… 3 cosechas… abono cada 15 días… trozador y
 * gota») recibía una RESPUESTA GENERATIVA que afirmaba «Registré parte de las
 * operaciones» mientras IndexedDB quedaba vacío (logs=0, farm_processes=0,
 * pending_transactions=0…). Afirmación falsa de acción: el peor bug posible
 * para un producto de registro de finca.
 *
 * Este spec congela el criterio de aceptación del fix:
 *
 *   GIVEN la frase verbatim del HC1
 *   WHEN el agente la procesa
 *   THEN aparece el gate de confirmación, al aprobarlo quedan escrituras en
 *        IndexedDB (farm_processes, farm_process_events, pending_transactions,
 *        assets del surco) e intentos de POST de escritura hacia farmOS.
 *
 *   CONTROL — una frase que NO es una operación registrable («¿cuánto rinde la
 *   rúcula?») NO abre el gate NI escribe nada. Un router que escribe siempre es
 *   tan malo como uno que nunca escribe.
 *
 * La verificación es por VOLCADO de IndexedDB (no a ojo): el propio bug se
 * escondió detrás de un «parece que responde bien».
 */

const ORIGIN = 'http://localhost:5173';

// Verbatim EXACTO del script 02-hc1.mjs del hard-test David/Cata.
const HC1_VERBATIM =
  'Hola chagra sembré 10 tomate Cherry aquí en el surco número 12 hace 3 meses y ya entregué tres cosechas del surco, se abonó cada 15 días y se trató un problema de trozador y de gota.';

const CONTROL_QUERY = '¿cuánto rinde la rúcula?';

const WRITE_STORES = [
  'logs',
  'farm_processes',
  'farm_process_events',
  'pending_transactions',
  'inventory_events',
  'agent_outbox',
];

async function mockBackend(page, bag = {}) {
  // OAuth stub — mismo patrón que e2e-integral-logueado.spec.js.
  await page.context().route('**/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-bug01-token',
        refresh_token: 'e2e-bug01-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    }),
  );

  // GETs de farmOS: vacíos pero válidos.
  const emptyJsonApi = JSON.stringify({ data: [], jsonapi: { version: '1.0' } });
  for (const pattern of ['**/api/asset/**', '**/api/log/**', '**/api/taxonomy_term/**', '**/api/user/**']) {
    await page.context().route(pattern, (route) => {
      if (route.request().method() !== 'GET') {
        // POST/PATCH de escritura: registrar y responder como farmOS.
        bag.writeRequests = bag.writeRequests || [];
        bag.writeRequests.push({
          method: route.request().method(),
          url: route.request().url().slice(0, 140),
        });
        return route.fulfill({ status: 201, contentType: 'application/vnd.api+json', body: emptyJsonApi });
      }
      return route.fulfill({ status: 200, contentType: 'application/vnd.api+json', body: emptyJsonApi });
    });
  }

  await page.context().route('**/fincas-publicas.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }),
  );

  // Sidecar NLU/validación: respuestas neutras.
  await page.context().route('**/nlu', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );
  await page.context().route('**/resolve-entities', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );
  await page.context().route('**/post-validate', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
  );

  // LLM generativo: stream NDJSON corto para que la ruta generativa cierre
  // rápido (solo la usa el CONTROL; el verbatim nunca debe llegar acá).
  await page.context().route('**/api/ollama/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: [
        JSON.stringify({ message: { role: 'assistant', content: 'Respuesta generativa de prueba.' }, done: false }),
        JSON.stringify({ message: { role: 'assistant', content: '' }, done: true }),
      ].join('\n'),
    }),
  );
}

async function seedSession(page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('chagra:active_tenant_id', 'e2e-bug01');
      window.localStorage.setItem(
        'chagra:profile:v1',
        JSON.stringify({ rol: 'operador', vocacion: 'mixta', finca_tipo: 'integral', nivel_respuestas: 'detallado' }),
      );
    } catch (_) {
      /* noop */
    }
  });
}

async function login(page) {
  await page.evaluate(async () => {
    const authMod = await import('/src/services/authService.js');
    const result = await authMod.authenticateUser('e2e-bug01', 'e2e-bug01-pwd');
    if (!result.success) {
      throw new Error(`Login mock falló: ${result.error || 'sin detalle'}`);
    }
  });
}

/** Volcado de las stores de escritura de ChagraDB (adaptado de 04-idb-inspect). */
async function dumpWriteStores(page) {
  return page.evaluate(async (storeNames) => {
    const openDB = (name) =>
      new Promise((res, rej) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    const countStore = (db, store) =>
      new Promise((res) => {
        try {
          const req = db.transaction(store, 'readonly').objectStore(store).count();
          req.onsuccess = () => res(req.result);
          req.onerror = () => res(-1);
        } catch {
          res(-1);
        }
      });
    const out = {};
    let db;
    try {
      db = await openDB('ChagraDB');
    } catch {
      return out;
    }
    for (const store of storeNames) {
      out[store] = await countStore(db, store);
    }
    db.close();
    return out;
  }, WRITE_STORES);
}

async function openAgent(page) {
  await page.goto(`${ORIGIN}/#/agente`, { waitUntil: 'domcontentloaded' });
  const input = page.getByTestId('agent-input');
  // 60s: en servidor vite frío (primera carga, transform de módulos on-demand)
  // el splash «Cargando: Maíz creciendo» puede superar los 20s.
  await expect(input).toBeVisible({ timeout: 60_000 });
  return input;
}

test.describe('BUG-01 — la ingesta NLU debe persistir, no solo hablar', () => {
  test('frase verbatim HC1 → gate de confirmación → escritura en IndexedDB', async ({ page }) => {
    const bag = {};
    const consoleMsgs = [];
    page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
    page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`));
    await seedSession(page);
    await mockBackend(page, bag);
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await login(page);

    const input = await openAgent(page);
    const before = await dumpWriteStores(page);

    await input.fill(HC1_VERBATIM);
    await input.press('Enter');

    // 1) El pipeline determinista debe abrir el gate de confirmación (esto es
    //    también la «UI de confirmación de operaciones parseadas» del BUG-02).
    const gate = page.locator('[role="dialog"][aria-label="Confirmar acción del agente"]');
    await expect(gate).toBeVisible({ timeout: 10_000 });
    await expect(gate).toContainText('Confirmar registro de campo');

    // 2) Aprobar → ejecutar la persistencia offline-first.
    await gate.getByRole('button', { name: 'Aprobar' }).click();

    // 3) La respuesta del agente llega cuando TODA la escritura terminó (el
    //    resumen qué sí / qué no se emite al cerrar la última operación).
    //    Sincronizamos por el mensaje final, no por una store intermedia: el
    //    pipeline escribe 8 operaciones en serie y un dump a mitad de cadena
    //    contaría de menos (falso negativo).
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => document.body.innerText)).match(
            /Listo\. Registr[ée]|Registr[ée] solo|No registr[ée] ninguna/i,
          )?.[0] ?? null,
        { timeout: 30_000 },
      )
      .not.toBeNull();

    // 4) VOLCADO de IndexedDB — la prueba dura, no a ojo.
    const after = await dumpWriteStores(page);

    // Siembra + ciclo creados.
    expect(after.farm_processes).toBeGreaterThan(before.farm_processes);
    // 7 eventos del ciclo: 1 sowing_confirmed + 3 cosechas + 1 abono + 2 observaciones.
    expect(after.farm_process_events - before.farm_process_events).toBeGreaterThanOrEqual(7);
    // Transacciones pendientes de sync hacia farmOS (≥ 8: lote + proceso + eventos).
    expect(after.pending_transactions - before.pending_transactions).toBeGreaterThanOrEqual(8);

    // 5) La respuesta del agente NO afirma en falso: enumera lo registrado.
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toMatch(/Registr[ée]|Listo\./i);
    expect(bodyText).not.toMatch(/^$|\bFaltó confirmar\b/);

    // 6) POST de escritura en la red: drenar el queue pendiente (lo mismo que
    //    hace el Service Worker con SYNC_REQUESTED / el badge de sync) y exigir
    //    que las transacciones salgan como POST/PATCH hacia farmOS.
    await page.evaluate(async () => {
      const { syncManager } = await import('/src/services/syncManager.js');
      await syncManager.syncAll();
    });
    expect((bag.writeRequests || []).length).toBeGreaterThan(0);
    for (const req of bag.writeRequests || []) {
      expect(['POST', 'PATCH']).toContain(req.method);
    }

    // Evidencia durable en el log del test (volcado, no a ojo).
    console.log('=====BUG01_IDB_DUMP=====');
    console.log(JSON.stringify({ before, after, writeRequests: bag.writeRequests }));
  });

  test('CONTROL — pregunta agronómica NO abre gate NI escribe nada', async ({ page }) => {
    await seedSession(page);
    await mockBackend(page, {});
    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await login(page);

    const input = await openAgent(page);
    const before = await dumpWriteStores(page);

    await input.fill(CONTROL_QUERY);
    await input.press('Enter');

    // El gate NO debe aparecer en una pregunta que no es operación registrable.
    const gate = page.locator('[role="dialog"][aria-label="Confirmar acción del agente"]');
    await expect(gate).not.toBeVisible({ timeout: 8_000 });

    // Y a los 8s tampoco: sin escrituras de ningún tipo.
    await page.waitForTimeout(8_000);
    const after = await dumpWriteStores(page);
    for (const store of WRITE_STORES) {
      expect(after[store], `store ${store} no debe cambiar`).toBe(before[store]);
    }
  });
});

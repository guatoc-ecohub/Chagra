/* global process */
import { test, expect } from '@playwright/test';

/**
 * stress/offline-intermittent.spec.js — Frente 4: offline/SW bajo red
 * intermitente.
 *
 * Extiende el patrón ya probado en tests/offline.spec.js (login mock +
 * `context.route('**\/api/**')` abortando + `context.setOffline`) pero en vez
 * de UN solo corte, hace FLAPPING: N ciclos de offline→online→offline en
 * sucesión rápida, generando transacciones en cada ventana offline. El
 * contrato que se valida es el mismo que offline.spec.js pero bajo estrés:
 *   1. La PWA nunca queda en un estado roto (la UI base sigue visible y
 *      responde después de cada flap — "la PWA sigue" del enunciado).
 *   2. Ninguna transacción encolada se pierde ni se duplica al reconectar
 *      en caliente (la cola de IndexedDB solo crece, nunca se vacía sola
 *      mientras el sync sigue fallando).
 *   3. No hay excepciones JS no capturadas (`pageerror`) durante el
 *      flapping — sería la señal de un crash real del bundle/SW.
 *
 * Se corre AISLADO de la suite normal — ver stress/playwright.stress.config.js
 * para el porqué de no vivir bajo tests/.
 *
 * USO:
 *   npx playwright test --config=stress/playwright.stress.config.js offline-intermittent
 *   STRESS_OFFLINE_CYCLES=10 STRESS_ACTIONS_PER_CYCLE=3 npx playwright test \
 *     --config=stress/playwright.stress.config.js offline-intermittent
 */

const DB_NAME = 'ChagraDB';
const PENDING_STORE = 'pending_transactions';

const CYCLES = Number(process.env.STRESS_OFFLINE_CYCLES || 5);
const ACTIONS_PER_CYCLE = Number(process.env.STRESS_ACTIONS_PER_CYCLE || 2);
const FLAP_DELAY_MS = Number(process.env.STRESS_FLAP_DELAY_MS || 250);

const countPendingTransactions = async (page) =>
  page.evaluate(
    ({ dbName, storeName }) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve(0);
            return;
          }
          const tx = db.transaction(storeName, 'readonly');
          const countReq = tx.objectStore(storeName).count();
          countReq.onsuccess = () => {
            db.close();
            resolve(countReq.result);
          };
          countReq.onerror = () => {
            db.close();
            reject(countReq.error);
          };
        };
        req.onerror = () => reject(req.error);
      }),
    { dbName: DB_NAME, storeName: PENDING_STORE },
  );

const preloadPayloadService = (page) =>
  page.evaluate(async () => {
    // Precarga mientras hay red — tras el primer setOffline el dev server
    // queda inalcanzable y el dynamic import fallaría.
    const mod = await import('/src/services/payloadService.js');
    window.__chagraStress = { savePayload: mod.savePayload };
  });

const triggerOfflineSeeding = (page, { crop, quantity }) =>
  page.evaluate(
    async ({ crop, quantity }) => {
      if (!window.__chagraStress?.savePayload) {
        throw new Error('payloadService no fue precargado antes del flapping');
      }
      const payload = {
        data: {
          type: 'log--seeding',
          attributes: {
            name: `Siembra de ${crop} - stress-intermitente`,
            timestamp: new Date().toISOString().split('.')[0] + '+00:00',
            status: 'done',
          },
          relationships: {
            quantity: {
              data: [
                {
                  type: 'quantity--standard',
                  attributes: { measure: 'count', value: { decimal: String(quantity) }, label: 'Plántulas' },
                },
              ],
            },
          },
        },
      };
      return window.__chagraStress.savePayload('seeding', payload);
    },
    { crop, quantity },
  );

test.describe('Stress — red intermitente (flapping offline/online)', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/oauth/token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'stress-fake-access',
          refresh_token: 'stress-fake-refresh',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      }),
    );

    // Igual que tests/offline.spec.js: cualquier llamada a FarmOS/HA/Ollama
    // se aborta tras un pequeño delay — aislamos el test de la disponibilidad
    // de backends reales, el foco es la resiliencia del cliente offline-first.
    await context.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.abort('blockedbyclient');
    });
  });

  test(`sobrevive ${CYCLES} ciclos de flapping offline/online sin perder transacciones ni crashear`, async ({
    context,
    page,
  }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/');
    await expect(page.getByLabel(/usuario/i)).toBeVisible({ timeout: 90_000 });
    await page.getByLabel(/usuario/i).fill('stress-operator');
    await page.getByRole('textbox', { name: /contraseña/i }).fill('stress-pass');
    await page.getByRole('button', { name: /ingresar/i }).click();
    await expect(page.getByText('Tareas pendientes')).toBeVisible({ timeout: 15_000 });

    await preloadPayloadService(page);

    let expectedMinPending = 0;

    for (let cycle = 0; cycle < CYCLES; cycle++) {
      // ── ventana OFFLINE ──────────────────────────────────────────────
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event('offline')));

      for (let action = 0; action < ACTIONS_PER_CYCLE; action++) {
        const result = await triggerOfflineSeeding(page, {
          crop: `StressCrop-${cycle}-${action}`,
          quantity: cycle * 10 + action + 1,
        });
        expect(result.success).toBe(false);
        expectedMinPending += 1;
      }

      // La cola durable debe reflejar YA las transacciones de este ciclo —
      // no debe perderse nada mientras seguimos offline.
      await expect
        .poll(() => countPendingTransactions(page), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(expectedMinPending);

      // La UI base sigue viva — no quedó en blanco ni crasheó.
      await expect(page.getByText('Tareas pendientes')).toBeVisible({ timeout: 5_000 });

      // ── flap a ONLINE brevemente (reconexión inestable) ────────────────
      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await page.waitForTimeout(FLAP_DELAY_MS);

      // Reconectar no debe hacer desaparecer la cola (el sync sigue
      // fallando por el route abort — el contrato es "nunca perder datos").
      await expect
        .poll(() => countPendingTransactions(page), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(expectedMinPending);
    }

    // Cierre: sin excepciones JS no capturadas durante todo el flapping.
    expect(pageErrors, `pageerror durante el flapping: ${pageErrors.join(' | ')}`).toHaveLength(0);

    // La UI sigue respondiendo al final de la corrida.
    await expect(page.getByText('Tareas pendientes')).toBeVisible({ timeout: 5_000 });

    const finalCount = await countPendingTransactions(page);
    console.log(`[stress] ciclos=${CYCLES} acciones/ciclo=${ACTIONS_PER_CYCLE} transacciones esperadas>=${expectedMinPending} finalCount=${finalCount}`);
    expect(finalCount).toBeGreaterThanOrEqual(expectedMinPending);
  });
});

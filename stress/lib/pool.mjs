/**
 * stress/lib/pool.mjs — pool de concurrencia liviano, sin dependencias.
 *
 * No hay `p-limit`/`p-map` en package.json y la tarea pide preferir scripts
 * Node nativos antes que sumar herramientas nuevas. `runPool` implementa un
 * worker pool clásico por índice: N "runners" concurrentes van tomando el
 * siguiente índice disponible hasta agotar `total`. Cada resultado se
 * captura con try/catch para que un fallo individual NUNCA aborte la corrida
 * completa (igual que un usuario real: una pregunta que falla no debe tumbar
 * las demás).
 *
 * @module stress/lib/pool
 */

/**
 * sleep — pausa N ms.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * runPool — ejecuta `worker(index)` para `index` en [0, total) con a lo sumo
 * `concurrency` invocaciones simultáneas. Nunca rechaza: cada resultado es
 * `{ ok: true, value }` o `{ ok: false, error }`.
 *
 * @param {object} p
 * @param {number} p.total — cantidad total de tareas a correr.
 * @param {number} p.concurrency — cuántas corren en simultáneo (clamp a total).
 * @param {(index:number)=>Promise<any>} p.worker — tarea individual.
 * @param {number} [p.rampUpMs=0] — retraso escalonado antes de arrancar cada
 *        runner (runner i arranca a los `i*rampUpMs`ms). Útil para no lanzar
 *        un "thundering herd" instantáneo cuando se simula tráfico real.
 * @param {(done:number, total:number)=>void} [p.onProgress] — callback opcional
 *        invocado tras cada tarea completada (para progreso en vivo).
 * @returns {Promise<Array<{ok:boolean, value?:any, error?:Error, index:number, startedAt:number, finishedAt:number}>>}
 */
export async function runPool({ total, concurrency, worker, rampUpMs = 0, onProgress }) {
  if (total <= 0) return [];
  const effectiveConcurrency = Math.max(1, Math.min(concurrency, total));
  const results = new Array(total);
  let nextIndex = 0;
  let done = 0;

  async function runner(runnerId) {
    if (rampUpMs > 0) await sleep(runnerId * rampUpMs);
    for (;;) {
      const index = nextIndex++;
      if (index >= total) return;
      const startedAt = Date.now();
      try {
        const value = await worker(index);
        results[index] = { ok: true, value, index, startedAt, finishedAt: Date.now() };
      } catch (error) {
        results[index] = { ok: false, error, index, startedAt, finishedAt: Date.now() };
      } finally {
        done += 1;
        if (onProgress) onProgress(done, total);
      }
    }
  }

  const runners = Array.from({ length: effectiveConcurrency }, (_, i) => runner(i));
  await Promise.all(runners);
  return results;
}

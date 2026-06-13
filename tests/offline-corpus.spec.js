import { test, expect } from '@playwright/test';

/**
 * offline-corpus.spec.js — OFFLINE-FIRST de campo: grounding RAG sin señal.
 *
 * Cierra el hueco hallado en la auditoría verify-first 2026-06-13: el shell +
 * bundle + catalog.sqlite ya se precacheaban, pero el corpus RAG
 * (/cycle-content/*) y los embeddings (/rag-embeddings.json) NO → una recarga
 * OFFLINE en frío dejaba al agente SIN grounding (corpusCache vivía solo en
 * memoria y se perdía al recargar).
 *
 * Este spec valida la CAPA DE RED (Service Worker): que tras una visita ONLINE
 * el SW cachea el corpus + embeddings y que, ya OFFLINE, esos bytes siguen
 * disponibles para que el RAG pueda reconstruir/hidratar su índice.
 *
 * POLÍTICA (memoria feedback-sidecar-bench-misses-pwa-rag-path): el gate viejo
 * corría en dev server y era ciego al SW de producción. Este spec valida contra
 * el SW REAL. Vite dev SÍ sirve public/sw.js y public/cycle-content/* de forma
 * estática, así que el SW se registra y cachea el corpus también en dev — pero
 * para fidelidad total contra dist+SW real, correlo con:
 *   npm run build && npx vite preview --port 5173 --strictPort &
 *   PLAYWRIGHT_BASE_URL=http://localhost:5173 npx playwright test offline-corpus
 *
 * Si el SW no llega a controlar la página (entorno sin SW), el test marca skip
 * en vez de fallar en falso — NUNCA bloquea por un entorno sin service worker.
 */

async function waitForActiveSW(page, timeoutMs = 15000) {
  return page.evaluate(async (timeout) => {
    if (!('serviceWorker' in navigator)) return false;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active && navigator.serviceWorker.controller) return true;
      await new Promise((r) => setTimeout(r, 150));
    }
    // El SW puede estar activo pero aún no controlar este cliente (primer load).
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && reg.active);
  }, timeoutMs);
}

test.describe('Offline-first de campo — corpus RAG cacheado por el SW', () => {
  test('el corpus + embeddings sobreviven una recarga OFFLINE en frío', async ({
    context,
    page,
  }) => {
    // 1) Carga ONLINE: registra el SW y deja que tome control.
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const swReady = await waitForActiveSW(page);
    test.skip(!swReady, 'Service Worker no disponible/activo en este entorno — no aplica el test de corpus offline.');

    // Si el SW está activo pero todavía no controla este cliente (primer
    // registro), una recarga lo pone al mando.
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    if (!controlled) {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await waitForActiveSW(page);
    }

    // 2) ONLINE: leemos el manifest para tomar un slug REAL del corpus, y
    //    forzamos que el SW cachee el manifest, esa ficha y los embeddings —
    //    exactamente las rutas que prewarmCorpus pide al login. Los fetch van
    //    desde la página → pasan por el SW → cache-first put.
    const sampleSlug = await page.evaluate(async () => {
      const m = await fetch('/cycle-content/manifest.json');
      if (!m.ok) return null;
      const j = await m.json();
      return Array.isArray(j.slugs) && j.slugs.length > 0 ? j.slugs[0] : null;
    });
    expect(sampleSlug, 'el manifest debe traer al menos un slug').toBeTruthy();

    const onlineFetch = await page.evaluate(async (slug) => {
      const urls = [
        '/cycle-content/manifest.json',
        `/cycle-content/${slug}.json`,
        '/rag-embeddings.json',
      ];
      const results = {};
      for (const u of urls) {
        try {
          const res = await fetch(u);
          results[u] = res.ok ? res.status : `not-ok:${res.status}`;
        } catch (e) {
          results[u] = `error:${e.message}`;
        }
      }
      return results;
    }, sampleSlug);

    // El manifest, la ficha tomada del propio manifest y los embeddings deben
    // existir online (200).
    expect(onlineFetch['/cycle-content/manifest.json']).toBe(200);
    expect(onlineFetch[`/cycle-content/${sampleSlug}.json`]).toBe(200);
    expect(onlineFetch['/rag-embeddings.json']).toBe(200);

    // Dar un instante a que el SW persista los puts en cache (los put del
    // handler cache-first son async respecto al respond).
    await page.waitForTimeout(500);

    // 3) OFFLINE: cortamos la red por completo.
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // 4) Recarga en FRÍO offline: el shell debe bootear desde cache.
    await page.reload();
    await waitForActiveSW(page);

    // 5) OFFLINE: los bytes del grounding deben seguir disponibles vía el SW
    //    (cache-first). Sin red, un fetch que NO estuviera cacheado daría error
    //    o un 504 sintético; con el corpus cacheado debe responder 200 + JSON.
    const offlineGrounding = await page.evaluate(async (slug) => {
      const out = {};
      // Manifest cacheado → JSON con slugs.
      try {
        const m = await fetch('/cycle-content/manifest.json');
        out.manifestOk = m.ok;
        if (m.ok) {
          const j = await m.json();
          out.manifestSlugs = Array.isArray(j.slugs) ? j.slugs.length : 0;
        }
      } catch (e) {
        out.manifestErr = e.message;
      }
      // Embeddings cacheados → JSON no vacío.
      try {
        const e = await fetch('/rag-embeddings.json');
        out.embeddingsOk = e.ok;
        if (e.ok) {
          const j = await e.json();
          out.embeddingsKeys = j && typeof j === 'object' ? Object.keys(j).length : 0;
        }
      } catch (err) {
        out.embeddingsErr = err.message;
      }
      // La ficha que fetcheamos online debe seguir disponible offline.
      try {
        const f = await fetch(`/cycle-content/${slug}.json`);
        out.slugStatus = f.status;
        out.slugOk = f.ok;
      } catch (err) {
        out.slugErr = err.message;
      }
      return out;
    }, sampleSlug);

    // El contrato offline-first: el grounding NO desaparece sin red.
    expect(offlineGrounding.manifestOk, 'manifest debe servirse offline desde cache').toBe(true);
    expect(offlineGrounding.manifestSlugs, 'manifest cacheado debe traer slugs').toBeGreaterThan(0);
    expect(offlineGrounding.embeddingsOk, 'embeddings deben servirse offline desde cache').toBe(true);
    expect(offlineGrounding.embeddingsKeys, 'embeddings cacheados no deben estar vacíos').toBeGreaterThan(0);
    // La ficha que cacheamos online debe seguir disponible offline (200), no un
    // 504 de "no cacheado".
    expect(offlineGrounding.slugStatus, 'la ficha cacheada online debe servirse offline').toBe(200);

    // 6) El SW debe tener el bucket de grounding SEPARADO (sobrevive a deploys).
    const cacheNames = await page.evaluate(async () => {
      if (!('caches' in window)) return [];
      return caches.keys();
    });
    expect(
      cacheNames.some((n) => n.startsWith('chagra-rag-grounding-')),
      `debe existir el bucket de grounding separado; caches: ${cacheNames.join(', ')}`,
    ).toBe(true);

    await context.setOffline(false);
  });
});

/**
 * caseStudyDemoLoader — Hidratación idempotente de casos demo seed.
 * ================================================================
 * 2026-05-18: feature "casos modo foro + validación + timeline".
 *
 * Fetcha `/case-studies-demo/manifest.json` (estático, sirve Vite/CDN
 * en cualquier instancia Chagra) y carga cada caso listado en el store
 * vía `hydrateDemoCases()`. La acción del store es idempotente por id:
 * casos demo ya presentes en LS no se re-insertan.
 *
 * Uso típico (mount de CaseStudyScreen):
 * ```js
 * useEffect(() => { loadCaseStudyDemos().catch((e) => console.warn(e)); }, []);
 * ```
 *
 * Offline-first: si el fetch falla (offline, 404, parsing), no se
 * insertan casos demo y la app sigue funcionando con los casos reales
 * del operador. Esto NO bloquea la UX bajo ningún escenario.
 */

import { resolveSpecies } from './speciesResolver';

const MANIFEST_URL = '/case-studies-demo/manifest.json';
const DEMO_BASE = '/case-studies-demo';

/**
 * Aplica la regla operator 2026-05-19: si un species_id en
 * `subject.species_ids` no matchea el catálogo, intenta resolver con RAG
 * y reemplaza por el slug real; si no hay candidato, lo dropea
 * silenciosamente. NUNCA falla el caso completo por species inválida.
 *
 * @param {object} caseObj
 * @returns {Promise<object>} mismo case con species_ids normalizado
 */
async function normalizeSpeciesIds(caseObj) {
  const ids = caseObj?.subject?.species_ids;
  if (!Array.isArray(ids) || ids.length === 0) return caseObj;
  const resolved = [];
  for (const id of ids) {
    const r = await resolveSpecies(id);
    if (r && (r.match === 'exact' || (r.match === 'fuzzy' && r.confidence >= 0.6))) {
      resolved.push(r.slug);
    }
    // sin match → skip silencioso (regla operator)
  }
  return {
    ...caseObj,
    subject: { ...caseObj.subject, species_ids: resolved },
  };
}

/**
 * Carga el manifest + cada case JSON listado.
 * Retorna `{ added, attempted }` para tests/telemetría.
 *
 * @param {object} store — el zustand store completo (no el hook). Pasa
 *   `useCaseStudyStore` directamente; el loader llama
 *   `store.getState().hydrateDemoCases(...)`.
 * @param {object} opts
 * @param {typeof fetch} [opts.fetchImpl] — inyectable para tests.
 */
export async function loadCaseStudyDemos(store, { fetchImpl = fetch } = {}) {
  if (!store || typeof store.getState !== 'function') {
    throw new Error('loadCaseStudyDemos: store inválido');
  }
  let manifest;
  try {
    const resp = await fetchImpl(MANIFEST_URL, { cache: 'no-cache' });
    if (!resp.ok) {
      return { added: 0, attempted: 0, error: `manifest ${resp.status}` };
    }
    manifest = await resp.json();
  } catch (e) {
    return { added: 0, attempted: 0, error: `manifest fetch: ${e?.message || e}` };
  }
  const files = Array.isArray(manifest?.cases) ? manifest.cases : [];
  if (files.length === 0) return { added: 0, attempted: 0 };

  const fetched = [];
  for (const file of files) {
    try {
      const r = await fetchImpl(`${DEMO_BASE}/${file}`, { cache: 'no-cache' });
      if (!r.ok) continue;
      const c = await r.json();
      if (!c || !c.id) continue;
      // 2026-05-19: aplicar regla skip-species-no-match a species_ids del caso.
      // Cualquier species_id inválido se dropea silenciosamente (resolver con
      // RAG si hay candidato fuzzy). El caso NUNCA falla por species.
      const normalized = await normalizeSpeciesIds(c).catch(() => c);
      fetched.push(normalized);
    } catch {
      // skip silently — el demo es nice-to-have, no bloquea
    }
  }
  const added = store.getState().hydrateDemoCases(fetched);
  return { added, attempted: fetched.length };
}

export default loadCaseStudyDemos;

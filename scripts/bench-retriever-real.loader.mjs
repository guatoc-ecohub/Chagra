/**
 * bench-retriever-real.loader.mjs — module hooks (Node `module.register`) que
 * permiten importar `src/services/ragRetriever.js` TAL CUAL en Node puro, sin
 * reescribir su lógica de fusión.
 *
 * Adaptado de `scripts/bench-rag-retrieve.loader.mjs` (mismo mecanismo,
 * probado en prod desde 2026-07-02 — ver `bench/history/rag-retrieve__*`).
 * Una sola diferencia deliberada respecto a ese loader, explicada abajo.
 *
 * Qué intercepta y por qué:
 *
 * - `authService.js` / `tenantContext.js`: stubs mínimos. `ragRetriever.js`
 *   solo los toca transitivamente vía `apiService.js` (para el POST de
 *   embeddings); ninguna de sus funciones reales (OAuth, tenant scoping)
 *   participa en retrieve(). Sin este stub, `authService.js` revienta al
 *   evaluarse: tiene `const REDIRECT_URI = \`${window.location.origin}...\`
 *   a nivel de módulo (no dentro de una función), y Node no tiene `window`.
 *
 * - `catalogDB.js`: **DIFERENCIA DELIBERADA vs bench-rag-retrieve.loader.mjs.**
 *   Ese loader stubea `getAllSpecies` a `async () => []` (catálogo vacío) →
 *   `buildCorpus()` no puede confiar en el catálogo → tier-gate FAIL-CLOSED →
 *   colapsa al subconjunto seguro `CROP_TAXONOMY ∩ manifest`. Verificado en
 *   vivo (2026-07-22): ese subconjunto hoy da SOLO 44 de 501 slugs del
 *   manifest (`CROP_TAXONOMY` quedó con ids de ESPECIE BASE que la migración
 *   de catálogo a variedades dejó huérfanos — el mismo problema que rompe 15
 *   items del golden set, ver eval/rag-golden.json). Correr el bench de
 *   embedders sobre un corpus de 44 especies en vez de las 491+ que usa
 *   `bench-embedders.mjs` invalidaría la comparación: cualquier diferencia de
 *   recall sería ruido de corpus, no señal de embedder.
 *
 *   Este loader en cambio hace `getAllSpecies` devolver TODOS los slugs del
 *   manifest como especies "confiables" — el tier-gate pasa con
 *   `catalogTrusted=true` y sirve el corpus COMPLETO, igual que
 *   `bench-embedders.mjs`. Es la elección correcta para AISLAR el efecto del
 *   embedder: todo lo demás (tamaño de corpus, BM25, fusión, collapseVarieties)
 *   se mantiene constante entre los 4 embedders bajo prueba.
 *
 * - Reemplazo de texto `import.meta.env` → `({})`: red de seguridad para
 *   cualquier otro archivo transitivo que lo use fuera de optional-chaining
 *   (ninguno detectado en el camino real de `retrieve()`, pero barato de
 *   mantener por si un import nuevo lo introduce).
 */
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const EXT_CANDIDATES = ['.js', '.mjs', '.jsx', '.ts', '.tsx'];

async function fileExists(url) {
  try {
    const s = await stat(fileURLToPath(url));
    return s.isFile();
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.json')) {
    context = { ...context, importAttributes: { ...(context.importAttributes || {}), type: 'json' } };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) throw err;
    const base = context.parentURL ?? import.meta.url;
    for (const ext of EXT_CANDIDATES) {
      const candidate = new URL(specifier + ext, base);
      if (await fileExists(candidate)) return nextResolve(specifier + ext, context);
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('/authService.js')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export const SESSION_EXPIRED_EVENT = "chagra:session-expired";\n'
        + 'export const getAccessToken = async () => null;\n'
        + 'export const refreshAccessToken = async () => null;\n'
        + 'export const expireSession = async () => undefined;\n',
    };
  }
  if (url.endsWith('/tenantContext.js')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: 'export const getActiveTenantId = () => null;\n'
        + 'export const setActiveTenantId = () => undefined;\n'
        + 'export const clearActiveTenantId = () => undefined;\n'
        + 'export const hasActiveTenant = () => false;\n'
        + 'export const _resetForTests = () => undefined;\n',
    };
  }
  if (url.endsWith('/catalogDB.js')) {
    // Ver comentario de cabecera: catálogo "confiable" = TODOS los slugs del
    // manifest (corpus completo), no [] (que degrada a FAIL-CLOSED/44 slugs).
    // Path calculado en runtime contra el propio `url` interceptado
    // (.../src/db/catalogDB.js) para no depender de dónde vive este loader.
    const catalogDbPath = fileURLToPath(url);
    const manifestPath = join(dirname(catalogDbPath), '..', '..', 'public', 'cycle-content', 'manifest.json');
    const manifestPathEscaped = manifestPath.replace(/\\/g, '\\\\');
    return {
      format: 'module',
      shortCircuit: true,
      source: 'import { readFileSync } from "node:fs";\n'
        + 'let ids = [];\n'
        + 'try {\n'
        + `  const manifest = JSON.parse(readFileSync("${manifestPathEscaped}", "utf8"));\n`
        + '  ids = Array.isArray(manifest.slugs) ? manifest.slugs : [];\n'
        + '} catch (_) { ids = []; }\n'
        + 'export const getAllSpecies = async () => ids.map((id) => ({ id }));\n',
    };
  }
  if (url.endsWith('.json')) {
    context = { ...context, importAttributes: { ...(context.importAttributes || {}), type: 'json' }, format: 'json' };
  }
  const result = await nextLoad(url, context);
  if (result.source && (typeof result.source === 'string' || result.source instanceof Uint8Array)) {
    const source = typeof result.source === 'string'
      ? result.source
      : new TextDecoder().decode(result.source);
    if (source.includes('import.meta.env')) {
      result.source = source.replace(/import\.meta\.env/g, '({})');
    }
  }
  return result;
}

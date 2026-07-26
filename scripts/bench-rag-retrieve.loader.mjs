import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXT_CANDIDATES = ['.js', '.mjs', '.jsx', '.ts', '.tsx'];

// Catálogo REAL para el tier-gate del bench (fix 2026-07-26).
// ANTES: getAllSpecies() se stubeaba a `[]`. Eso hacía que ragRetriever.buildCorpus()
// tomara la rama FAIL-CLOSED (audit P0-1) y degradara el corpus a las ~44 especies
// de CROP_TAXONOMY — mientras que PRODUCCIÓN carga 463 (= catalog.sqlite ∩ manifest).
// Resultado: el bench medía un corpus 10x más chico que el real y reportaba ceros
// "por ausencia" (la ficha esperada ni siquiera estaba indexada), así que el número
// de recall del CI no era el de prod. Ahora leemos el mismo catalog.sqlite que sirve
// el navegador, vía node:sqlite, replicando `SELECT data FROM species` + JSON.parse
// de src/db/catalogDB.js (misma forma de fila).
// Si el catálogo no se puede leer, degradamos a [] (comportamiento anterior) pero
// GRITANDO, para que nadie vuelva a leer un recall deflactado como si fuera de prod.
const CATALOG_PATH = fileURLToPath(new URL('../public/catalog.sqlite', import.meta.url));

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
    return {
      format: 'module',
      shortCircuit: true,
      source: [
        "import { DatabaseSync } from 'node:sqlite';",
        `const CATALOG_PATH = ${JSON.stringify(CATALOG_PATH)};`,
        'let cache = null;',
        'export const getAllSpecies = async () => {',
        '  if (cache) return cache;',
        '  try {',
        '    const db = new DatabaseSync(CATALOG_PATH, { readOnly: true });',
        // Mismo query y mismo parseo que src/db/catalogDB.js::getAllSpecies().
        "    const rows = db.prepare('SELECT data FROM species').all();",
        '    db.close();',
        '    cache = rows.map((r) => JSON.parse(r.data));',
        '    console.info(`[bench-loader] catálogo real: ${cache.length} especies desde catalog.sqlite (tier-gate como en prod).`);',
        '  } catch (err) {',
        '    cache = [];',
        "    console.warn('[bench-loader] AVISO: no se pudo leer catalog.sqlite (' + err.message + ').');",
        "    console.warn('[bench-loader] getAllSpecies() devuelve [] → el tier-gate degradará FAIL-CLOSED a ~44 especies.');",
        "    console.warn('[bench-loader] El recall que imprima este bench NO es el de producción (463 especies). NO lo reportes como tal.');",
        '  }',
        '  return cache;',
        '};',
        'export const getSpeciesById = async (id) => (await getAllSpecies()).find((s) => s.id === id) || null;',
        '',
      ].join('\n'),
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

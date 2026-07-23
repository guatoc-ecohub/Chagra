// test-inteligencia-chagra.loader.mjs — ESM loader para correr el retriever de
// producción (src/services/ragRetriever.js) en Node, SIN el navegador.
//
// Es el hermano de scripts/bench-rag-retrieve.loader.mjs con UN cambio clave:
// aquí `catalogDB.getAllSpecies()` devuelve el catálogo COMPLETO (los 501 slugs
// del manifest), no `[]`. Eso importa: con `[]` el tier-gate de buildCorpus()
// degrada FAIL-CLOSED al subconjunto seguro (CROP_TAXONOMY ≈ 44 especies) y el
// bench termina midiendo recall sobre 44 fichas en vez del catálogo real
// (bug del loader documentado 2026-07-23). Con el catálogo completo el
// tier-gate confía y el retriever indexa las 501 fichas — que es lo que corre
// en producción para un usuario con catálogo hidratado.
//
// El manifest se lee de public/cycle-content/manifest.json (mismo asset que
// sirve el retriever). Si no existe, cae al mock vacío (comportamiento del
// bench viejo) para no romper.

import { stat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';

const EXT_CANDIDATES = ['.js', '.mjs', '.jsx', '.ts', '.tsx'];
const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = resolvePath(__dirname, '..', 'public', 'cycle-content', 'manifest.json');

// Lee los slugs del manifest UNA vez y arma el source del mock de catalogDB.
// getAllSpecies() debe devolver objetos con al menos `{ id }` (buildCorpus solo
// usa `s.id` y `catalogSpecies.length`).
let CATALOG_SOURCE = 'export const getAllSpecies = async () => [];\n';
try {
  const raw = await readFile(MANIFEST_PATH, 'utf8');
  const manifest = JSON.parse(raw);
  const slugs = Array.isArray(manifest?.slugs) ? manifest.slugs : [];
  if (slugs.length > 0) {
    const arr = JSON.stringify(slugs.map((id) => ({ id })));
    CATALOG_SOURCE = `export const getAllSpecies = async () => (${arr});\n`;
  }
} catch {
  // sin manifest → mock vacío (FAIL-CLOSED, como el bench viejo)
}

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
      source: CATALOG_SOURCE,
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

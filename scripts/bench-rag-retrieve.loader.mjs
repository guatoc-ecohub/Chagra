import { readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXT_CANDIDATES = ['.js', '.mjs', '.jsx', '.ts', '.tsx'];
const CATALOG_MANIFEST_URL = new URL('../public/cycle-content/manifest.json', import.meta.url);

/**
 * Construye el catalogo minimo que necesita el tier-gate durante el bench.
 * En la PWA getAllSpecies() lee SQLite; Node no puede abrir ese catalogo con
 * el mismo adaptador de navegador. El manifest es el corpus real que evalua
 * este harness, por lo que sus slugs representan exactamente las especies
 * que deben pasar el filtro antes de medir recall.
 */
export function getBenchCatalogSpecies() {
  const manifest = JSON.parse(readFileSync(CATALOG_MANIFEST_URL, 'utf8'));
  if (!Array.isArray(manifest.slugs)) {
    throw new Error('El manifest del corpus debe contener un arreglo de slugs');
  }
  return manifest.slugs.map((id) => ({ id }));
}

const benchCatalogSpecies = getBenchCatalogSpecies();

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
      source: `export const getAllSpecies = async () => ${JSON.stringify(benchCatalogSpecies)};\n`,
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

/**
 * Loader hook para bench-rag-retrieve.mjs.
 *
 * El código de src/ usa imports estilo Vite sin extensión `.js`. Este hook
 * añade extensiones cuando Node nativo no puede resolver el specifier.
 *
 * Uso:
 *   node --import ./scripts/bench-rag-retrieve.register.mjs scripts/bench-rag-retrieve.mjs
 */
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const EXT_CANDIDATES = ['.js', '.mjs', '.jsx', '.ts', '.tsx'];

async function fileExists(url) {
  try {
    const path = fileURLToPath(url);
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Solo intentamos rescate si parece un path relativo o absoluto sin ext.
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) throw err;
    const base = context.parentURL ?? import.meta.url;
    for (const ext of EXT_CANDIDATES) {
      const candidate = new URL(specifier + ext, base);
      if (await fileExists(candidate)) {
        return nextResolve(specifier + ext, context);
      }
    }
    throw err;
  }
}

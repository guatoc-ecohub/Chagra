/**
 * ext-resolver-hooks.mjs — hook de resolución ESM que permite a node importar
 * módulos `src/` del repo que usan imports relativos SIN extensión (p. ej.
 * `import { X } from './promptAssembler'`). Vite los resuelve en build; node ESM
 * por defecto NO. Este hook intenta el especificador tal cual y, si falla con un
 * relativo sin extensión, reintenta agregando `.js` / `/index.js`.
 *
 * Uso (registra el hook antes de cargar el script):
 *   node --import ./scripts/lib/ext-resolver.mjs scripts/<bench>.mjs
 *
 * Solo toca especificadores relativos ('./' o '../'); paquetes y node: builtins
 * pasan sin cambios. No-op para imports que ya traen extensión.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';

const CANDIDATES = ['.js', '.mjs', '/index.js', '/index.mjs'];

/**
 * load hook — los módulos `src/` importan `.json` sin `with { type: 'json' }`
 * (Vite lo resuelve; node ESM exige el atributo y aborta con
 * ERR_IMPORT_ASSERTION_TYPE_MISSING). Para `.json` corto-circuitamos: leemos el
 * archivo y lo devolvemos como módulo JSON (default export = el parseado),
 * saltando la validación de atributos. El resto pasa a nextLoad sin cambios.
 */
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    const source = await readFile(fileURLToPath(new URL(url)));
    return { format: 'json', source, shortCircuit: true };
  }
  return nextLoad(url, context);
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    const hasExt = /\.[mc]?js$|\.json$/.test(specifier);
    if (!isRelative || hasExt || !context.parentURL) throw err;
    for (const ext of CANDIDATES) {
      const candidateUrl = new URL(specifier + ext, context.parentURL);
      if (existsSync(fileURLToPath(candidateUrl))) {
        return nextResolve(specifier + ext, context);
      }
    }
    throw err;
  }
}

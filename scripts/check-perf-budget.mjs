import { readdirSync, statSync, lstatSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const ASSETS = join(DIST, 'assets');

const THRESHOLDS = {
  mainBundleMax: 340 * 1024,
  chunkMax:      500 * 1024,
  totalMax:      Math.round(27.5 * 1024 * 1024),
};

// MODO CAMPO / wake-word "hola chagra" (#2088): los libs de TF.js vendoreados
// + el modelo speech-commands (~9 MB) se cargan PEREZOSAMENTE — inyectados con
// injectScript SOLO al activar el modo campo, y cacheados cache-on-use por el
// SW (WAKE_WORD_PATH_PREFIXES en public/sw.js), NUNCA precacheados en install.
// No pesan en la carga inicial ni en el bundle crítico, así que se excluyen del
// techo de 27.5 MB (que mide el peso de arranque, no el disco total del dist).
// Espeja EXACTAMENTE los prefijos del SW: si cambian allá, cambian acá.
//
// Assets semánticos/grounding diferidos (2026-07-13): rag-embeddings.json
// (~1.7MB) y cycle-content/ (~3.4MB) se cargan cache-on-use — NUNCA
// precacheados en install (ver RAG_GROUNDING_PRECACHE en public/sw.js).
// El agente responde sin RAG en >90% de sesiones; la búsqueda semántica y
// las fichas de cultivo cargan su primer fetch cuando el usuario realmente
// las necesita, no en el arranque. Excluidos del budget igual que TF.js.
const LAZY_EXCLUDED_PREFIXES = [
  join(DIST, 'vendor', 'tfjs'),
  join(DIST, 'vendor', 'speech-commands'),
  join(DIST, 'models', 'speech-commands'),
  join(DIST, 'models', 'hola-chagra'),
  join(DIST, 'rag-embeddings.json'),
  join(DIST, 'cycle-content'),
];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isLazyExcluded(fullPath) {
  return LAZY_EXCLUDED_PREFIXES.some((p) => fullPath === p || fullPath.startsWith(p + '/'));
}

function getDirSizeRaw(dir) {
  const st = lstatSync(dir);
  if (st.isFile()) return st.size;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isFile()) total += statSync(full).size;
    else if (entry.isDirectory()) total += getDirSizeRaw(full);
  }
  return total;
}

function getDirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    // Assets lazy del modo campo (#2088): no cuentan al techo de arranque.
    if (isLazyExcluded(full)) continue;
    if (entry.isFile()) total += statSync(full).size;
    else if (entry.isDirectory()) total += getDirSize(full);
  }
  return total;
}

function checkBudget() {
  if (!existsSync(ASSETS)) {
    console.error('dist/assets/ not found. Run `npm run build` first.');
    process.exit(1);
  }

  const errors = [];

  const totalSize = getDirSize(DIST);
  if (totalSize > THRESHOLDS.totalMax) {
    errors.push('TOTAL dist exceeds budget: ' + formatSize(totalSize));
  }

  // Peso lazy excluido (modo campo #2088): reportado para trazabilidad — así el
  // gate deja constancia de cuánto se dejó fuera del techo y por qué.
  let lazyExcluded = 0;
  for (const p of LAZY_EXCLUDED_PREFIXES) {
    if (existsSync(p)) lazyExcluded += getDirSizeRaw(p);
  }

  let mainBundleSize = 0;
  const chunkSizes = [];
  for (const f of readdirSync(ASSETS)) {
    const fp = join(ASSETS, f);
    if (!lstatSync(fp).isFile()) continue;
    if (!f.endsWith('.js')) continue;
    const size = statSync(fp).size;
    chunkSizes.push({ file: f, size });
    if (f.startsWith('index-') && size > mainBundleSize) mainBundleSize = size;
  }

  if (mainBundleSize > THRESHOLDS.mainBundleMax) {
    errors.push('MAIN bundle exceeds 300KB: ' + formatSize(mainBundleSize));
  }
  // Chunks vendor lazy conocidos: se cargan bajo demanda (cache-on-use), NO en el
  // arranque, así que no cuentan contra el budget de arranque (ya medido por totalMax).
  // three.js es inherentemente ~1MB; el 3D va perezoso (vendor-three) y solo lo paga
  // quien entra a un mundo 3D. La regla por-chunk de 500KB es para pillar bloat
  // ACCIDENTAL en chunks eager, no la separación deliberada del vendor 3D.
  const LAZY_VENDOR_ALLOWLIST = [/^vendor-three-/];
  for (const { file, size } of chunkSizes) {
    if (size > THRESHOLDS.chunkMax && !LAZY_VENDOR_ALLOWLIST.some((re) => re.test(file))) {
      errors.push('CHUNK "' + file + '" exceeds 500KB: ' + formatSize(size));
    }
  }

  console.log('Total dist (arranque, budget): ' + formatSize(totalSize) + ' / ' + formatSize(THRESHOLDS.totalMax));
  if (lazyExcluded > 0) {
    console.log('Excluido lazy (modo campo #2088): ' + formatSize(lazyExcluded) + ' (cache-on-use, no en arranque)');
  }
  console.log('Main bundle: ' + formatSize(mainBundleSize));
  console.log('Chunk count: ' + chunkSizes.length);

  if (errors.length > 0) {
    console.error('\nBUDGET EXCEEDED:\n' + errors.map(e => '  - ' + e).join('\n'));
    process.exit(1);
  }
  console.log('All budgets within thresholds.');
}

checkBudget();

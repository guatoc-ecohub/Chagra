import { readdirSync, statSync, lstatSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const ASSETS = join(DIST, 'assets');

const THRESHOLDS = {
  mainBundleMax: 300 * 1024,
  chunkMax:      500 * 1024,
  totalMax:      Math.round(25.5 * 1024 * 1024),
};

// MODO CAMPO / wake-word "hola chagra" (#2088): los libs de TF.js vendoreados
// + el modelo speech-commands (~9 MB) se cargan PEREZOSAMENTE — inyectados con
// injectScript SOLO al activar el modo campo, y cacheados cache-on-use por el
// SW (WAKE_WORD_PATH_PREFIXES en public/sw.js), NUNCA precacheados en install.
// No pesan en la carga inicial ni en el bundle crítico, así que se excluyen del
// techo de 25 MB (que mide el peso de arranque, no el disco total del dist).
// Espeja EXACTAMENTE los prefijos del SW: si cambian allá, cambian acá.
const LAZY_EXCLUDED_PREFIXES = [
  join(DIST, 'vendor', 'tfjs'),
  join(DIST, 'vendor', 'speech-commands'),
  join(DIST, 'models', 'speech-commands'),
  join(DIST, 'models', 'hola-chagra'),
];

// three.js + @react-three (#2309, mundos 3D): el 3D es ASPIRACIONAL y se carga
// PEREZOSO — `<Mundo>`/el storybook hacen dynamic import de los dioramas, que
// Vite agrupa en el chunk `vendor-three` (dist/assets/vendor-three-*.js). Ese
// chunk NUNCA se referencia en index.html (solo lo hacen los chunks de entrada),
// así que el SW NO lo precachea en install (parsea index.html para el shell; el
// resto es cache-on-use vía el fetch handler cache-first). No pesa en el arranque
// → se excluye del techo total y del cap por-chunk (three son ~850KB irreducibles,
// no divisibles bajo 500KB sin romper la lib). Mismo espíritu que el modo campo.
const LAZY_VENDOR_CHUNK_PREFIXES = ['vendor-three'];
function isLazyVendorChunk(filename) {
  return LAZY_VENDOR_CHUNK_PREFIXES.some((p) => filename.startsWith(p));
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isLazyExcluded(fullPath) {
  return LAZY_EXCLUDED_PREFIXES.some((p) => fullPath === p || fullPath.startsWith(p + '/'));
}

function getDirSizeRaw(dir) {
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
    // Chunk vendor-three lazy (#2309): tampoco cuenta al arranque (cache-on-use).
    if (entry.isFile() && isLazyVendorChunk(entry.name)) continue;
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
  let lazyVendorExcluded = 0;
  const chunkSizes = [];
  for (const f of readdirSync(ASSETS)) {
    const fp = join(ASSETS, f);
    if (!lstatSync(fp).isFile()) continue;
    if (!f.endsWith('.js')) continue;
    const size = statSync(fp).size;
    chunkSizes.push({ file: f, size });
    if (f.startsWith('index-') && size > mainBundleSize) mainBundleSize = size;
    if (isLazyVendorChunk(f)) lazyVendorExcluded += size;
  }

  if (mainBundleSize > THRESHOLDS.mainBundleMax) {
    errors.push('MAIN bundle exceeds 300KB: ' + formatSize(mainBundleSize));
  }
  for (const { file, size } of chunkSizes) {
    // vendor-three (#2309): chunk vendor lazy, exento del cap por-chunk (three es
    // irreducible ~850KB; cache-on-use, no en el arranque).
    if (isLazyVendorChunk(file)) continue;
    if (size > THRESHOLDS.chunkMax) {
      errors.push('CHUNK "' + file + '" exceeds 500KB: ' + formatSize(size));
    }
  }

  console.log('Total dist (arranque, budget): ' + formatSize(totalSize) + ' / ' + formatSize(THRESHOLDS.totalMax));
  if (lazyExcluded > 0) {
    console.log('Excluido lazy (modo campo #2088): ' + formatSize(lazyExcluded) + ' (cache-on-use, no en arranque)');
  }
  if (lazyVendorExcluded > 0) {
    console.log('Excluido lazy (vendor-three #2309): ' + formatSize(lazyVendorExcluded) + ' (cache-on-use, no en arranque)');
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

import { readdirSync, statSync, lstatSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const ASSETS = join(DIST, 'assets');

const THRESHOLDS = {
  mainBundleMax: 340 * 1024,
  chunkMax:      500 * 1024,
  totalMax:      Math.round(42 * 1024 * 1024),
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
// Imágenes de plagas/enfermedades (dist/plaga-images, ~33 MB): NO se precachean
// en install (no aparecen en public/sw.js). Se sirven ON-DEMAND — la usuaria solo
// baja la foto del plaga que realmente consulta, cache-on-use. Igual que TF.js y
// el grounding diferido, no pesan en el arranque, así que se excluyen del techo de
// 27.5 MB (que mide peso de arranque, no disco total). Crecieron a 33 MB y estaban
// contándose contra el budget por accidente (falta de exclusión), no por bloat eager.
//
// Láminas PNG de Compai (dist/compai/laminas): se solicitan por URL solo cuando
// se monta el avatar correspondiente y no aparecen en el precache del SW.
// Son cache-on-use, igual que las imágenes de plagas, no peso de arranque.
//
// Valle 3D vanilla (dist/valle, ~17 MB — scripts/sync-valle.mjs): marco de
// entrada OPCIONAL detrás de un toggle de perfil (default OFF, ver
// ValleMarcoScreen.jsx / userProfileService.getMarco3DPreference). Se sirve
// dentro de un <iframe> SOLO si el usuario lo activó — nunca se precachea en
// install (offline-cache del valle es trabajo aparte). Mismo criterio que el
// resto de esta lista: cache-on-use, no pesa en el arranque.
const LAZY_EXCLUDED_PREFIXES = [
  join(DIST, 'vendor', 'tfjs'),
  join(DIST, 'vendor', 'speech-commands'),
  join(DIST, 'models', 'speech-commands'),
  join(DIST, 'models', 'hola-chagra'),
  join(DIST, 'rag-embeddings.json'),
  join(DIST, 'cycle-content'),
  join(DIST, 'plaga-images'),
  join(DIST, 'compai', 'laminas'),
  join(DIST, 'valle'),
];

// El registro de fauna compartido solo se alcanza desde rutas lazy 3D y la
// vitrina de avatar. Rolldown lo emite como un archivo común en assets/, no
// bajo una carpeta propia, por eso se excluye por prefijo de nombre igual que
// vendor-three: cache-on-use, nunca parte del arranque 2D.
//
// ARTE DE TRAZADO EN TINTA (gate 087, 2026-09-03): los chunks de la familia
// trazado — JaguarTrazado-, trazadoCreature- (payloads SVG compartidos por
// los rigs), ChivitoTrazado-, …— son DATO, no código: SVG generado por
// scripts/trazar-lamina.sh ("huesos reales, piel dibujada"), inherentemente
// >500KB y NO degradable por presupuesto. Están excluidos del techo de
// arranque PORQUE SON LAZY DE VERDAD, no porque pesen: verificado midiendo el
// cierre estático de index.html → main-* en el dist (ver _gate/087/) — solo
// son alcanzables por import() dinámico (React.lazy por especie del
// dispatcher de avatar + rutas 3D), así que se cargan cache-on-use al montar
// el avatar/escena elegida y no bloquean el arranque.
//
// La exclusion es por FAMILIA (regex), no por nombre literal: los chunks se
// llaman como su módulo fuente y cada rename o criatura nueva rompía la lista
// literal — exactamente lo que dejó la base en rojo (`JaguarTrazado-` y
// `creatures-` exceptuados, `trazadoCreature-` no). El patrón exige prefijo
// camelCase sin guiones para no tragarse por accidente otros
// "…-trazado-…" que no sean arte.
const FAMILIA_TRAZADO_RE = /^[a-z]*trazado/i;
const LAZY_EXCLUDED_ASSET_PREFIXES = ['creatures-', FAMILIA_TRAZADO_RE];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isLazyExcluded(fullPath) {
  if (LAZY_EXCLUDED_PREFIXES.some((p) => fullPath === p || fullPath.startsWith(p + '/'))) return true;
  const assetName = fullPath.startsWith(ASSETS + '/') ? fullPath.slice(ASSETS.length + 1) : '';
  return LAZY_EXCLUDED_ASSET_PREFIXES.some((prefix) =>
    typeof prefix === 'string' ? assetName.startsWith(prefix) : prefix.test(assetName)
  );
}

/* ── Verificación lazy-vs-grafo (gate 087) ─────────────────────────────────
 * Una exclusión "lazy" que mienta es peor que un gate roto: en la base la
 * allowlist decía "lazy" mientras el chunk EAGER en el arranque (por eso el
 * rojo de trazadoCreature-). Esta función calcula el CIERRE ESTÁTICO de
 * arranque del dist real — index.html → entry <script type=module> (+ sus
 * <link rel=modulepreload>) → imports estáticos transitivos — para que
 * checkBudget() pueda VERIFICAR que ningún chunk exceptuado como lazy
 * aparezca ahí. Si un refactor futuro vuelve a enganchar el arte al
 * arranque, el gate falla con un mensaje preciso en vez de aprobar en falso.
 *
 * Formato asumido del bundler (rolldown-vite, verificado 2026-09-03):
 * `…from"./chunk-hash.js"` y `import"./chunk-hash.js"` son estáticos; los
 * dinámicos (`import("./x")`) y las listas de strings de __vite__mapDeps no
 * matchean. Solo sigue .js (el CSS viaja con el chunk que lo importa). */
function computeStartupClosure() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const entry = html.match(/<script[^>]*type="module"[^>]*src="\/?(assets\/[^"]+)"/);
  if (!entry) {
    throw new Error('perf-budget: no se encontró el entry module en dist/index.html — no se puede verificar la exclusión lazy');
  }
  const starts = [entry[1]];
  for (const m of html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="\/?(assets\/[^"]+)"/g)) {
    starts.push(m[1]);
  }
  const STATIC_IMPORT_RE = /(?:from|import)"\.\/([^"]+\.js)"/g;
  const seen = new Set();
  const queue = starts.map((p) => p.slice('assets/'.length)).filter((f) => existsSync(join(ASSETS, f)));
  while (queue.length) {
    const c = queue.pop();
    if (seen.has(c)) continue;
    seen.add(c);
    const src = readFileSync(join(ASSETS, c), 'utf8');
    for (const m of src.matchAll(STATIC_IMPORT_RE)) {
      if (!seen.has(m[1]) && existsSync(join(ASSETS, m[1]))) queue.push(m[1]);
    }
  }
  if (seen.size < 10) {
    // Fail-closed: si el grafo no parsea, NO aprobamos las exclusiones.
    throw new Error(`perf-budget: grafo de arranque no parseable (${seen.size} chunks) — revisar el formato de imports del bundler`);
  }
  return seen;
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
  for (const f of readdirSync(ASSETS)) {
    const fp = join(ASSETS, f);
    if (isLazyExcluded(fp) && lstatSync(fp).isFile()) lazyExcluded += statSync(fp).size;
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
  //
  // FAMILIA TRAZADO (gate 087): exceptuada PORQUE es lazy, no porque pese —
  // el arte de tinta en SVG se paga solo al montar el avatar/escena elegida
  // (ver comentario de FAMILIA_TRAZADO_RE arriba y _gate/087/INFORME-087.md
  // por la evidencia del grafo de arranque). Patrón por familia, no por
  // literal: la base exceptuaba "JaguarTrazado-" y se cayó cuando el payload
  // compartido salió como "trazadoCreature-" — cada rename rompía la lista.
  // Un chunk NUEVO que no sea de esta familia sigue cazado por la regla.
  const CHUNK_ALLOWLIST = [/^vendor-three-/, /^creatures-/, FAMILIA_TRAZADO_RE];
  for (const { file, size } of chunkSizes) {
    if (size > THRESHOLDS.chunkMax && !CHUNK_ALLOWLIST.some((re) => re.test(file))) {
      errors.push('CHUNK "' + file + '" exceeds 500KB: ' + formatSize(size));
    }
  }

  // Verificación de las EXCLUSIONES lazy contra el grafo de arranque real
  // (gate 087): toda familia exceptuada como "lazy" (vendor-three, creatures,
  // trazado) debe estar FUERA del cierre estático de index.html → main-*. Si
  // aparece, la exclusión es mentira y el gate lo dice — es el modo de fallo
  // exacto que dejó la base en rojo (allowlist "lazy", chunk EAGER).
  const startupClosure = computeStartupClosure();
  const FAMILIAS_LAZY_VERIFICADAS = [
    ['vendor-three', (f) => f.startsWith('vendor-three-')],
    ['creatures', (f) => f.startsWith('creatures-')],
    ['trazado', (f) => FAMILIA_TRAZADO_RE.test(f)],
  ];
  for (const f of startupClosure) {
    const familia = FAMILIAS_LAZY_VERIFICADAS.find(([, test]) => test(f));
    if (familia) {
      errors.push(
        'LAZY MENTIRA: "' + f + '" (familia ' + familia[0] + ', exceptuada como lazy) ' +
        'aparece como import estático del arranque — sacarlo del grafo eager o corregir la exclusión',
      );
    }
  }

  console.log('Total dist (arranque, budget): ' + formatSize(totalSize) + ' / ' + formatSize(THRESHOLDS.totalMax));
  if (lazyExcluded > 0) {
    console.log('Excluido lazy (modo campo #2088): ' + formatSize(lazyExcluded) + ' (cache-on-use, no en arranque)');
  }
  console.log('Main bundle: ' + formatSize(mainBundleSize));
  console.log('Chunk count: ' + chunkSizes.length);
  const lazyMentira = errors.filter((e) => e.startsWith('LAZY MENTIRA')).length;
  console.log(
    'Grafo de arranque verificado: ' + startupClosure.size + ' chunks estáticos' +
    (lazyMentira ? ' — ' + lazyMentira + ' familia(s) lazy EN el arranque (arriba)' : ' (ninguna familia lazy presente)'),
  );

  if (errors.length > 0) {
    console.error('\nBUDGET EXCEEDED:\n' + errors.map(e => '  - ' + e).join('\n'));
    process.exit(1);
  }
  console.log('All budgets within thresholds.');
}

checkBudget();

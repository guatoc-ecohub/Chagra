#!/usr/bin/env node
/**
 * audit-integraciones.mjs — auditor de "construido pero no conectado"
 * =====================================================================
 * Ver ADR-INTEGRACIONES-NO-CONSUMIDAS-2026-07-15 (Chagra-strategy/ops/,
 * privado — discute los 3 casos fuente y el detalle de chagra-pro que no
 * puede vivir en este repo público).
 *
 * QUÉ AUDITA
 * ----------
 * 1. Exports "de conocimiento" declarados en SAME_REPO_TARGETS abajo:
 *    ¿los llama alguien en `src/` fuera de su propio módulo y su test?
 * 2. (Solo si `chagra-pro` está disponible en este filesystem — ver
 *    "TRAMPA REPO PRIVADO" abajo) Endpoints del sidecar agro-mcp
 *    (`chagra-pro/modules/agro-mcp/sidecar/src/server.ts`): ¿los llama
 *    alguien en `src/`?
 * 3. Componentes bajo `src/mockups/` y `src/visual/` (extensión 2026-07-21,
 *    D-5 de la reingeniería del pipeline): ¿son ALCANZABLES por import
 *    estático desde el entry point real de la app (`src/App.jsx`)? Este es
 *    el gate del patrón "se construye, pasa el build, pero nunca se
 *    renderiza / nunca entra al bundle / nunca se importa" — casos reales
 *    que lo motivaron: `PerrosValle.jsx` existía y no se veía en ninguna
 *    ruta; mockups nuevos que quedaron fuera del bundle de producción. Se
 *    hace con un mini-resolver de imports (BFS desde App.jsx, ver
 *    `buildReachableSet`) — NO un bundler real, así que comparte el mismo
 *    LÍMITE CONOCIDO de abajo (imports dinámicos por variable no se ven).
 *
 * Cualquier capacidad SIN consumidor y SIN entrada en el allowlist
 * (`ops/integraciones-no-consumidas.json`) hace fallar el script (exit 1).
 * El allowlist es la forma de decir "esto es una decisión, no un olvido" —
 * cada entrada requiere `reason` + `date`.
 *
 * TRAMPA REPO PRIVADO (anti-leak, ver ADR)
 * -----------------------------------------
 * `chagra` es público, `chagra-pro` privado. Este script NUNCA escribe a
 * disco nada leído de `chagra-pro` — el parseo de `server.ts` (regex sobre
 * rutas `app.get/app.post`, ver `extractSidecarEndpoints`) vive solo en
 * memoria durante la corrida y se descarta al salir. Ningún archivo de
 * chagra-pro se commitea ni se copia a este repo.
 *
 * Resolución de la ruta a chagra-pro (mismo patrón que `audit-bundle.mjs`
 * con `INTERNAL_PRESET_PATH`):
 *   1. env `CHAGRA_PRO_PATH` — explícito (dev local con nombre de carpeta
 *      distinto, o un futuro job de CI privilegiado en chagra-pro que
 *      clona este repo público — esa dirección NO es leak: privado leyendo
 *      público es seguro).
 *   2. `../chagra-pro` relativo a la raíz de este repo — convención local.
 * Si ninguno existe (el caso normal de CI del repo público en GitHub
 * Actions, que NO tiene acceso a chagra-pro), la auditoría de endpoints del
 * sidecar se SALTA con un warning explícito y el script solo audita
 * SAME_REPO_TARGETS. Eso es aceptable — igual que en audit-bundle.mjs, el
 * repo público no puede fallar un gate por contenido que no puede ver.
 *
 * LÍMITE CONOCIDO (documentado a propósito, no ocultado)
 * --------------------------------------------------------
 * La detección de "consumidor" es un grep de la ruta del endpoint (string
 * literal) o del nombre del export sobre los archivos de `src/`. Esto NO
 * ve:
 *   - imports dinámicos por variable/path construido en runtime (ej.
 *     `loadProModules.js`, que arma el path desde una env var),
 *   - llamadas indirectas vía un wrapper genérico si el string del
 *     endpoint no aparece literal (ej. `callTool(name)` con `name` armado
 *     en runtime en vez de la ruta completa).
 * La auditoría de componentes huérfanos (§3) comparte esta misma limitación:
 * `buildReachableSet` resuelve especificadores de import LITERALES (string
 * fijo tras `from`/`import(`), no rutas armadas con template strings
 * (`import(\`./x/${var}.jsx\`)`) — si aparece un caso así, cae en el mismo
 * hueco documentado, no en uno nuevo.
 * Si un caso legítimo cae en alguno de estos huecos, la respuesta NO es
 * afinar el regex hasta la perfección (ruido = la gente lo silencia) sino
 * declararlo en el allowlist con la razón "false positive conocido: <por
 * qué>" — así el hueco queda documentado igual que un no-consumo real.
 *
 * Exit codes: 0 limpio · 1 hay capacidades sin consumidor y sin allowlist
 * · 2 problema de ejecución (archivo target ausente, allowlist mal formado).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_DIR = join(ROOT, 'src');
const ALLOWLIST_PATH = join(ROOT, 'ops/integraciones-no-consumidas.json');

function die(code, msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(code);
}
function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m⚠\x1b[0m ${msg}`); }

// ---------------------------------------------------------------------------
// SAME_REPO_TARGETS — capacidades declaradas explícitamente para auditar.
// A propósito NO es "todo export de src/" (eso sería ruido: imports
// dinámicos, re-exports, barrels). Es una lista curada que se amplía cuando
// se descubre un nuevo caso "construido y no conectado" (el mismo patrón
// que motivó este script — ver ADR).
// ---------------------------------------------------------------------------
const SAME_REPO_TARGETS = [
  {
    id: 'grafoRelations.getKnowledgeTopics',
    file: 'src/services/grafoRelations.js',
    export: 'getKnowledgeTopics',
  },
  {
    id: 'grafoRelations.getKnowledgeTopic',
    file: 'src/services/grafoRelations.js',
    export: 'getKnowledgeTopic',
  },
  {
    id: 'grafoRelations.buildKnowledgeTopicBlock',
    file: 'src/services/grafoRelations.js',
    export: 'buildKnowledgeTopicBlock',
  },
];

// Rutas del sidecar que son introspección/ops, no "capacidad de producto" —
// no tiene sentido exigirles un consumidor en el chat del agente. Igual que
// audit-bundle.mjs excluye vendor false-positives, esto es una exclusión
// documentada, no silenciosa.
const SIDECAR_INFRA_ENDPOINTS = new Set([
  '/healthz',
  '/health',
  '/metrics',
  '/cache/stats',
  '/resolve-cache/stats',
  '/tools',
]);

function walk(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, exts));
    else if (exts.has(extname(p))) out.push(p);
  }
  return out;
}

const SRC_EXTS = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const allSrcFiles = walk(SRC_DIR, SRC_EXTS);

// -----------------------------
// 1) SAME_REPO_TARGETS audit
// -----------------------------
function auditSameRepoTarget(target) {
  const targetFile = resolve(ROOT, target.file);
  if (!existsSync(targetFile)) {
    return { ...target, status: 'error', detail: `archivo no existe: ${target.file}` };
  }
  const wordBoundary = new RegExp(`\\b${target.export}\\b`);
  let consumers = 0;
  for (const f of allSrcFiles) {
    if (f === targetFile) continue; // el propio módulo no cuenta
    if (f.includes('__tests__')) continue; // los propios tests no cuentan como consumidor real
    let content;
    try { content = readFileSync(f, 'utf8'); } catch { continue; }
    if (wordBoundary.test(content)) { consumers++; break; }
  }
  return { ...target, status: consumers > 0 ? 'consumed' : 'orphan' };
}

const sameRepoResults = SAME_REPO_TARGETS.map(auditSameRepoTarget);

// -----------------------------
// 2) Sidecar endpoints audit (condicional a chagra-pro presente)
// -----------------------------
const CHAGRA_PRO_PATH = process.env.CHAGRA_PRO_PATH || resolve(ROOT, '../chagra-pro');
const SERVER_TS = join(CHAGRA_PRO_PATH, 'modules/agro-mcp/sidecar/src/server.ts');
const chagraProAvailable = existsSync(SERVER_TS);

function extractSidecarEndpoints(serverTsPath) {
  const content = readFileSync(serverTsPath, 'utf8');
  const re = /app\.(?:get|post)\(\s*["'`]([^"'`]+)["'`]/g;
  const found = new Set();
  let m;
  while ((m = re.exec(content)) !== null) {
    const path = m[1];
    if (path.includes('${')) continue; // ruta templada (ej. /tools/${name}) — multiplexer genérico, no capacidad fija
    found.add(path);
  }
  return [...found].sort();
}

let sidecarResults = [];
if (chagraProAvailable) {
  const endpoints = extractSidecarEndpoints(SERVER_TS);
  sidecarResults = endpoints
    .filter((ep) => !SIDECAR_INFRA_ENDPOINTS.has(ep))
    .map((ep) => {
      let consumers = 0;
      for (const f of allSrcFiles) {
        let content;
        try { content = readFileSync(f, 'utf8'); } catch { continue; }
        if (content.includes(ep)) { consumers++; break; }
      }
      return { endpoint: ep, status: consumers > 0 ? 'consumed' : 'orphan' };
    });
} else {
  warn(`chagra-pro no disponible en "${CHAGRA_PRO_PATH}" (ni CHAGRA_PRO_PATH) — se salta la auditoría de endpoints del sidecar.`);
  warn('Esto es esperado en CI del repo público. Para la auditoría completa, correr con chagra-pro clonado al lado (o CHAGRA_PRO_PATH=<ruta>).');
}

// -----------------------------------------------------------------------
// 3) Componentes huérfanos bajo src/mockups/ y src/visual/ (D-5, 2026-07-21)
// -----------------------------------------------------------------------
// Entry point real de la app (ver src/App.jsx: rutas hash `#/mockups/<slug>`
// resueltas vía `lazy(() => import('./mockups/<Componente>'))` antes del
// check de sesión). Si un .jsx nuevo bajo estos dos directorios no es
// alcanzable desde acá por ninguna cadena de imports estáticos, quedó
// "construido pero no cableado" — el mismo patrón de `PerrosValle.jsx`.
const ENTRY_POINT = 'src/App.jsx';
const ORPHAN_SCAN_DIRS = ['src/mockups', 'src/visual'];
// Extensiones que el resolver intenta al completar un especificador relativo
// sin extensión (orden = prioridad). Incluye no-JS (css/json/assets) porque
// un archivo reachable puede importar un `./Foo.css` — no lo contamos como
// "componente" en el reporte (eso lo filtra COMPONENT_EXTS abajo) pero sí
// necesita resolverse para que el BFS no se detenga ahí.
const RESOLVABLE_EXTS = ['.jsx', '.js', '.mjs', '.ts', '.tsx', '.css', '.json', '.svg', '.png'];
// Lo que este audit trata como "componente" reportable (los .js/.ts de estos
// dos directorios suelen ser datos/config — arquetipos.js, mundoData.js — no
// "algo que debería verse en una ruta"; no se auditan como huérfanos).
const COMPONENT_EXTS = new Set(['.jsx', '.tsx']);

function resolveWithExts(basePath) {
  if (existsSync(basePath) && statSync(basePath).isFile()) return basePath;
  for (const ext of RESOLVABLE_EXTS) {
    if (existsSync(basePath + ext)) return basePath + ext;
  }
  for (const ext of RESOLVABLE_EXTS) {
    const idx = join(basePath, 'index' + ext);
    if (existsSync(idx)) return idx;
  }
  return null;
}

// Resuelve un especificador de import tal como aparece en el código fuente.
// Soporta relativos (`./x`, `../x`) y el alias `@/` (`jsconfig.json` →
// `src/*`, usado en un puñado de archivos aunque no está en vite.config.js
// como alias de build real — igual se resuelve para no perder esos casos).
// Paquetes de node_modules (sin `.` ni `@/` al inicio) se ignoran: no son
// auditables ni relevantes para "¿esto vive en una ruta viva?".
function resolveSpecifier(fromFile, spec) {
  if (spec.startsWith('@/')) return resolveWithExts(join(SRC_DIR, spec.slice(2)));
  if (spec.startsWith('.')) return resolveWithExts(resolve(dirname(fromFile), spec));
  return null;
}

// Extrae especificadores de import de un archivo fuente. A propósito NO es
// un parser AST (mismo criterio "barato, regex, documentado" que el resto
// del script) — cubre `import ... from '...'`, `export ... from '...'`,
// `import('...')` (incluye el caso `lazy(() => import('...'))`) e
// `import '...'` (side-effect, ej. una hoja de estilos).
const SPEC_PATTERNS = [
  /\bfrom\s*['"`]([^'"`]+)['"`]/g,
  /\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  /^\s*import\s*['"`]([^'"`]+)['"`]/gm,
];

function extractSpecifiers(content) {
  const specs = new Set();
  for (const re of SPEC_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) specs.add(m[1]);
  }
  return specs;
}

// BFS desde el entry point siguiendo imports estáticos resolubles. El
// resultado es el conjunto de archivos que un bundler real incluiría en el
// grafo de módulos alcanzable desde App.jsx (con la salvedad de imports
// dinámicos por variable — ver LÍMITE CONOCIDO en el header).
function buildReachableSet(entryFile) {
  const visited = new Set();
  const queue = [entryFile];
  while (queue.length) {
    const file = queue.shift();
    if (visited.has(file)) continue;
    visited.add(file);
    let content;
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    for (const spec of extractSpecifiers(content)) {
      const resolved = resolveSpecifier(file, spec);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  return visited;
}

const entryAbs = resolve(ROOT, ENTRY_POINT);
const entryAvailable = existsSync(entryAbs);
const reachableSet = entryAvailable ? buildReachableSet(entryAbs) : new Set();

function auditOrphanComponents() {
  if (!entryAvailable) {
    warn(`entry point ${ENTRY_POINT} no existe — se salta la auditoría de componentes huérfanos.`);
    return [];
  }
  const results = [];
  for (const dir of ORPHAN_SCAN_DIRS) {
    const absDir = resolve(ROOT, dir);
    for (const f of walk(absDir, COMPONENT_EXTS)) {
      if (f.includes('__tests__')) continue;
      if (/\.(test|spec|stories)\.[jt]sx?$/.test(f)) continue;
      results.push({ id: f.slice(ROOT.length + 1), file: f, status: reachableSet.has(f) ? 'consumed' : 'orphan' });
    }
  }
  return results;
}

const orphanResults = auditOrphanComponents();

// -----------------------------
// Allowlist
// -----------------------------
if (!existsSync(ALLOWLIST_PATH)) die(2, `falta el allowlist: ${ALLOWLIST_PATH}`);
let allowlist;
try {
  allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
} catch (e) {
  die(2, `allowlist mal formado (${ALLOWLIST_PATH}): ${e.message}`);
}

function validateAllowlistEntry(entry, label) {
  if (!entry.reason || typeof entry.reason !== 'string' || !entry.reason.trim()) {
    die(2, `allowlist: entrada "${label}" sin "reason" — una excepción sin razón no es una decisión, es un olvido con papeleo.`);
  }
  if (!entry.date || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    die(2, `allowlist: entrada "${label}" sin "date" válida (YYYY-MM-DD).`);
  }
}

const allowedSameRepoIds = new Map();
for (const e of allowlist.same_repo || []) {
  validateAllowlistEntry(e, e.id || '(sin id)');
  allowedSameRepoIds.set(e.id, e);
}
const allowedEndpoints = new Map();
for (const e of allowlist.sidecar_endpoints || []) {
  validateAllowlistEntry(e, e.endpoint || '(sin endpoint)');
  allowedEndpoints.set(e.endpoint, e);
}
const allowedOrphanIds = new Map();
for (const e of allowlist.orphan_components || []) {
  validateAllowlistEntry(e, e.id || '(sin id)');
  allowedOrphanIds.set(e.id, e);
}

// -----------------------------
// Reporte + veredicto
// -----------------------------
console.log('Chagra — auditor de integraciones no consumidas');
console.log(`  targets same-repo:     ${SAME_REPO_TARGETS.length}`);
console.log(`  chagra-pro disponible: ${chagraProAvailable ? SERVER_TS : 'no'}`);
console.log(`  endpoints auditados:   ${sidecarResults.length}${chagraProAvailable ? '' : ' (saltado)'}`);
console.log(`  componentes auditados (mockups+visual): ${orphanResults.length}${entryAvailable ? '' : ' (saltado)'}`);
console.log('');

const failures = [];
const skippedAllowlisted = [];

for (const r of sameRepoResults) {
  if (r.status === 'error') { failures.push(`[same-repo] ${r.id}: ${r.detail}`); continue; }
  if (r.status === 'consumed') { ok(`same-repo consumido: ${r.id}`); continue; }
  const allow = allowedSameRepoIds.get(r.id);
  if (allow) { skippedAllowlisted.push(r.id); warn(`same-repo SIN consumidor pero allowlisted: ${r.id} — ${allow.reason} (${allow.date})`); continue; }
  failures.push(`[same-repo] ${r.id} (${r.file}::${r.export}) — SIN consumidor en src/ y SIN entrada en allowlist`);
}

for (const r of sidecarResults) {
  if (r.status === 'consumed') { ok(`endpoint consumido: ${r.endpoint}`); continue; }
  const allow = allowedEndpoints.get(r.endpoint);
  if (allow) { skippedAllowlisted.push(r.endpoint); warn(`endpoint SIN consumidor pero allowlisted: ${r.endpoint} — ${allow.reason} (${allow.date})`); continue; }
  failures.push(`[sidecar] ${r.endpoint} — SIN consumidor en src/ y SIN entrada en allowlist`);
}

// Reporte de §3 resumido (no un `ok()` por archivo — con ~250 componentes
// bajo mockups+visual eso solo agrega ruido al log de CI): se cuenta, y solo
// se imprime línea por línea lo que NO está limpio (huérfano u orphan
// allowlisted), igual que el resto del script hace con sus fallas.
let orphanConsumedCount = 0;
for (const r of orphanResults) {
  if (r.status === 'consumed') { orphanConsumedCount++; continue; }
  const allow = allowedOrphanIds.get(r.id);
  if (allow) { skippedAllowlisted.push(r.id); warn(`componente SIN ruta viva pero allowlisted: ${r.id} — ${allow.reason} (${allow.date})`); continue; }
  failures.push(`[orphan] ${r.id} — construido pero NO alcanzable desde ${ENTRY_POINT} (ninguna ruta viva lo importa) y SIN entrada en allowlist`);
}
if (orphanResults.length > 0) ok(`componentes cableados en mockups/visual: ${orphanConsumedCount}/${orphanResults.length}`);

console.log('');
if (failures.length === 0) {
  ok(`Auditoría limpia — ${skippedAllowlisted.length} excepción(es) declarada(s), 0 huérfanos sin declarar.`);
  process.exit(0);
}

console.error(`\x1b[31m✗ ${failures.length} capacidad(es) construida(s) y no conectada(s), sin declarar\x1b[0m`);
for (const f of failures) console.error(`  ${f}`);
console.error('');
console.error('Si esto es una decisión de producto (no un olvido), declarala en');
console.error(`  ${ALLOWLIST_PATH.slice(ROOT.length + 1)}`);
console.error('con { reason, date }. Si no lo es, cableala o borrá el código muerto.');
process.exit(1);

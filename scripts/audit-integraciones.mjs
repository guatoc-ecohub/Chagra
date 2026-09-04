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
 * 3. Piezas de `src/` (extensión 2026-07-21, D-5 de la reingeniería del
 *    pipeline; reescrita 2026-09-03, task 095.b): ¿las monta alguna ruta que
 *    un usuario pueda alcanzar? Este es el gate del patrón "se construye,
 *    pasa el build, pero nunca se renderiza / nunca entra al bundle / nunca
 *    se importa" — casos reales que lo motivaron: `PerrosValle.jsx` existía y
 *    no se veía en ninguna ruta; mockups nuevos que quedaron fuera del bundle
 *    de producción.
 *
 *    LO MIDE EL MOTOR COMPARTIDO `scripts/lib/alcance-simbolica.mjs`, el mismo
 *    que usa `scripts/audit-componente-huerfano.mjs`. Hasta el 2026-09-03 esta
 *    sección tenía su PROPIO BFS por archivo sobre dos carpetas, y daba falso
 *    negativo por tres vías (barril que lava · los 216 `lazy()` en un saco ·
 *    solo `src/mockups`+`src/visual`). Ver el bloque de §3 más abajo para el
 *    detalle medido. Sigue sin ser un bundler real: comparte el LÍMITE
 *    CONOCIDO de abajo (imports por template string no se ven).
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
 * La auditoría de piezas no montadas (§3) comparte esta misma limitación: el
 * motor resuelve especificadores de import LITERALES (string fijo tras
 * `from`/`import(`), no rutas armadas con template strings
 * (`import(\`./x/${var}.jsx\`)`) — si aparece un caso así, cae en el mismo
 * hueco documentado, no en uno nuevo. Igual con la navegación: una vista a la
 * que se navega armando el id en runtime sale como no alcanzable.
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

import { analizarAlcance } from './lib/alcance-simbolica.mjs';

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
// 3) Piezas de src/ que ninguna ruta viva monta
//    (D-5 2026-07-21 · reescrita 2026-09-03, task 095.b)
// -----------------------------------------------------------------------
// ANTES esta sección tenía su propio BFS por ARCHIVO desde `src/App.jsx` sobre
// dos carpetas (`src/mockups`, `src/visual`). Daba falso NEGATIVO por tres
// vías, las tres medidas sobre `origin/dev` el 2026-09-03:
//
//   1. EL BARRIL LAVABA. `src/visual/creatures/index.js` re-exporta 72 símbolos.
//      Como el barril era alcanzable, el BFS por archivo marcaba "cableado" todo
//      lo que el barril re-exporta, lo pidiera alguien o no. 10 componentes
//      salían cableados sin que ningún consumidor les pida el nombre — un
//      bundler con tree-shaking no los emite. Ahora el alcance es POR SÍMBOLO.
//   2. LOS 216 `lazy()` EN UN SOLO SACO. App.jsx declara 216 `lazy(() =>
//      import(…))` y un `switch (currentView)` de 224 `case`. El BFS plano los
//      metía juntos y perdía a qué vista pertenece cada uno. Ahora cada import
//      perezoso se atribuye al `case` donde se usa su binding.
//   3. SOLO DOS CARPETAS. Un gate que mira dos carpetas certifica esas dos
//      carpetas, no el repo. Ahora barre todo `src/`.
//
// El motor es COMPARTIDO con `scripts/audit-componente-huerfano.mjs`
// (`scripts/lib/alcance-simbolica.mjs`). No se porta la lógica: se llama. Dos
// motores midiendo lo mismo se contradicen, y hasta hoy el que se contradecía
// era justo el que bloquea merges.
//
// QUÉ ES HALLAZGO Y QUÉ NO (el gate NO decide solo):
//   · HUERFANO / SOLO_TEST  → hallazgo: nada que un usuario pueda alcanzar lo
//     monta. "Lo importa su test" no es estar cableado: es verde en el tablero y
//     ausente del producto.
//   · SOLO_VITRINA          → NO es hallazgo. Vive en una ruta pública de
//     mockups (`MOCKUP_HASH_ROUTES`) que el producto no enlaza. Es una decisión
//     visible en el router, no un olvido. Lo que vive DENTRO de una vitrina y
//     nadie monta sí sale, por `audit-componente-huerfano.mjs` (control B1).
//   · SOLO_PAGINA_SUELTA    → NO es hallazgo. Lo sirve otra entrada real del
//     build (mercado.html, species-visor.html, rigged-preview.html).
//
// El allowlist sigue siendo `orphan_components` con los mismos ids (ruta
// relativa a la raíz), así que las 83 entradas escritas hasta hoy siguen valiendo
// tal cual. Lo que cambia es que ahora el gate MIDE lo que declara.
const HALLAZGO_A = new Set(['HUERFANO', 'SOLO_TEST']);
const COMPONENT_EXTS = new Set(['.jsx', '.tsx']);

const alcance = analizarAlcance({ root: ROOT, conConsumo: false });
const entryAvailable = alcance.ok;

function auditOrphanComponents() {
  if (!alcance.ok) {
    warn(`no se pudo medir el alcance (${alcance.motivo}) — se salta la auditoría de piezas no montadas.`);
    return [];
  }
  return alcance.resultadosA.map((r) => ({
    id: r.id,
    file: r.file,
    esComp: COMPONENT_EXTS.has(extname(r.file)),
    veredicto: r.veredicto,
    porque: r.porque,
    status: HALLAZGO_A.has(r.veredicto) ? 'orphan' : 'consumed',
  }));
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
console.log(`  piezas de src/ auditadas (alcance por símbolo): ${orphanResults.length}${entryAvailable ? '' : ' (saltado)'}`);
if (alcance.ok) {
  const p = alcance.premisas;
  console.log(`    entradas del build: ${p.entradas.map((e) => e.html).join(', ')}`);
  console.log(`    vistas del router: ${p.vistasSwitch} (${p.vistasProducto.length} producto · ${p.vistasVitrina.length} vitrina) · bindings lazy(): ${p.lazyBindings}`);
}
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

// Reporte de §3. NO un `ok()` por archivo — con ~1.600 módulos en src/ eso solo
// agrega ruido al log de CI: se cuenta por veredicto, y se imprime línea por
// línea lo que NO está limpio. Los hallazgos se separan en COMPONENTES (pieza de
// UI, uno por línea con su porqué) y MÓDULOS DE APOYO (hooks/servicios/datos,
// agrupados por carpeta): son deudas de distinto orden y mezclarlas hace que 168
// módulos de apoyo entierren los 40 componentes.
const orphanFindings = [];
const conteoVeredicto = {};
for (const r of orphanResults) {
  conteoVeredicto[r.veredicto] = (conteoVeredicto[r.veredicto] || 0) + 1;
  if (r.status === 'consumed') continue;
  const allow = allowedOrphanIds.get(r.id);
  if (allow) { skippedAllowlisted.push(r.id); warn(`pieza SIN ruta viva pero allowlisted: ${r.id} — ${allow.reason} (${allow.date})`); continue; }
  orphanFindings.push(r);
  failures.push(`[orphan] ${r.id} — ${r.veredicto}: ${r.porque}`);
}
if (orphanResults.length > 0) {
  ok(`alcance de src/: ${Object.entries(conteoVeredicto).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}

// LA LECCIÓN DEL CHUNK_ALLOWLIST (el que exceptuaba `creatures-` mientras el
// chunk que reventaba se llamaba `trazadoCreature-`): una excepción que ya no le
// hace match a ningún sujeto NO es un no-op silencioso — es una excepción
// protegiendo un fantasma, y se ve. Se REPORTA, no se borra sola ni hace fallar:
// borrarla es curaduría, y esa decisión es del operador, entrada por entrada.
const orphanIdsHallados = new Set(orphanFindings.map((r) => r.id).concat(skippedAllowlisted));
const allowObsoletas = [...allowedOrphanIds.keys()].filter((id) => !orphanIdsHallados.has(id));
if (allowObsoletas.length) {
  warn(`allowlist: ${allowObsoletas.length} entrada(s) de orphan_components ya NO le hacen match a ningún hallazgo`);
  for (const id of allowObsoletas) {
    const r = orphanResults.find((x) => x.id === id);
    warn(`  ${id} — ${r ? `hoy sale ${r.veredicto} (${r.porque})` : 'el archivo ya no existe en src/'}`);
  }
  warn('  Son excepciones protegiendo un fantasma. Revisar una por una y borrarlas (decisión de curaduría, no del gate).');
}

console.log('');
if (failures.length === 0) {
  ok(`Auditoría limpia — ${skippedAllowlisted.length} excepción(es) declarada(s), 0 huérfanos sin declarar.`);
  process.exit(0);
}

console.error(`\x1b[31m✗ ${failures.length} capacidad(es) construida(s) y no conectada(s), sin declarar\x1b[0m`);
for (const f of failures) { if (!f.startsWith('[orphan]')) console.error(`  ${f}`); }

// Los [orphan] van aparte y agrupados: componentes uno por línea (son la
// pregunta del gate: "¿esta pieza de UI la monta alguna ruta?"), módulos de
// apoyo por carpeta (misma deuda, otro orden de magnitud).
if (orphanFindings.length) {
  const comps = orphanFindings.filter((r) => r.esComp).sort((a, b) => a.id.localeCompare(b.id));
  const apoyo = orphanFindings.filter((r) => !r.esComp);
  console.error(`  [orphan] ${orphanFindings.length} pieza(s) de src/ que ninguna ruta viva monta — ${comps.length} componente(s) + ${apoyo.length} módulo(s) de apoyo`);
  for (const r of comps) console.error(`    ⬛ ${r.id} — ${r.veredicto}: ${r.porque}`);
  if (apoyo.length) {
    const porDir = {};
    for (const r of apoyo) {
      const d = r.id.slice(0, r.id.lastIndexOf('/'));
      (porDir[d] = porDir[d] || []).push(r.id.split('/').pop());
    }
    // Agrupados por carpeta pero con la RUTA COMPLETA en cada línea, no el
    // nombre suelto. Un log de CI se lee con grep: `src/hooks/ → useX.js` no le
    // hace match a nadie que busque `src/hooks/useX.js`, y un hallazgo que no se
    // puede buscar es un hallazgo que no se drena. Sin tope: un gate que
    // esconde parte de lo que encontró es otra forma de callarse.
    console.error('    módulos de apoyo (hooks/servicios/datos/geometría), por carpeta:');
    for (const [d, fs] of Object.entries(porDir).sort((a, b) => b[1].length - a[1].length)) {
      console.error(`      ${d}/  (${fs.length})`);
      for (const f of fs.sort()) console.error(`        ${d}/${f}`);
    }
  }
}
console.error('');
console.error('Si esto es una decisión de producto (no un olvido), declarala en');
console.error(`  ${ALLOWLIST_PATH.slice(ROOT.length + 1)}`);
console.error('con { reason, date }. Si no lo es, cableala o borrá el código muerto.');
process.exit(1);

#!/usr/bin/env node
/**
 * audit-componente-huerfano.mjs — ¿qué pieza de UI NO monta ninguna ruta viva?
 * ============================================================================
 * Card: Chagra-strategy/queue/095-control-de-componente-huerfano.md
 *
 * LA PREGUNTA (y lo que NO es)
 * ----------------------------
 * Responde, por componente: **¿lo monta alguna ruta alcanzable por un usuario?**
 * NO responde "¿está importado en algún lado?". En particular:
 *   · que lo importe un test NO cuenta;
 *   · que lo arrastre un barril (`export * from`) NO cuenta;
 *   · que viva en una vitrina pública NO cuenta como producto — se reporta
 *     aparte, porque la vitrina es alcanzable solo si uno sabe el hash.
 *
 * POR QUÉ NO ALCANZA EL AUDITOR QUE YA EXISTE
 * -------------------------------------------
 * `scripts/audit-integraciones.mjs` §3 ya hace un BFS de imports desde
 * `src/App.jsx`, y es el que hoy caza huérfanos en CI. Este control NO lo
 * reemplaza: lo extiende en los tres puntos donde aquel da falso NEGATIVO
 * (dice "cableado" y no lo está), medidos sobre `origin/dev` el 2026-09-03:
 *
 *   1. ALCANCE POR ARCHIVO vs POR SÍMBOLO. `src/visual/creatures/index.js` es
 *      un barril con 72 `export ... from`. Como el barril es alcanzable, aquel
 *      BFS marca "consumido" TODO lo que el barril re-exporta.
 *      `OsoBastonLaminaViva` y `ZariguyaGeminiLaminaViva` salen "cableados"
 *      cuando su único camino es ese barril, y su único importador real
 *      (`src/mockups/VisualLib.jsx`) solo pide `{ Colibri }`. Un bundler con
 *      tree-shaking NO los emite. Acá la alcanzabilidad es por SÍMBOLO: un
 *      `export {X} from './y'` propaga a `y` SOLO si alguien pidió `X`.
 *
 *   2. TODO App.jsx ES "UNA SOLA RUTA". App.jsx declara 216 `lazy(() =>
 *      import(...))` y un `switch (currentView)` de 224 `case`. El BFS plano
 *      mete los 216 en el mismo saco, así que una pieza que solo monta
 *      `case 'mockup_angelita_viva'` queda indistinguible de una que monta el
 *      dashboard. Acá cada `import()` perezoso se ATRIBUYE al `case` en cuyo
 *      bloque se usa su binding, y las vistas se parten en dos clases:
 *        · PRODUCTO — el usuario llega navegando (tiles, menús, `navigate(...)`).
 *        · VITRINA  — solo existe en `MOCKUP_HASH_ROUTES`; se llega tecleando
 *                     el hash. El código las documenta como "vitrinas de
 *                     discovery"/"página pública autocontenida": NO son un
 *                     olvido, y por eso la vitrina EN SÍ no se reporta como
 *                     huérfana — pero lo que solo vive dentro de ella, sí.
 *
 *   3. SOLO MIRA `src/mockups` y `src/visual`. Tres de los seis casos del card
 *      (`CompaiGuiaPantalla`, `useCompaiGuiaPantalla`, `compaiExplicaPantallas`,
 *      `GuiaEspecieCards`) viven en `src/components`, `src/hooks` y
 *      `src/services`: fuera de su radar. Acá se barre todo `src/`.
 *
 * LOS TRES CONTROLES
 * ------------------
 *   A · ALCANCE      — ¿algún export del archivo queda vivo partiendo de una
 *                      entrada real del build? Veredictos: MONTADO ·
 *                      SOLO_VITRINA · SOLO_PAGINA_SUELTA · SOLO_TEST · HUERFANO.
 *   B · CONSUMO      — sobre lo que SÍ está vivo, dos hallazgos duros:
 *                      B1 componente React exportado sin ningún importador
 *                         no-test (el archivo entra al bundle por un helper
 *                         hermano, pero el componente nunca se monta);
 *                      B2 módulo donde el 100% de sus exports no tiene
 *                         importador fuera de su propia carpeta ("librería que
 *                         solo se habla a sí misma").
 *   C · AFORDANCIA   — pieza de UI que el usuario VE y TOCA y que no tiene
 *                      conducta: intents de chip declarados en el manifiesto de
 *                      capacidades sin `case` en `planForcedIntent`. Ambos
 *                      lados se derivan del código, no de una lista escrita a
 *                      mano: renombrar el intent no rompe el control.
 *
 * EL ALLOWLIST Y LA LECCIÓN DEL CHUNK_ALLOWLIST
 * ---------------------------------------------
 * `ops/componentes-huerfanos-allowlist.json` declara lo que es DECISIÓN y no
 * olvido. Cada entrada exige `reason` + `date`. Y — esta es la lección del
 * `CHUNK_ALLOWLIST`, que exceptuaba `creatures-` mientras el chunk que
 * reventaba se llamaba `trazadoCreature-` — **una entrada que no le hace match
 * a ningún sujeto real es un ERROR ruidoso, no un no-op silencioso**: se
 * reporta como `[allowlist-obsoleta]`. Una excepción que dejó de aplicar por un
 * rename se ve; no se queda protegiendo un fantasma.
 * Además, el mecanismo que exime a las vitrinas NO es una lista de nombres: se
 * deriva de `MOCKUP_HASH_ROUTES` en App.jsx. Renombrar `AngelitaViva.jsx` no
 * rompe nada; sacarla del router sí la vuelve a poner en el reporte, que es
 * justo lo que uno quiere.
 * El allowlist heredado de `ops/integraciones-no-consumidas.json`
 * (`orphan_components`, 81 entradas) se LEE para no duplicar 81 razones ya
 * escritas, y se marca como heredado en el reporte.
 *
 * LÍMITES CONOCIDOS (documentados, no escondidos)
 * -----------------------------------------------
 *   · No es un parser AST: regex sobre fuente con comentarios removidos. Un
 *     `import(`${dir}/${x}.jsx`)` con template literal no se ve (mismo hueco
 *     que audit-integraciones documenta).
 *   · No modela flujo DENTRO de un módulo: si un módulo ejecutado importa `X`
 *     y nunca lo usa, `X` cuenta como vivo. Es un sesgo DELIBERADO hacia el
 *     falso negativo: este control prefiere callarse a gritar en falso.
 *   · Consecuencia concreta con REGISTROS: `creatures/index.js` importa 30-y-pico
 *     criaturas y las mete en un objeto `{ 'oso-baston': { Component: … } }`.
 *     Todas quedan MONTADAS porque el bundle SÍ las carga — pero que la entrada
 *     del registro se seleccione alguna vez en runtime, este control no lo sabe
 *     ni lo afirma. Lo que dice es "entra al bundle por esta cadena", y la
 *     cadena va impresa para que se pueda juzgar a ojo. Caso real:
 *     `OsoBastonLaminaViva` sale MONTADO por el registro, mientras que
 *     `ZariguyaGeminiLaminaViva` sale MONTADO porque `ZariguyaCompaiEscena.jsx`
 *     lo renderiza de verdad. No son lo mismo y el reporte deja ver cuál es cuál.
 *   · La navegación se detecta por forma de llamada (`navigate('x')`,
 *     `onNavigate?.('x')`, `view: 'x'`, `href="#x"`, …), no por ejecución. Una
 *     vista a la que se navega armando el id en runtime sale como no
 *     alcanzable; el remedio es una entrada de allowlist con la razón escrita.
 *
 * EL MOTOR VIVE AFUERA (2026-09-03, task 095.b). Secciones 0-5 y 7-9 se
 * movieron a `scripts/lib/alcance-simbolica.mjs` para que el gate de CI
 * `Integraciones no consumidas` (`scripts/audit-integraciones.mjs`) mida con el
 * MISMO motor. Este archivo quedó como lo que siempre debió ser: allowlist +
 * reporte. Dos motores midiendo lo mismo se contradicen — y de hecho se
 * contradecían en 10 archivos.
 *
 * ESTE ARCHIVO NO ES EL GATE. Sale 0 siempre, salvo `--fallar`. El gate
 * bloqueante es `audit-integraciones.mjs`, y bloquea solo por CONTROL A. Aquí
 * viven además B (consumo) y C (afordancia), que son deuda de higiene y se
 * miran a mano.
 *
 * USO
 *   node scripts/audit-componente-huerfano.mjs              # reporte legible
 *   node scripts/audit-componente-huerfano.mjs --todo       # incluye montados
 *   node scripts/audit-componente-huerfano.mjs --json out.json
 *   node scripts/audit-componente-huerfano.mjs --caso <regex>  # foco
 *   node scripts/audit-componente-huerfano.mjs --fallar     # exit 1 si hay hallazgos
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analizarAlcance } from './lib/alcance-simbolica.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');
const ALLOWLIST = join(ROOT, 'ops/componentes-huerfanos-allowlist.json');
const ALLOWLIST_HEREDADO = join(ROOT, 'ops/integraciones-no-consumidas.json');

const args = process.argv.slice(2);
const OPT = {
  todo: args.includes('--todo'),
  exports: args.includes('--exports'),
  fallar: args.includes('--fallar'),
  json: args.includes('--json') ? args[args.indexOf('--json') + 1] : null,
  caso: args.includes('--caso') ? new RegExp(args[args.indexOf('--caso') + 1], 'i') : null,
};

const C = process.stdout.isTTY
  ? { rojo: '\x1b[31m', verde: '\x1b[32m', amar: '\x1b[33m', gris: '\x1b[90m', neg: '\x1b[1m', off: '\x1b[0m' }
  : { rojo: '', verde: '', amar: '', gris: '', neg: '', off: '' };

const rel = (f) => relative(ROOT, f).split(sep).join('/');

// ---------------------------------------------------------------------------
// Motor (compartido con el gate de CI — scripts/lib/alcance-simbolica.mjs)
// ---------------------------------------------------------------------------
const M = analizarAlcance({ root: ROOT, conConsumo: true });
if (!M.ok) {
  console.error(`${C.rojo}✗ no se pudo medir: ${M.motivo}${C.off}`);
  process.exit(2);
}
const {
  ENTRADAS, entradaPWA, CASES, LAZY, PROD, TOTAL, MODULOS,
  vistasVitrinaNoProducto, resultadosA, B1, B2, UMBRAL_B2, C: C_RES,
  resolverConExts,
} = M;
const { montaApp, montaProd } = M.premisas;

// ---------------------------------------------------------------------------
// 6 · Allowlist (propio + heredado) con detección de entradas obsoletas
// ---------------------------------------------------------------------------
function leerJSON(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) {
    console.error(`${C.rojo}✗ allowlist mal formado (${rel(p)}): ${e.message}${C.off}`);
    process.exit(2);
  }
}
const AL = leerJSON(ALLOWLIST) || { componentes: [], exports: [], afordancias: [] };
const ALH = leerJSON(ALLOWLIST_HEREDADO) || {};

const allow = new Map();
const allowUsado = new Set();
for (const sec of ['componentes', 'exports', 'afordancias']) {
  for (const e of AL[sec] || []) {
    const id = e.id || '';
    if (!e.reason || !String(e.reason).trim()) {
      console.error(`${C.rojo}✗ allowlist: "${id}" sin reason — una excepción sin razón es un olvido con papeleo.${C.off}`);
      process.exit(2);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || '')) {
      console.error(`${C.rojo}✗ allowlist: "${id}" sin date válida (YYYY-MM-DD).${C.off}`);
      process.exit(2);
    }
    allow.set(id, { ...e, seccion: sec, heredado: false });
  }
}
for (const e of ALH.orphan_components || []) {
  if (!allow.has(e.id)) allow.set(e.id, { ...e, seccion: 'componentes', heredado: true });
}

function excusa(id) {
  const e = allow.get(id);
  if (e) allowUsado.add(id);
  return e || null;
}

// ---------------------------------------------------------------------------
// 10 · Reporte
// ---------------------------------------------------------------------------
const foco = (id) => !OPT.caso || OPT.caso.test(id);

console.log(`${C.neg}Chagra — control de componente huérfano${C.off}   ${C.gris}(095)${C.off}`);
console.log(`${C.gris}${'─'.repeat(78)}${C.off}`);
console.log('PREMISAS MEDIDAS (no recordadas)');
for (const e of ENTRADAS) console.log(`  entrada de build   ${e.html} → ${rel(e.modulo)}`);
console.log(`  ${rel(entradaPWA.modulo)} monta <App/>: ${montaApp ? 'sí' : 'NO'} · monta ProdChagraApp: ${montaProd ? 'SÍ' : 'no'}`);
const catalogo = resolverConExts(join(SRC, 'config/rutasProdChagraApp.js'));
console.log(`  src/config/rutasProdChagraApp.js en el cierre vivo: ${catalogo && TOTAL.ejecutado.has(catalogo) ? 'SÍ' : 'no → es un catálogo, no el router vivo'}`);
console.log(`  vistas en el switch de App.jsx: ${CASES.porVista.size} · bindings lazy(): ${LAZY.size}`);
console.log(`  vistas PRODUCTO (alcanzables navegando): ${PROD.vistas.size}`);
console.log(`  vistas VITRINA (solo por hash, no enlazadas desde el producto): ${vistasVitrinaNoProducto.length}`);
console.log(`  módulos ejecutados — producto ${PROD.r.ejecutado.size} · producto+vitrina ${TOTAL.ejecutado.size} · total en src/ ${MODULOS.length}`);
console.log('');

const conteo = {};
for (const r of resultadosA) conteo[r.veredicto] = (conteo[r.veredicto] || 0) + 1;
console.log(`${C.neg}CONTROL A · alcance${C.off} — ¿lo monta alguna ruta alcanzable?`);
console.log(`  ${Object.entries(conteo).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log('');

const hallazgos = [];
const declarados = [];

// HALLAZGO = pide una decisión (cablear / borrar / declarar).
// CLASE INFORMATIVA = ya es una decisión tomada y visible en el router:
//   · SOLO_VITRINA — vive en una ruta pública de mockups que el producto no
//     enlaza. El card lo dice explícito: las vitrinas bajo `mockup_*` están
//     deliberadamente no montadas y NO se reportan como huérfanas. Lo que sí es
//     hallazgo es lo que vive dentro de una y nadie monta — eso lo caza B1.
//   · SOLO_PAGINA_SUELTA — lo sirve otra entrada del build (mercado.html,
//     species-visor.html, rigged-preview.html), que es una página real.
const VEREDICTOS_HALLAZGO = ['HUERFANO', 'SOLO_TEST'];
const VEREDICTOS_INFO = ['SOLO_VITRINA', 'SOLO_PAGINA_SUELTA'];

for (const v of VEREDICTOS_HALLAZGO) {
  const lista = resultadosA
    .filter((r) => r.veredicto === v && foco(r.id))
    .sort((a, b) => (b.esComp - a.esComp) || a.id.localeCompare(b.id));
  if (!lista.length) continue;
  const sinExcusa = [];
  for (const r of lista) {
    const e = excusa(r.id);
    if (e) { declarados.push({ ...r, excusa: e }); continue; }
    sinExcusa.push(r);
    hallazgos.push({ control: 'A', ...r });
  }
  const comps = sinExcusa.filter((r) => r.esComp);
  const apoyo = sinExcusa.filter((r) => !r.esComp);
  console.log(`  ${C.amar}${v}${C.off} — ${sinExcusa.length} sin declarar de ${lista.length} (${comps.length} componente(s) + ${apoyo.length} módulo(s) de apoyo)`);
  const tope = OPT.todo ? 1e9 : 25;
  for (const r of comps.slice(0, tope)) {
    console.log(`    ⬛ ${r.id}`);
    console.log(`       ${C.gris}${r.porque}${C.off}`);
  }
  if (comps.length > tope) console.log(`    ${C.gris}… ${comps.length - tope} componente(s) más (--todo | --json)${C.off}`);
  if (apoyo.length) {
    const porDir = {};
    for (const r of apoyo) (porDir[dirname(r.id)] ||= []).push(r.id.split('/').pop());
    console.log(`    ${C.gris}módulos de apoyo (hooks/servicios/datos) por carpeta:${C.off}`);
    for (const [d, fs] of Object.entries(porDir).sort((a, b) => b[1].length - a[1].length).slice(0, OPT.todo ? 1e9 : 10)) {
      console.log(`      ${C.gris}${d}/ → ${fs.join(', ')}${C.off}`);
    }
  }
  console.log('');
}

for (const v of VEREDICTOS_INFO) {
  const lista = resultadosA.filter((r) => r.veredicto === v && foco(r.id));
  const comps = lista.filter((r) => r.esComp);
  console.log(`  ${C.gris}${v} (decisión ya tomada, no es hallazgo)${C.off} — ${lista.length} archivo(s), ${comps.length} componente(s)`);
  if (OPT.todo) {
    for (const r of comps.sort((a, b) => a.id.localeCompare(b.id))) {
      console.log(`    ${C.gris}${r.id} — ${r.porque}${C.off}`);
    }
  }
}
console.log('');

if (OPT.todo) {
  const mont = resultadosA.filter((r) => r.veredicto === 'MONTADO' && r.esComp && foco(r.id));
  console.log(`  ${C.verde}MONTADO${C.off} — ${mont.length} componentes`);
  for (const r of mont.slice(0, 40)) console.log(`    ${r.id}  ${C.gris}${r.porque}${C.off}`);
  if (mont.length > 40) console.log(`    ${C.gris}… ${mont.length - 40} más${C.off}`);
  console.log('');
}

console.log(`${C.neg}CONTROL B · consumo${C.off} — vivo en el bundle pero nadie lo usa`);
const b1 = B1.filter((r) => foco(r.id)).sort((a, b) => a.id.localeCompare(b.id));
const b1Sin = [];
for (const r of b1) {
  const e = excusa(`${r.id}::componentes`);
  if (e) { declarados.push({ id: `${r.id}::componentes`, veredicto: 'B1', excusa: e }); continue; }
  b1Sin.push(r);
  hallazgos.push({ control: 'B1', ...r });
}
console.log(`  B1 · componente React exportado sin ningún importador no-test: ${b1Sin.length}`);
for (const r of b1Sin) {
  console.log(`    ⬛ ${r.id} → ${C.amar}${r.muertos.join(', ')}${C.off}${r.vivos.length ? `  ${C.gris}(vivos: ${r.vivos.join(', ')})${C.off}` : ''}`);
}
console.log('');

const b2 = B2.filter((r) => foco(r.id) && (r.fuerte || OPT.exports)).sort((a, b) => a.id.localeCompare(b.id));
const b2Sin = [];
for (const r of b2) {
  const e = excusa(`${r.id}::modulo`);
  if (e) { declarados.push({ id: `${r.id}::modulo`, veredicto: 'B2', excusa: e }); continue; }
  b2Sin.push(r);
  hallazgos.push({ control: 'B2', ...r });
}
const b2Debiles = B2.filter((r) => !r.fuerte).length;
const totalSostenido = B2.reduce((a, r) => a + r.sostenidoTest.length, 0);
console.log(`  B2 · superficie muerta (exports que nadie importa por nombre; un barril que los re-exporta NO cuenta): ${b2Sin.length} módulo(s)`);
console.log(`     ${C.gris}umbral: ≥${UMBRAL_B2} exports sin NINGÚN consumidor (ni test), o el 100% de la superficie.`);
console.log(`     ${b2Debiles} módulo(s) por debajo del umbral y ${totalSostenido} export(s) "sostenidos solo por su test" salen con --exports.${C.off}`);
const porCarpeta = {};
for (const r of b2Sin) (porCarpeta[r.carpeta] ||= []).push(r);
const carpetasOrd = Object.entries(porCarpeta).sort((a, b) => b[1].length - a[1].length);
for (const [carpeta, lista] of carpetasOrd.slice(0, OPT.todo || OPT.exports ? 1e9 : 12)) {
  console.log(`    ${carpeta}/  ${C.gris}(${lista.length} módulo(s))${C.off}`);
  for (const r of (OPT.todo || OPT.exports ? lista : lista.slice(0, 6))) {
    const mues = r.muertos.slice(0, 5).join(', ') + (r.muertos.length > 5 ? `, +${r.muertos.length - 5}` : '');
    const sost = r.sostenidoTest.length ? ` ${C.gris}· ${r.sostenidoTest.length} sostenido(s) solo por su test${C.off}` : '';
    console.log(`      ${r.id}  ${C.amar}${r.muertos.length}/${r.total}${C.off} ${C.gris}sin consumidor: ${mues}${r.todoMuerto ? ' — superficie 100% muerta' : ''}${C.off}${sost}`);
  }
  if (!OPT.todo && !OPT.exports && lista.length > 6) console.log(`      ${C.gris}… ${lista.length - 6} más en esta carpeta${C.off}`);
}
if (!OPT.todo && !OPT.exports && carpetasOrd.length > 12) {
  console.log(`    ${C.gris}… ${carpetasOrd.length - 12} carpeta(s) más (--exports | --json)${C.off}`);
}
console.log('');

console.log(`${C.neg}CONTROL C · afordancia${C.off} — pintada en la UI y sin conducta`);
if (!C_RES.ok) {
  console.log(`  ${C.gris}saltado: ${C_RES.motivo}${C.off}`);
} else {
  console.log(`  intents declarados ${C_RES.declarados} · con routing determinístico ${C_RES.manejados}`);
  const inertesSin = [];
  for (const i of C_RES.inertes) {
    const e = excusa(`chip:${i}`);
    if (e) { declarados.push({ id: `chip:${i}`, veredicto: 'C', excusa: e }); continue; }
    inertesSin.push(i);
    hallazgos.push({ control: 'C', id: `chip:${i}`, porque: 'intent declarado sin case en planForcedIntent — el chip se pinta y el turno cae al NLU en silencio' });
  }
  console.log(`  ${C.amar}INERTE${C.off} — ${inertesSin.length}: ${inertesSin.join(', ') || '(ninguno)'}`);
}
console.log('');

// Allowlist: entradas declaradas y — la lección del CHUNK_ALLOWLIST — obsoletas
const obsoletas = [...allow.entries()].filter(([id]) => !allowUsado.has(id));
console.log(`${C.neg}ALLOWLIST${C.off}  ${allow.size} entrada(s) · ${allowUsado.size} en uso · ${obsoletas.length} sin sujeto`);
if (obsoletas.length) {
  console.log(`  ${C.rojo}[allowlist-obsoleta]${C.off} entradas que ya no le hacen match a ningún sujeto: o el archivo se`);
  console.log(`  ${C.gris}borró, o lo renombraron, o la pieza SÍ se cableó y la excepción quedó protegiendo un`);
  console.log(`  fantasma. Ese es el error del CHUNK_ALLOWLIST: la excepción por nombre literal se cae`);
  console.log(`  con cada rename y nadie se entera. Revisar una por una y borrarlas del allowlist.${C.off}`);
  for (const [id, e] of obsoletas.slice(0, OPT.todo ? 999 : 12)) {
    console.log(`    ${id}${e.heredado ? ` ${C.gris}(heredada de integraciones-no-consumidas.json)${C.off}` : ''}`);
  }
  if (!OPT.todo && obsoletas.length > 12) console.log(`    ${C.gris}… ${obsoletas.length - 12} más (--todo para verlas)${C.off}`);
}
console.log('');

// Dos tallies, a propósito. MONTAJE responde la pregunta del card ("¿lo monta
// alguna ruta?"). SUPERFICIE es la deuda de exports de más: real, pero de otro
// orden — mezclarlas hace que 220 exports muertos entierren los 2 chips inertes.
const montaje = hallazgos.filter((h) => h.control !== 'B2');
const superficie = hallazgos.filter((h) => h.control === 'B2');

console.log(`${C.gris}${'─'.repeat(78)}${C.off}`);
console.log(`${C.neg}RESUMEN${C.off}`);
console.log(`  MONTAJE     ${montaje.length} sin declarar   ${C.gris}(A: no lo alcanza ninguna ruta · B1: componente que nadie monta · C: afordancia inerte)${C.off}`);
console.log(`  SUPERFICIE  ${superficie.length} sin declarar   ${C.gris}(B2: exports vivos que nadie importa)${C.off}`);
console.log(`  DECLARADOS  ${declarados.length} en allowlist${obsoletas.length ? ` · ${C.rojo}${obsoletas.length} entrada(s) de allowlist sin sujeto${C.off}` : ''}`);
console.log('');
console.log(`${C.gris}PARA CABLEARLO A CI (decisión del operador, no de este script):`);
console.log(`  1. Drenar o declarar los ${montaje.length} de MONTAJE. Hoy incluyen los 6 casos del card, así que`);
console.log(`     cablearlo bloqueante de una deja el repo trabado — que es justo lo que el card prohíbe.`);
console.log(`  2. Correrlo con --fallar en un job APARTE y no bloqueante un par de semanas, para medir su`);
console.log(`     tasa de falso positivo contra renames, rutas nuevas y navegación armada en runtime.`);
console.log(`  3. Recién ahí volverlo bloqueante, y solo sobre MONTAJE. SUPERFICIE (B2) conviene dejarla`);
console.log(`     informativa: es deuda de higiene, no de producto roto.`);
console.log(`  El allowlist obsoleto (entradas sin sujeto) sí puede ser gate desde ya: es barato y no`);
console.log(`  depende de drenar nada.${C.off}`);

if (OPT.json) {
  const salida = {
    generado: new Date().toISOString(),
    premisas: {
      entradas: ENTRADAS.map((e) => ({ html: e.html, modulo: rel(e.modulo) })),
      montaApp, montaProd,
      vistasSwitch: CASES.porVista.size,
      lazyBindings: LAZY.size,
      vistasProducto: [...PROD.vistas].sort(),
      vistasVitrina: vistasVitrinaNoProducto,
      modulosProducto: PROD.r.ejecutado.size,
      modulosTotal: TOTAL.ejecutado.size,
    },
    controlA: resultadosA,
    controlB1: B1,
    controlB2: B2,
    controlC: C_RES,
    hallazgos,
    resumen: { montaje: montaje.length, superficie: superficie.length, declarados: declarados.length },
    allowlistObsoletas: obsoletas.map(([id, e]) => ({ id, heredado: !!e.heredado })),
  };
  writeFileSync(OPT.json, JSON.stringify(salida, null, 2) + '\n', 'utf8');
  console.log(`${C.gris}JSON → ${OPT.json}${C.off}`);
}

// `--fallar` falla por MONTAJE, no por SUPERFICIE: la pregunta del card es
// "¿lo monta una ruta?", y B2 es higiene de exports.
process.exit(OPT.fallar && montaje.length ? 1 : 0);

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
 * NO ES UN GATE DE CI. Sale 0 siempre, salvo `--fallar`. Con seis casos vivos
 * en dev, cablearlo bloqueante deja el repo trabado: esa decisión es del
 * operador (ver §"Para cablearlo" en el reporte final).
 *
 * USO
 *   node scripts/audit-componente-huerfano.mjs              # reporte legible
 *   node scripts/audit-componente-huerfano.mjs --todo       # incluye montados
 *   node scripts/audit-componente-huerfano.mjs --json out.json
 *   node scripts/audit-componente-huerfano.mjs --caso <regex>  # foco
 *   node scripts/audit-componente-huerfano.mjs --fallar     # exit 1 si hay hallazgos
 */

import { readFileSync, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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
// 0 · Utilidades de archivo y de fuente
// ---------------------------------------------------------------------------
const EXTS_RESOLVE = ['.jsx', '.js', '.mjs', '.ts', '.tsx', '.css', '.json', '.svg', '.png'];
const EXTS_MODULO = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const EXTS_COMPONENTE = new Set(['.jsx', '.tsx']);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const esTest = (f) =>
  f.includes('__tests__') ||
  f.includes('/test-utils/') ||
  /\.(test|spec|stories)\.[jt]sx?$/.test(f);

function resolverConExts(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const e of EXTS_RESOLVE) if (existsSync(base + e)) return base + e;
  for (const e of EXTS_RESOLVE) {
    const i = join(base, 'index' + e);
    if (existsSync(i)) return i;
  }
  return null;
}

/** Alias del proyecto: `@/*` → `src/*` (jsconfig.json). */
function resolverSpec(desde, spec) {
  if (spec.startsWith('@/')) return resolverConExts(join(SRC, spec.slice(2)));
  if (spec.startsWith('.')) return resolverConExts(resolve(dirname(desde), spec));
  return null; // node_modules: fuera de alcance
}

/**
 * Quita comentarios con un escáner de estado (código · // · comentario de
 * bloque · '…' · "…" · `…` · literal de regex). Sin esto, un `#/mockups/...`
 * citado en un comentario cuenta como navegación real.
 *
 * POR QUÉ ESCÁNER Y NO DOS REGEX. La versión regex (primero `/\*…\*\/`, después
 * `//…`) daba un falso NEGATIVO grave y silencioso: la línea
 *   `// ── Galería de mockups aspiracionales (#/mockups/*) ──`
 * tiene un `/*` DENTRO de un comentario de línea, así que el barrido de bloques
 * abría ahí un comentario falso que se cerraba 5.155 caracteres después y se
 * tragaba 10 `case` de App.jsx — entre ellos `mockup_mundo3d_agua`. Resultado:
 * cuatro mundos 3D salían HUERFANOS teniendo ruta viva. El medidor mintiendo
 * antes que el sujeto; se cazó porque el reporte decía "solo lo importan
 * archivos igual de inalcanzables: src/App.jsx", y App.jsx sí está vivo.
 */
function sinComentarios(src) {
  const out = [];
  const ANTES_REGEX = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '~', '^', '<', '>', 'n']);
  let i = 0;
  let ultimoSignificativo = '';
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out.push(' ');
      continue;
    }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      out.push(' ');
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const cierre = c;
      out.push(c); i++;
      while (i < src.length) {
        if (src[i] === '\\') { out.push(src[i], src[i + 1] ?? ''); i += 2; continue; }
        out.push(src[i]);
        if (src[i] === cierre) { i++; break; }
        i++;
      }
      ultimoSignificativo = cierre;
      continue;
    }
    if (c === '/' && ANTES_REGEX.has(ultimoSignificativo)) {
      // literal de regex: se copia entero para que un `/['"]/` no desbalancee
      // el estado de comillas del escáner.
      let j = i + 1;
      let enClase = false;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') enClase = true;
        else if (src[j] === ']') enClase = false;
        else if (src[j] === '/' && !enClase) break;
        else if (src[j] === '\n') { j = -1; break; }
        j++;
      }
      if (j > 0) { out.push(src.slice(i, j + 1)); i = j + 1; ultimoSignificativo = '/'; continue; }
    }
    out.push(c);
    if (!/\s/.test(c)) ultimoSignificativo = c;
    i++;
  }
  return out.join('');
}

const cacheFuente = new Map();
function fuente(f) {
  if (!cacheFuente.has(f)) {
    let t = '';
    try { t = sinComentarios(readFileSync(f, 'utf8')); } catch { t = ''; }
    cacheFuente.set(f, t);
  }
  return cacheFuente.get(f);
}

// ---------------------------------------------------------------------------
// 1 · Análisis de módulo: imports, re-exports, exports locales
// ---------------------------------------------------------------------------
// La cláusula NO puede contener `;` ni comillas. Sin esa restricción, un
// `import './config/env';` en la línea 1 arrancaba el match y lo cerraba con el
// `from 'react'` de la línea 2: se tragaba el estatuto siguiente y `main.jsx`
// quedaba sin registrar que importa `App`. Síntoma: el control B1 reportaba
// `src/App.jsx → App` como componente que nadie importa. Cuando el instrumento
// acusa al entry point, el sospechoso es el instrumento.
const RE_IMPORT_FROM = /\bimport\s+(?!\()([^;'"]{0,400}?)\s+from\s*['"]([^'"]+)['"]/g;
const RE_IMPORT_BARE = /\bimport\s*['"]([^'"]+)['"]/g;
const RE_IMPORT_DIN = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const RE_EXPORT_STAR = /\bexport\s*\*\s*(?:as\s+([A-Za-z_$][\w$]*)\s*)?from\s*['"]([^'"]+)['"]/g;
const RE_EXPORT_FROM = /\bexport\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
const RE_EXPORT_DECL = /\bexport\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
const RE_EXPORT_LOCAL = /\bexport\s*\{([^}]*)\}\s*(?!\s*from)/g;
const RE_EXPORT_DEFAULT = /\bexport\s+default\b/;

const esIdent = (s) => /^[A-Za-z_$][\w$]*$/.test(s);

/** `Default, { a, b as c }` / `* as ns` / `{ a }` / `Default` */
function parseClausulaImport(cl) {
  const out = { nombres: [], ns: false, def: false };
  const c = cl.trim();
  if (!c) return out;
  if (/^\*\s+as\s+/.test(c)) { out.ns = true; return out; }
  const llave = c.match(/\{([\s\S]*)\}/);
  if (llave) {
    for (let p of llave[1].split(',')) {
      p = p.trim();
      if (!p) continue;
      const orig = p.split(/\s+as\s+/)[0].trim();
      if (esIdent(orig)) out.nombres.push(orig);
      else if (orig === 'default') out.nombres.push('default');
    }
  }
  const antes = c.split('{')[0].replace(/,\s*$/, '').trim();
  if (antes && !antes.startsWith('*') && esIdent(antes)) out.def = true;
  if (/^\*\s*,/.test(c) || /,\s*\*\s+as\s+/.test(c)) out.ns = true;
  return out;
}

const cacheModulo = new Map();
function analizar(file) {
  if (cacheModulo.has(file)) return cacheModulo.get(file);
  const src = fuente(file);
  const m = {
    file,
    imports: [],     // {target, nombres[], ns, def}
    sideEffect: [],  // target
    dinamicos: [],   // target
    reexports: [],   // {target, pares:[{expuesto, origen}]}
    reexportStar: [],// target
    exportsLocales: new Set(),
    tieneDefault: false,
  };
  let x;

  const spansFrom = [];
  RE_EXPORT_FROM.lastIndex = 0;
  while ((x = RE_EXPORT_FROM.exec(src)) !== null) {
    spansFrom.push([x.index, x.index + x[0].length]);
    const t = resolverSpec(file, x[2]);
    const pares = [];
    for (let p of x[1].split(',')) {
      p = p.trim();
      if (!p) continue;
      const [o, a] = p.split(/\s+as\s+/).map((s) => s.trim());
      pares.push({ origen: o, expuesto: a || o });
    }
    if (t) m.reexports.push({ target: t, pares });
    for (const par of pares) m.exportsLocales.add(par.expuesto);
    if (pares.some((p) => p.expuesto === 'default')) m.tieneDefault = true;
  }

  RE_EXPORT_STAR.lastIndex = 0;
  while ((x = RE_EXPORT_STAR.exec(src)) !== null) {
    const t = resolverSpec(file, x[2]);
    if (!t) continue;
    if (x[1]) m.reexports.push({ target: t, pares: [{ origen: '*', expuesto: x[1] }] });
    else m.reexportStar.push(t);
  }

  RE_IMPORT_FROM.lastIndex = 0;
  while ((x = RE_IMPORT_FROM.exec(src)) !== null) {
    const t = resolverSpec(file, x[2]);
    if (!t) continue;
    const c = parseClausulaImport(x[1]);
    m.imports.push({ target: t, nombres: c.nombres, ns: c.ns, def: c.def });
  }

  RE_IMPORT_BARE.lastIndex = 0;
  while ((x = RE_IMPORT_BARE.exec(src)) !== null) {
    const t = resolverSpec(file, x[1]);
    if (t) m.sideEffect.push(t);
  }

  RE_IMPORT_DIN.lastIndex = 0;
  while ((x = RE_IMPORT_DIN.exec(src)) !== null) {
    const t = resolverSpec(file, x[1]);
    if (t) m.dinamicos.push(t);
  }

  RE_EXPORT_DECL.lastIndex = 0;
  while ((x = RE_EXPORT_DECL.exec(src)) !== null) m.exportsLocales.add(x[1]);

  RE_EXPORT_LOCAL.lastIndex = 0;
  while ((x = RE_EXPORT_LOCAL.exec(src)) !== null) {
    if (spansFrom.some(([a, b]) => x.index >= a && x.index < b)) continue;
    for (let p of x[1].split(',')) {
      p = p.trim();
      if (!p) continue;
      const [o, a] = p.split(/\s+as\s+/).map((s) => s.trim());
      const exp = a || o;
      if (exp === 'default') { m.tieneDefault = true; continue; }
      if (esIdent(exp)) m.exportsLocales.add(exp);
    }
  }

  if (RE_EXPORT_DEFAULT.test(src)) m.tieneDefault = true;

  cacheModulo.set(file, m);
  return m;
}

/** ¿Es nombre de componente React? PascalCase de verdad: `AngelitaSalida` sí,
 *  `SEND_TRANSITION_MS` / `SPECIES` no (constantes, no piezas de UI — meterlas
 *  infla el reporte con ruido que no es el sujeto del card). */
const esNombreComponente = (n) => /^[A-Z][A-Za-z0-9]*$/.test(n) && !/^[A-Z0-9_]+$/.test(n);

/**
 * Exports "de componente" de un .jsx/.tsx, con una colapsada deliberada:
 * el patrón `export function Foo(){}` + `export default Foo` declara UNA sola
 * pieza por dos puertas. Si una de las dos tiene consumidor, la pieza está
 * montada. Contarlas por separado hacía que 30 archivos sanos salieran como
 * "componente muerto" solo porque todo el mundo los importa por default.
 */
function componentesDe(file) {
  const m = analizar(file);
  const out = new Map(); // identidad → Set<export que la representa>
  if (!EXTS_COMPONENTE.has(extname(file))) return out;
  const base = file.split('/').pop().replace(/\.[jt]sx$/, '');
  const ident = (n) => (n === 'default' || n === base ? base : n);
  for (const n of m.exportsLocales) {
    if (!esNombreComponente(n)) continue;
    const k = ident(n);
    if (!out.has(k)) out.set(k, new Set());
    out.get(k).add(n);
  }
  if (m.tieneDefault) {
    const k = base;
    if (!out.has(k)) out.set(k, new Set());
    out.get(k).add('default');
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2 · Entradas reales del build (derivadas de vite.config.js, no a mano)
// ---------------------------------------------------------------------------
function entradasDelBuild() {
  const vite = fuente(join(ROOT, 'vite.config.js'));
  const bloque = vite.match(/input\s*:\s*\{([\s\S]*?)\}/);
  const htmls = new Set();
  if (bloque) {
    const re = /['"]([^'"]+\.html)['"]/g;
    let x;
    while ((x = re.exec(bloque[1])) !== null) htmls.add(x[1]);
  }
  if (!htmls.size) htmls.add('index.html');
  const out = [];
  for (const h of htmls) {
    const p = join(ROOT, h);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    const re = /<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/g;
    let x;
    while ((x = re.exec(raw)) !== null) {
      const mod = resolverConExts(join(ROOT, x[1].replace(/^\//, '')));
      if (mod) out.push({ html: h, modulo: mod });
    }
  }
  return out;
}

const ENTRADAS = entradasDelBuild();
const entradaPWA = ENTRADAS.find((e) => e.html === 'index.html');
const otrasEntradas = ENTRADAS.filter((e) => e !== entradaPWA);

// ---------------------------------------------------------------------------
// 3 · Router de App.jsx: vistas, bindings perezosos, bloques de `case`
// ---------------------------------------------------------------------------
const APP = join(SRC, 'App.jsx');

function objetoLiteral(src, nombre) {
  const i = src.indexOf(`const ${nombre}`);
  if (i < 0) return {};
  const abre = src.indexOf('{', i);
  const cierra = src.indexOf('\n};', abre);
  const cuerpo = src.slice(abre, cierra < 0 ? src.length : cierra);
  const out = {};
  const re = /['"]?([\w/-]+)['"]?\s*:\s*['"]([\w-]+)['"]/g;
  let x;
  while ((x = re.exec(cuerpo)) !== null) out[x[1]] = x[2];
  return { mapa: out, desde: abre + i - i, hasta: cierra < 0 ? src.length : cierra };
}

const appSrc = fuente(APP);
const mockRoutes = objetoLiteral(appSrc, 'MOCKUP_HASH_ROUTES');
const hashRoutes = objetoLiteral(appSrc, 'HASH_VIEW_ROUTES');
const vistasVitrinaCandidatas = new Set(Object.values(mockRoutes.mapa || {}));
const vistasProductoSemilla = new Set(Object.values(hashRoutes.mapa || {}));
for (const v of ['dashboard', 'login', 'oauth-callback', 'onboarding-piloto']) vistasProductoSemilla.add(v);

/** `const X = lazy(() => import('./y'))` → X → archivo resuelto. */
function bindingsPerezosos() {
  const out = new Map();
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*lazy\s*\(([\s\S]{0,500}?)\)\s*;/g;
  let x;
  while ((x = re.exec(appSrc)) !== null) {
    const dentro = x[2].match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (!dentro) continue;
    const t = resolverSpec(APP, dentro[1]);
    if (t) out.set(x[1], t);
  }
  return out;
}
const LAZY = bindingsPerezosos();

/** Parte el `switch (currentView)` en bloques por etiqueta de `case`. */
function bloquesDeCase() {
  const iSwitch = appSrc.indexOf('switch (currentView)');
  if (iSwitch < 0) return { porVista: new Map(), fueraDelSwitch: appSrc };
  const cuerpo = appSrc.slice(iSwitch);
  const partes = cuerpo.split(/\n\s*case\s+/);
  const porVista = new Map();
  let pendientes = [];
  for (let i = 1; i < partes.length; i++) {
    const p = partes[i];
    const et = p.match(/^['"]([\w-]+)['"]\s*:/);
    const resto = p.slice(p.indexOf(':') + 1);
    if (!et) { continue; }
    pendientes.push(et[1]);
    // fallthrough: `case 'a': case 'b': return ...` → el bloque de 'a' viene vacío
    if (resto.trim().length > 2) {
      for (const v of pendientes) porVista.set(v, (porVista.get(v) || '') + resto);
      pendientes = [];
    }
  }
  return { porVista, fueraDelSwitch: appSrc.slice(0, iSwitch) };
}
const CASES = bloquesDeCase();

/** Bindings perezosos USADOS en un texto: solo uso como elemento JSX (`<X`) o
 *  como valor pasado a otro componente (`Componente={X}`). Ojo con el falso
 *  positivo obvio: la propia línea `const X = lazy(...)` menciona X, y contarla
 *  como uso hacía que TODO binding saliera incondicional y el reporte de
 *  vitrinas diera cero (medido: producto y producto+vitrina daban el mismo
 *  número de módulos, que es la firma de un control ciego). Por eso el texto se
 *  limpia de declaraciones antes de buscar. */
function sinDeclaracionesLazy(texto) {
  return texto.replace(/(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*lazy\s*\([\s\S]{0,500}?\)\s*;/g, ' ');
}
function bindingsUsadosEn(texto) {
  const limpio = sinDeclaracionesLazy(texto);
  const out = new Set();
  for (const [nombre] of LAZY) {
    const re = new RegExp(`<${nombre}[\\s/>]|=\\s*\\{\\s*${nombre}\\s*\\}`);
    if (re.test(limpio)) out.add(nombre);
  }
  return out;
}
const LAZY_INCONDICIONAL = bindingsUsadosEn(CASES.fueraDelSwitch);

/** Formas de navegación: llamada o campo de tabla de tiles. Estructural, no
 *  "el string aparece" — si no, el propio catálogo de rutas marca todo vivo. */
function vistasNavegadasEn(texto) {
  const out = new Set();
  const patrones = [
    /\b(?:navigate|onNavigate|setView|setCurrentView|goTo|navigateTo|irA|abrirVista|onOpen|onSelect)\s*(?:\?\.)?\(\s*['"]([\w-]+)['"]/g,
    /\b(?:view|vista|ruta|target|destino)\s*:\s*['"]([\w-]+)['"]/g,
    /(?:href|hash)\s*=\s*['"]#\/?([\w/-]+)['"]/g,
    /location\.hash\s*=\s*['"]#\/?([\w/-]+)['"]/g,
  ];
  for (const re of patrones) {
    re.lastIndex = 0;
    let x;
    while ((x = re.exec(texto)) !== null) out.add(x[1]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4 · Alcanzabilidad POR SÍMBOLO
// ---------------------------------------------------------------------------
const clave = (f, n) => `${f} ${n}`;

/** Vistas que el punto fijo YA probó alcanzables navegando. La usa el
 *  etiquetador para no llamar "vitrina" a una ruta de mockup que el producto
 *  sí enlaza (se llena en `alcanceProducto`). */
let vistasProductoConocidas = new Set(vistasProductoSemilla);

/**
 * @param {Array<{file:string, nombres?:string[], todo?:boolean, etiqueta:string}>} semillas
 * @param {Set<string>|null} vistasPermitidas  vistas cuyos lazy() se siguen (null = todas)
 */
function alcanzar(semillas, vistasPermitidas) {
  const ejecutado = new Map(); // file → etiqueta
  const vivos = new Map();     // file → Set<nombre>
  const origen = new Map();    // clave → {desde, etiqueta}
  const cola = [];

  const marcarVivo = (f, n, etiqueta, desde) => {
    if (!vivos.has(f)) vivos.set(f, new Set());
    const s = vivos.get(f);
    if (s.has(n)) return;
    s.add(n);
    origen.set(clave(f, n), { desde, etiqueta });
    cola.push({ t: 'sim', f, n, etiqueta });
  };
  const marcarEjec = (f, etiqueta, desde) => {
    if (ejecutado.has(f)) return;
    ejecutado.set(f, etiqueta);
    if (!origen.has(clave(f, '@exec'))) origen.set(clave(f, '@exec'), { desde, etiqueta });
    cola.push({ t: 'exec', f, etiqueta });
  };

  for (const s of semillas) {
    marcarEjec(s.file, s.etiqueta, null);
    if (s.todo) marcarVivo(s.file, '*', s.etiqueta, null);
    for (const n of s.nombres || []) marcarVivo(s.file, n, s.etiqueta, null);
  }

  while (cola.length) {
    const it = cola.shift();
    if (it.t === 'exec') {
      const m = analizar(it.f);
      const esApp = it.f === APP;
      for (const imp of m.imports) {
        marcarEjec(imp.target, it.etiqueta, it.f);
        if (imp.ns) marcarVivo(imp.target, '*', it.etiqueta, it.f);
        if (imp.def) marcarVivo(imp.target, 'default', it.etiqueta, it.f);
        for (const n of imp.nombres) marcarVivo(imp.target, n, it.etiqueta, it.f);
      }
      for (const t of m.sideEffect) marcarEjec(t, it.etiqueta, it.f);
      if (esApp) {
        // Los import() de App.jsx NO se siguen en bloque: cada uno pertenece a
        // la vista en cuyo `case` se usa su binding. Ese es el corazón de la
        // distinción producto/vitrina.
        for (const [nombre, target] of LAZY) {
          let et = null;
          if (LAZY_INCONDICIONAL.has(nombre)) et = it.etiqueta;
          else {
            for (const [vista, texto] of CASES.porVista) {
              if (vistasPermitidas && !vistasPermitidas.has(vista)) continue;
              if (bindingsUsadosEn(texto).has(nombre)) {
                // Una ruta de MOCKUP_HASH_ROUTES a la que el producto SÍ navega
                // (`onNavigate('mockup_vitrina_maestra')` en MundosDeMiFinca,
                // `onNavigate('mockup_mundo3d_clima')` en ClimaBoletinScreen)
                // dejó de ser vitrina: es una vista del producto con nombre de
                // mockup. Etiquetarla "vitrina" por el nombre sería el error del
                // CHUNK_ALLOWLIST otra vez.
                const esVitrina = vistasVitrinaCandidatas.has(vista) && !vistasProductoConocidas.has(vista);
                et = esVitrina ? `vitrina #/${vista}` : `vista ${vista}`;
                break;
              }
            }
          }
          if (!et) continue;
          marcarEjec(target, et, it.f);
          marcarVivo(target, '*', et, it.f);
        }
        // import() no perezosos de App.jsx: incondicionales.
        const perezosos = new Set([...LAZY.values()]);
        for (const t of m.dinamicos) {
          if (perezosos.has(t)) continue;
          marcarEjec(t, it.etiqueta, it.f);
          marcarVivo(t, '*', it.etiqueta, it.f);
        }
      } else {
        for (const t of m.dinamicos) {
          marcarEjec(t, it.etiqueta, it.f);
          marcarVivo(t, '*', it.etiqueta, it.f); // conservador: no sabemos qué nombre se usa
        }
      }
      continue;
    }

    // símbolo vivo → propagar SOLO por re-exports (el barril no lava)
    const m = analizar(it.f);
    marcarEjec(it.f, it.etiqueta, null);
    if (it.n === '*') {
      for (const rx of m.reexports) for (const p of rx.pares) marcarVivo(rx.target, p.origen === '*' ? '*' : p.origen, it.etiqueta, it.f);
      for (const t of m.reexportStar) marcarVivo(t, '*', it.etiqueta, it.f);
      continue;
    }
    let resuelto = false;
    for (const rx of m.reexports) {
      for (const p of rx.pares) {
        if (p.expuesto !== it.n) continue;
        marcarVivo(rx.target, p.origen === '*' ? '*' : p.origen, it.etiqueta, it.f);
        resuelto = true;
      }
    }
    if (!resuelto && !m.exportsLocales.has(it.n) && !(it.n === 'default' && m.tieneDefault)) {
      for (const t of m.reexportStar) marcarVivo(t, it.n, it.etiqueta, it.f);
    }
  }

  return { ejecutado, vivos, origen };
}

/** Semillas de la PWA + punto fijo sobre las vistas que el producto navega. */
function alcanceProducto() {
  let vistas = new Set(vistasProductoSemilla);
  for (const v of vistasNavegadasEn(CASES.fueraDelSwitch)) if (CASES.porVista.has(v)) vistas.add(v);
  let r = null;
  for (let paso = 0; paso < 12; paso++) {
    vistasProductoConocidas = vistas;
    r = alcanzar([{ file: entradaPWA.modulo, todo: true, etiqueta: 'producto' }], vistas);
    const antes = vistas.size;
    for (const f of r.ejecutado.keys()) {
      if (f === APP) continue;
      if (!EXTS_MODULO.has(extname(f))) continue;
      for (const v of vistasNavegadasEn(fuente(f))) if (CASES.porVista.has(v)) vistas.add(v);
    }
    if (vistas.size === antes) break;
  }
  return { r, vistas };
}

const PROD = alcanceProducto();
const TOTAL = alcanzar([{ file: entradaPWA.modulo, todo: true, etiqueta: 'producto' }], null);
const PAGINAS = otrasEntradas.map((e) => ({
  html: e.html,
  r: alcanzar([{ file: e.modulo, todo: true, etiqueta: `página ${e.html}` }], null),
}));

const vistasVitrinaNoProducto = [...vistasVitrinaCandidatas].filter((v) => !PROD.vistas.has(v)).sort();

// ---------------------------------------------------------------------------
// 5 · Grafo de importadores (para SOLO_TEST y para el control B)
// ---------------------------------------------------------------------------
const TODOS = walk(SRC).filter((f) => EXTS_MODULO.has(extname(f)));
const MODULOS = TODOS.filter((f) => !esTest(f));
const TESTS = TODOS.filter((f) => esTest(f));

/** target → Set<{file, nombres, ns, def, reexport}> */
const importadores = new Map();
function registrarImportadores(lista) {
  for (const f of lista) {
    const m = analizar(f);
    const push = (t, d) => {
      if (!importadores.has(t)) importadores.set(t, []);
      importadores.get(t).push({ file: f, ...d });
    };
    for (const i of m.imports) push(i.target, { nombres: i.nombres, ns: i.ns, def: i.def, reexport: false });
    for (const t of m.sideEffect) push(t, { nombres: [], ns: false, def: false, reexport: false });
    for (const t of m.dinamicos) push(t, { nombres: [], ns: true, def: true, reexport: false });
    for (const rx of m.reexports) push(rx.target, { nombres: rx.pares.map((p) => p.origen), ns: false, def: false, reexport: true });
    for (const t of m.reexportStar) push(t, { nombres: [], ns: true, def: false, reexport: true });
  }
}
registrarImportadores(TODOS);

const importadoresNoTest = (f) => (importadores.get(f) || []).filter((i) => !esTest(i.file));
const importadoresReales = (f) => importadoresNoTest(f).filter((i) => !i.reexport);

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
// 7 · CONTROL A — alcance por archivo
// ---------------------------------------------------------------------------
function cadena(r, f) {
  const pasos = [];
  let cur = clave(f, '@exec');
  let o = r.origen.get(cur);
  let guard = 0;
  while (o && o.desde && guard++ < 8) {
    pasos.push(rel(o.desde));
    o = r.origen.get(clave(o.desde, '@exec'));
  }
  return pasos;
}

const resultadosA = [];
for (const f of MODULOS) {
  const esComp = EXTS_COMPONENTE.has(extname(f));
  const id = rel(f);
  let veredicto, porque;
  if (PROD.r.ejecutado.has(f)) {
    veredicto = 'MONTADO';
    porque = `${PROD.r.ejecutado.get(f)} ← ${cadena(PROD.r, f).slice(0, 3).join(' ← ') || 'entrada'}`;
  } else if (TOTAL.ejecutado.has(f)) {
    veredicto = 'SOLO_VITRINA';
    porque = `${TOTAL.ejecutado.get(f)} ← ${cadena(TOTAL, f).slice(0, 3).join(' ← ') || 'entrada'}`;
  } else {
    const pag = PAGINAS.find((p) => p.r.ejecutado.has(f));
    if (pag) {
      veredicto = 'SOLO_PAGINA_SUELTA';
      porque = `${pag.html} ← ${cadena(pag.r, f).slice(0, 3).join(' ← ') || 'entrada'}`;
    } else if (importadoresNoTest(f).length === 0 && (importadores.get(f) || []).some((i) => esTest(i.file))) {
      veredicto = 'SOLO_TEST';
      porque = `solo lo importan tests: ${(importadores.get(f) || []).filter((i) => esTest(i.file)).map((i) => rel(i.file)).slice(0, 2).join(', ')}`;
    } else if ((importadores.get(f) || []).length === 0) {
      veredicto = 'HUERFANO';
      porque = 'nadie lo importa — ni producto, ni vitrina, ni test';
    } else {
      veredicto = 'HUERFANO';
      const imps = importadoresNoTest(f);
      // AUTOCONTROL: si un importador SÍ está vivo y aun así este archivo no lo
      // está, o es un `import()` que no le tocó ninguna ruta, o el instrumento
      // leyó mal el router. La primera vez que salió esta línea con
      // "src/App.jsx" era lo segundo (ver `sinComentarios`). Se deja escrita
      // para que la próxima vez se vea, en vez de pasar por hallazgo bueno.
      // Solo importadores REALES: un barril vivo que lo re-exporta y que nadie
      // le pide el nombre NO es sospechoso — es exactamente el huérfano que
      // este control existe para ver.
      const vivosImp = imps.filter((i) => !i.reexport && TOTAL.ejecutado.has(i.file)).map((i) => rel(i.file));
      if (vivosImp.length) {
        porque = `SOSPECHOSO: lo importa un archivo VIVO (${vivosImp.slice(0, 2).join(', ')}) pero ningún símbolo suyo queda vivo — revisar si es un import() sin ruta o un fallo de lectura del router`;
      } else {
        porque = imps.length
          ? `solo lo importan archivos igual de inalcanzables: ${imps.map((i) => rel(i.file)).slice(0, 2).join(', ')}`
          : 'ningún importador alcanzable';
      }
    }
  }
  resultadosA.push({ id, file: f, esComp, veredicto, porque });
}

// ---------------------------------------------------------------------------
// 8 · CONTROL B — consumo real de lo que SÍ está vivo
// ---------------------------------------------------------------------------
const vivosSet = new Set([...PROD.r.ejecutado.keys(), ...TOTAL.ejecutado.keys()]);

const pideNombre = (i, nombre) => i.ns || (nombre === 'default' ? i.def : i.nombres.includes(nombre));

// archivo re-exportado → quién lo re-exporta y bajo qué nombre.
// Un barril NO es consumidor, pero SÍ es un camino: quien le pide el nombre al
// barril está consumiendo el módulo de atrás. Sin seguir esa cadena, todo lo
// que se importa vía `creatures/index.js` salía "sin consumidor" y el reporte
// se llenaba de falsos.
const reexportadoPor = new Map();
for (const f of TODOS) {
  const m = analizar(f);
  const push = (t, d) => { if (!reexportadoPor.has(t)) reexportadoPor.set(t, []); reexportadoPor.get(t).push(d); };
  for (const rx of m.reexports) for (const p of rx.pares) push(rx.target, { barril: f, expuesto: p.expuesto, origen: p.origen });
  for (const t of m.reexportStar) push(t, { barril: f, expuesto: '*', origen: '*' });
}

const cacheConsumidores = new Map();
function consumidoresProfundo(f, nombre, conTests, visto = new Set(), prof = 0) {
  const memo = `${f}|${nombre}|${conTests}`;
  if (prof === 0 && cacheConsumidores.has(memo)) return cacheConsumidores.get(memo);
  if (visto.has(memo) || prof > 4) return [];
  visto.add(memo);
  const out = (importadores.get(f) || []).filter(
    (i) => !i.reexport && (conTests || !esTest(i.file)) && pideNombre(i, nombre),
  );
  for (const rx of reexportadoPor.get(f) || []) {
    if (rx.origen === '*') out.push(...consumidoresProfundo(rx.barril, nombre, conTests, visto, prof + 1));
    else if (rx.origen === nombre) out.push(...consumidoresProfundo(rx.barril, rx.expuesto, conTests, visto, prof + 1));
  }
  if (prof === 0) cacheConsumidores.set(memo, out);
  return out;
}

/** ¿alguien lo importa por nombre, sin contar tests? (siguiendo barriles) */
function consumidoresDe(f, nombre) { return consumidoresProfundo(f, nombre, false); }

/** Igual, pero contando tests. Sirve para separar "código muerto de verdad" de
 *  "vive porque su test lo sostiene" — que es literalmente el diagnóstico del
 *  card: los seis casos tienen tests verdes y por eso se leen como hechos. */
function consumidoresConTest(f, nombre) { return consumidoresProfundo(f, nombre, true); }

// B1 · componentes React exportados que nadie importa.
// Una IDENTIDAD de componente puede exponerse por dos puertas (`export function
// Foo` + `export default Foo`); está muerta solo si NINGUNA de las dos tiene
// consumidor. Ver `componentesDe`.
const B1 = [];
for (const f of MODULOS) {
  if (!vivosSet.has(f)) continue; // los muertos ya los reporta el control A
  const comps = componentesDe(f);
  if (!comps.size) continue;
  const muertos = [];
  const vivos = [];
  const cuerpo = fuente(f);
  // Un componente que su PROPIO archivo renderiza (`<Oruga/>` dentro de
  // PlagasSprites.jsx) SÍ se monta: está exportado de más, que es otra deuda y
  // mucho menor. Sin este filtro, B1 llenaba el reporte con sub-piezas sanas
  // (los 12 sprites de plagas, los 8 de CatalogoInfra3D) y enterraba el caso
  // que importa.
  const usadoAdentro = (n) => {
    // Ojo: la propia declaración `export function Foo({...})` hace match con
    // `Foo\s*\(`. Sin sacarla, TODO componente se veía "usado adentro" y B1
    // daba cero — incluido `AngelitaSalida`, que es uno de los seis casos que
    // este control tiene que encontrar. Control positivo salvando al control.
    const decl = new RegExp(
      `(?:export\\s+)?(?:async\\s+)?function\\s+${n}\\s*\\(` +
      `|(?:export\\s+)?(?:const|let|var)\\s+${n}\\s*=` +
      `|export\\s+default\\s+${n}\\b` +
      `|export\\s*\\{[^}]*\\b${n}\\b[^}]*\\}`, 'g');
    return new RegExp(`<${n}[\\s/>]|\\b${n}\\s*\\(|\\{\\s*${n}\\s*\\}`).test(cuerpo.replace(decl, ' '));
  };
  for (const [ident, puertas] of comps) {
    const consumido = [...puertas].some((n) => consumidoresDe(f, n).length > 0)
      || [...puertas].some((n) => n !== 'default' && usadoAdentro(n));
    (consumido ? vivos : muertos).push(ident);
  }
  if (!muertos.length) continue;
  if (importadoresReales(f).length === 0) continue; // nadie lo importa: es el control A, no este
  B1.push({ id: rel(f), file: f, muertos, vivos });
}

// B2 · superficie muerta: exports vivos en el bundle que NINGÚN archivo no-test
// importa por nombre (un barril que los re-exporta NO cuenta como consumidor —
// esa es justamente la lavandería que hay que destapar).
//
// El umbral existe porque sin él esto es una manguera: medido sobre dev, la
// versión "sin consumidor fuera de su propia carpeta" daba 361 módulos, y un
// control que reporta 361 cosas no lo lee nadie. Se reportan los módulos con
// UMBRAL_B2 o más exports muertos, y los que tienen el 100% de su superficie
// muerta (esos son "librería que nadie llama" aunque sea chica). El resto sale
// solo con --exports.
const UMBRAL_B2 = 3;
const B2 = [];
for (const f of MODULOS) {
  if (!vivosSet.has(f)) continue;
  const m = analizar(f);
  const nombres = [...m.exportsLocales].filter(esIdent);
  if (m.tieneDefault) nombres.push('default');
  if (!nombres.length) continue;
  const yaEnB1 = new Set((B1.find((b) => b.file === f)?.muertos) || []);
  const sinConsumidor = nombres.filter((n) => consumidoresDe(f, n).length === 0 && !yaEnB1.has(n));
  if (!sinConsumidor.length) continue;
  // Dos niveles, porque no es lo mismo:
  //   muertos      · ni el producto ni un test lo tocan → código muerto y ya.
  //   sostenidoTest· solo lo importa su test → el patrón exacto que denuncia el
  //                  card: verde en el tablero, ausente del producto.
  const muertos = sinConsumidor.filter((n) => consumidoresConTest(f, n).length === 0);
  const sostenidoTest = sinConsumidor.filter((n) => consumidoresConTest(f, n).length > 0);
  const todoMuerto = muertos.length === nombres.length;
  B2.push({
    id: rel(f), file: f, total: nombres.length, muertos, sostenidoTest,
    todoMuerto, carpeta: rel(dirname(f)),
    fuerte: todoMuerto || muertos.length >= UMBRAL_B2,
  });
}

// ---------------------------------------------------------------------------
// 9 · CONTROL C — afordancias declaradas sin conducta
// ---------------------------------------------------------------------------
function afordanciasInertes() {
  const cap = join(SRC, 'services/agentCapabilities.js');
  const router = join(SRC, 'services/chipIntentRouter.js');
  if (!existsSync(cap) || !existsSync(router)) return { ok: false, motivo: 'no existen agentCapabilities.js / chipIntentRouter.js' };
  const declarados = new Set();
  const re = /\bintent\s*:\s*['"]([\w-]+)['"]/g;
  let x;
  const capSrc = fuente(cap);
  while ((x = re.exec(capSrc)) !== null) declarados.add(x[1]);
  const manejados = new Set();
  const rs = fuente(router);
  const re2 = /\bcase\s+CHIP_INTENTS\.([\w$]+)\s*:/g;
  while ((x = re2.exec(rs)) !== null) manejados.add(x[1]);
  const re3 = /\bcase\s+['"]([\w-]+)['"]\s*:/g;
  while ((x = re3.exec(rs)) !== null) manejados.add(x[1]);
  const inertes = [...declarados].filter((i) => !manejados.has(i)).sort();
  return { ok: true, declarados: declarados.size, manejados: manejados.size, inertes };
}
const C_RES = afordanciasInertes();

// ---------------------------------------------------------------------------
// 10 · Reporte
// ---------------------------------------------------------------------------
const foco = (id) => !OPT.caso || OPT.caso.test(id);

console.log(`${C.neg}Chagra — control de componente huérfano${C.off}   ${C.gris}(095)${C.off}`);
console.log(`${C.gris}${'─'.repeat(78)}${C.off}`);
console.log('PREMISAS MEDIDAS (no recordadas)');
for (const e of ENTRADAS) console.log(`  entrada de build   ${e.html} → ${rel(e.modulo)}`);
const montaApp = /<App\s*\/?>/.test(fuente(entradaPWA.modulo));
const montaProd = /ProdChagraApp/.test(fuente(entradaPWA.modulo));
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

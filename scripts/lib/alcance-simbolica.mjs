#!/usr/bin/env node
/**
 * alcance-simbolica.mjs — el MOTOR ÚNICO de alcanzabilidad de la UI de Chagra.
 * ===========================================================================
 * Extraído de `scripts/audit-componente-huerfano.mjs` (card 095) el 2026-09-03
 * para que el gate de CI `Integraciones no consumidas` y el instrumento de mano
 * respondan con el MISMO motor. Antes había dos: el gate hacía su propio BFS
 * plano por archivo desde `src/App.jsx` y el instrumento medía por símbolo desde
 * las entradas del build. Se contradecían en 10 archivos, y el que estaba
 * equivocado era el que bloqueaba merges. Dos motores que se contradicen no son
 * redundancia: son un gate que certifica lo que no midió.
 *
 * QUÉ RESPONDE
 * ------------
 * Por archivo de `src/`: ¿queda vivo algún símbolo suyo partiendo de una entrada
 * real del build? Con tres precisiones que el BFS plano no tenía:
 *
 *   1. ALCANCE POR SÍMBOLO, no por archivo. `src/visual/creatures/index.js` es un
 *      barril con 72 `export … from`. Un BFS por archivo marca vivo TODO lo que
 *      el barril re-exporta con solo tocar el barril. Aquí un `export {X} from
 *      './y'` propaga a `y` SOLO si alguien pidió `X` — que es lo que hace un
 *      bundler con tree-shaking. Medido sobre dev: 10 componentes que el gate
 *      viejo certificaba "cableados" y que ningún consumidor pide por nombre.
 *      OJO al reverso: `import Oso from './Oso.jsx'` DENTRO del barril, metido
 *      en un objeto de registro, SÍ lo emite el bundler — y sale MONTADO.
 *      No todo lo que pasa por un barril está lavado.
 *   2. CADA `lazy()` A SU `case`. App.jsx declara 216 `lazy(() => import(…))` y
 *      un `switch (currentView)` de 224 `case`. Meterlos en un saco hace
 *      indistinguible lo que monta el dashboard de lo que solo monta una
 *      vitrina. Aquí cada import perezoso se atribuye al `case` en cuyo bloque se
 *      usa su binding, y las vistas se parten en PRODUCTO (el usuario llega
 *      navegando) y VITRINA (solo tecleando el hash).
 *   3. TODO `src/`, no dos carpetas. Un control que mira `src/mockups` y
 *      `src/visual` certifica esas dos carpetas, no el repo.
 *
 * LÍMITES CONOCIDOS (documentados, no escondidos)
 * -----------------------------------------------
 *   · No es un parser AST: regex sobre fuente con comentarios removidos. Un
 *     `import(`${dir}/${x}.jsx`)` con template literal no se ve.
 *   · No modela flujo DENTRO de un módulo: si un módulo ejecutado importa `X` y
 *     nunca lo usa, `X` cuenta como vivo. Sesgo DELIBERADO al falso negativo:
 *     prefiere callarse a gritar en falso.
 *   · La navegación se detecta por forma de llamada (`navigate('x')`,
 *     `view: 'x'`, `href="#x"`, …), no por ejecución.
 *
 * API
 *   analizarAlcance({ root, conConsumo }) → { premisas, resultadosA, B1, B2, C, … }
 *     root       raíz del repo a auditar (permite fixtures herméticos en tests).
 *     conConsumo si es false, salta los controles B1/B2 (el gate no los usa).
 *
 * DEGRADACIÓN. Si no hay `vite.config.js`/`index.html` resolubles (árbol de
 * fixture), la entrada cae a `src/main.jsx` y después a `src/App.jsx`. Sin
 * entrada no hay nada que medir y se devuelve `{ ok: false }` en vez de reventar.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, extname, relative, sep } from 'node:path';

export function analizarAlcance({ root, conConsumo = true } = {}) {
  const ROOT = root;
  const SRC = join(ROOT, 'src');
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

// DEGRADACIÓN. Un árbol de fixture (los tests herméticos del gate) no trae
// vite.config.js ni index.html: sin este respaldo el motor reventaba en
// `entradaPWA.modulo` y el test moría con un stack en vez de un veredicto.
// El orden es el del build real: main.jsx primero, App.jsx como último recurso.
function entradasConRespaldo() {
  const e = entradasDelBuild();
  if (e.length) return e;
  for (const cand of ['src/main.jsx', 'src/main.js', 'src/App.jsx']) {
    const m = resolverConExts(join(ROOT, cand));
    if (m) return [{ html: 'index.html', modulo: m }];
  }
  return [];
}
const ENTRADAS = entradasConRespaldo();
const entradaPWA = ENTRADAS.find((e) => e.html === 'index.html') || ENTRADAS[0];
const otrasEntradas = ENTRADAS.filter((e) => e !== entradaPWA);
if (!entradaPWA) {
  return { ok: false, motivo: 'ninguna entrada de build resoluble (ni vite.config.js, ni index.html, ni src/main.jsx)', rel };
}

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
// MEMOIZADA a propósito: es una función PURA del texto, y se la llama una vez
// por (binding lazy x bloque de case) en CADA una de las 5+ corridas de
// `alcanzar` — 216 x 224 x 216 ≈ 10 M de test de regex. Sin la caché el motor
// tarda ~25 s; con ella, ~3 s. Es la diferencia entre un gate barato de CI y uno
// que la gente aprende a saltarse.
const cacheBindings = new Map();
const cacheRegexBinding = new Map();
function bindingsUsadosEn(texto) {
  const memo = cacheBindings.get(texto);
  if (memo) return memo;
  const limpio = sinDeclaracionesLazy(texto);
  const out = new Set();
  for (const [nombre] of LAZY) {
    let re = cacheRegexBinding.get(nombre);
    if (!re) {
      re = new RegExp(`<${nombre}[\\s/>]|=\\s*\\{\\s*${nombre}\\s*\\}`);
      cacheRegexBinding.set(nombre, re);
    }
    if (re.test(limpio)) out.add(nombre);
  }
  cacheBindings.set(texto, out);
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
for (const f of (conConsumo ? MODULOS : [])) {
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
for (const f of (conConsumo ? MODULOS : [])) {
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

  const montaApp = /<App\s*\/?>/.test(fuente(entradaPWA.modulo));
  const montaProd = /ProdChagraApp/.test(fuente(entradaPWA.modulo));

  return {
    ok: true,
    rel,
    ROOT,
    SRC,
    premisas: {
      entradas: ENTRADAS.map((e) => ({ html: e.html, modulo: rel(e.modulo) })),
      montaApp,
      montaProd,
      vistasSwitch: CASES.porVista.size,
      lazyBindings: LAZY.size,
      vistasProducto: [...PROD.vistas].sort(),
      vistasVitrina: vistasVitrinaNoProducto,
      modulosProducto: PROD.r.ejecutado.size,
      modulosTotal: TOTAL.ejecutado.size,
      modulosEnSrc: MODULOS.length,
    },
    ENTRADAS,
    entradaPWA,
    CASES,
    LAZY,
    PROD,
    TOTAL,
    PAGINAS,
    MODULOS,
    TESTS,
    vistasVitrinaNoProducto,
    resultadosA,
    B1,
    B2,
    UMBRAL_B2,
    C: C_RES,
    resolverConExts,
    fuente,
  };
}

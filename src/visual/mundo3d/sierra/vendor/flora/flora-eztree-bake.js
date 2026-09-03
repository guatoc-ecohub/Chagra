/* ─────────────────────────────────────────────────────────────────────────────
 * COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO.
 *
 * Original: `~/demos/3d/lib3d/flora/flora-eztree-bake.js` (valle). Se trae al bundle
 * de la PWA para el descenso por la Sierra.
 *
 * Licencia: MIT (Sylva / Token-Gremlin), notice completo al pie del archivo.
 * ───────────────────────────────────────────────────────────────────────────── */
/* eslint-disable */
/* ── INICIO COPIA VERBATIM ── */
// ── flora-eztree-bake.js ─────────────────────────────────────────────────────
// Puente entre el generador ez-tree (dgreenheck/ez-tree, MIT — vendorizado en
// flora/ez-tree/) y el sistema de InstancedMesh del valle (flora.js).
//
// ez-tree NO es drop-in (ver flora/BITACORA-flora-eztree.md): cada `Tree` es un
// Group con DOS mallas NO instanciadas (branchesMesh + leavesMesh). Sembrar un
// Tree por individuo = 2 draw calls × miles de árboles = presupuesto reventado.
//
// Estrategia (respeta ≤478 draw calls y máx 2 bosques):
//   1. Se BAKEA cada arquetipo UNA vez a dos BufferGeometry estáticas
//      (ramas + hojas), centradas al pie (y=0) y a escala natural en metros.
//   2. flora.js instancia esas geometrías con su scatter/InstancedMesh de
//      siempre → 2 draw calls por arquetipo, no por individuo.
//   3. Los árboles HÉROE (primer plano, ~14) sí pueden ser `Tree` completos
//      individuales — su costo en triángulos/draw-calls es trivial y ahí la
//      silueta rica es lo que más se ve.
//
// FILTRO AGROECOLÓGICO DURO: solo se usan claves de ESPECIES_EZTREE, que ya
// excluye por diseño eucalipto/pino/retamo/acacia (ver ESPECIES_EXCLUIDAS en
// flora/especies-eztree.js). Este módulo NUNCA importa el catálogo -742 crudo.
import * as THREE from 'three';
import { Tree } from './flora/ez-tree/tree.js';
import TreeOptions from './flora/ez-tree/options.js';
import { ESPECIES_EZTREE, ESPECIES_EXCLUIDAS } from './flora/especies-eztree.js';
import { crearCopaMasa } from './lib3d/flora/FollajeMasa.js';
import { aplicarVientoMundo } from './lib3d/flora/vientoMundos.js';

// baja el detalle de un TreeOptions para el bosque MASIVO instanciado: mismos
// parámetros de silueta (ángulos/largos/niveles de copa) pero menos sections/
// segments/leaves.count → misma forma reconocible, ~1/4 de triángulos.
function bajarDetalle(base) {
  const o = JSON.parse(JSON.stringify(base));
  if (o.branch) {
    for (const k of ['sections', 'segments']) {
      if (o.branch[k]) for (const lvl in o.branch[k]) o.branch[k][lvl] = Math.max(3, Math.round(o.branch[k][lvl] * 0.5));
    }
    if (o.branch.children) for (const lvl in o.branch.children) o.branch.children[lvl] = Math.max(1, Math.round(o.branch.children[lvl] * 0.65));
    if (typeof o.branch.levels === 'number') o.branch.levels = Math.min(o.branch.levels, 2);
  }
  if (o.leaves && o.leaves.count) o.leaves.count = Math.max(4, Math.round(o.leaves.count * 0.6));
  return o;
}

// GUARDIA agroecológica: rechaza cualquier especie cuyo nombre científico esté
// en la lista negra (defensa en profundidad; ESPECIES_EZTREE ya no las trae).
function esInvasora(def) {
  return !!ESPECIES_EXCLUIDAS[def.nombreCientifico];
}

// Genera un Tree, extrae sus dos geometrías, las "hornea" al pie (y=0) y a
// escala natural, y las devuelve listas para instanciar. NO conserva el Tree.
function bakearArquetipo(clave, { detalle = 'lod' } = {}) {
  const def = ESPECIES_EZTREE[clave];
  if (!def) throw new Error(`bake: especie desconocida "${clave}"`);
  if (def.arquetipo !== 'arbol') throw new Error(`bake: "${clave}" no es arbol (${def.arquetipo})`);
  if (esInvasora(def)) throw new Error(`bake: "${clave}" (${def.nombreCientifico}) es INVASORA — vetada`);

  const opts = new TreeOptions();
  opts.copy(detalle === 'lod' ? bajarDetalle(def.options) : def.options);
  const tree = new Tree(opts);
  tree.generate();

  const rama = tree.branchesMesh.geometry.clone();
  const hoja = tree.leavesMesh.geometry.clone();
  // ez-tree ya nace con el pie en y≈0 y escala en metros; medimos la altura
  // real para que flora.js pueda escalar con Box3 (commit 9b8c89b) sin adivinar.
  rama.computeBoundingBox();
  const bb = rama.boundingBox;
  const alturaNatural = bb.max.y - bb.min.y;
  const tintHoja = def.options?.leaves?.tint ?? 0x3f7a2e;
  const tintCorteza = def.options?.bark?.tint ?? 0x6e5138;

  // liberar el Tree (mallas ya clonadas)
  tree.branchesMesh.geometry.dispose();
  tree.leavesMesh.geometry.dispose();

  return { clave, nombre: def.nombreComun, rama, hoja, alturaNatural, tintHoja, tintCorteza };
}

// Hornea una SILUETA de arquetipo ez-tree con follaje-MASA. Las posiciones de
// las hojas del generador solo se usan para leer la forma; no se publican sus
// cards originales, que a escala de bosque se vuelven hojas contables. La
// copa densa de FollajeMasa conserva los lóbulos del arquetipo; el valle usa un
// tronco compartido por rodal para no pagar un draw call por forma.
// `lejos: true` = variante LOD-LEJANO del MISMO arquetipo: cards más grandes y
// núcleo más magro (~60% menos triángulos por instancia). Para rodales a 700 m+
// donde el card fino es sub-píxel y solo paga vértices. Default = bake de siempre.
// ── SYLVA s47 (Token-Gremlin/realistic-forest, MIT) ─────────────────────────
// `nivel` emula la DECIMACIÓN DE LA MALLA MEDIA por distancia del generador de
// Sylva (TreeGenerator LOD_PROFILE): el MISMO esqueleto (misma seed → mismos
// lóbulos → misma silueta) se meshea a un presupuesto menor. Sylva baja
// `keep` (fracción de hojas que sobreviven) y sube las supervivientes por
// 1/sqrt(keep) para que el ÁREA de follaje no caiga: la copa no se transparenta
// al alejarse. Acá la analogía sobre la copa-masa del valle es un card MÁS
// GRANDE (tamCard ~ ×1/sqrt(keep)) y MENOS cards (maxCards ~ ×keep), con el
// núcleo a menos segmentos. Misma seed → misma silueta; el presupuesto baja.
//   'full'  → keep≈1.00 (card 1.6, 260 cards, núcleo [8,6])  = el bake actual
//   'mid'   → keep≈0.62 (card 2.0, 165 cards, núcleo [6,5])
//   'lejos' → keep≈0.34 (card 2.4,  90 cards, núcleo [5,4])  = `lejos:true` hoy
// `nivel:'full'` (default) conserva EXACTA la geometría actual; `lejos:true`
// sigue significando lo mismo que siempre (alias de nivel 'lejos').
export function bakearArbolMasa(clave, { detalle = 'lod', tono = '#35612d', claro, oscuro, seed = null, lejos = false, nivel = null } = {}) {
  const nivelResuelto = nivel ?? (lejos ? 'lejos' : 'full');
  const perfilNivel = {
    full: { tamCard: 1.6, maxCards: 260, nucleoSegs: [8, 6], hojasTex: 420 },
    mid: { tamCard: 2.0, maxCards: 165, nucleoSegs: [6, 5], hojasTex: 330 },
    lejos: { tamCard: 2.4, maxCards: 90, nucleoSegs: [5, 4], hojasTex: 300 },
  }[nivelResuelto] ?? { tamCard: 1.6, maxCards: 260, nucleoSegs: [8, 6], hojasTex: 420 };
  const b = bakearArquetipo(clave, { detalle });
  b.hoja.computeBoundingBox();
  const bb = b.rama.boundingBox;
  const esferas = lobulosDesdeHojas(b.hoja, bb);
  const base = new THREE.Color(tono);
  const luz = new THREE.Color(claro ?? base.clone().offsetHSL(0, -0.04, 0.16).getStyle());
  const sombra = new THREE.Color(oscuro ?? base.clone().offsetHSL(0.02, 0.03, -0.18).getStyle());
  let yMin = Infinity, yMax = -Infinity;
  for (const e of esferas) { yMin = Math.min(yMin, e.c[1] - e.r); yMax = Math.max(yMax, e.c[1] + e.r); }
  const span = Math.max(0.001, yMax - yMin);
  const tmp = new THREE.Color();
  const gradiente = (x, y) => tmp.copy(sombra).lerp(luz, THREE.MathUtils.clamp((y - yMin) / span, 0, 1) * 0.85 + 0.12);
  const estilo = (c) => `#${c.getHexString()}`;
  const hojaProcedural = typeof location === 'undefined'
    || new URLSearchParams(location.search).get('hoja') !== '0';
  if (typeof window !== 'undefined') window.__floraHoja = { activa: hojaProcedural };
  const { grupo, matCards, matNucleo } = crearCopaMasa(THREE, {
    esferas,
    gradiente,
    seed: seed ?? ((b.clave.length * 977 + (ESPECIES_EZTREE[b.clave].options?.seed ?? 7)) % 9973),
    // El núcleo opaco tapa los huecos; este LOD mantiene la masa densa sin
    // multiplicar la geometría por cada familia de silueta.
    cobertura: 1.35,
    // LOD masivo: cards más grandes mantienen la masa a distancia con menos
    // quads; los héroes siguen usando `crearHeroeMasa` con su detalle propio.
    // Sylva s47: el par (tamCard, maxCards) ES la decimación de la malla media.
    tamCard: perfilNivel.tamCard,
    maxCards: perfilNivel.maxCards,
    // LOD de bosque: la masa/cards aporta la lectura orgánica; un núcleo con
    // la teselación de héroe multiplica millones de triángulos al instanciarlo.
    // Esta resolución conserva el volumen suave sin convertir cada árbol en
    // una esfera facetada.
    nucleoOpts: { segs: perfilNivel.nucleoSegs, encoger: 0.88, rugosidad: 0.38, sombra: 0.48 },
    texOpts: { medio: tono, oscuro: estilo(sombra), claro: estilo(luz), hojas: perfilNivel.hojasTex, alargue: 2.0 },
    hojaProcedural, verticalidad: 0.32,
  });
  const bbHoja = b.hoja.boundingBox;
  const alturaNatural = Math.max(0.001, Math.max(bb.max.y, bbHoja.max.y) - Math.min(bb.min.y, bbHoja.min.y));
  b.rama.dispose();
  b.hoja.dispose();
  return {
    clave: b.clave,
    geoNucleo: grupo.children[0].geometry,
    matNucleo,
    geoCards: grupo.children[1].geometry,
    matCards,
    tex: grupo.children[1].material.map,
    alturaNatural,
  };
}

// Arquetipos que sí viven en el valle altoandino de Guatoc (~2300 m) — nativos
// del bosque andino / subandino. NADA de exóticas de plantación.
//   encenillo  — dominante del bosque altoandino (Weinmannia); masa verde del
//     bosque cercano y lejano (ez-tree, no bola-lóbulo).
//   chachafruto— árbol de la chagra fría-templada (Erythrina edulis), nativo;
//     árboles sueltos de potrero (primer plano del deck).
//   guayacan_rosado / guayacan_amarillo — árboles de FLORACIÓN (rosa / oro):
//     ponen COLOR en el bosque instanciado, no solo verde. Silueta sombrilla.
//     El operador pidió explícitamente "los guayacanes que se ven bien".
export function bakearArbolesValle() {
  return {
    encenillo: bakearArquetipo('encenillo', { detalle: 'lod' }),
    chachafruto: bakearArquetipo('chachafruto', { detalle: 'lod' }),
    guayacan_rosado: bakearArquetipo('guayacan_rosado', { detalle: 'lod' }),
    guayacan_amarillo: bakearArquetipo('guayacan_amarillo', { detalle: 'lod' }),
  };
}

// Árbol HÉROE de primer plano: Tree completo (detalle full), individual, con
// su propio swing de viento. Devuelve un THREE.Group (branchesMesh+leavesMesh).
export function crearHeroe(clave) {
  const def = ESPECIES_EZTREE[clave];
  if (!def || def.arquetipo !== 'arbol') throw new Error(`heroe: "${clave}" inválido`);
  if (esInvasora(def)) throw new Error(`heroe: "${clave}" INVASORA — vetada`);
  const opts = new TreeOptions();
  opts.copy(def.options);
  const tree = new Tree(opts);
  tree.generate();
  return tree;
}

// ── crearHeroeMasa ───────────────────────────────────────────────────────────
// Árbol HÉROE de primer plano con follaje de MASA densa (gate Humboldt), NO las
// cartas facetadas de ez-tree. Se CONSERVA el esqueleto ez-tree (tronco + ramas
// visibles — es primer plano, hay que verle la estructura) y se DESCARTA su
// `leavesMesh` de cartón. En su lugar la copa se cubre con `crearCopaMasa`
// (núcleo esculpido + cards texturizados = masa densa ilustrada), tintada al
// color de floración de la especie (rosa Handroanthus / oro Tabebuia). Los
// lóbulos de la copa se COLOCAN muestreando dónde el ez-tree pone sus hojas —
// así la masa se posa exactamente sobre la ramazón, no como un domo flotante.
//
// Viento: los materiales de la copa se parchean con `aplicarVientoMundo` (el
// MISMO reloj global uTiempoVM que ya menea el pasto/copas del valle) → la copa
// se bambolea sobre el tronco quieto. Devuelve un THREE.Group (ramas + copa).
export function crearHeroeMasa(clave, opts = {}) {
  const def = ESPECIES_EZTREE[clave];
  if (!def || def.arquetipo !== 'arbol') throw new Error(`heroeMasa: "${clave}" inválido`);
  if (esInvasora(def)) throw new Error(`heroeMasa: "${clave}" INVASORA — vetada`);

  // 1) generar el ez-tree solo para robarle el ESQUELETO (tronco + ramas)
  const to = new TreeOptions();
  to.copy(def.options);
  const tree = new Tree(opts.detalle === false ? to : bajarDetalleRamas(to));
  tree.generate();

  const ramaGeo = tree.branchesMesh.geometry.clone();
  const hojaGeo = tree.leavesMesh.geometry;   // solo para muestrear posiciones
  ramaGeo.computeBoundingBox();
  const bb = ramaGeo.boundingBox;
  const alturaNatural = Math.max(0.001, bb.max.y - bb.min.y);

  // 2) muestrear dónde el ez-tree pone follaje → centros de los lóbulos de masa.
  //    Se agrupan las posiciones de hoja en una rejilla 3D y se toma el centroide
  //    de cada celda poblada como un lóbulo (con radio según cuántas hojas cayeron
  //    ahí). Así la copa de masa reproduce la silueta-sombrilla de la especie.
  const esferas = lobulosDesdeHojas(hojaGeo, bb);

  // 3) copa de MASA densa tintada al color de floración de la especie
  const tintHoja = def.options?.leaves?.tint ?? 0x6ea63a;
  const cHoja = new THREE.Color(tintHoja);
  // claro = flor encendida al sol; oscuro = sombra interna (mismo hue, más apagado)
  const claro = cHoja.clone().offsetHSL(0.0, 0.04, 0.16);
  const oscuro = cHoja.clone().offsetHSL(0.0, 0.02, -0.20);
  const gradiente = (() => {
    let yMin = Infinity, yMax = -Infinity;
    for (const e of esferas) { yMin = Math.min(yMin, e.c[1] - e.r); yMax = Math.max(yMax, e.c[1] + e.r); }
    const span = Math.max(0.001, yMax - yMin);
    const tmp = new THREE.Color();
    return (x, y) => {
      const t = THREE.MathUtils.clamp((y - yMin) / span, 0, 1);
      return tmp.copy(oscuro).lerp(claro, t * 0.85 + 0.12);
    };
  })();

  const styleHex = (c) => `#${c.getHexString()}`;
  const hojaProcedural = typeof location === 'undefined'
    || new URLSearchParams(location.search).get('hoja') !== '0';
  if (typeof window !== 'undefined') window.__floraHoja = { activa: hojaProcedural };
  const { grupo, matCards, matNucleo } = crearCopaMasa(THREE, {
    esferas, gradiente, seed: (def.options?.seed ?? 7) % 9973,
    // primer plano: MÁS cards (cobertura alta) y card algo más chico → la
    // superficie lee como follaje texturizado denso, no como bola lisa de
    // plastilina. El núcleo se hunde (nucleoOpts.encoger) para que asome menos y
    // manden los cards. rugosidad alta rompe la silueta orgánica.
    cobertura: 1.7, tamCard: opts.tamCard ?? 0.85, brillo: 0.06,
    maxCards: 900,
    nucleoOpts: { encoger: 0.9, rugosidad: 0.42, sombra: 0.5 },
    // las hojitas del CANVAS salen del color de la especie (masa rosa/oro real,
    // no verde con "rubor"): pasamos oscuro/claro/medio de floración al map, con
    // más contraste (más hojitas, alargue mayor) para que la textura de flor se
    // lea de cerca y no quede plana.
    texOpts: {
      medio: styleHex(cHoja),
      oscuro: styleHex(oscuro.clone().offsetHSL(0, 0.03, -0.1)),
      claro: styleHex(claro.clone().offsetHSL(0, -0.02, 0.06)),
      hojas: 460, alargue: 1.7,
    },
    hojaProcedural, verticalidad: 0.36,
  });

  // 4) viento: la copa se mece con el reloj global del valle; el tronco queda
  //    quieto (piso alto → solo la copa, que está muy por encima, se bambolea).
  const pisoViento = bb.min.y + alturaNatural * 0.42;
  aplicarVientoMundo(matCards, { amplitud: 0.10, piso: pisoViento, velocidad: 0.9 });
  aplicarVientoMundo(matNucleo, { amplitud: 0.10, piso: pisoViento, velocidad: 0.9 });

  // 5) ensamblar: ramas ez-tree (material de corteza propio) + copa de masa.
  //    Se descarta el leavesMesh (cartón) por completo.
  const ramas = new THREE.Mesh(ramaGeo, tree.branchesMesh.material);
  ramas.frustumCulled = false;
  grupo.frustumCulled = false;
  const heroe = new THREE.Group();
  heroe.name = `heroe-masa-${clave}`;
  heroe.add(ramas);
  heroe.add(grupo);

  // liberar el ez-tree (ya clonamos ramas; hoja solo se muestreó)
  tree.leavesMesh.geometry.dispose();
  tree.leavesMesh.material.dispose();

  return heroe;
}

// baja el detalle de RAMAS del ez-tree para el héroe de masa: la copa ya la pone
// la masa, así que las ramas altas finas (nivel 2-3) sobran — bastan tronco +
// ramas madre. Menos triángulos, silueta de ramazón igual de legible.
function bajarDetalleRamas(to) {
  const o = new TreeOptions();
  o.copy(to);
  if (o.branch) {
    if (typeof o.branch.levels === 'number') o.branch.levels = Math.min(o.branch.levels, 2);
    if (o.branch.children) for (const lvl in o.branch.children) o.branch.children[lvl] = Math.max(1, Math.round(o.branch.children[lvl] * 0.8));
  }
  if (o.leaves) o.leaves.count = Math.max(6, o.leaves.count);  // mantener muestreo de copa
  return o;
}

// Agrupa las posiciones de HOJA del ez-tree en lóbulos-esfera para la copa de
// masa. Rejilla 3D adaptada al bounding de la copa (mitad superior del árbol);
// cada celda poblada → un lóbulo con centro en el centroide y radio según la
// dispersión local. Devuelve [{ c:[x,y,z], r, esc:[sx,sy,sz] }] para crearCopaMasa.
function lobulosDesdeHojas(hojaGeo, bbRama) {
  const P = hojaGeo.attributes.position;
  const n = P ? P.count : 0;
  // fallback: si el ez-tree no dejó hojas, un domo simple sobre el tercio alto
  if (n < 12) {
    const cx = (bbRama.min.x + bbRama.max.x) / 2, cz = (bbRama.min.z + bbRama.max.z) / 2;
    const yTop = bbRama.max.y, h = bbRama.max.y - bbRama.min.y;
    const R = Math.max(1.5, (bbRama.max.x - bbRama.min.x) * 0.6);
    return [{ c: [cx, yTop - R * 0.5, cz], r: R, esc: [1.15, 0.78, 1.15] }];
  }
  // bounding de la nube de hojas
  let minx = Infinity, miny = Infinity, minz = Infinity, maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (x < minx) minx = x; if (y < miny) miny = y; if (z < minz) minz = z;
    if (x > maxx) maxx = x; if (y > maxy) maxy = y; if (z > maxz) maxz = z;
  }
  const spanX = Math.max(0.001, maxx - minx), spanY = Math.max(0.001, maxy - miny), spanZ = Math.max(0.001, maxz - minz);
  // rejilla ~3×3×3: pocas esferas grandes = copa MASA continua (no “racimos”).
  const GX = 3, GY = 3, GZ = 3;
  const celdas = new Map();
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const ix = Math.min(GX - 1, Math.floor((x - minx) / spanX * GX));
    const iy = Math.min(GY - 1, Math.floor((y - miny) / spanY * GY));
    const iz = Math.min(GZ - 1, Math.floor((z - minz) / spanZ * GZ));
    const key = ix + '|' + iy + '|' + iz;
    let c = celdas.get(key);
    if (!c) { c = { sx: 0, sy: 0, sz: 0, sxx: 0, syy: 0, szz: 0, cnt: 0 }; celdas.set(key, c); }
    c.sx += x; c.sy += y; c.sz += z; c.sxx += x * x; c.syy += y * y; c.szz += z * z; c.cnt++;
  }
  const esferas = [];
  let maxCnt = 1;
  for (const c of celdas.values()) if (c.cnt > maxCnt) maxCnt = c.cnt;
  for (const c of celdas.values()) {
    if (c.cnt < Math.max(3, maxCnt * 0.05)) continue;   // descartar celdas casi vacías
    const mx = c.sx / c.cnt, my = c.sy / c.cnt, mz = c.sz / c.cnt;
    const vx = Math.sqrt(Math.max(0, c.sxx / c.cnt - mx * mx));
    const vy = Math.sqrt(Math.max(0, c.syy / c.cnt - my * my));
    const vz = Math.sqrt(Math.max(0, c.szz / c.cnt - mz * mz));
    // radio del lóbulo: dispersión local + colchón para que las esferas se SOLAPEN
    // (copa continua, sin huecos entre lóbulos = masa, no racimo de bolas).
    const disp = (vx + vy + vz) / 3;
    const r = Math.max(spanX, spanZ) * 0.28 + disp * 1.15;
    const ex = 1 + (vx / (disp + 1e-3) - 1) * 0.4;
    const ey = 1 + (vy / (disp + 1e-3) - 1) * 0.4;
    const ez = 1 + (vz / (disp + 1e-3) - 1) * 0.4;
    esferas.push({ c: [mx, my, mz], r: Math.max(1.0, r), esc: [Math.max(0.6, ex), Math.max(0.55, ey), Math.max(0.6, ez)] });
  }
  // seguridad: si el filtro dejó <2 lóbulos, un domo central grande
  if (esferas.length < 2) {
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, cz = (minz + maxz) / 2;
    const R = Math.max(spanX, spanZ) * 0.62;
    esferas.push({ c: [cx, cy, cz], r: R, esc: [1.1, 0.8, 1.1] });
  }
  return esferas;
}

// ── bakearArquetipoFusion ────────────────────────────────────────────────────
// Igual que bakearArquetipo, pero FUSIONA rama+hoja en UNA sola BufferGeometry
// con color POR VÉRTICE (position + color), lista para instanciar con un único
// material `vertexColors:true` — el patrón que usan bosque.js/cafetal.js/etc con
// su `sembrar(geom, n, ...)`. Reemplaza un domo/parasol horneado a mano por la
// silueta ez-tree ramificada SIN subir draw calls (sigue siendo 1 InstancedMesh
// por arquetipo). La geometría queda con el pie en y=0 y escalada para que su
// altura natural sea `alturaObjetivo` metros (para casar con el escalado que ya
// hacía la geometría vieja). tintHoja/tintCorteza permiten afinar al ambiente.
export function bakearArquetipoFusion(clave, { detalle = 'lod', alturaObjetivo = null, tintHoja = null, tintCorteza = null } = {}) {
  const b = bakearArquetipo(clave, { detalle });
  const k = alturaObjetivo ? (alturaObjetivo / b.alturaNatural) : 1;
  const cHoja = new THREE.Color(tintHoja ?? b.tintHoja);
  const cCort = new THREE.Color(tintCorteza ?? b.tintCorteza);

  const tintar = (geo, col) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (k !== 1) g.scale(k, k, k);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // jitter suave por vértice para que la masa no lea plana (como el resto del valle)
      const j = (Math.random() - 0.5) * 0.06;
      arr[i * 3] = Math.min(1, Math.max(0, col.r + j));
      arr[i * 3 + 1] = Math.min(1, Math.max(0, col.g + j));
      arr[i * 3 + 2] = Math.min(1, Math.max(0, col.b + j));
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  };

  const gr = tintar(b.rama, cCort);
  const gh = tintar(b.hoja, cHoja);

  // fusión manual (nunca mergeGeometries a pelo: mezclar indexadas/no-indexadas → null)
  const gs = [gr, gh];
  let total = 0;
  for (const g of gs) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), colr = new Float32Array(total * 3);
  let o = 0;
  for (const g of gs) {
    const P = g.attributes.position.array, Cc = g.attributes.color.array;
    for (let i = 0; i < g.attributes.position.count; i++) {
      pos[(o + i) * 3] = P[i * 3]; pos[(o + i) * 3 + 1] = P[i * 3 + 1]; pos[(o + i) * 3 + 2] = P[i * 3 + 2];
      colr[(o + i) * 3] = Cc[i * 3]; colr[(o + i) * 3 + 1] = Cc[i * 3 + 1]; colr[(o + i) * 3 + 2] = Cc[i * 3 + 2];
    }
    o += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  out.computeVertexNormals(); out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

export { bakearArquetipo };

/*
 * artesaniaAndina.js — EL LENGUAJE DE FORMA "ARTESANÍA ANDINA" (tokens + paleta
 * + generadores de patrón + perfiles low-poly). Three-free: seguro en el bundle
 * base, importable desde cualquier lámina 2D o escena 3D.
 *
 * QUÉ ES (FASE 4, pulido premium): un kit REUTILIZABLE de siluetas y patrones
 * inspirados en la artesanía andina colombiana — la geometría del telar (rombos,
 * zigzag, grecas escalonadas), las franjas rítmicas de la mochila, el perfil de
 * la cerámica — fusionado con el norte rubber-hose (línea gruesa que respira,
 * terminales redondas, squash & stretch). Da identidad coherente a mundos y
 * criaturas sin dibujar cada asset desde cero.
 *
 * LÍMITE ÉTICO (sin apropiación): SOLO formas geométricas abstractas y paleta
 * de tintes naturales. NADA de iconografía sagrada, símbolos rituales ni
 * motivos identitarios de un pueblo específico (no soles rituales, no figuras
 * antropo/zoomorfas de tradición, no nombres de clanes). Rombo, escalón, franja
 * y zigzag son vocabulario geométrico universal del telar.
 *
 * CÓMO SE CONSUME (el cableo lo hace quien integra):
 *
 *   · 2D (SVG): los generadores devuelven `d` de path o listas de datos.
 *     Las primitivas listas viven en `ArtesaniaAndina.jsx` (mismo folder).
 *
 *   · 3D (R3F, dentro de `escenas/` — perezoso, chunk vendor-three):
 *       const pts = PERFILES_VASIJA.olla.map(([r, y]) => new THREE.Vector2(r * ESCALA, y * ALTO));
 *       <mesh><latheGeometry args={[pts, SEGMENTOS_VASIJA]} /><meshLambertMaterial color={PALETA_ANDINA.terracota} /></mesh>
 *     Perf (DR §6): Lambert/Basic, sin sombras, segmentos acotados.
 *
 * Determinismo: todo generador con azar recibe `seed` (mismo tejido siempre).
 */

// ── PALETA — tintes naturales del textil andino ────────────────────────────
// Nombres por MATERIA de tinte/fibra, no por símbolo. `crudo` y `tinta`
// empatan a propósito con el fondo y la línea ya usados por mundo.css.
export const PALETA_ANDINA = {
  crudo: '#ece0c7', // fique/lana sin teñir — el fondo del mundo
  hueso: '#f6efe0', // algodón claro — papel de las láminas
  tinta: '#2a2016', // negro humo — LA línea rubber-hose
  terracota: '#b4572e', // barro cocido — cerámica
  cochinilla: '#973128', // rojo de tinte animal — acento cálido fuerte
  maiz: '#d9a441', // amarillo dorado — acento luminoso
  paramo: '#5d7a4b', // verde frailejonal apagado — acento vegetal
  anil: '#33507a', // azul de añil — acento frío
  mora: '#6b4a5e', // morado de fruto — acento raro (úselo poco)
};

// Roles listos: quién es fondo, quién es línea, y el ciclo de acentos en el
// ORDEN rítmico del textil (cálido → luminoso → frío → vegetal → raro).
export const ROLES_ANDINOS = {
  fondo: PALETA_ANDINA.crudo,
  papel: PALETA_ANDINA.hueso,
  linea: PALETA_ANDINA.tinta,
  acentos: [
    PALETA_ANDINA.terracota,
    PALETA_ANDINA.maiz,
    PALETA_ANDINA.anil,
    PALETA_ANDINA.paramo,
    PALETA_ANDINA.cochinilla,
  ],
};

/** Acento cíclico i → color (para series: franjas, criaturas, mundos). */
export function acentoAndino(i) {
  const a = ROLES_ANDINOS.acentos;
  return a[((i % a.length) + a.length) % a.length];
}

// ── TRAZO — la línea rubber-hose (Cuphead / Miss Minutes) ──────────────────
// Terminales y uniones SIEMPRE redondas; dos grosores (estructura vs detalle);
// `respiracion` es la amplitud de ondulación de `lineaQueRespira`.
export const TRAZO_ANDINO = {
  grosor: 3, // contorno estructural
  fino: 1.4, // detalle interior / hifas del patrón
  cap: 'round',
  join: 'round',
  respiracion: 1.6, // px de vaivén de la línea viva
};

// El módulo del telar: la baldosa base de todo patrón repetible (px en SVG,
// unidades de mundo en 3D). Múltiplos de MODULO_TELAR mantienen los patrones
// en fase cuando se yuxtaponen bandas.
export const MODULO_TELAR = 24;

// ── PRNG determinista (misma receta LCG de las escenas del framework) ──────
export function rngArtesania(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ── GENERADORES DE PATRÓN (puros → `d` de SVG path) ────────────────────────

/** Un rombo (la unidad madre del telar): centro (cx,cy), semiejes rw/rh. */
export function pathRombo(cx, cy, rw, rh) {
  return `M ${cx} ${cy - rh} L ${cx + rw} ${cy} L ${cx} ${cy + rh} L ${cx - rw} ${cy} Z`;
}

/**
 * Rombos ANIDADOS (el "ojo" del chumbe, leído solo como geometría): niveles
 * concéntricos que encogen. Devuelve UNA `d` por nivel (afuera → adentro),
 * para alternar color por índice con `acentoAndino(i)`.
 */
export function pathsRomboAnidado(cx, cy, rw, rh, niveles = 3) {
  const out = [];
  for (let i = 0; i < niveles; i += 1) {
    const f = 1 - i / niveles;
    out.push(pathRombo(cx, cy, rw * f, rh * f));
  }
  return out;
}

/**
 * Zigzag de telar (polilínea abierta, para stroke): `dientes` picos de `alto`
 * a lo largo de `ancho`, arrancando en (x, y). El pico va hacia ARRIBA.
 */
export function pathZigzag({ x = 0, y = 0, ancho = MODULO_TELAR * 4, alto = 10, dientes = 4 } = {}) {
  const paso = ancho / dientes;
  let d = `M ${x} ${y}`;
  for (let i = 0; i < dientes; i += 1) {
    d += ` L ${x + paso * (i + 0.5)} ${y - alto} L ${x + paso * (i + 1)} ${y}`;
  }
  return d;
}

/**
 * Greca ESCALONADA (pirámide de escalones, subida y bajada): la escalera del
 * telar como pura geometría. Path CERRADO para fill; base en (x, y), cada
 * escalón mide `paso` × `paso`, `niveles` escalones por lado.
 */
export function pathGrecaEscalonada({ x = 0, y = 0, paso = 8, niveles = 3 } = {}) {
  let d = `M ${x} ${y}`;
  let px = x;
  let py = y;
  for (let i = 0; i < niveles; i += 1) {
    py -= paso;
    d += ` L ${px} ${py}`;
    px += paso;
    d += ` L ${px} ${py}`;
  }
  for (let i = 0; i < niveles; i += 1) {
    px += paso;
    d += ` L ${px} ${py}`;
    py += paso;
    d += ` L ${px} ${py}`;
  }
  return `${d} Z`;
}

/**
 * La LÍNEA QUE RESPIRA (rubber-hose): un trazo recto es un trazo muerto. Esta
 * devuelve el path de (x1,y1)→(x2,y2) ondulado con `ondas` curvas cuadráticas
 * de amplitud ±`amplitud` (default: TRAZO_ANDINO.respiracion), determinista
 * por `seed`. Úsela para contornos de marcos, tallos, horizontes.
 */
export function lineaQueRespira(x1, y1, x2, y2, { amplitud = TRAZO_ANDINO.respiracion, ondas = 4, seed = 7 } = {}) {
  const r = rngArtesania(seed);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const largo = Math.hypot(dx, dy) || 1;
  const nx = -dy / largo; // perpendicular unitaria
  const ny = dx / largo;
  let d = `M ${x1} ${y1}`;
  for (let i = 0; i < ondas; i += 1) {
    const t1 = (i + 0.5) / ondas;
    const t2 = (i + 1) / ondas;
    const lado = (i % 2 === 0 ? 1 : -1) * (0.6 + r() * 0.8);
    const cx = x1 + dx * t1 + nx * amplitud * lado;
    const cy = y1 + dy * t1 + ny * amplitud * lado;
    d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${(x1 + dx * t2).toFixed(2)} ${(y1 + dy * t2).toFixed(2)}`;
  }
  return d;
}

/**
 * FRANJAS rítmicas (el compás de la mochila, leído solo como ritmo de color):
 * llena `alto` con bandas horizontales { y, alto, color } alternando bandas
 * anchas de acento con separadores finos de tinta/crudo. Determinista por
 * `seed`; `colores` (default ROLES_ANDINOS.acentos) cicla en orden.
 */
export function secuenciaFranjas({ alto = MODULO_TELAR * 5, colores = ROLES_ANDINOS.acentos, seed = 7 } = {}) {
  const r = rngArtesania(seed);
  const franjas = [];
  let y = 0;
  let i = 0;
  while (y < alto) {
    const ancha = Math.min(alto - y, MODULO_TELAR * (0.6 + r() * 0.9));
    franjas.push({ y, alto: ancha, color: colores[i % colores.length] });
    y += ancha;
    if (y >= alto) break;
    const fina = Math.min(alto - y, MODULO_TELAR * 0.16);
    franjas.push({ y, alto: fina, color: i % 2 === 0 ? ROLES_ANDINOS.linea : ROLES_ANDINOS.papel });
    y += fina;
    i += 1;
  }
  return franjas;
}

// ── PERFILES LOW-POLY DE CERÁMICA (una fuente de forma, 2D Y 3D) ───────────
// Pares [radio, y] normalizados (y ∈ 0..1, radio relativo al alto). Pocos
// puntos A PROPÓSITO: el facetado ES el estilo low-poly. La MISMA tabla
// alimenta `latheGeometry` en 3D y `pathVasija` en 2D — la silueta nunca
// diverge entre dimensiones. Formas genéricas de alfarería (olla / cántaro /
// cuenco), sin referencia a piezas rituales.
export const PERFILES_VASIJA = {
  olla: [
    [0, 0], [0.3, 0.02], [0.46, 0.18], [0.5, 0.42], [0.42, 0.66],
    [0.3, 0.78], [0.32, 0.88], [0.37, 0.95], [0.35, 1],
  ],
  cantaro: [
    [0, 0], [0.26, 0.02], [0.44, 0.22], [0.48, 0.46], [0.36, 0.68],
    [0.18, 0.8], [0.16, 0.92], [0.23, 0.97], [0.21, 1],
  ],
  cuenco: [
    [0, 0], [0.34, 0.03], [0.52, 0.35], [0.62, 0.75], [0.66, 0.9], [0.62, 1],
  ],
};

/** Segmentos radiales del lathe: 10 = facetado visible (el look, no un bug). */
export const SEGMENTOS_VASIJA = 10;

/**
 * Silueta 2D de una vasija desde el MISMO perfil del lathe: path cerrado
 * facetado (lado derecho + espejo izquierdo). `base` es el punto de apoyo
 * (cx, cy en coordenadas SVG, y crece hacia abajo).
 */
export function pathVasija(tipo = 'olla', { cx = 0, cy = 0, alto = 60 } = {}) {
  const perfil = PERFILES_VASIJA[tipo] || PERFILES_VASIJA.olla;
  const derecha = perfil.map(([pr, py]) => [cx + pr * alto, cy - py * alto]);
  const izquierda = [...perfil].reverse().map(([pr, py]) => [cx - pr * alto, cy - py * alto]);
  const pts = [...derecha, ...izquierda];
  return `M ${pts.map(([px, py]) => `${px.toFixed(2)} ${py.toFixed(2)}`).join(' L ')} Z`;
}

/** Claves de perfil disponibles, en orden canónico. */
export const VASIJA_TIPOS = Object.keys(PERFILES_VASIJA);

// ── El farallón de La Chorrera: malla paramétrica propia ─────────────────────
// ══ ARCHIVADO 2026-08-11 ════════════════════════════════════════════════════
// No conectar este módulo a una entrada pública: el gate visual final siguió
// leyendo la masa como una franja verde de bordes rectos, aunque el muestreo
// se corrigió con fade, jitter, halo y transición volumétrica.
// A/B final, mismo viewport 1280x800, misma GPU Quadro M6000, post=0:
//   cliff orgánico: 117 draw calls · 12.774.583 tris · 136,7 FPS
//   impostor final:  113 draw calls · 10.399.055 tris · 148,7 FPS
// El ahorro de rendimiento no compensa el fallo de lectura visual; la entrada
// `impostores-valle.html` queda rotulada y vuelve a `cliff.js`.
// ════════════════════════════════════════════════════════════════════════════
// EXPERIMENTO DE IMPOSTOR-LOD para la ladera del páramo (`cliff-impostores.js`).
// Mantiene los mismos exports y la misma firma de makeCliff que `cliff.js`;
// `main-impostores.js` lo selecciona explícitamente para esta entrada pública.
// La diferencia deliberada: el bosque de niebla de la pared ya NO es
// `IcosahedronGeometry(r,0)` crudo (~19.300 instancias) sino el sistema de
// impostores de `lib/impostor-lod.js` (regla dura «follaje = MASA; si se le
// cuentan las caras → SACAR»). Presupuesto garantizado por diseño: 3 draw
// calls de InstancedMesh (cerca/media/lejos) y ~1 quad por árbol en el peor
// caso, en vez de una malla por árbol.
//
// chorrera-real-detalle.jpg (la referencia canónica):
//  · PARED casi vertical y masiva — no colina.
//  · Afloramientos de roca CLARA ESTRATIFICADA (líneas horizontales de piedra)
//    asomando en manchones entre el bosque, sobre todo junto al canal del agua.
//  · Bosque de niebla DENSO, CAÓTICO y CONTINUO: no se ve el suelo; copas de
//    todos los tamaños, emergentes sueltos, sombra profunda en las gargantas.
import * as THREE from 'three';
import { height, fbm, sstep, clamp, mix, faceCol, faceZAt, CHANNEL_X, CHIFLON_X, CHIFLON_LADO, CHIFLON_T0 } from './terrain.js';
import { makeImpostorLOD } from './lib/impostor-lod.js';
import { aplicarVientoMundo } from './lib3d/flora/vientoMundos.js';

// ══════════════════════════════════════════════════════════════════════════
// ⛔ LA LÁMINA PARAMÉTRICA (la "pared inventada") SALIÓ. BORRADA EN FIRME.
//
// Este archivo construía una malla propia de 300x226 vértices que fingía el
// farallón de La Chorrera, con su cresta dictada por `wallTopY` y su plano
// base en FACE_Z=-790. Con la ROTACIÓN 180° dejó de hacer falta y pasó a
// estorbar: medido desde el ojo de Guatoc (r/skyline.mjs), la lámina tapaba el
// escarpe REAL en los 21 azimuts del encuadre (+3,7° a +16,0°), su cumbre
// inventaba 3674 msnm contra 2676 msnm de terreno real bajo ella (+991 m) y
// por el flanco derecho se quedaba 113-364 m por DEBAJO del DEM, que la
// atravesaba. Era la causa raíz de tres rondas de "montaña sobre montaña".
//
// LO QUE SÍ SIGUE VIVO, y por qué: el DEM da la FORMA (cumbre 3216-3270 msnm a
// 1,0-1,7 km, +23° desde el ojo, garganta con hombros de 220-340 m) pero a
// 9,4 m/px no da la PIEL — ni el bosque de niebla denso, ni las cárcavas
// verticales, ni el fleco de la cresta. Eso se conserva, pero ahora DRAPEADO
// sobre el terreno real: `facePos(x,t)` ya no devuelve un punto de una malla
// inventada sino un punto de la ladera del DEM.
// ══════════════════════════════════════════════════════════════════════════
export const NOTCH_X = CHANNEL_X;  // eje del canal de La Chorrera
// ── LA BANDA DEL ESCARPE ─────────────────────────────────────────────────
// Antes la piel de pared se sembraba en x ∈ [-1430, 1430], porque la lámina
// inventada ocupaba todo ese ancho. Con el DEM real hay CARA sólo alrededor
// del canal. Sembrar fuera de esa banda plantaba el bosque de pared en el
// PRIMER PLANO: `faceZAt` no encontraba ladera y devolvía z≈-240, a 280 u del
// ojo, con lo que las copas de 5 m salían como matas de 35 m tapando el valle.
//
// Re-medida con el RUMBO REAL (r/banda.mjs, columnas cada 50 u,
// FACE_ZNEAR=-450 FACE_ZFAR=-1150): `esCara` da ✔ en x ∈ [-100, +450].
// La banda NO se abre a todo eso: se cierra en +300 a propósito. De +300 a
// +450 lo que hay no es el anfiteatro de la caída sino el flanco derecho del
// cañón, y vestirlo de piel de pared lo convertía en un muro de bloques
// oscuros (captura N1). En file_158 el hombro derecho es ladera verde normal
// —la que ya siembra `flora.js`— y la roca vive SÓLO dentro de la garganta.
const X0 = -180, X1 = 300;
// y aun dentro de la banda, sólo donde la columna es cara y no ladera
const esCara = (x) => {
  const c = faceCol(x);
  return (c.top - c.bot) > 330 &&
    Math.atan2(c.top - c.bot, Math.abs(c.topZ - c.botZ)) > 0.34;   // >19,5°
};
// Halo de transición: las copas geométricas del control sobresalen de la
// columna estricta y rompen su silueta. Un segundo umbral deja entrar pocos
// centros en la ladera vecina, siempre anclados a `facePos`/DEM y con la
// densidad reducida por el muestreo; no es un muro nuevo.
const esCaraHalo = (x) => {
  const c = faceCol(x);
  return (c.top - c.bot) > 120 &&
    Math.atan2(c.top - c.bot, Math.abs(c.topZ - c.botZ)) > 0.16;
};

// ── ANCLAJE AL TERRENO REAL ──────────────────────────────────────────────
// base = fondo del valle delante del macizo; cresta = cumbre real de la
// columna. Los dos salen de `faceCol` (terrain.js), que los lee del DEM.
function baseY(x) { return faceCol(x).bot; }
function topY(x) { return faceCol(x).top; }
function corrug(x) {
  // contrafuertes VERTICALES grandes + costillas menores, hacia la cámara (+z).
  // Amplitud contenida: panzas muy gordas leían como lomas de rampa, no pared
  return (fbm(x / 300 + 5.1, 1.9, 3) * 0.5 + 0.5) * 95 + (fbm(x / 80 + 11.4, 4.2, 2) * 0.5 + 0.5) * 22;
}

// luz/sombra de gran forma HORNEADA: gargantas oscuras entre contrafuertes +
// luz rasante del amanecer entrando por la derecha (+x). Va multiplicada al
// color de la cara Y de los árboles: la masa entera respira el mismo relieve.
export function shadeAt(x, y = 0) {
  // el contrafuerte SERPENTEA al subir: sin esto la sombra era una columna
  // recta de arriba a abajo (lectura "diseño artificial" — el gate lo marcó)
  const xw = x + fbm(y / 210 + 0.7, x / 900 + 3.9, 2) * 46;
  const cav = clamp(corrug(xw) / 117, 0, 1);             // fondo de garganta = sombra
  const dx = (corrug(xw + 6) - corrug(xw - 6)) / 12;     // flanco hacia +x = luz rasante
  let s = clamp(0.44 + cav * 0.52 + clamp(dx, -1.2, 1.2) * 0.36, 0.20, 1.32);
  // ── la HENDIDURA se LEE por la luz (file_158): la geometría cóncava sola no
  // alcanza con cámara frontal — el cuenco se auto-sombrea (AO) y el sol que
  // entra por la derecha (+x) ilumina la pared interna IZQUIERDA del embudo y
  // hunde en sombra la DERECHA: la firma lumínica EXACTA de una concavidad,
  // inversa a la de un lomo convexo (que brilla del lado del sol). Va aquí
  // porque shadeAt multiplica cara Y dosel instanciado: todo lo que vive
  // dentro del pliegue se oscurece junto ──
  const B = baseY(x), H = topY(x);
  const tG = clamp((y - B) / Math.max(1, H - B), 0, 1);
  const g = gorgeAt(x, tG);
  if (g.amph > 0.01) {
    const side = clamp((x - pathX(tG)) / 55, -1, 1);   // + = pared interna derecha
    s *= 1 - g.amph * 0.30 - g.slot * 0.20;            // AO del cuenco: hondo = oscuro
    s *= 1 - Math.max(side, 0) * g.amph * 0.28;        // pared derecha: sombra propia
    s *= 1 + Math.max(-side, 0) * g.amph * 0.16;       // pared izquierda: recibe el sol
  }
  return s;
}

// cárcavas de drenaje VERTICALES: líneas oscuras angostas bajando la cara
// (la anisotropía vertical es LA señal de "pared", no "suelo visto desde arriba")
export function gullyK(x, y) {
  // raya vertical con MEANDRO (recta perfecta full-height leía artificial)
  const g = fbm(x / 30 + 4.9 + fbm(y / 160 + 3.3, 0.7, 2) * 0.35, y / 300 + 1.1, 2) * 0.5 + 0.5;
  return sstep(0.62, 0.80, g) * (0.55 + 0.45 * (fbm(y / 110 + 8.8, x / 500 + 0.3, 2) * 0.5 + 0.5));
}

// ⛔ `channelNotch` salió con la lámina: el surco del canal ya no se hunde
// en un plano inventado — está TALLADO en el terreno real (terrain.js).


// ── los SALTOS de La Chorrera (chorrera-real-detalle.jpg, la referencia de
// cerca 2026-07-31): la caída nace BIEN ABAJO de la cumbre y baja en TRES
// SALTOS escalonados — velo alto que se abre, tobogán medio sobre la roca,
// velo bajo largo que se desfleca al pie. Es UNA sola caída (la ruta lateral
// no zigzaguea: pathX deriva continua der→izq como en la foto); los saltos
// son el ritmo VERTICAL de las repisas, el que la propia lección enuncia
// («~590 metros en tres saltos»). El corte único anterior dejaba dos tramos
// y la caída leía como raya continua sin escalones.
export const SALTOS_T = [0.60, 0.38];
export const T_NACE = 0.80;   // altura (en t) donde NACE el hilo de La Chorrera
export const CUTS_T = [T_NACE, ...SALTOS_T, 0.12];
// RUTA (t, x): puntos de control del hilo. Los desvíos van RELATIVOS a
// CHANNEL_X (la ruta sigue al canal si el canal se mueve).
// ── (2026-07-30) SENTIDO CORREGIDO: LA FOTO MANDA ──
// chorrera-montana.jpg: el hilo NACE a la DERECHA y el pie muere a la
// IZQUIERDA (deriva ≈84 u real, amortiguada a 55+9). La ruta anterior
// (−70·sstep) era el ESPEJO — nacía izquierda y caía hacia la derecha. La
// deriva +55·sstep sigue a `channelAxis` (terrain.js), corregido igual.
const ROUTE = [
  [0.80, 4], [0.56, 0],                 // tramo ALTO: casi a plomo, deriva leve
  [0.52, -4], [0.30, -7], [0.12, -9],   // tramo BAJO: sigue abriéndose a la izquierda
  // (la foto: en la repisa el hilo JOGUEA ~6 u a la izquierda y sigue —
  //  escalón corto, no zigzag mecánico)
].map(([t, dx]) => [t, CHANNEL_X + dx + 55 * sstep(0.12, 0.80, t)]);
export function pathX(t) {
  if (t >= ROUTE[0][0]) return ROUTE[0][1];
  for (let i = 1; i < ROUTE.length; i++) {
    if (t >= ROUTE[i][0]) {
      const [t0, x0] = ROUTE[i - 1], [t1, x1] = ROUTE[i];
      return mix(x0, x1, (t0 - t) / (t0 - t1));
    }
  }
  return ROUTE[ROUTE.length - 1][1];
}
// ── LA HENDIDURA (file_158 + DR geomorfología): el agua NO baja por el lomo
// convexo del domo — el cañón talló un anfiteatro CÓNCAVO y el hilo corre por
// el fondo de esa garganta ("sigue las fisuras de las rocas": hendidura
// labrada, no cara expuesta). Embudo en V: abierto arriba, cerrado abajo,
// siguiendo la RUTA del agua (pathX). Se desvanece bajo la cumbre para no
// rajar el skyline: el domo redondeado queda intacto y el hilo nace bien
// abajo de la cresta, dentro del pliegue.
export function gorgeAt(x, t) {
  const dx = x - pathX(t);
  const tc = clamp(t, 0, 1);
  // no raja la cumbre (arriba) y afloja al pie (la V se abre al valle y los
  // espolones de primer plano toman el relevo — y el heightfield fundido
  // detrás de la cara no debe asomar a través de la garganta honda)
  const fade = (1 - sstep(0.86, 0.985, tc)) * (0.35 + 0.65 * sstep(0.06, 0.30, tc));
  const sA = mix(80, 170, tc);                    // embudo: se ABRE hacia arriba
  const amph = Math.exp(-(dx * dx) / (sA * sA)) * fade;   // cuenco ancho
  const slot = Math.exp(-(dx * dx) / (26 * 26)) * fade;   // tajo interior
  return { amph, slot, carve: amph * 52 + slot * 26 };
}

function ledgeShelf(x, t) {
  // cada repisa CENTRADA en la ruta real del agua (pathX en la altura del
  // salto), no en el eje fijo del canal: con la deriva der→izq de 55 u el
  // gaussian en CHANNEL_X dejaba el escalón corrido del hilo que lo talla
  let s = 0;
  for (const lt of SALTOS_T) {
    s += Math.exp(-((t - lt) ** 2) / (2 * 0.025 * 0.025)) * 16 *
         Math.exp(-((x - pathX(lt)) ** 2) / (95 * 95));
  }
  // poza del Chiflón: la repisa donde revienta la caída limpia de ~90 m
  // (54 u bajo el labio CHIFLON_T0 — waterfalls.js corta la cinta ahí mismo;
  // el +18 sigue la deriva del hilo hacia la vaguada, ver chX en waterfalls)
  const tCh = CHIFLON_T0 - 54 / Math.max(120, topY(x) - baseY(x));
  s += Math.exp(-((t - tCh) ** 2) / (2 * 0.016 * 0.016)) * 10 *
       Math.exp(-((x - (CHIFLON_X + 18)) ** 2) / (42 * 42));
  // ── HORNACINA DEL NACIMIENTO (T_NACE): el hilo brotaba de un canto liso, a
  // media ladera, sin nada que explicara de dónde sale ("la parte alta sale muy
  // rara para bajar"). Ahora justo ENCIMA del nacimiento la cara se HUNDE —
  // nicho en sombra, el rincón de donde mana el agua — y en el labio mismo
  // SOBRESALE una cornisa corta: el hilo salta de un borde de piedra real.
  // Solo en el corredor del canal, sin tocar la hendidura (gorgeAt). ──
  const nearN = Math.exp(-((x - pathX(t)) ** 2) / (68 * 68));
  s -= nearN * 19 * Math.exp(-((t - (T_NACE + 0.034)) ** 2) / (2 * 0.021 * 0.021));
  s += nearN * 12 * Math.exp(-((t - T_NACE) ** 2) / (2 * 0.012 * 0.012));
  return s;
}

// ── ESTRATOS: bedding cuasi-horizontal con buzamiento leve ──
const STRATA_P = 13;  // separación vertical entre bancos (bedding FINO — textura, no franjas)
function strataF(x, y) {
  const warp = fbm(x / 260 + 3.1, 0.5, 2) * 14 + Math.sin(x * 0.0038) * 5; // ondulación del banco
  const sy = (y + warp) / STRATA_P;
  return sy - Math.floor(sy);          // 0..1 dentro del banco
}

// máscara de afloramiento de roca desnuda (0=bosque, 1=piedra pelada):
// manchones irregulares a dos escalas + el ANFITEATRO que el agua talló en el
// canal + cornisas bajo cada repisa de salto (la foto: cada salto golpea piedra)
export function rockMask(x, y, t) {
  // parches IRREGULARES a dos escalas, casi isótropos: NADA de bandas
  // horizontales uniformes (el bandeado mecánico leía curvas de nivel — el
  // operador lo marcó). La roca asoma en manchones sueltos entre el bosque.
  const o = (fbm(x / 160 + 1.7, y / 115 + 8.2, 3) * 0.5 + 0.5) * 0.66 +
            (fbm(x / 52 + 5.3, y / 38 + 3.9, 2) * 0.5 + 0.5) * 0.34;
  // sesgo suave hacia el corredor del agua; PARCHES SUELTOS, el bosque manda
  const corridor = 0.22 + 0.78 * Math.exp(-((x - pathX(t)) ** 2) / (280 * 280));
  let m = sstep(0.705, 0.775, o) * corridor * (0.35 + 0.65 * sstep(0.12, 0.40, t));
  // ── CONTRAFUERTE estratificado (file_157): pared de roca expuesta tan/gris
  // a la derecha del agua, a media altura — el BORDE lo dicta el ruido (nada
  // de elipse perfecta: la campana solo es el envelope) ──
  const btN = fbm(x / 105 + 2.2, y / 78 + 5.1, 3) * 0.5 + 0.5;
  const bt = Math.exp(-((x + 424) ** 2) / (100 * 100) - ((t - 0.50) ** 2) / (0.10 * 0.10));
  // más quebrado y contenido: los manchones grandes leían como claros de
  // tierra flotando en el bosque, no como afloramiento
  m = Math.max(m, sstep(0.54, 0.70, btN * (0.35 + bt * 0.85)) * sstep(0.16, 0.48, bt));
  // ── CORONA DE ROCA BLANCA (file_158): banda angosta estratificada bajo la
  // cumbre redondeada, cargada al flanco IZQUIERDO del macizo, rota en tramos ─
  // banda ANGOSTA (~35 u): cinta clara quebrada bajo el domo, no casquete
  const crownT = sstep(0.845, 0.875, t) * (1 - sstep(0.905, 0.935, t));
  // acotada AL MACIZO de La Chorrera y al flanco bajo la cumbre (158: la
  // banda gris quebrada vive a la izquierda bajo el domo, no envuelve todo)
  // + MÁS ROTA: umbral alto = repisas sueltas, no faja continua
  m = Math.max(m, 0.8 * crownT * (1 - sstep(-549, -289, x)) * sstep(-949, -769, x) *
    sstep(0.37, 0.58, fbm(x / 230 + 9.1, y / 95 + 4.4, 2) * 0.5 + 0.5));
  // el anfiteatro pegado al camino del agua: la piedra que el hilo cortó —
  // SOLO el tramo bajo-medio (flanqueaba la caída entera de tan liso; en la
  // foto el entorno del hilo es verde y la roca asoma en la garganta baja)
  const nearCh = Math.exp(-((x - pathX(t)) ** 2) / (40 * 40));
  m = Math.max(m, nearCh * sstep(0.55, 0.74, fbm(x / 120 + 2.4, y / 85 + 7.7, 2) * 0.5 + 0.5) *
    sstep(0.10, 0.28, t) * (1 - sstep(0.50, 0.68, t)));
  // ── LA ROCA DEL NACIMIENTO: el labio y el nicho de T_NACE son piedra
  // desnuda, no dosel — el hilo SALE DE LA ROCA (file_158: el agua brota de
  // una banda rocosa quebrada, jamás del bosque cerrado) ──
  const birth = Math.exp(-((x - pathX(t)) ** 2) / (58 * 58)) *
    Math.exp(-((t - T_NACE) ** 2) / (2 * 0.030 * 0.030));
  m = Math.max(m, birth * 0.92 *
    sstep(0.33, 0.60, fbm(x / 88 + 3.3, y / 62 + 8.8, 2) * 0.5 + 0.5));
  for (const lt of SALTOS_T) {
    const dt = t - lt;
    // cornisa IRREGULAR bajo cada salto (modulada por ruido: nada de
    // rectángulos claros perfectos detrás del agua)
    if (dt < 0 && dt > -0.07) {
      const rough = sstep(0.35, 0.7, fbm(x / 34 + 6.1, y / 16 + 2.8, 2) * 0.5 + 0.5);
      m = Math.max(m, nearCh * sstep(-0.07, -0.025, dt) * 0.5 * rough);
    }
  }
  // Roca Blanca: la piedra clara asoma FRANCA junto al Chiflón
  // (refs-chorrera/chiflon-rocablanca.jpg: el farallón pálido con el socavón
  // vive a MEDIA LADERA de la montaña del Chiflón, arriba-izquierda del
  // salto — no coronando cresta ninguna). La banda de roca clara acompaña a
  // la piedra: t alrededor del labio, lado de AFUERA (+28·CHIFLON_LADO).
  const chifK = Math.exp(-((x - (CHIFLON_X + 28 * CHIFLON_LADO)) ** 2) / (58 * 58)) *
    sstep(CHIFLON_T0 - 0.05, CHIFLON_T0 + 0.05, t) * (1 - sstep(CHIFLON_T0 + 0.20, CHIFLON_T0 + 0.32, t));
  m = Math.max(m, chifK * 0.8 * sstep(0.45, 0.66, fbm(x / 85 + 4.2, y / 55 + 1.6, 2) * 0.5 + 0.5));
  return m;
}

// posición de la cara del farallón; t: 0 base → 1 cresta
// PARED, no ladera: el plano casi no se echa hacia atrás al subir (lean 18u en
// toda la altura). El relieve lo ponen los contrafuertes verticales + los
// escalones de estrato DENTRO de los afloramientos de roca.
export function facePos(x, t) {
  const B = baseY(x), H = topY(x);
  const y = B + (H - B) * t;
  // ── DRAPEADO SOBRE EL TERRENO REAL ──────────────────────────────────────
  // Antes: `z = FACE_Z + corrug(x)*… + bump…`, o sea un plano inventado a
  // z=-790 con panzas de hasta 117 u. Ahora el z lo dicta el DEM: `faceZAt`
  // devuelve dónde la ladera del frente alcanza esa altura. Todo lo que sigue
  // son offsets FINOS hacia la cámara (+z) — piel sobre la ladera de verdad,
  // no una montaña nueva.
  let z = faceZAt(x, y);
  // micro-relieve que el DEM no resuelve (9,4 m/px): manchones y costillas
  // cortas. Amplitud 6+2,5 u (antes 24+9 sobre un plano liso).
  const bump = fbm(x / 150 + 2.2, y / 120 + 5.5, 3) * 6 +
               fbm(x / 52 + 8.8, y / 44 + 1.9, 2) * 2.5;
  const g = gorgeAt(x, t);
  z += bump * (1 - g.slot * 0.5);
  // la hendidura cóncava sigue mandando sobre el micro-relieve (intacta): el
  // surco del canal ya está tallado en el terreno (terrain.js · channelAxis),
  // así que aquí sólo hunde la PIEL lo que falta para que nada la cruce.
  z -= g.carve * 0.35;
  const shelf = ledgeShelf(x, t);
  z += shelf;                        // las repisas de los saltos sobresalen
  const rk = rockMask(x, y, t);
  if (rk > 0.02) {
    const f = strataF(x, y);
    z += rk * ((f - 0.5) * 5 + 2);   // escalón de estrato donde hay roca desnuda
  }
  z -= gullyK(x, y) * 5;             // cárcavas verticales hundidas (antes 14)
  const tread = clamp(shelf / 11, 0, 1);
  return { y, z, k: rk, tread };
}

export function makeCliff(scene) {
  // ══════════════════════════════════════════════════════════════════════
  // ⛔ AQUÍ SE CONSTRUÍA LA LÁMINA: malla (x,t) de 301x227 vértices con su
  //    falda enterrada (APRON=16), su paleta de roca estratificada y sus
  //    cuatro costuras de fusión contra el terreno. BORRADA EN FIRME.
  //    El motivo, con números, está en la cabecera de este archivo y en el
  //    bloque ⛔ de `wallTopY` en terrain.js. Resumen: con el valle rotado la
  //    lámina TAPABA el escarpe real en los 21 azimuts del encuadre.
  //    La superficie visible del macizo es ahora la malla del DEM (terrain.js),
  //    que además pinta sus propias cornisas de roca sobre la elevación real.
  // ══════════════════════════════════════════════════════════════════════
  // velo verde-gris frío de la pasada 4: el lavanda anterior arrastraba el
  // dosel hacia gris-malva y lo hacía competir con la roca.
  const cVeil = new THREE.Color(0x9db8ab);

  // ── ATLAS DEL DOSEL (2026-08-07, PASADAS 4–5) ────────────────────────────
  // Es el mismo atlas procedural aprobado en `cliff.js`: moteado fino dentro
  // de la copa, fleco de hojas con alpha y filo verde entintado. Se pasa al
  // sistema LOD para que el experimento no congele la piel visual dos días
  // atrás junto con la copia de código.
  const texturaDosel = (() => {
    let semilla = 20260807;
    const rn = () => {
      semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
      let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 512;
    const ctx = cv.getContext('2d');
    const lerpHex = (h1, h2, t) => {
      const pa = parseInt(h1.slice(1), 16), pb = parseInt(h2.slice(1), 16);
      const r = ((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t;
      const g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t;
      const b = (pa & 255) + ((pb & 255) - (pa & 255)) * t;
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    };
    const hoja = (x, y, L, tono, alpha) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rn() * Math.PI);
      ctx.globalAlpha = alpha; ctx.fillStyle = tono;
      ctx.beginPath(); ctx.ellipse(0, 0, L, L / 2.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    ctx.fillStyle = '#31511d'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) hoja(rn() * 512, rn() * 512, 16 + rn() * 18, lerpHex('#22401a', '#31511d', rn() * 0.6), 0.4);
    for (let i = 0; i < 700; i++) hoja(rn() * 512, rn() * 512, 5 + rn() * 6, lerpHex('#2a4a1c', '#79a23c', rn() * 0.85), 0.8);
    for (let i = 0; i < 420; i++) hoja(rn() * 512, rn() * 512, 3 + rn() * 4.5, lerpHex('#4c7028', '#93b44e', rn()), 0.8);
    ctx.globalAlpha = 1; ctx.fillStyle = '#3a2b1b'; ctx.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 30; i++) {
      ctx.globalAlpha = 0.55 + rn() * 0.4;
      ctx.fillStyle = lerpHex('#241a10', '#57422a', rn());
      ctx.fillRect(rn() * 90, 0, 2 + rn() * 5, 96);
    }
    ctx.globalAlpha = 1;
    const punto = (spread) => {
      const an = rn() * Math.PI * 2, r = 256 * Math.pow(rn(), 0.58) * spread;
      return [768 + Math.cos(an) * r, 256 + Math.sin(an) * r];
    };
    for (let i = 0; i < 70; i++) { const [x, y] = punto(0.68); hoja(x, y, 20 + rn() * 20, lerpHex('#264618', '#3a5c26', rn() * 0.5), 0.55); }
    for (let i = 0; i < 260; i++) { const [x, y] = punto(0.97); hoja(x, y, 8 + rn() * 9, lerpHex('#33551f', '#79a23c', rn() * 0.6), 0.9); }
    for (let i = 0; i < 120; i++) {
      const an = rn() * Math.PI * 2, r = 256 * (0.80 + rn() * 0.12);
      hoja(768 + Math.cos(an) * r, 256 + Math.sin(an) * r, 3.5 + rn() * 4.5,
        lerpHex('#1a3313', '#2a4a1c', rn()), 0.62);
    }
    for (let i = 0; i < 170; i++) { const [x, y] = punto(0.92); hoja(x, y - 10 * rn(), 5 + rn() * 7, lerpHex('#4c7028', '#a3c258', 0.4 + rn() * 0.6), 0.85); }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  })();

  // ── BOSQUE DE NIEBLA de pared → IMPOSTOR-LOD (lib/impostor-lod.js) ────────
  // Reemplaza el dosel geométrico (~19.300 IcosahedronGeometry(r,0) en 6 draw
  // calls) por billboards de copa-masa en 3 niveles por distancia con
  // histéresis: CERCA malla real con volumen, MEDIA 3 billboards cruzados,
  // LEJOS billboard único encarado a cámara. Un InstancedMesh por nivel.
  //    · La textura es procedural (encenillo/gaque de páramo): verde dominante,
  //      acento amarillo MÍNIMO. Nada de eucalipto/pino pátula/retamo/acacia.
  //    · La siembra REPLICA la firma del dosel geométrico original (mismo
  //      `accept` de clusters, mismos tamaños de copa con los mismos emergentes,
  //      mismo enanismo altitudinal, misma luz de gran forma horneada por
  //      `shadeAt`) para que la silueta de la pared NO cambie al cruzar umbrales.
  //    · El auto-cableado lee la cámara que main.js ya expone en `window.__cam`
  //      (main.js:274): el orquestador sólo cambia el import del cliff.
  // parches MACRO de densidad: regiones grandes densas y ralas (anti-rejilla)
  const patchK = (x, y) => fbm(x / 240 + 7.7, y / 170 + 2.2, 2) * 0.5 + 0.5;
  const cliffSeed = Number(new URLSearchParams(location.search).get('cliffSeed')) || 11;
  const mulberry32 = (seed) => {
    let s = seed >>> 0;
    return () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let z = Math.imul(s ^ (s >>> 15), 1 | s);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Muestra `m` copas sobre la cara paramétrica y devuelve los CENTROS de copa
  // (con tamaño, luz horneada y posición ya anclada a la pared) para el
  // impostor. 56% dosel (mismo accept que canopy+lobes originales), 44%
  // relleno bajo (como el sotobosque) para que no quede UN hueco entre copas.
  const muestrearPared = (m) => {
    const out = [];
    const nDosel = Math.round(m * 0.56);
    const rn = mulberry32(cliffSeed ^ (m * 2654435761));
    let guard = m * 70;
    let i = 0;
    while (i < m && guard-- > 0) {
      // Soporte orgánico: la densidad cae gradualmente en los dos extremos
      // de la cara y el centro recibe jitter lateral, claros y parches macro.
      // Así no queda una línea de corte aunque la cara siga acotada a X0..X1.
      const x0 = X0 + rn() * (X1 - X0);
      const borde = sstep(X0, X0 + 92, x0) * sstep(X1 - 92, X1, x0);
      if (rn() > 0.22 + borde * 0.78) continue;
      const x = clamp(x0 + (rn() - 0.5) * 60, X0 - 45, X1 + 45);
      if (!esCara(x) && (!esCaraHalo(x) || rn() > 0.48)) continue;
      // hasta t=0.94: el domo va VERDE hasta la coronación (foto 158)
      const t = clamp(0.03 + rn() * 0.91 + (rn() - 0.5) * 0.035, 0.02, 0.95);
      const fp = facePos(x, t);
      if (fp.k > 0.35 + rn() * 0.35 && fp.tread < 0.35) continue; // borde bosque-roca DIFUSO
      if (Math.abs(x - pathX(t)) < 13 || Math.abs(x - CHIFLON_X) < 10) continue; // paso del agua
      const cl = fbm(x / 58 + 3.7, fp.y / 52 + 6.1, 2) * 0.5 + 0.5; // ruido de cluster
      const esDosel = i < nDosel;
      if (esDosel) {
        // MISMO accept que el dosel original (sampleFace/canopyPts)
        if (!((cl > 0.40 || fp.tread > 0.3 || rn() < 0.10) && rn() < 0.35 + patchK(x, fp.y) * 0.9)) continue;
      } else {
        // relleno bajo: como el sotobosque (accept `() => true`), casi todo
        if (rn() > 0.42 + patchK(x, fp.y) * 0.58) continue;
      }
      // ── TAMAÑOS: copas chicas contra la pared. El tamaño de mundo sí pasa
      // intacto al shader y la proyección lo reduce con distancia; el ajuste
      // es la HUELLA del atlas, no una compensación de pantalla. Un quad lleno
      // expone toda su silueta, mientras que la copa geométrica de la portada
      // mezcla volumen, cards y oclusión. Con el mismo diámetro nominal los
      // quads leían racimos de discos demasiado grandes. Esta escala conserva
      // el rango relativo, incluidos emergentes y enanismo altitudinal, pero
      // devuelve el grano fino del dosel de control.
      //   dosel   r = 3.4·(0.60+cl·0.7+rand·0.5)·enanismo·emergente
      //   relleno r = 3.0·(0.60+rand·0.7)·enanismo
      const huellaImpostor = 0.80;
      const dwarf = 1 - t * 0.30;                       // enanismo altitudinal (Humboldt)
      const emerg = esDosel ? (rn() < 0.03 ? 2.6 : rn() < 0.08 ? 1.8 : 1) : 1;
      const r = esDosel
        ? 3.4 * (0.60 + cl * 0.7 + rn() * 0.5) * dwarf * emerg
        : 3.0 * (0.60 + rn() * 0.7) * dwarf;
      const sy = THREE.MathUtils.clamp(r * 2 * huellaImpostor, 2, 14); // alto de quad en u
      const sx = sy * (0.72 + rn() * 0.34);
      // ── ANCLAJE a la pared: el centro queda pegado a la cara (+z), con el
      // cuerpo sobresaliendo hacia la cámara — si el billboard quedara DENTRO
      // de la roca, el z-buffer lo come y la pared se ve pelada (bug medido).
      const y = fp.y + sy * 0.3;
      const z = fp.z + sy * 0.90;
      // MISMA luz de gran forma que la cara (`shadeAt`) + parche + altura, y
      // variación de VALOR entre individuos (anti-brócoli: masa, no lunares).
      // El shader del billboard es UNLIT: la portada, en cambio, recibe la
      // rampa fría por canal de `paint()`. Pasamos aquí esa misma rampa RGB,
      // con una compensación contenida por la ausencia de luz del material;
      // el valor anterior (un solo escalar) aclaraba el dosel a verde-amarillo.
      // El velo de distancia lo pone el fog lineal del shader; su color sigue
      // siendo el verde-gris frío de la portada y su alcance se calibra abajo.
      const shRaw = Math.max(0.24,
        shadeAt(x, fp.y) * (0.62 + t * 0.36) * (0.86 + 0.26 * sstep(-650, 650, x)));
      const sh = Math.pow(shRaw, 0.72);
      const fr = THREE.MathUtils.clamp((1.05 - shRaw) * 0.75, 0, 0.62);
      const patch = 0.9 + patchK(x, fp.y) * 0.3;
      const unlit = 0.78 * patch;
      const tint = [
        THREE.MathUtils.clamp(sh * (1 - fr * 0.42) * unlit, 0.32, 1.05),
        THREE.MathUtils.clamp(sh * (1 + fr * 0.05) * unlit, 0.32, 1.05),
        THREE.MathUtils.clamp(sh * (1 + fr * 0.40) * unlit, 0.32, 1.05),
      ];
      out.push({ x, y, z, sx, sy, tint });
      i++;
    }
    return out;
  };

  // La huella más fina necesita más centros para conservar masa continua:
  // 0,80² × (25.000 / 20.000) = 0,80 de la cobertura proyectada anterior.
  // Sigue habiendo exactamente tres InstancedMesh; el presupuesto que crece
  // es de instancias/fragmentos, no de draw calls.
  const N = 25000;
  const sistema = makeImpostorLOD({
    count: N,
    alturaObjetivo: 8,
    posiciones: muestrearPared,
    paleta: { base: '#31511d', claro: '#79a23c', oscuro: '#22401a', acento: '#3a5c26' },
    moteado: texturaDosel,
    // El shader LOD usa niebla lineal; 11.000 u aproxima el velo de la
    // `FogExp2` de la portada en el plano medio sin lavar el verde.
    fog: { near: 0, far: 11000, color: cVeil.getHex() },
    wind: 0.35,                                      // los árboles se mueven, con suavidad
    seed: 11,
  });
  scene.add(sistema.group);
  // ── AUTO-CABLEADO ───────────────────────────────────────────────────────
  // El sistema necesita un `update(camera, dt)` por frame para repartir LOD y
  // escribir matrices. main.js ya expone la cámara en `window.__cam` (línea
  // 274): este rAF la lee y la alimenta. Costo ~17k sqrts/frame (~0,3 ms);
  // las matrices SOLO se reescriben cuando cambia la asignación de nivel.
  let _impLast = -1;
  const _impTick = () => {
    const cam = window.__cam;
    const now = performance.now();
    if (cam) {
      const dt = _impLast >= 0 ? (now - _impLast) / 1000 : 0;
      sistema.update(cam, dt);
    }
    _impLast = now;
    requestAnimationFrame(_impTick);
  };
  requestAnimationFrame(_impTick);
  window.__impostorCliff = sistema;   // hook del gate: counts()

  // ── FLECO DE CRESTA: arbustos achaparrados coronando el filo, en silueta
  // oscura contra la nube — el skyline dentado que grita "borde de pared".
  // Se conserva como geometría (240 instancias, 1 draw call): el filo es
  // silueta pura y las copas-masa no deben fabricarlo.
  {
    const N = 240;
    const fgeo = new THREE.IcosahedronGeometry(2.2, 0);
    fgeo.scale(1, 1.28, 1);
    const fmat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, color: 0xffffff });
    aplicarVientoMundo(fmat, { amplitud: 0.035, piso: 0.5, velocidad: 0.95 });
    const fringe = new THREE.InstancedMesh(fgeo, fmat, N);
    const fm4 = new THREE.Matrix4(), fq = new THREE.Quaternion(), fc = new THREE.Color();
    const frn = mulberry32((cliffSeed + 97) ^ 0x51f15e);
    for (let i = 0; i < N; i++) {
      const fx0 = X0 + frn() * (X1 - X0);
      const fringeBorde = sstep(X0, X0 + 70, fx0) * sstep(X1 - 70, X1, fx0);
      if (frn() > 0.18 + fringeBorde * 0.82) { i--; continue; }
      const fx = clamp(fx0 + (frn() - 0.5) * 16, X0, X1);
      if (!esCara(fx)) { i--; continue; }
      const ft = 0.985 + frn() * 0.02;
      // el fleco NO invade el paso del agua (labios de La Chorrera y Chiflón)
      if (Math.abs(fx - pathX(ft)) < 16 || Math.abs(fx - CHIFLON_X) < 12) { i--; continue; }
      const fp = facePos(fx, ft);
      const sc = 0.7 + frn() * 1.5;
      fq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), frn() * Math.PI * 2);
      fm4.compose(new THREE.Vector3(fx, fp.y + sc * 0.8, fp.z - 2), fq,
        new THREE.Vector3(sc, sc * (0.8 + frn() * 0.5), sc));
      fringe.setMatrixAt(i, fm4);
      fc.set(0x22301c).offsetHSL((frn() - 0.5) * 0.03, 0, (frn() - 0.5) * 0.06);
      fringe.setColorAt(i, fc);
    }
    fringe.instanceMatrix.needsUpdate = true;
    scene.add(fringe);

    // BORDE DE TRANSICIÓN: pocas copas volumétricas fuera de la columna
    // estricta. No son otra pared: solo rompen el contorno recto de los
    // billboards con el mismo DEM, el mismo paso de agua y una densidad baja.
    const EN = 900;
    const edge = new THREE.InstancedMesh(fgeo, fmat, EN);
    const ern = mulberry32((cliffSeed + 313) ^ 0x2a6f31);
    let ei = 0, eguard = EN * 80;
    while (ei < EN && eguard-- > 0) {
      const ex = X0 - 45 + ern() * (X1 - X0 + 90);
      if (esCara(ex) || !esCaraHalo(ex) || ern() > 0.55) continue;
      const et = 0.10 + ern() * 0.83;
      if (Math.abs(ex - pathX(et)) < 14 || Math.abs(ex - CHIFLON_X) < 11) continue;
      const efp = facePos(ex, et);
      const esc = 0.55 + ern() * 1.25;
      fq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ern() * Math.PI * 2);
      fm4.compose(new THREE.Vector3(ex, efp.y + esc * 0.45, efp.z + esc * 0.85), fq,
        new THREE.Vector3(esc, esc * (0.82 + ern() * 0.45), esc));
      edge.setMatrixAt(ei, fm4);
      fc.set(0x31511d).offsetHSL((ern() - 0.5) * 0.035, 0, (ern() - 0.5) * 0.12);
      edge.setColorAt(ei, fc);
      ei++;
    }
    edge.count = ei;
    edge.instanceMatrix.needsUpdate = true;
    edge.instanceColor.needsUpdate = true;
    scene.add(edge);
  }

  // ── ROCA BLANCA: el farallón de roca clara con su SOCAVÓN, al lado del
  //    Chiflón. EXISTE (el operador lo confirma; foto
  //    refs-chorrera/chiflon-rocablanca.jpg) y dentro está el mirador
  //    NATURAL: un rellano en la propia piedra, sin nada construido.
  //
  //    ⚠️ Venía inflada a 148 x 120 x 119 m — rechazada como "platillo beige
  //    sobre la cresta". Se queda en tamaño de peñón real (~33 m).
  //
  //    (2026-07-30) Y SE MUDA CON EL CHIFLÓN a su montaña propia: en la foto
  //    el farallón pálido vive a MEDIA LADERA, arriba-IZQUIERDA del salto
  //    (lado de afuera, +28·CHIFLON_LADO), con el socavón oscuro debajo —
  //    no coronando la cresta de la confluencia, que ya no es su casa.
  const rbX = CHIFLON_X + 28 * CHIFLON_LADO;
  const crest = facePos(rbX, CHIFLON_T0 + 0.10);
  const rbGeo = new THREE.IcosahedronGeometry(11, 2);
  const rp = rbGeo.attributes.position;
  let rbTop = -1e9;
  for (let i = 0; i < rp.count; i++) {
    const vx = rp.getX(i), vy = rp.getY(i), vz = rp.getZ(i);
    const n = fbm(vx / 4.5 + 3.3, (vy + vz) / 4.5 + 3.3, 3);
    const sc = 1 + n * 0.52;
    const nx = vx * sc * 1.1, ny = vy * sc * 0.85, nz = vz * sc * 0.95;
    rp.setXYZ(i, nx, ny, nz);
    if (ny > rbTop) rbTop = ny;
  }
  // ── EL RELLANO NATURAL: la cara alta de la roca se aplana en una repisa
  //    (con su propio grano, no una tapa lisa) — el mirador es ESO, la piedra
  //    misma, no una tarima. Sin baranda, sin madera, sin pilotes.
  const shelfY = rbTop * 0.52;
  for (let i = 0; i < rp.count; i++) {
    const vy = rp.getY(i);
    if (vy > shelfY) {
      const vx = rp.getX(i), vz = rp.getZ(i);
      const grain = fbm(vx / 3.1 + 7.7, vz / 3.1 + 7.7, 2) * 0.9;
      rp.setXYZ(i, vx, shelfY + grain, vz);
    }
  }
  rbGeo.computeVertexNormals();
  const rbMat = new THREE.MeshStandardMaterial({
    color: 0xd3d0c2, roughness: 0.96, metalness: 0, flatShading: true,
    emissive: 0x0e0d0c, emissiveIntensity: 0.35,
  });
  const roca = new THREE.Mesh(rbGeo, rbMat);
  roca.position.set(rbX, crest.y - 4, crest.z - 5);
  roca.rotation.z = 0.14;
  scene.add(roca);
  const roca2 = new THREE.Mesh(rbGeo.clone(), rbMat);
  roca2.scale.set(0.55, 0.45, 0.55);
  roca2.rotation.y = 1.9;
  roca2.position.set(rbX - 14, crest.y - 6, crest.z - 3);
  scene.add(roca2);
  // el SOCAVÓN (chiflon-rocablanca.jpg): el hueco en sombra excavado bajo el
  // canto del farallón — media bóveda oscura metida bajo la cara pálida.
  // No es geometría inventada de relieve: es la sombra del alero de la
  // propia roca, del lado del salto.
  const socGeo = new THREE.SphereGeometry(6.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const socMat = new THREE.MeshBasicMaterial({ color: 0x0b0d0c });
  const socavon = new THREE.Mesh(socGeo, socMat);
  socavon.scale.set(1.15, 0.7, 0.8);
  socavon.rotation.x = Math.PI;                 // bóveda abierta hacia abajo
  // AL FRENTE de la roca (+z, hacia la casa): con −1.5 quedaba enterrado
  // dentro de la ladera y desde el valle no se leía hueco ninguno.
  socavon.position.set(rbX + 4, crest.y - 10, crest.z + 2.5);
  scene.add(socavon);

  // ══════════════════════════════════════════════════════════════════════
  // ⛔ AQUÍ ESTABA EL "MIRADOR DEL CHIFLÓN": tarima de 28 x 20 m con 13
  //    postes de baranda de 5,3 m, 6 largueros y 4 pilotes de 13,3 m,
  //    plantada a 3262 msnm — 746 m por encima de la casa.
  //    BORRADO EN FIRME por orden del operador, que vive ahí:
  //      «Ese mirador no existe, hay que sacarlo. El mirador es natural,
  //       dentro de la propia roca.»
  //    No era un problema de escala: era una construcción que no está en el
  //    terreno. El mirador es el rellano de Roca Blanca, aquí arriba.
  //    NO LO VUELVAS A CREAR.
  // ══════════════════════════════════════════════════════════════════════

  return {};
}

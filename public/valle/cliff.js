// ── El farallón de La Chorrera: malla paramétrica propia ─────────────────────
// Grid (x, t) → (x, y(x,t), z(x,t)). Como z es libre, hay estratos y salientes
// VERDADEROS (cornisas que sobresalen, gargantas hundidas), cosa que un
// heightfield no puede. La cascada y el bosque de pared se drapean sobre esta
// misma función.
//
// chorrera-real-detalle.jpg (la referencia canónica):
//  · PARED casi vertical y masiva — no colina.
//  · Afloramientos de roca CLARA ESTRATIFICADA (líneas horizontales de piedra)
//    asomando en manchones entre el bosque, sobre todo junto al canal del agua.
//  · Bosque de niebla DENSO, CAÓTICO y CONTINUO: no se ve el suelo; copas de
//    todos los tamaños, emergentes sueltos, sombra profunda en las gargantas.
import * as THREE from 'three';
import { height, fbm, sstep, clamp, mix, faceCol, faceZAt, CHANNEL_X, CHIFLON_X, CHIFLON_LADO, CHIFLON_T0 } from './terrain.js';
// VIENTO EN EL BOSQUE DE PARED (2026-08-11): el dosel del farallón era el último
// manto verde del valle clavado — la regla dura dice que TODA la flora se mece.
// aplicarVientoMundo es el MISMO parche que ya menea el pasto y las copas de
// masa de flora.js (onBeforeCompile + uWind/seno sobre el reloj global uTiempoVM
// que auto-avanza quickGrass). NO three-stylized crudo (getShadow no compila en
// r160): este es el patrón del valle que ya pasó gate. Sombra no hay en el valle
// (ninguna luz castea), así que no se parchean depth materials.
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
  // velo de distancia (lo usa paint). PASADA 4: era 0xa3adc0 LAVANDA — la v3 ya
  // lo había bajado de 13% a 6% y aun así el juicio ciego encontró manchones
  // gris-malva: sobre un verde oscuro multiplicado, hasta un 6% de lavanda
  // arrastra el tono a malva. El velo del follaje va verde-gris FRÍO.
  const cVeil = new THREE.Color(0x9db8ab);

  // ── ATLAS DEL DOSEL (2026-08-07, PASADA 4) ───────────────────────────────
  // El juicio ciego v3 (ops/JUICIO-CIEGO-DOSEL-V3-2026-08-07.md) nombró el
  // material: «plástico verde moldeado, aguacates, repollos». Y la vara está
  // DENTRO del cuadro: los arbolitos de masa de flora.js ganan porque tienen
  // (1) textura de hoja ADENTRO de la silueta, (2) borde deshilachado de alta
  // frecuencia, (3) tronco que ancla, (4) sombra que no es parda. Este atlas
  // trae (1) y (2) al dosel instanciado SIN draw calls nuevos: una sola
  // textura por material, con tres regiones por UV —
  //   · mitad IZQUIERDA (opaca): moteado denso de hojitas = la piel del
  //     núcleo. Muere el color plano dentro de la silueta.
  //   · mitad DERECHA (alpha ralo al borde): racimo de hojitas = los cards
  //     del fleco. Muere la cuerda recta de polígono en el contorno.
  //   · esquina superior izquierda: corteza, para el tronco fusionado.
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
    // IZQUIERDA (opaca): interior de copa — GRANO fino de hojitas, no manchas.
    // Primera tanda: manchas de 26-60 px leían como CAMUFLAJE militar en el
    // plano cercano (parches lisos grandes = otra forma de color plano). El
    // grano de hoja es puntillismo: muchas hojitas chicas, sombra contenida.
    ctx.fillStyle = '#31511d'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 70; i++) hoja(rn() * 512, rn() * 512, 16 + rn() * 18, lerpHex('#22401a', '#31511d', rn() * 0.6), 0.4);
    for (let i = 0; i < 700; i++) hoja(rn() * 512, rn() * 512, 5 + rn() * 6, lerpHex('#2a4a1c', '#79a23c', rn() * 0.85), 0.8);
    for (let i = 0; i < 420; i++) hoja(rn() * 512, rn() * 512, 3 + rn() * 4.5, lerpHex('#4c7028', '#93b44e', rn()), 0.8);
    // CORTEZA (esquina superior izquierda): parche opaco para el tronco fusionado
    ctx.globalAlpha = 1; ctx.fillStyle = '#3a2b1b'; ctx.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 30; i++) {
      ctx.globalAlpha = 0.55 + rn() * 0.4;
      ctx.fillStyle = lerpHex('#241a10', '#57422a', rn());
      ctx.fillRect(rn() * 90, 0, 2 + rn() * 5, 96);
    }
    ctx.globalAlpha = 1;
    // DERECHA (alpha): el fleco — hojitas con centro denso y borde ralo (el
    // alpha del card cae orgánico: eso ES el deshilachado del contorno)
    const punto = (spread) => {
      const an = rn() * Math.PI * 2, r = 256 * Math.pow(rn(), 0.58) * spread;
      return [768 + Math.cos(an) * r, 256 + Math.sin(an) * r];
    };
    // deuda 3 del juicio v4 (mordidas de alpha): esta tanda —el centro denso
    // del stamp— eran 70 hojas GRANDES a α0.55: solas ya pasaban el alphaTest
    // (0.28) y su apiñamiento formaba un NÚCLEO sólido de ~300 px que la rampa
    // fría aplasta a negro; donde el card sobresale de la silueta, ese bloque
    // cuelga contra el fondo claro como tinta derramada (medido: quitar los
    // cards devuelve el crop 4x de ~4.3% a 2.9% de casi-negro — el resto es
    // sombra de escena). A α0.24 —POR DEBAJO del cutoff— la hoja grande sola
    // ya no renderiza: solo sobrevive donde la cubren las hojitas α0.85-0.9 o
    // donde se solapa consigo misma (0.24+0.24·0.76=0.42), y el núcleo se
    // rompe en trozos a escala de hoja. El lab A/B/C/D de esta medición vive
    // en _gate/INFORME-DOSEL-MORDIDAS-ALPHA.md.
    for (let i = 0; i < 70; i++) { const [x, y] = punto(0.68); hoja(x, y, 20 + rn() * 20, lerpHex('#264618', '#3a5c26', rn() * 0.5), 0.24); }
    for (let i = 0; i < 260; i++) { const [x, y] = punto(0.97); hoja(x, y, 8 + rn() * 9, lerpHex('#33551f', '#79a23c', rn() * 0.6), 0.9); }
    // FILO ENTINTADO (deuda 2 del juicio v4): anillo fino y ROTO de hojitas
    // casi-negras frías en la orilla del fleco — el card que cae a caballo del
    // contorno saca esta tinta al borde de la copa, como el filo del arbolito
    // de referencia. Recurso de lámina: dibujo, no polígonos. r 205-235 porque
    // la ventana UV del card (0.54-0.97) recorta el stamp a ~±225 px.
    // (α0.62/120/verde-tinta: la primera tanda a α0.85 con casi-negro #12240e
    // engordaba los manchones de alpha de la deuda 3 en los cards interiores)
    for (let i = 0; i < 120; i++) {
      const an = rn() * Math.PI * 2, r = 256 * (0.80 + rn() * 0.12);
      hoja(768 + Math.cos(an) * r, 256 + Math.sin(an) * r, 3.5 + rn() * 4.5,
        lerpHex('#1a3313', '#2a4a1c', rn()), 0.62);
    }
    for (let i = 0; i < 170; i++) { const [x, y] = punto(0.92); hoja(x, y - 10 * rn(), 5 + rn() * 7, lerpHex('#4c7028', '#a3c258', 0.4 + rn() * 0.6), 0.85); }
    // RELLENO BAJO EL ALPHA (deuda 3 del juicio v4): el canvas deja los texels
    // no dibujados del fleco en (0,0,0,0) — RGB NEGRO. El filtrado bilinear y
    // los mips interpolan ese negro hacia adentro de cada mordida del
    // alpha-test, y el card muestra manchones de tinta que ninguna hoja
    // dibujó. Rellenar el RGB de los texels vacíos con verde-sombra hace que
    // el filtrado interpole hacia follaje. El alpha queda en 8 (≪ alphaTest:
    // jamás pasa el corte) y NO en 0, porque putImageData re-premultiplica:
    // con alpha 0 el canvas no puede guardar RGB y el verde volvería a salir
    // negro en la subida a GPU.
    const img = ctx.getImageData(0, 0, 1024, 512);
    const px = img.data;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] < 8) { px[i - 3] = 34; px[i - 2] = 66; px[i - 1] = 26; px[i] = 8; }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  })();

  // ── BOSQUE DE NIEBLA de pared: masa densa, caótica y continua ──
  // Tres capas instanciadas sobre la misma cara paramétrica:
  //  1. dosel en CLUSTERS con emergentes sueltos (copas grandes e irregulares)
  //  2. sotobosque que rellena TODO hueco (matorral bajo, más oscuro)
  //  3. siluetas cónicas de acento (varía el contorno, rompe la repetición)
  const sampleFace = (nWant, accept) => {
    const out = [];
    let guard = nWant * 40;
    while (out.length < nWant && guard-- > 0) {
      const x = X0 + Math.random() * (X1 - X0);
      if (!esCara(x)) continue;
      // hasta t=0.94: el domo va VERDE hasta la coronación (foto 158 — el
      // bosque achaparrado cubre la cumbre; solo el fleco corona el filo)
      const t = 0.03 + Math.random() * 0.91;
      const fp = facePos(x, t);
      if (fp.k > 0.35 + Math.random() * 0.35 && fp.tread < 0.35) continue; // borde bosque-roca DIFUSO
      // …pero las REPISAS de los saltos sí se colonizan (la foto: cada
      // cornisa entre caída y caída carga su bosque)
      // La caída restaurada abre hasta ~24 u y la roca mojada necesita
      // respirar alrededor de cada terraza. El claro de 42 u mantiene el
      // canal legible sin convertir toda la garganta en un peladero.
      if (Math.abs(x - pathX(t)) < 42 || Math.abs(x - CHIFLON_X) < 10) continue; // paso del agua
      const cl = fbm(x / 58 + 3.7, fp.y / 52 + 6.1, 2) * 0.5 + 0.5; // ruido de cluster
      if (!accept(fp, cl, x)) continue;
      out.push({ x, t, cl, ...fp });
    }
    return out;
  };
  // luz cenital HORNEADA con TEMPERATURA (pasada 4): arriba claro neutro,
  // abajo oscuro FRÍO (verde-azulado). El juicio v3: la cara en sombra de la
  // copa salía gris-pardo CÁLIDO — exactamente el tono con que el motor pinta
  // la roca del mismo cuadro — y con esa sombra el ojo clasifica el objeto
  // como mineral por más verde que tenga arriba. El follaje real, en sombra,
  // se va a verde-azulado profundo. La rampa de bakeTopLight era GRIS (mismo
  // escalar en RGB); esta devuelve un multiplicador que hunde el rojo y sube
  // el azul hacia la base de la copa.
  const rampaFria = (t, bmp = 0.5, lo = 0.30, hi = 1.14) => {
    let k = lo + (hi - lo) * t;
    k *= 0.90 + bmp * 0.38;                 // grano intra-copa (sobrevive al velo)
    const w = 1 - t;                        // qué tan hondo en la sombra propia
    return [k * (1 - w * 0.44), k * (1 + w * 0.03), k * (1 + w * 0.38)];
  };

  // ── COPA ORGÁNICA (PASADA 4, 2026-08-07 tarde) ───────────────────────────
  // Historia completa, porque este dosel ya falló TRES veces y de tres modos:
  //  · Pasada 1: IcosahedronGeometry(r, 0) + flatShading — poliedros con las
  //    caras contables a 197-570 u (ops/PREPARACION-CAMARA-BIENVENIDA.md).
  //  · Pasada 2: elipsoide liso, amp 0.24 invisible al vuelo. Mató las facetas
  //    y aterrizó en "PIEDRAS" — pedregal gris-malva liso.
  //  · Pasada 3: ganó el verde… con lóbulos de amp 0.40 que REINTRODUJERON las
  //    caras contables (4-6 por copa, cuerdas rectas de silueta) y cero detalle
  //    interno: «plástico verde moldeado» (JUICIO-CIEGO-DOSEL-V3). El patrón:
  //    cada pasada movió UN dial y rompió el otro.
  //  · Pasada 4 (esto): los lóbulos BAJAN (amp 0.40→~0.26: «más lóbulos» era
  //    exactamente el dial equivocado) y lo que falta lo ponen los tres diales
  //    que el juicio nombró y nunca se habían movido: textura interna (atlas
  //    moteado por UV), sombra FRÍA (rampaFria + tinte en paint) y ruido de
  //    silueta de ALTA frecuencia (cards de hojas a caballo del contorno, en
  //    armarCopa). La referencia es el arbolito de flora.js del mismo cuadro.
  //  Normal radial suave: para follaje mate roughness 1, CERO facetas.
  //  El fbm es determinista en la posición: vértices duplicados iguales, sin
  //  costuras.
  const organicBlob = (r, detail, seed, ampL = 0.26, ampB = 0.22) => {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const pp = g.attributes.position, nn = g.attributes.normal, uu = g.attributes.uv;
    const bump = new Float32Array(pp.count);
    const v = new THREE.Vector3();
    for (let i = 0; i < pp.count; i++) {
      v.fromBufferAttribute(pp, i);
      const lob = fbm(v.x * 0.75 / r + seed, (v.y * 0.62 - v.z * 0.5) / r + seed * 1.7, 2);
      const bite = fbm((v.x * 2.2 + v.y * 0.9) / r + seed * 2.9, (v.y * 1.9 + v.z * 1.6) / r + seed * 5.3, 2);
      bump[i] = lob * 0.5 + bite * 0.5;     // viaja a rampaFria: grano de mata
      const d = 1 + lob * ampL + bite * ampB;
      pp.setXYZ(i, v.x * d, v.y * d, v.z * d);
      v.normalize();
      nn.setXYZ(i, v.x, v.y, v.z);
      // UV → mitad IZQUIERDA del atlas (moteado opaco), esquivando la corteza
      uu.setXY(i, 0.02 + uu.getX(i) * 0.40, 0.03 + uu.getY(i) * 0.75);
    }
    g.userData.bump = bump;
    return g;
  };

  // ── armarCopa: lóbulos + cards de fleco + tronco, UNA geometría ──────────
  // Fusiona en una sola BufferGeometry (posición/normal/uv/color — un solo
  // material, cero draw calls nuevos, cero instancias nuevas):
  //  1. los lóbulos orgánicos con la rampa fría horneada,
  //  2. CARDS de hojas a caballo de la superficie (prof 0.85-1.20: mitad
  //     adentro, mitad ASOMANDO) — el deshilachado de alta frecuencia del
  //     contorno que el juicio pidió, sin tocar el tamaño de los lóbulos,
  //  3. un TRONCO corto (UV a la corteza del atlas): «el bulto flota sobre el
  //     terreno» — el arbolito de referencia ancla, la copa del farallón no.
  const _zv = new THREE.Vector3(0, 0, 1);
  const armarCopa = (partes, { tCard = 1.8, cardsPorLobo = 14, tronco = 0, lo = 0.30, hi = 1.14 } = {}) => {
    const geos = partes.map((p) => {
      const g = organicBlob(p.r, p.detail, p.seed, p.ampL ?? 0.26, p.ampB ?? 0.22);
      if (p.o) g.translate(p.o[0], p.o[1], p.o[2]);
      return g;
    });
    const P = [], N = [], UV = [], C = [];
    let yMin = 1e9, yMax = -1e9;
    for (const g of geos) {
      const pp = g.attributes.position;
      for (let i = 0; i < pp.count; i++) { const y = pp.getY(i); if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
    }
    const span = Math.max(1e-3, yMax - yMin);
    for (const g of geos) {
      const pp = g.attributes.position, nn = g.attributes.normal, uu = g.attributes.uv, bb = g.userData.bump;
      for (let i = 0; i < pp.count; i++) {
        P.push(pp.getX(i), pp.getY(i), pp.getZ(i));
        N.push(nn.getX(i), nn.getY(i), nn.getZ(i));
        UV.push(uu.getX(i), uu.getY(i));
        const [cr, cg, cb] = rampaFria(clamp((pp.getY(i) - yMin) / span, 0, 1), bb[i], lo, hi);
        C.push(cr, cg, cb);
      }
      g.dispose();
    }
    // cards del fleco
    const dir = new THREE.Vector3(), eje = new THREE.Vector3(), qq = new THREE.Quaternion(), qr = new THREE.Quaternion();
    const esq = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const gs = () => (Math.random() + Math.random() + Math.random()) - 1.5;
    for (const p of partes) {
      const ox = p.o?.[0] ?? 0, oy = p.o?.[1] ?? 0, oz = p.o?.[2] ?? 0;
      for (let i = 0; i < cardsPorLobo; i++) {
        dir.set(gs(), gs(), gs());
        if (dir.lengthSq() < 1e-4) dir.set(0, 1, 0);
        dir.normalize();
        // el card cae SOBRE la superficie desplazada real (mismo fbm del lóbulo)
        const lob = fbm(dir.x * 0.75 + p.seed, (dir.y * 0.62 - dir.z * 0.5) + p.seed * 1.7, 2);
        const bite = fbm((dir.x * 2.2 + dir.y * 0.9) + p.seed * 2.9, (dir.y * 1.9 + dir.z * 1.6) + p.seed * 5.3, 2);
        const d = 1 + lob * (p.ampL ?? 0.26) + bite * (p.ampB ?? 0.22);
        const prof = 0.85 + Math.random() * 0.35;
        const px = ox + dir.x * p.r * d * prof, py = oy + dir.y * p.r * d * prof, pz = oz + dir.z * p.r * d * prof;
        eje.set(dir.x + gs() * 0.55, dir.y + gs() * 0.55, dir.z + gs() * 0.55).normalize();
        qq.setFromUnitVectors(_zv, eje);
        qr.setFromAxisAngle(eje, Math.random() * Math.PI * 2).multiply(qq);
        const t = tCard * (0.7 + Math.random() * 0.6), w = t / 2, h = t * 0.46;
        esq[0].set(-w, -h, 0); esq[1].set(w, -h, 0); esq[2].set(w, h, 0); esq[3].set(-w, h, 0);
        for (const v of esq) { v.applyQuaternion(qr); v.x += px; v.y += py; v.z += pz; }
        // el fleco es la CÁSCARA exterior: ve más cielo que el interior de la
        // copa. Sin este piso, el card que sobresale por la base hereda el
        // sótano absoluto de la rampa (t=0 → k=lo) y cuelga negro contra el
        // fondo claro (parte de las mordidas de la deuda 3, medido en lab).
        const [cr, cg, cb] = rampaFria(0.18 + 0.82 * clamp((py - yMin) / span, 0, 1), 0.35 + Math.random() * 0.55, lo, hi);
        const lum = 0.85 + Math.random() * 0.35;
        const flip = Math.random() < 0.5;
        const u0 = flip ? 0.97 : 0.54, u1 = flip ? 0.54 : 0.97, v0 = 0.03, v1 = 0.97;
        const uvs = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
        // normal de FOLLAJE: el eje del quad con sesgo hacia el cielo. Con el
        // eje pelado, el card cuyo azar lo dejó mirando al piso queda a pura
        // luz ambiente y se lee como tinta (el dial más fuerte de la deuda 3,
        // medido en lab con lotería clavada: -0.9 pt de casi-negro). El fleco
        // real dispersa luz de cielo aunque la hoja cuelgue — sesgar solo la
        // normal, no la orientación del quad, deja la silueta idéntica.
        const nyC = eje.y + 0.6, ilC = 1 / Math.hypot(eje.x, nyC, eje.z);
        for (const k of [0, 1, 2, 0, 2, 3]) {
          P.push(esq[k].x, esq[k].y, esq[k].z);
          N.push(eje.x * ilC, nyC * ilC, eje.z * ilC);
          UV.push(uvs[k][0], uvs[k][1]);
          C.push(cr * lum, cg * lum, cb * lum);
        }
      }
    }
    // tronco fusionado (UV a la corteza; vc cálido: la corteza SÍ es parda)
    if (tronco > 0) {
      const tg = new THREE.CylinderGeometry(tronco * 0.045 + 0.12, tronco * 0.075 + 0.16, tronco, 5, 1, true).toNonIndexed();
      tg.translate(0, -tronco * 0.42, 0);
      const tp = tg.attributes.position, tn = tg.attributes.normal, tu = tg.attributes.uv;
      for (let i = 0; i < tp.count; i++) {
        P.push(tp.getX(i), tp.getY(i), tp.getZ(i));
        N.push(tn.getX(i), tn.getY(i), tn.getZ(i));
        UV.push(0.005 + tu.getX(i) * 0.08, 0.83 + tu.getY(i) * 0.16);
        C.push(1.05, 0.82, 0.62);
      }
      tg.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(UV), 2));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
    return g;
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), tinte = new THREE.Color();
  const paint = (mesh2, pts, base, opts) => {
    pts.forEach((p, i) => {
      // enanismo altitudinal: hacia el filo el bosque se achaparra (Humboldt)
      const sc = opts.scale(p) * (1 - p.t * 0.30);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      m4.compose(new THREE.Vector3(p.x, p.y + sc * opts.lift, p.z + opts.out), q,
        new THREE.Vector3(sc, sc * (0.9 + Math.random() * 0.35), sc));
      mesh2.setMatrixAt(i, m4);
      // MISMA luz horneada que la cara (garganta oscura / contrafuerte al sol)
      // + variación fuerte de VALOR entre individuos (anti-brócoli: masa, no lunares)
      // tinte por PARCHE: rodales enteros viran de tono (complejidad ecológica
      // real — manchas de encenillo vs gaque vs claros, no verde uniforme)
      const pk = fbm(p.x / 240 + 7.7, p.y / 170 + 2.2, 2);
      // PASADA 4: `base` ya no es el albedo (el verde vive en el ATLAS del
      // material) — es un MULTIPLICADOR claro sobre la textura. El jitter de
      // tono/saturación por parche sigue operando sobre él.
      col.set(base).offsetHSL(pk * 0.055 + (Math.random() - 0.5) * 0.045,
        pk * 0.08 + 0.11 + (Math.random() - 0.5) * 0.08,
        pk * 0.05 + (Math.random() - 0.5) * 0.11);
      // SOMBRA FRÍA (pasada 4, el dial que el juicio v3 valoró por encima de
      // toda la geometría): lo hundido NO se apaga a gris — vira a verde-
      // azulado profundo. El multiplicador escalar de la v3 conservaba el tono
      // y la copa en sombra caía en el MISMO gris-pardo cálido con que el
      // motor pinta la roca del cuadro: lectura mineral instantánea. Piso 0.24
      // intacto (la garganta sigue oscura, shadeAt sigue mandando el relieve).
      // PASADA 5 (deuda 1 del juicio v4): el multiplicador aplastaba el
      // contraste del `map` donde la sombra se hunde — la media copa del plano
      // cercano quedaba lisa y leía domo musgoso. Gamma 0.72 sobre el producto:
      // levanta el extremo oscuro (0.40→0.52) sin mover el 1.0 y sin invertir
      // el orden — la garganta sigue más oscura, el relieve horneado se
      // conserva. El tinte frío se calcula sobre el valor SIN levantar: la
      // sombra recupera luz (el moteado sobrevive al flanco) pero no pierde
      // frialdad (el gris-pardo cálido era la otra mitad del defecto).
      const shRaw = Math.max(0.24,
        shadeAt(p.x, p.y) * (0.62 + p.t * 0.36) * (0.86 + 0.26 * sstep(-650, 650, p.x)));
      const sh = Math.pow(shRaw, 0.72);
      const fr = clamp((1.05 - shRaw) * 0.75, 0, 0.62);
      tinte.setRGB(sh * (1 - fr * 0.42), sh * (1 + fr * 0.05), sh * (1 + fr * 0.40));
      col.multiply(tinte);
      // velo de distancia contra el fondo (bug 3b): 6%, y desde la pasada 4 en
      // verde-gris frío — el lavanda de siempre era el asesino del verde.
      col.lerp(cVeil, 0.06);
      mesh2.setColorAt(i, col);
    });
    mesh2.instanceMatrix.needsUpdate = true;
    scene.add(mesh2);
  };

  // 1) dosel: copas CHICAS (contra la pared deben leerse como musgo — la
  // escala del farallón la dan ellas) en clusters con huecos, pocos emergentes
  // parches MACRO de densidad: regiones grandes densas y ralas (anti-rejilla)
  const patchK = (x, y) => fbm(x / 240 + 7.7, y / 170 + 2.2, 2) * 0.5 + 0.5;
  const canopyPts = sampleFace(9000, (fp, cl, x) =>
    (cl > 0.40 || fp.tread > 0.3 || Math.random() < 0.10) && Math.random() < 0.35 + patchK(x, fp.y) * 0.9);
  // el dosel se parte en DOS mallas del mismo total (9.000 — el piso, no el
  // techo): las copas rasas con detail 1 (80 caras + lóbulos) y los EMERGENTES
  // FRANCOS —los que el vuelo de bienvenida ve a 30-50 px— con detail 2, que
  // es donde la subdivisión paga. Misma distribución que antes: 3% × 2.6,
  // luego 8% × 1.8.
  const rasoPts = [], emergPts = [];
  for (const p of canopyPts) {
    p.emerg = Math.random() < 0.03 ? 2.6 : Math.random() < 0.08 ? 1.8 : 0;
    (p.emerg ? emergPts : rasoPts).push(p);
  }
  // copas rasas (pasada 4): lóbulos contenidos + piel moteada + fleco de
  // cards + tronco, todo en la MISMA malla instanciada (cero draw calls y
  // cero instancias nuevas — el conteo no-poda se conserva).
  const blobGeo = armarCopa(
    [{ r: 3.4, detail: 1, seed: 3.1 }],
    { tCard: 1.9, cardsPorLobo: 14, tronco: 8.2, lo: 0.30, hi: 1.14 });
  blobGeo.scale(1, 1.18, 1);
  // el verde vive en el ATLAS; el material es UNO por capa, con alpha-test
  // (sin sorting) y doble cara para los cards del fleco.
  const blobMat = new THREE.MeshStandardMaterial({
    map: texturaDosel, alphaTest: 0.28, side: THREE.DoubleSide,
    roughness: 1, vertexColors: true,
  });
  // VIENTO EN EL DOSEL (2026-08-11, regla dura: TODA la flora se mece). El peso
  // del meneo lo da la altura LOCAL del vértice (armarCopa hornea el tronco de
  // 0 hacia ABAJO y los lóbulos de la copa por ENCIMA): piso 0 = base plantada,
  // copa que se dobla hacia la punta. Amplitudes en unidades de MUNDO — la
  // proyección mundo→instancia de aplicarVientoMundo cancela la escala de cada
  // individuo. Son copas a DISTANCIA sobre la pared: meneo modesto, no gelatina.
  // ⚠️ blobMat.clone() copia userData por JSON: si el base ya está parcheado el
  // clone hereda la marca `__vientoMundo` y la idempotencia se traga su parche.
  // `conViento` limpia la marca antes de aplicar (cada capa tiene su amplitud).
  const conViento = (mat, opts) => {
    if (mat.userData) delete mat.userData.__vientoMundo;
    return aplicarVientoMundo(mat, opts);
  };
  conViento(blobMat, { amplitud: 0.045, piso: 0, velocidad: 0.95 });   // copas rasas
  const canopy = new THREE.InstancedMesh(blobGeo, blobMat, rasoPts.length);
  // las bases pasan de albedo a MULTIPLICADOR claro (el albedo es el atlas);
  // la referencia sin coartada siguen siendo los arbolitos de flora.js del
  // mismo cuadro, que el juicio leyó como vegetación.
  paint(canopy, rasoPts, 0xdfeec8, {
    lift: 0.9, out: 1.2,
    scale: (p) => 0.58 + p.cl * 0.78 + Math.random() * 0.55,
  });
  // EMERGENTES: racimo de 3 lóbulos (v3) — ahora con amplitud CONTENIDA (los
  // lóbulos de 0.38-0.42 eran las «4-6 caras contables por copa» del juicio),
  // fleco de cards más franco (son las copas que el vuelo ve a 30-50 px) y
  // tronco de emergente.
  const emergGeo = armarCopa([
    { r: 3.4, detail: 2, seed: 7.4, ampL: 0.30, ampB: 0.24, o: [0, 0.5, 0] },
    { r: 2.5, detail: 2, seed: 12.6, ampL: 0.32, ampB: 0.26, o: [2.1, -0.4, 1.0] },
    { r: 2.2, detail: 2, seed: 5.9, ampL: 0.32, ampB: 0.26, o: [-1.9, 1.3, -1.1] },
  ], { tCard: 2.3, cardsPorLobo: 15, tronco: 10.5, lo: 0.30, hi: 1.14 });
  emergGeo.scale(1, 1.18, 1);
  const emergMat = blobMat.clone();
  conViento(emergMat, { amplitud: 0.055, piso: 0.5, velocidad: 0.95 });   // emergentes
  const emergentes = new THREE.InstancedMesh(emergGeo, emergMat, emergPts.length);
  paint(emergentes, emergPts, 0xdfeec8, {
    lift: 0.9, out: 1.2,
    scale: (p) => (0.58 + p.cl * 0.78 + Math.random() * 0.55) * p.emerg, // emergentes FRANCOS
  });

  // 1b) copas BILOBULADAS: segundo arquetipo de silueta irregular (mata la
  // textura repetida de gomitas idénticas)
  {
    const lobeGeo = armarCopa([
      { r: 2.9, detail: 1, seed: 11.2 },
      { r: 2.0, detail: 1, seed: 4.8, ampL: 0.28, ampB: 0.24, o: [2.3, 1.6, 0.5] },
    ], { tCard: 1.8, cardsPorLobo: 12, tronco: 7.4, lo: 0.32, hi: 1.12 });
    const lobePts = sampleFace(3200, (fp, cl, x) =>
      (cl > 0.34 || Math.random() < 0.14) && Math.random() < 0.35 + patchK(x, fp.y) * 0.9);
    const lobeMat = blobMat.clone();
    conViento(lobeMat, { amplitud: 0.045, piso: 0.5, velocidad: 0.95 });   // bilobuladas
    const lobes = new THREE.InstancedMesh(lobeGeo, lobeMat, lobePts.length);
    paint(lobes, lobePts, 0xe4f4c6, { lift: 0.8, out: 1.1, scale: (p) => 0.56 + p.cl * 0.67 + Math.random() * 0.5 });
  }

  // 2) sotobosque: relleno bajo y oscuro POR TODA la cara (mata el suelo liso).
  // Sin tronco (es matorral), pero CON piel moteada y fleco: sus bultos pardos
  // eran buena parte de los «guijarros» del juicio en la ribera.
  const underPts = sampleFace(5500, () => true);
  const underGeo = armarCopa(
    [{ r: 2.4, detail: 1, seed: 9.7, ampB: 0.24 }],
    { tCard: 1.5, cardsPorLobo: 8, lo: 0.38, hi: 1.0 });
  underGeo.scale(1.25, 0.72, 1.1);
  const underMat = blobMat.clone();
  conViento(underMat, { amplitud: 0.025, piso: -0.2, velocidad: 0.95 });   // sotobosque (bajo)
  const under = new THREE.InstancedMesh(underGeo, underMat, underPts.length);
  paint(under, underPts, 0x9db884, { lift: 0.5, out: 0.8, scale: () => 0.62 + Math.random() * 0.78 });

  // 3) acentos cónicos: siluetas esbeltas que rompen la gomita repetida —
  // con la piel moteada del atlas y rampa fría (eran color plano)
  const spirePts = sampleFace(600, (fp, cl) => cl > 0.52);
  const spireGeo = (() => {
    const cg = new THREE.ConeGeometry(1.5, 6.5, 5).toNonIndexed();
    const pp = cg.attributes.position, uu = cg.attributes.uv;
    const cc = new Float32Array(pp.count * 3);
    for (let i = 0; i < pp.count; i++) {
      uu.setXY(i, 0.02 + uu.getX(i) * 0.40, 0.03 + uu.getY(i) * 0.75);
      const [cr, cg2, cb] = rampaFria(clamp((pp.getY(i) + 3.25) / 6.5, 0, 1), 0.5, 0.36, 1.06);
      cc[i * 3] = cr; cc[i * 3 + 1] = cg2; cc[i * 3 + 2] = cb;
    }
    cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    cg.translate(0, 2.6, 0);
    return cg;
  })();
  const spireMat = blobMat.clone();
  conViento(spireMat, { amplitud: 0.035, piso: 1.0, velocidad: 0.95 });    // acentos cónicos
  const spires = new THREE.InstancedMesh(spireGeo, spireMat, spirePts.length);
  paint(spires, spirePts, 0xc2d8a8, { lift: 0.35, out: 0.8, scale: () => 0.5 + Math.random() * 0.7 });

  // 4) columnas: silueta vertical esbelta (laurel/encenillo viejo) — cuarto
  // arquetipo contra el mosaico de gomitas idénticas
  const colPts = sampleFace(1000, (fp, cl) => cl > 0.35 && Math.random() < 0.7);
  const colGeo = armarCopa(
    [{ r: 2.2, detail: 1, seed: 5.3, ampB: 0.24 }],
    { tCard: 1.4, cardsPorLobo: 12, tronco: 4.6 });
  colGeo.scale(0.72, 2.1, 0.72);
  const colMat = blobMat.clone();
  conViento(colMat, { amplitud: 0.045, piso: 0.8, velocidad: 0.95 });      // columnas esbeltas
  const colsM = new THREE.InstancedMesh(colGeo, colMat, colPts.length);
  paint(colsM, colPts, 0xb3cc96, { lift: 1.0, out: 1.0, scale: () => 0.6 + Math.random() * 0.85 });

  // ── FLECO DE CRESTA: arbustos achaparrados coronando el filo, en silueta
  // oscura contra la nube — el skyline dentado que grita "borde de pared" ──
  {
    const N = 240;
    // el fleco vive en SILUETA contra la nube: el skyline dentado lo dan el
    // lóbulo orgánico y AHORA el fleco de cards (borde mordido fino contra el
    // cielo, no cuerda de polígono)
    const fgeo = armarCopa(
      [{ r: 2.2, detail: 1, seed: 8.8, ampL: 0.28, ampB: 0.26 }],
      { tCard: 1.6, cardsPorLobo: 12, lo: 0.34, hi: 1.05 });
    fgeo.scale(1, 1.28, 1);
    const fmat = blobMat.clone();
    conViento(fmat, { amplitud: 0.035, piso: 0.5, velocidad: 0.95 });       // fleco de cresta
    const fringe = new THREE.InstancedMesh(fgeo, fmat, N);
    const fm4 = new THREE.Matrix4(), fq = new THREE.Quaternion(), fc = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const fx = X0 + Math.random() * (X1 - X0);
      if (!esCara(fx)) { i--; continue; }
      const ft = 0.985 + Math.random() * 0.02;
      // el fleco NO invade el paso del agua (labios de La Chorrera y Chiflón)
      if (Math.abs(fx - pathX(ft)) < 44 || Math.abs(fx - CHIFLON_X) < 12) { i--; continue; }
      const fp = facePos(fx, ft);
      const sc = 0.7 + Math.random() * 1.5;
      fq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2);
      fm4.compose(new THREE.Vector3(fx, fp.y + sc * 0.8, fp.z - 2), fq,
        new THREE.Vector3(sc, sc * (0.8 + Math.random() * 0.5), sc));
      fringe.setMatrixAt(i, fm4);
      // multiplicador sobre el atlas (no albedo): silueta verde PROFUNDA
      // contra la nube — oscura, pero nunca el casi-negro pardo de antes
      fc.set(0x74875f).offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.06);
      fringe.setColorAt(i, fc);
    }
    fringe.instanceMatrix.needsUpdate = true;
    scene.add(fringe);
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

// ── criaturas/oso.js — OSO ANDINO · Tremarctos ornatus ──────────────────────
//
// SEGUNDA RECONSTRUCCIÓN, con el patrón que salvó a la guacamaya: UNA SOLA
// PIEL. La versión anterior era el mismo defecto arquitectónico que mató a la
// guacamaya v1: primitivas apiladas (25 esferas en tronco y cabeza, patas de
// masa+tubo+esfera) que dejaban COSTURAS — collares en codos y rodillas, tapas
// asomando como anillos, y ~88 mechones del vientre que se leían verrugas.
//
// Tres decisiones sostienen esta versión:
//
//   1. UNA SOLA PIEL. Cola, grupa, lomo, joroba, cuello, cráneo y hocico son
//      UN solo loft continuo (cuerpoOrganico a resolución alta). Donde no hay
//      unión, no hay costura. La cola es el muñón del remate trasero del mismo
//      loft — no una esfera pegada.
//   2. CADA PATA ES UN SOLO TUBO, de adentro del tronco hasta los dedos. El
//      pie plantígrado es el FINAL del mismo loft: la trasera hace muslo →
//      rodilla adelante → tibia atrás → talón casi al piso → planta larga.
//      El radio se cuelga de las articulaciones reales (tDeCadena) y el pie
//      se aplana y ensancha por post-proceso de vértices. Cero masas, cero
//      esferas intermedias = cero collares.
//   3. PELAJE = MASA. Ni un mechón geométrico: dos pasadas de `despeinar`
//      (grano fino + grano grueso) con sesgo por zona, más vetas de flujo de
//      pelo multiplicativas en la pintura (el truco de las barbas de la
//      guacamaya). Los mechones-verruga de la pasada anterior no vuelven.
//
// La identidad de especie que TIENE que leerse (sin ella no es un oso de
// anteojos): cara corta con el cráneo mandando, orejas chicas redondas, LOS
// ANTEOJOS como aros crema casi CERRADOS alrededor de cada ojo (ruptura baja:
// la pasada anterior con 0.44 los volvía mancha de frente), hocico habano,
// babero del pecho CONECTADO a los aros por franjas de garganta, pie
// plantígrado con cinco uñas, y ningún rastro de cola.
//
// Unidades: METROS, mira a +X, y=0 es el piso.

import * as THREE from 'three';
import {
  rng, poner, pintarPlano, pintarPorVertice, pintarMancha, pintarAnillo,
  fusionar, hornearPelaje, cuerpoOrganico, orejaRedonda, garraCurva, despeinar,
  materialPelaje, crearAnclas, ruidoFbm, clamp01, suavePaso, mezclar,
  perfilParadas, tDeCadena, tuboCurva,
} from '../anatomia.js';
import { crearSer } from '../../../lib3d/creatures/generarSer.js';
import { construirBastonFrailejon } from './bastonFrailejon.js';

const PELO       = '#211a14';   // negro pardo cálido: en negro puro el volumen se pierde
const PELO_CLARO = '#3a2e20';
const CREMA      = '#e8d4a6';   // los anteojos y el babero
const HOCICO     = '#c9a276';   // el morro habano (la única nota cálida de la cara)
const TRUFA      = '#15110e';
const OJO        = '#120e0b';
const UNA        = '#4a3d2e';   // queratina oscura
const BOCA       = '#2b1f19';
const OREJA_INT  = '#191310';

/* La mano no se adivina con una coordenada de escena: se toma de los vértices
   de la pata que realmente se va a ver agarrando el bastón. */
function muestrearManoDelantera(geo) {
  const pos = geo.attributes.position;
  const mano = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    if (x < 0.20 || y > 0.16) continue; // palma y dedos, no el antebrazo
    mano.x += x;
    mano.y += y;
    mano.z += pos.getZ(i);
    n++;
  }
  if (!n) throw new Error('oso: no se pudo muestrear la mano delantera');
  return mano.multiplyScalar(1 / n);
}

/* ═══ LA PIEL ÚNICA ══════════════════════════════════════════════════════════
   t=0 es la cola, t=1 la trufa. Espina y radios van por PARADAS con transición
   smoothstep: la grupa llena pero MÁS BAJA que la cruz, LA JOROBA de músculo
   sobre los hombros, el cuello corto y macizo (la cabeza casi sentada en el
   hombro), el cráneo que manda y el hocico que apenas asoma y cae. */
const LARGO = 1.44;

const espina = perfilParadas([
  [0.00, 0.545],   // muñón de cola
  [0.09, 0.575],   // grupa llena
  [0.34, 0.552],   // la silla del lomo
  [0.58, 0.634],   // LA CRUZ: por encima de la grupa
  [0.72, 0.656],   // base del cuello, subiendo
  [0.88, 0.692],   // cráneo — hundido entre los hombros, no izado
  [0.95, 0.686],   // el stop de la frente
  [1.00, 0.668],   // la trufa cae apenas: morro recto y ROMO
]);
/* ⚠️ CARA CORTA, medida DOS veces en captura: las primeras pasadas de esta
   piel estiraban el taper del morro por un cuarto del loft y el bicho salía
   COATÍ. El cráneo manda hasta t≈0.95 y el morro es SOLO el último 5 % del
   loft (~10 cm), terminando GORDO (radios finales ~0.05-0.06, no punta):
   el remate romo con la trufa encima es lo que lee "oso". */
const arriba = perfilParadas([
  [0.00, 0.062], [0.09, 0.178], [0.33, 0.165],
  [0.58, 0.212],   // la joroba
  [0.66, 0.186],   // la joroba muere DENTRO del cuello: nuca corta
  [0.78, 0.158],   // cuello macizo
  [0.88, 0.124],   // cráneo
  [0.95, 0.092],   // frente/ceja
  [1.00, 0.054],   // el morro remata GORDO: cara corta, no trompa
]);
const abajo = perfilParadas([
  [0.00, 0.070], [0.09, 0.168],
  [0.38, 0.208],   // la barriga cuelga
  [0.62, 0.196],   // pecho hondo
  [0.76, 0.138],   // garganta gruesa
  [0.88, 0.102],   // mandíbula
  [0.95, 0.078],   // quijada llena
  [1.00, 0.048],
]);
const lado = perfilParadas([
  [0.00, 0.075], [0.09, 0.182], [0.36, 0.198],
  [0.60, 0.198],   // hombros
  [0.76, 0.150],   // cuello macizo
  [0.88, 0.130],   // cachetes anchos
  [0.95, 0.106],   // pómulos: la cara sigue ancha
  [1.00, 0.062],   // morro ROMO, nunca punta
]);

/* Punto analítico sobre la piel: los ojos van APOYADOS en la superficie (la
   pasada anterior los dejó hundidos y el anteojo se quedaba sin ojo adentro). */
function superficie(t, a) {
  const s = Math.sin(a), c = Math.cos(a);
  const ry = s >= 0 ? arriba(t) : abajo(t);
  return [-LARGO / 2 + t * LARGO, espina(t) + s * ry, c * lado(t)];
}

/* ═══ EL PIE PLANTÍGRADO, por post-proceso del MISMO tubo ════════════════════
   Aplana la planta contra el piso, ensancha el pie y ondula el frente para
   insinuar los cinco dedos — sin pegar ni una esfera. */
function pieOso(geo, { zCentro, xDedos }) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (y > 0.115) continue;
    const f = suavePaso(0.115, 0.030, y);           // 1 abajo, 0 arriba
    let ny = mezclar(y, Math.max(0.012, 0.012 + (y - 0.012) * 0.34), f);
    if (ny < 0.010) ny = 0.010;                     // nada atraviesa el piso
    const nz = zCentro + (z - zCentro) * (1 + 0.26 * f);
    // los dedos: ondulación del empeine, solo en el frente del pie
    const fd = suavePaso(xDedos - 0.055, xDedos + 0.012, x) * f * suavePaso(0.016, 0.038, ny);
    if (fd > 0) ny -= 0.0035 * fd * (0.5 + 0.5 * Math.cos((z - zCentro) * 205));
    pos.setXYZ(i, x, ny, nz);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function construirOso({ baston = true } = {}) {
  const r = rng(9137);
  const pelo = [];      // lo que recibe manchas, despeinado y horneado
  const detalle = [];   // ojos, trufa, boca, uñas: no se despeinan
  const A = crearAnclas();

  /* Pintura de pelaje compartida por piel y patas: base con moteado, sombra
     ventral y VETAS de flujo de pelo (bandas finas multiplicativas — pelo
     peinado hacia abajo y atrás, sin un solo mechón geométrico). */
  const pintarPelaje = (geo, conCara) => pintarPorVertice(geo, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 2.9 + 5, y * 2.9, z * 2.9);
    c.set(PELO).lerp(new THREE.Color(PELO_CLARO), clamp01((n - 0.40) * 2.0));
    // vetas de flujo: caída vertical en flancos y patas, nunca en la cara
    const wob = (ruidoFbm(x * 6.5 + 17, y * 6.5, z * 6.5) - 0.5) * 4.2;
    const veta = 0.5 + 0.5 * Math.sin(x * 165 + z * 40 + wob);
    const dondeV = (1 - suavePaso(0.40, 0.55, x)) * suavePaso(0.06, 0.16, y);
    c.multiplyScalar(1 - dondeV * 0.14 * (1 - veta));
    // contrasombra ventral suave (el horneado remata el resto)
    c.multiplyScalar(1 - 0.10 * (1 - suavePaso(0.28, 0.50, y)));
    if (!conCara) return c;

    // EL MORRO HABANO: borde ruidoso, y arranca DESPUÉS del aro del ojo — si
    // se tocan, aro+habano se funden en máscara de panda (medido en captura)
    const fH = suavePaso(0.655, 0.705, x + (ruidoFbm(x * 9 + 13, y * 9, z * 9) - 0.5) * 0.04);
    if (fH > 0) c.lerp(new THREE.Color(HOCICO), fH * 0.80);

    // EL BABERO del pecho: V crema ESTRECHA de borde roto — ancho se vuelve
    // chaleco y lava todo el frente (medido en la vista frontal)
    {
      const w = (ruidoFbm(x * 7 + 31, y * 7, z * 7) - 0.5) * 0.40;
      const dB = Math.hypot((x - 0.345) / 0.100, (y - 0.465) / 0.085, z / 0.115);
      const fB = 1 - suavePaso(0.55, 0.98, dB + w);
      if (fB > 0) c.lerp(new THREE.Color(CREMA), fB * 0.85);
    }
    // FRANJAS DE GARGANTA: conectan el babero con la quijada (y de ahí, por la
    // chorreada, con el aro del ojo) — el dibujo continuo del animal real
    for (const [gx, gy, gz, ax, ay, az, fz] of [
      [0.500, 0.578, 0.048, 0.115, 0.050, 0.030, 0.70],
      [0.490, 0.570, -0.044, 0.095, 0.045, 0.027, 0.58],
    ]) {
      const w = (ruidoFbm(x * 8 + 47, y * 8, z * 8) - 0.5) * 0.5;
      const dG = Math.hypot((x - gx) / ax, (y - gy) / ay, (z - gz) / az);
      const fG = 1 - suavePaso(0.60, 1.05, dG + w);
      if (fG > 0) c.lerp(new THREE.Color(CREMA), fG * fz);
    }
    return c;
  });

  /* ── LA PIEL: cola→grupa→joroba→cuello→cráneo→hocico, un solo loft ──────
     ⚠️ RESOLUCIÓN ALTA A PROPÓSITO: los anteojos se pintan POR VÉRTICE; a
     160×72 el paso entre vértices baja a ~1 cm y el aro se lee como aro
     (lección medida en la pasada anterior: a paso de 3 cm salía un manchón). */
  const piel = cuerpoOrganico({
    largo: LARGO, nSeg: 176, nRad: 84, semilla: 11, ruido: 0.02,
    espina, arriba, abajo, lado,
  });
  pintarPelaje(piel, true);
  pelo.push(piel);
  A.marca('lomo', piel, { modo: 'extremo', dir: [-0.14, 1, 0.06] });   // la joroba, no la nuca
  A.marca('cola', piel, { modo: 'extremo', dir: [-1, 0.1, 0] });

  /* ── LAS CUATRO PATAS: un solo tubo cada una, nacido DENTRO del tronco ───
     Pose diagonal asimétrica (delantera derecha adelantada, trasera derecha
     recogida): cuatro patas paralelas leen mesa, no animal. */
  const AV_DEL = { 1: 0.045, [-1]: -0.030 };
  const AV_TRA = { 1: -0.035, [-1]: 0.045 };
  let pataTraseraDer = null;
  let pataDelanteraDer = null;
  const garrasDelanteras = [];
  for (const s of [1, -1]) {
    /* delantera: hombro (enterrado) → codo → antebrazo → muñeca → palma → dedos */
    const av = AV_DEL[s];
    const P = (x, y, z) => [x + av * Math.max(0, 1 - y / 0.56), y, s * z];
    const cadD = [
      P(0.150, 0.540, 0.075),   // nace DENTRO del pecho: la tapa queda enterrada
      P(0.163, 0.415, 0.148),
      P(0.140, 0.298, 0.162),   // CODO
      P(0.157, 0.180, 0.162),   // antebrazo de excavador
      P(0.179, 0.108, 0.157),   // MUÑECA (curva abierta: doblada en seco pliega el tubo)
      P(0.214, 0.056, 0.155),   // entra a la palma
      P(0.258, 0.040, 0.153),   // dedos
      P(0.288, 0.038, 0.152),   // remate redondo del pie
    ];
    const TD = tDeCadena(cadD);
    const del = tuboCurva(cadD, perfilParadas([
      [TD[0], 0.080], [TD[1], 0.095],
      [(TD[1] + TD[2]) / 2, 0.077], [TD[2], 0.071],           // nudillo del codo
      [(TD[2] + TD[3]) / 2, 0.058], [TD[3], 0.056],
      [TD[4], 0.045], [TD[5], 0.055], [TD[6], 0.048], [TD[7], 0.026],
    ]), { segs: 56, radial: 22 });
    pieOso(del, { zCentro: s * 0.153, xDedos: cadD[6][0] });
    pintarPelaje(del, false);
    pelo.push(del);
    if (s === 1) pataDelanteraDer = del;

    /* trasera: muslo → RODILLA adelante → tibia atrás → TALÓN casi al piso →
       planta LARGA horizontal → dedos. La huella grande del plantígrado. */
    const avT = AV_TRA[s];
    const Q = (x, y, z) => [x + avT * Math.max(0, 1 - y / 0.56), y, s * z];
    const cadT = [
      Q(-0.400, 0.515, 0.078),  // nace DENTRO de la grupa
      Q(-0.393, 0.392, 0.148),  // muslo
      Q(-0.343, 0.282, 0.161),  // RODILLA (adelante)
      Q(-0.398, 0.163, 0.161),  // tibia, cayendo hacia atrás
      Q(-0.452, 0.066, 0.157),  // el TALÓN llega casi al piso
      Q(-0.372, 0.038, 0.155),  // planta larga
      Q(-0.306, 0.036, 0.153),  // dedos
      Q(-0.276, 0.035, 0.152),  // remate redondo
    ];
    const TT = tDeCadena(cadT);
    const tra = tuboCurva(cadT, perfilParadas([
      [TT[0], 0.094], [TT[1], 0.106],
      [(TT[1] + TT[2]) / 2, 0.084], [TT[2], 0.072],           // nudillo de la rodilla
      [(TT[2] + TT[3]) / 2, 0.058], [TT[3], 0.054],
      [TT[4], 0.047], [TT[5], 0.056], [TT[6], 0.048], [TT[7], 0.026],
    ]), { segs: 56, radial: 22 });
    pieOso(tra, { zCentro: s * 0.153, xDedos: cadT[6][0] });
    pintarPelaje(tra, false);
    pelo.push(tra);
    if (s === 1) pataTraseraDer = tra;

    /* CINCO uñas por pie, curvas, no retráctiles — las DELANTERAS más largas:
       la herramienta con la que excava y trepa. */
    for (let k = 0; k < 5; k++) {
      const f = (k / 4 - 0.5) * 2;   // P/Q espejan z, así que el abanico ±f se refleja solo
      // discretas: uñas de campo que rozan el piso, no rastrillo de tenedor
      const gd = garraCurva(P(0.286, 0.042, 0.153 + f * 0.046), [0.93, -0.38, s * f * 0.20], 0.058, 0.0150, 0.55);
      detalle.push(pintarPlano(gd, UNA));
      if (s === 1) garrasDelanteras.push(gd);
      const gt = garraCurva(Q(-0.274, 0.040, 0.153 + f * 0.044), [0.93, -0.34, s * f * 0.18], 0.042, 0.0130, 0.50);
      detalle.push(pintarPlano(gt, UNA));
    }
  }
  A.marca('garra', garrasDelanteras, { modo: 'extremo', dir: [1, -0.3, 0.1] });
  A.marca('planta', pataTraseraDer, { modo: 'extremo', dir: [0.1, -1, 0.3] });

  /* ── OREJAS chicas, redondas, altas — media identidad de perfil ────────── */
  let orejaDer = null;
  for (const s of [1, -1]) {
    const cara = [0.24, 0.45, s * 0.86];
    const oreja = orejaRedonda([0.520, 0.800, s * 0.100], cara, 0.054, 0.42, 22);
    pintarPelaje(oreja, false);
    pelo.push(oreja);
    if (s === 1) orejaDer = oreja;
    const interior = orejaRedonda([0.523, 0.805, s * 0.110], cara, 0.034, 0.30, 16);
    pelo.push(pintarPlano(interior, OREJA_INT));
  }
  A.marca('oreja', orejaDer, { modo: 'centro' });

  /* ── OJOS apoyados EN la piel (medidos sobre la superficie, no a ojo) ────
     Altos y algo frontales: en el ángulo bajo quedaban en el flanco del
     cráneo y de 3/4 el ojo lejano asomaba por encima del puente (medido). */
  const [ex, ey, ez] = superficie(0.928, 0.80);
  const N_OJO = [0.45, 0.52, 0.72];   // normal aproximada del cráneo ahí
  let ojoDer = null;
  for (const s of [1, -1]) {
    const p = [ex + N_OJO[0] * 0.002, ey + N_OJO[1] * 0.002, s * (ez + N_OJO[2] * 0.002)];
    const ojo = poner(new THREE.SphereGeometry(0.0215, 18, 14), p, [0, 0, 0], [0.90, 1, 0.72]);
    detalle.push(pintarPlano(ojo, OJO));
    if (s === 1) ojoDer = ojo;
    const brillo = poner(new THREE.SphereGeometry(0.0058, 8, 6), [p[0] + 0.009, p[1] + 0.008, p[2] + s * 0.007]);
    detalle.push(pintarPlano(brillo, '#e9e2d2'));
  }
  A.marca('anteojo', ojoDer, { modo: 'centro' });

  /* ── TRUFA, ventanas, boca: tapan el remate delantero del loft ─────────── */
  const trufa = poner(new THREE.SphereGeometry(0.052, 20, 16), [0.752, 0.685, 0], [0, 0, 0.10], [0.55, 0.55, 0.92]);
  detalle.push(pintarPlano(trufa, TRUFA));
  A.marca('hocico', trufa, { modo: 'extremo', dir: [1, 0.1, 0] });
  for (const s of [1, -1]) {
    detalle.push(pintarPlano(
      poner(new THREE.SphereGeometry(0.009, 8, 6), [0.770, 0.686, s * 0.015], [0, 0, 0], [0.75, 1, 1.15]),
      '#080605',
    ));
  }
  detalle.push(pintarPlano(
    poner(new THREE.SphereGeometry(0.022, 14, 10), [0.705, 0.623, 0], [0, 0, -0.2], [1.0, 0.16, 0.55]),
    BOCA,
  ));

  /* ═══ FUSIÓN + PELAJE COMO MASA ═════════════════════════════════════════
     Dos pasadas de despeine con SESGO por zona: la cara casi limpia (ahí
     mandan los anteojos), la caña baja limpia (el pie se tiene que leer),
     los flancos bajos y el faldón MÁS greñudos (ahí el pelo cuelga). */
  const cuerpo = fusionar(pelo, 'oso-pelo');
  const sesgo = (x, y) => (
    (x > 0.42 || (x > 0.355 && y > 0.72)) ? 0.15
      : y < 0.16 ? 0.35
        : y < 0.42 ? 1.45
          : 1.0
  );
  despeinar(cuerpo, { amp: 0.023, freq: 8.5, semilla: 4, sesgo });   // grano fino
  despeinar(cuerpo, { amp: 0.013, freq: 3.2, semilla: 9, sesgo });   // grano grueso

  /* LOS ANTEOJOS — aros crema CASI CERRADOS alrededor de cada ojo.
     Lección medida: con ruptura 0.44 los aros se deshacían y de 3/4 la cara
     leía "mancha de frente". El patrón real es individual y asimétrico: el
     aro derecho más ancho y con chorreada hasta la quijada, el izquierdo más
     corto y más roto. Se pintan DESPUÉS del despeine, sobre la piel final. */
  for (const s of [1, -1]) {
    // el aro es una BANDA de ~2 cm con el ojo oscuro ADENTRO (rInt > radio del
    // ojo): si el interior también es crema, la cara se lee panda, no anteojos
    pintarAnillo(cuerpo, [ex, ey, s * ez], [N_OJO[0], N_OJO[1], s * N_OJO[2]],
      0.030, s === 1 ? 0.052 : 0.047, CREMA, {
        dureza: 0.48, ruptura: s === 1 ? 0.18 : 0.27, semilla: s === 1 ? 4 : 9,
        grosorProf: 1.3, fuerza: s === 1 ? 1.0 : 0.95,
      });
    // ceja crema chica, asimétrica — el patrón más común de la especie
    pintarMancha(cuerpo, [0.596, 0.792, s * (s === 1 ? 0.048 : 0.044)], s === 1 ? 0.020 : 0.016, CREMA, {
      dureza: 0.50, ruido: 0.35, semilla: 12 + s, fuerza: s === 1 ? 0.42 : 0.36,
    });
  }
  // la CHORREADA del lado derecho: el aro se escurre hasta la quijada y
  // empalma con la franja de garganta — el dibujo continuo del animal real
  for (const [mx, my, mz, mr] of [
    [0.648, 0.696, 0.082, 0.022],
    [0.670, 0.666, 0.074, 0.020],
    [0.685, 0.643, 0.063, 0.019],
  ]) {
    pintarMancha(cuerpo, [mx, my, mz], mr, CREMA, {
      dureza: 0.48, ruido: 0.32, semilla: 21, fuerza: 0.60,
    });
  }

  /* ── AO horneado + detalles finos ──────────────────────────────────────── */
  hornearPelaje(cuerpo, { yBajo: 0.02, yAlto: 0.86, ao: 0.30, moteado: 0.15, semilla: 5, cielo: 0.26, freq: 4.2 });
  const finos = hornearPelaje(fusionar(detalle, 'oso-detalle'), {
    yBajo: 0.0, yAlto: 0.86, ao: 0.16, moteado: 0.03, semilla: 6, cielo: 0.14,
  });

  const G = new THREE.Group();
  G.name = 'oso-andino';
  // rim moderado con halo FINO: a 0.30/3.2 la vista frontal salía con capucha
  // gris — todo el contorno del cuello es "borde" ahí (medido en captura)
  const mat = materialPelaje({ roughness: 0.95, rim: 0.20, filo: 4.0, calido: [1.0, 0.86, 0.66] });
  const matFino = materialPelaje({ roughness: 0.45, rim: 0.16, filo: 4.5 });
  for (const [g, m] of [[cuerpo, mat], [finos, matFino]]) {
    const malla = new THREE.Mesh(g, m);
    malla.castShadow = true;
    malla.receiveShadow = true;
    G.add(malla);
  }

  /* ═══ EL BASTÓN: EL FRAILEJÓN (Espeletia) COMO BASTÓN ════════════════════
     El frailejón ya vive en el páramo (`paramo-vivo-arte-frailejon.js`): aquí se
     REÚSA a escala de bastón — mismo tronco columnar, mismas hojas muertas en
     espiral, misma roseta plata-salvia. Va en la pata delantera DERECHA (la
     delantera mira a +X, +Z es su lado): la punta plantada en el suelo justo
     delante de las garras y la roseta por encima del hombro. Como es hijo de la
     MISMA escena que el cuerpo, respira y se balancea con el oso. */
  let bastonG = null, bastonRoseta = null, bastonFlores = null;
  let bastonBase = null;
  let bastonOrientacion = null;
  if (baston) {
    const mano = muestrearManoDelantera(pataDelanteraDer);
    const cajaOso = new THREE.Box3().setFromObject(G);
    const alturaOso = cajaOso.max.y - cajaOso.min.y;
    const bastonSer = construirBastonFrailejon();
    bastonG = bastonSer.group;
    bastonRoseta = bastonSer.roseta;
    bastonFlores = bastonSer.flores;

    // Se escala el objeto completo (incluida la roseta) contra la altura REAL
    // del oso: la punta queda en el piso y el conjunto no supera su silueta.
    bastonG.updateMatrixWorld(true);
    const cajaBaston = new THREE.Box3().setFromObject(bastonG);
    const alturaBaston = cajaBaston.max.y - cajaBaston.min.y;
    bastonG.scale.setScalar((alturaOso * 0.84) / alturaBaston);

    // La punta sale apenas de la palma; al subir, el bastón se abre hacia
    // afuera del cuerpo. La mano queda en contacto visual y el eje no vuelve
    // a meterse en el pecho.
    const punta = new THREE.Vector3(
      mano.x + 0.035,
      Math.max(0.012, cajaOso.min.y + 0.012),
      mano.z + 0.035,
    );
    const empu = punta.clone().add(new THREE.Vector3(0.130, alturaOso * 0.84, 0.110));
    const eje = empu.clone().sub(punta).normalize();
    bastonOrientacion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), eje,
    );
    bastonBase = punta;
    bastonG.position.copy(punta);
    bastonG.quaternion.copy(bastonOrientacion);
    bastonG.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
    });
    G.add(bastonG);
  }

  /* ═══ LA RESPIRACIÓN DEL GUARDIÁN ════════════════════════════════════════
     El oso camina despacio: reposo digno, no vitrina congelada. Respira (el
     cuerpo sube y baja), se balancea lento y pesado, y el bastón acompaña a la
     pata — pivota apenas sobre su punta y la roseta se deja mecer por la brisa
     de altura. Todo sutil: un oso de 175 kg no vibra, se mueve. */
  const animarOso = (t) => {
    const resp = Math.sin(t * 1.35) * 0.0035 + Math.sin(t * 2.7 + 1.2) * 0.0015;
    G.scale.y = 1 + resp;
    G.position.y = resp * 0.9;
    G.rotation.z = Math.sin(t * 0.45) * 0.006;
    G.rotation.x = Math.sin(t * 0.31 + 0.8) * 0.004;
    if (bastonG) {
      bastonG.position.copy(bastonBase);
      bastonG.quaternion.copy(bastonOrientacion);
      bastonG.rotateZ(Math.sin(t * 0.45 + 0.5) * 0.005);
      bastonG.rotateX(Math.sin(t * 0.31 + 1.1) * 0.004);
    }
    if (bastonRoseta) {
      bastonRoseta.rotation.z = Math.sin(t * 0.6 + 2) * 0.03;
      bastonRoseta.rotation.x = Math.sin(t * 0.5 + 1) * 0.02;
    }
    if (bastonFlores) bastonFlores.rotation.z = Math.sin(t * 0.7 + 3) * 0.04;
  };

  if (typeof console !== 'undefined') {
    const caja = new THREE.Box3().setFromObject(G);
    const tris = [cuerpo, finos].reduce((sum, g) => sum + g.attributes.position.count / 3, 0);
    console.info('[oso]', {
      yPie: +caja.min.y.toFixed(3),
      alturaCruz: +caja.max.y.toFixed(3),
      largoTotal: +(caja.max.x - caja.min.x).toFixed(3),
      triangulos: Math.round(tris),
      baston: baston ? 'frailejon' : 'sin',
      nota: 'una sola piel; patas de un solo tubo; cero mechones',
    });
  }
  void r;

  return crearSer({
    especie: 'oso',
    reino: 'animal',
    estilo: 'naturalista',
    nivelDetalle: 2,
    grupo: G,
    animar: animarOso,
    puntos: [
      {
        id: 'garra', etiqueta: 'Garras',
        descripcion: 'Largas, curvas y NO retráctiles: siempre están afuera. Con ellas abre troncos podridos, arranca bromelias y cogollos de palma, y trepa — es el oso más trepador de América. Lo que come arriba lo suelta lejos, así que va sembrando el bosque mientras camina.',
        posicion: A.punto('garra'),
      },
      {
        id: 'anteojo', etiqueta: 'Los anteojos',
        descripcion: 'Las manchas claras alrededor de los ojos y sobre el hocico, que le dan el nombre. El dibujo es distinto en cada oso y no cambia con los años: por eso se identifican uno por uno con cámaras trampa, sin tocarlos ni ponerles collar.',
        posicion: A.punto('anteojo'),
      },
      {
        id: 'hocico', etiqueta: 'Cara corta',
        descripcion: 'El hocico apenas sale del cráneo. Es el último sobreviviente de los osos de cara corta (subfamilia Tremarctinae). Come sobre todo planta: bromelias, cogollos de palma y frutos — la mandíbula corta y ancha es palanca para desgarrar fibra dura.',
        posicion: A.punto('hocico'),
      },
      {
        id: 'planta', etiqueta: 'Pie plantígrado',
        descripcion: 'Apoya toda la planta del pie, como nosotros. Deja una huella ancha y alargada con las cinco uñas marcadas por delante: es la firma que se busca en el barro para saber que el oso todavía anda por aquí.',
        posicion: A.punto('planta'),
      },
      {
        id: 'lomo', etiqueta: 'Pelaje largo',
        descripcion: 'Pelo denso y largo, negro a pardo oscuro. Vive en el bosque alto andino y sube al páramo, donde la niebla no levanta en todo el día: el pelaje es su abrigo contra el frío y la humedad permanente.',
        posicion: A.punto('lomo'),
      },
      {
        id: 'oreja', etiqueta: 'Oreja redonda',
        descripcion: 'Chica, muy redonda y alta en el cráneo. Menos superficie expuesta es menos calor perdido — la forma que se repite en los animales de montaña fría.',
        posicion: A.punto('oreja'),
      },
      {
        id: 'cola', etiqueta: 'Casi sin cola',
        descripcion: 'La cola es un muñón de pocos centímetros, escondido en el pelaje. Sirve para el campo: un animal grande, oscuro y SIN cola en el monte andino solo puede ser él.',
        posicion: A.punto('cola'),
      },
    ],
    ficha: {
      nombreComun: 'Oso andino',
      nombreCientifico: 'Tremarctos ornatus',
      rol: 'Camina despacio y sabe dónde está el agua. Es el único oso de Suramérica y la especie sombrilla de estos cerros: donde queda territorio para él, queda bosque conectado, páramo sano y nacimiento de agua. Come sobre todo planta y fruto, y al moverse va sembrando el bosque que se comió.',
      pisoTermico: '',
      riesgo: 'UICN: Vulnerable',
    },
    metrosPorUnidad: 1,
  });
}

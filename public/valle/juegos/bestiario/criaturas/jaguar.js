// ── criaturas/jaguar.js — JAGUAR · Panthera onca ────────────────────────────
//
// El felino más grande de América. Contra el oso, TODO en la silueta es
// distinto a propósito — es la prueba de fuego del atlas: un fotograma quieto
// tiene que bastar para saber cuál es cuál.
//
//   oso                              jaguar
//   ───────────────────────────      ─────────────────────────────────────
//   alto, macizo, greñudo            largo, bajo, liso
//   NEGRO con máscara crema          DORADO con rosetas negras
//   SIN cola                         cola LARGA, más de medio cuerpo
//   plantígrado (planta completa)    digitígrado (camina en los dedos)
//   cara corta y redonda             cabeza ANCHA y cuadrada de mandíbula
//
// LA ROSETA: anillo roto CON UNO A TRES PUNTOS ADENTRO. Es exactamente lo que
// separa a Panthera onca del leopardo (Panthera pardus), que las lleva vacías.
// Por eso el patrón se GENERA con `sembrarRosetas` y no se pinta a ojo: si el
// núcleo no está, el atlas estaría enseñando mal.
//
// Unidades: METROS, mira a +X, y=0 es el piso.

import * as THREE from 'three';
import {
  rng, poner, hueso, pintarPlano, pintarPorVertice, pintarMancha, fusionar, hornearPelaje,
  cuerpoOrganico, campana, remate, orejaRedonda, garraCurva, tuboCurva, sembrarRosetas,
  sembrarManchas, materialPelaje, crearAnclas, ruidoFbm, clamp01,
  masa, perfilParadas, tDeCadena,
} from '../anatomia.js';
import { crearSer } from '../../../lib3d/creatures/generarSer.js';

const ORO      = '#c8913f';   // el leonado del dorso
const ORO_HONDO = '#ad7530';
const CREMA    = '#efe4cd';   // vientre, pecho, cara interna, barbilla
const TINTA    = '#171009';   // rosetas y manchas sólidas
const NARIZ    = '#5a3330';
const IRIS     = '#c99733';
const PUPILA   = '#140f0a';
const MARFIL   = '#ded2ba';   // uñas

/* La silueta del tronco DELATA el esqueleto o no hay felino: cruz sobre la
   escápula, el dorso baja detrás del hombro, la pelvis vuelve a subir; la caja
   torácica es honda y ancha y la CINTURA se recoge (el tuck-up del cazador),
   nada de salchicha pareja. t=0 cola, t=1 pecho. */
const LARGO = 0.92;
const espina = (t) => 0.512
  + 0.024 * campana(t, 0.80, 0.26)     // la cruz
  - 0.016 * campana(t, 0.45, 0.30)     // el dorso se asienta tras el hombro
  + 0.014 * campana(t, 0.13, 0.18);    // la pelvis
const arriba = (t) => (0.146 + 0.016 * campana(t, 0.80, 0.30) + 0.008 * campana(t, 0.13, 0.16)) * remate(t, 0.52);
const abajo  = (t) => (0.128 + 0.062 * campana(t, 0.75, 0.28) - 0.034 * campana(t, 0.28, 0.22)) * remate(t, 0.50);
const lado   = (t) => (0.124 + 0.038 * campana(t, 0.72, 0.30) - 0.020 * campana(t, 0.30, 0.20) + 0.016 * campana(t, 0.12, 0.16)) * remate(t, 0.52);

export function construirJaguar() {
  const r = rng(4471);
  const cuerpoPartes = [];   // torso + masas + cuello  → ROSETAS
  const cabezaPartes = [];   // cráneo, hocico, orejas  → manchas chicas
  const patasPartes  = [];   // las cuatro patas        → manchas chicas
  const colaPartes   = [];   // la cola                 → borrones/anillos
  const detalle      = [];   // ojos, nariz, uñas, bigotes: sin patrón
  const A = crearAnclas();

  const cOro = new THREE.Color(ORO), cHondo = new THREE.Color(ORO_HONDO), cCrema = new THREE.Color(CREMA);

  /* ── TRONCO: pecho hondo, cintura marcada, grupa poderosa ─────────────── */
  const torso = cuerpoOrganico({
    largo: LARGO, nSeg: 140, nRad: 96, semilla: 23, ruido: 0.012,
    espina, arriba, abajo, lado,
  });
  // el contrasombreado del felino: dorso leonado, vientre crema, borde con
  // ruido (nunca una línea recta — eso delata al modelo hecho a mano).
  // El corte SIGUE la panza recogida: se calcula del propio perfil del tronco,
  // no de una altura fija, o la cintura quedaría dorada por abajo.
  pintarPorVertice(torso, (x, y, z, i, c) => {
    const n = (ruidoFbm(x * 6.2 + 3, y * 6.2, z * 6.2) - 0.5) * 0.055;
    const t = clamp01((x + LARGO / 2) / LARGO);
    const corte = espina(t) - abajo(t) * 0.58;
    if (y < corte + n) return c.copy(cCrema);
    const prof = clamp01((y - corte) / 0.14);
    return c.copy(cHondo).lerp(cOro, prof);
  });
  cuerpoPartes.push(torso);
  A.marca('lomo', torso, { modo: 'extremo', dir: [-0.15, 1, 0.55] });

  const hombro = poner(new THREE.SphereGeometry(0.156, 66, 48), [0.262, 0.548, 0], [0, 0, 0.05], [1.16, 1.0, 0.98]);
  cuerpoPartes.push(pintarPlano(hombro, ORO));
  const grupa = poner(new THREE.SphereGeometry(0.178, 66, 48), [-0.300, 0.488, 0], [0, 0, -0.04], [1.0, 1.06, 0.98]);
  cuerpoPartes.push(pintarPlano(grupa, ORO));
  // la punta de la CADERA (tuberosidad ilíaca): el huesito que asoma antes
  // de la cola y le pone pelvis a la silueta
  for (const s of [1, -1]) {
    cuerpoPartes.push(pintarPlano(masa([-0.372, 0.564, s * 0.066], [-1, 0.30, 0], 0.11, 0.062, 0.055), ORO));
  }
  // el antepecho: MÁS CHICO y con el mismo corte de contrasombreado que el
  // torso. En la primera pasada era una esfera crema grande y se leía como un
  // huevo blanco pegado bajo el cuello, no como el pecho del animal.
  // el corte del antepecho EMPATA con el del torso en esa altura (≈0,455),
  // o queda una costura de dos blancos distintos entre las delanteras
  const pecho = poner(new THREE.SphereGeometry(0.124, 52, 40), [0.372, 0.452, 0], [0, 0, 0.24], [0.96, 1.02, 0.92]);
  pintarPorVertice(pecho, (x, y, z, i, c) => {
    const n = (ruidoFbm(x * 6.2 + 3, y * 6.2, z * 6.2) - 0.5) * 0.05;
    return c.copy(y < 0.452 + n ? cCrema : cOro);
  });
  cuerpoPartes.push(pecho);

  /* ── CUELLO grueso y BAJO: el jaguar lleva la cabeza casi a la altura del
        hombro. Un cuello erguido lo vuelve puma. ─────────────────────────── */
  const cuello = hueso([0.376, 0.556, 0], [0.596, 0.566, 0], 0.132, 0.118, 28, 12);
  cuerpoPartes.push(pintarPlano(cuello, ORO));
  // la NUCA musculada que une cráneo y cruz sin escalón
  cuerpoPartes.push(pintarPlano(masa([0.492, 0.598, 0], [1, 0.22, 0], 0.24, 0.150, 0.135), ORO));
  // garganta: clara solo POR DEBAJO — entera crema era otra bola blanca
  const garganta = poner(new THREE.SphereGeometry(0.070, 30, 22), [0.524, 0.502, 0], [0, 0, 0.2], [1.22, 0.76, 0.88]);
  pintarPorVertice(garganta, (x, y, z, i, c) => c.copy(y < 0.492 ? cCrema : cOro));
  cuerpoPartes.push(garganta);

  /* ── LA CABEZA ES LA FIRMA: cráneo ANCHO atrás, ARCO CIGOMÁTICO marcado
     (el pómulo por donde pasa el músculo de la mordida), maseteros hondos y
     hocico CORTO y macizo. En proporción, el jaguar lleva el cráneo más ancho
     y la mordida más fuerte por tamaño de todos los felinos; con una cabeza
     de bulbo liso el modelo se lee puma flaco. La cabeza se arma como el
     cráneo real: caja + pómulos + músculo encima, no una esfera. ─────────── */
  const craneo = poner(new THREE.SphereGeometry(0.126, 56, 42), [0.672, 0.578, 0], [0, 0, -0.03], [1.04, 0.92, 1.22]);
  cabezaPartes.push(pintarPlano(craneo, ORO));
  const frente = poner(new THREE.SphereGeometry(0.096, 40, 30), [0.722, 0.622, 0], [0, 0, 0.02], [0.98, 0.56, 1.16]);
  cabezaPartes.push(pintarPlano(frente, ORO));
  // PUENTE NASAL ancho: del ceño a la trufa sin pico de pájaro
  cabezaPartes.push(pintarPlano(masa([0.778, 0.594, 0], [1, 0.34, 0], 0.14, 0.056, 0.072), ORO));
  const cachetes = [];
  for (const s of [1, -1]) {
    // ARCO CIGOMÁTICO: la cresta ósea del ojo a la oreja, apenas más afuera
    // que el cráneo — INSINUADA bajo la piel (despegada se leía como un
    // chorizo aparte, medido en captura), pero suficiente para ensanchar la
    // cara de frente y de tres cuartos
    const arco = masa([0.706, 0.578, s * 0.124], [1, 0.06, -s * 0.38], 0.130, 0.040, 0.042);
    cabezaPartes.push(pintarPlano(arco, ORO));
    // MASETERO: la masa de la mordida cuelga BAJO el arco y ensancha la cara
    const cachete = poner(new THREE.SphereGeometry(0.089, 42, 32), [0.712, 0.522, s * 0.104], [0, 0, 0.06], [1.18, 1.08, 0.94]);
    cabezaPartes.push(pintarPlano(cachete, ORO));
    cachetes.push(cachete, arco);
    // patilla clara del carrillo: el jaguar la lleva marcada
    const patilla = poner(new THREE.SphereGeometry(0.052, 26, 19), [0.700, 0.480, s * 0.108], [0, 0, 0.1], [1.28, 0.92, 0.68]);
    cabezaPartes.push(pintarPlano(patilla, CREMA));
    // RAMA DE LA MANDÍBULA: del masetero al mentón, quijada con hueso debajo.
    // Dorada arriba y clara solo por debajo, como el labio real — toda crema
    // se leía como un rollo blanco pegado al cachete.
    const rama = masa([0.746, 0.492, s * 0.052], [1, -0.05, s * 0.10], 0.13, 0.050, 0.056);
    pintarPorVertice(rama, (x, y, z2, i, c) => c.copy(y < 0.487 ? cCrema : cOro));
    cabezaPartes.push(rama);
  }
  // HOCICO corto, ancho y hondo — caja de morder, no cono de perro
  const hocico = poner(new THREE.SphereGeometry(0.063, 32, 24), [0.798, 0.548, 0], [0, 0, -0.06], [1.28, 0.92, 1.26]);
  pintarPorVertice(hocico, (x, y, z, i, c) => c.copy(y < 0.542 ? cCrema : cOro));
  cabezaPartes.push(hocico);
  const menton = poner(new THREE.SphereGeometry(0.054, 24, 18), [0.786, 0.486, 0], [0, 0, -0.05], [1.38, 0.70, 1.06]);
  cabezaPartes.push(pintarPlano(menton, CREMA));
  A.marca('mandibula', [menton, ...cachetes], { modo: 'extremo', dir: [0.7, -0.55, 0.5] });

  const nariz = poner(new THREE.SphereGeometry(0.025, 18, 14), [0.862, 0.560, 0], [0, 0, 0.06], [0.78, 0.82, 1.30]);
  detalle.push(pintarPlano(nariz, NARIZ));
  for (const s of [1, -1]) {
    detalle.push(pintarPlano(poner(new THREE.SphereGeometry(0.0075, 8, 6), [0.872, 0.556, s * 0.017]), '#140d0b'));
  }
  const bocaJ = poner(new THREE.SphereGeometry(0.040, 18, 12), [0.826, 0.506, 0], [0, 0, -0.2], [1.30, 0.30, 0.98]);
  detalle.push(pintarPlano(bocaJ, '#2a1713'));

  // OJOS: grandes, ámbar, mirando al frente (depredador binocular).
  // ⚠️ medido en captura: con el pómulo nuevo el ojo de antes quedaba
  // ENTERRADO detrás del arco — va más ADELANTE y más AFUERA, apoyado en el
  // borde delantero de la órbita, o el jaguar queda ciego.
  let ojoDer = null;
  for (const s of [1, -1]) {
    const ojo = poner(new THREE.SphereGeometry(0.024, 18, 14), [0.776, 0.610, s * 0.074], [0, 0, 0], [0.86, 1, 1]);
    detalle.push(pintarPlano(ojo, IRIS));
    if (s === 1) ojoDer = ojo;
    const pupila = poner(new THREE.SphereGeometry(0.012, 12, 9), [0.790, 0.610, s * 0.077], [0, 0, 0], [0.7, 1.25, 1]);
    detalle.push(pintarPlano(pupila, PUPILA));
    const brillo = poner(new THREE.SphereGeometry(0.0058, 8, 6), [0.793, 0.620, s * 0.085]);
    detalle.push(pintarPlano(brillo, '#f3ecdd'));
  }
  A.marca('ojo', ojoDer, { modo: 'centro' });

  // OREJAS chicas y redondas, con el OCELO claro en el dorso (marca real de
  // la especie: la mancha que se ve por detrás cuando el animal se aleja).
  // Van más afuera: el cráneo ahora es ancho y la oreja vive en su esquina.
  let orejaDer = null;
  for (const s of [1, -1]) {
    const cara = [-0.34, 0.22, s * 0.92];
    const oreja = orejaRedonda([0.632, 0.650, s * 0.098], cara, 0.050, 0.40, 20);
    pintarPlano(oreja, TINTA);
    pintarMancha(oreja, [0.616, 0.654, s * 0.105], 0.026, '#efe6d2', { dureza: 0.5 });
    cabezaPartes.push(oreja);
    if (s === 1) orejaDer = oreja;
    const interior = orejaRedonda([0.644, 0.650, s * 0.111], cara, 0.032, 0.28, 14);
    cabezaPartes.push(pintarPlano(interior, '#8a6a4a'));
  }
  A.marca('oreja', orejaDer, { modo: 'centro' });

  // BIGOTES: seis por lado. Cuestan nada y son lo que vuelve gato a un gato.
  for (const s of [1, -1]) {
    for (let k = 0; k < 6; k++) {
      const fila = Math.floor(k / 3), col = k % 3;
      const base = [0.834 - col * 0.012, 0.534 - fila * 0.016, s * (0.034 + col * 0.008)];
      const dir = [0.42 + col * 0.06, 0.10 - fila * 0.18, s * 0.92];
      const b = hueso(base, [base[0] + dir[0] * 0.13, base[1] + dir[1] * 0.13, base[2] + dir[2] * 0.13], 0.0022, 0.0007, 5);
      detalle.push(pintarPlano(b, '#efe8d8'));
    }
  }

  /* ── PATAS: CADENA DE VOLÚMENES, nunca un tubo parejo ─────────────────────
     Regla del taller (el reclamo del operador era exactamente esto): la pata
     es masa muscular arriba FUNDIDA con el tronco, cintura hacia la
     articulación, NUDILLO óseo en la articulación (olécranon atrás en el
     codo, calcáneo atrás en el corvejón), caña fina y zarpa que se ensancha
     al apoyar. El loft va por la cadena de articulaciones REALES y el radio
     se cuelga de esas paradas con tDeCadena — si el codo se mueve, su bulto
     se mueve con él. La trasera hace ZIGZAG: rodilla adelante, corvejón
     ATRÁS, metatarso al piso. Digitígrado: apoya los dedos, el "talón" de la
     trasera queda en el aire a media caña.
     Y la POSE es ASIMÉTRICA: cada pata lleva su propio avance (diagonal de
     marcha en reposo) — cuatro patas paralelas leen mesa, no animal. */
  const patasDelanteras = [];
  const AV_DEL = { 1: 0.052, [-1]: -0.028 };   // delantera derecha adelantada
  const AV_TRA = { 1: -0.044, [-1]: 0.048 };   // trasera derecha recogida atrás
  for (const s of [1, -1]) {
    /* delantera: escápula → hombro → CODO → antebrazo de trepador → muñeca */
    const z = s * 0.118;
    const av = AV_DEL[s];
    const P = (x, y, zz = z) => [x + av * Math.max(0, 1 - y / 0.54), y, zz];
    // la ESCÁPULA asoma sobre el lomo al apoyar: paleta plana, no bola
    cuerpoPartes.push(pintarPlano(masa(P(0.238, 0.612, z * 0.60), [0.30, -1, s * 0.10], 0.21, 0.105, 0.055), ORO));
    // masa de hombro+brazo bajando hacia el codo, aplastada de lados
    patasPartes.push(pintarPlano(masa(P(0.286, 0.464, z * 0.90), [-0.30, -1, s * 0.06], 0.27, 0.125, 0.098), ORO));
    const codo = P(0.246, 0.330);
    // ⚠️ el tubo nace FINO adentro de la masa del hombro (si arranca más
    // gordo que ella, su tapa asoma como un collar) y engorda al salir
    const cadD = [
      P(0.288, 0.424, z * 0.94),   // nace DENTRO de la masa, más fino que ella
      codo,                        // CODO
      P(0.282, 0.224),             // antebrazo grueso: el brazo del trepador
      P(0.300, 0.126),             // MUÑECA
      P(0.304, 0.080),             // caña corta
      P(0.320, 0.044),             // entra a la zarpa
    ];
    const TD = tDeCadena(cadD);
    patasPartes.push(pintarPlano(tuboCurva(cadD, perfilParadas([
      [TD[0], 0.045], [(TD[0] + TD[1]) / 2, 0.054], [TD[1], 0.056],
      [(TD[1] + TD[2]) / 2, 0.056], [TD[2], 0.050],
      [(TD[2] + TD[3]) / 2, 0.033], [TD[3], 0.037],       // nudillo de la muñeca
      [TD[4], 0.027], [TD[5], 0.033],
    ]), { segs: 48, radial: 20 }), ORO));
    // OLÉCRANON: la punta del codo mira hacia ATRÁS — sin ella no hay codo
    patasPartes.push(pintarPlano(masa([codo[0] - 0.034, codo[1] + 0.016, z], [-1, 0.38, 0], 0.085, 0.046, 0.044), ORO));
    const zarpa = poner(new THREE.SphereGeometry(0.056, 26, 20), P(0.324, 0.040), [0, 0, 0], [1.34, 0.74, 1.12]);
    patasPartes.push(pintarPlano(zarpa, ORO));
    if (s === 1) patasDelanteras.push(zarpa);
    for (let k = 0; k < 4; k++) {
      const f = k / 3 - 0.5;
      const dedo = poner(new THREE.SphereGeometry(0.0215, 12, 9), P(0.366, 0.030, z + f * 0.058), [0, 0, 0], [1.15, 0.8, 1]);
      patasPartes.push(pintarPlano(dedo, ORO));
      // UÑA RETRÁCTIL asomada solo en la mano derecha: el punto caliente
      if (s === 1) {
        const u = garraCurva(P(0.384, 0.028, z + f * 0.058), [0.92, -0.10, f * 0.30], 0.027, 0.0055, 0.7);
        detalle.push(pintarPlano(u, MARFIL));
        patasDelanteras.push(u);
      }
    }

    /* trasera: MUSLO ancho → RODILLA adelante → tibia atrás → CORVEJÓN → pie */
    const zt = s * 0.132;
    const avT = AV_TRA[s];
    const Q = (x, y, zz = zt) => [x + avT * Math.max(0, 1 - y / 0.54), y, zz];
    // el MUSLO: ancho de adelante-atrás, aplastado de lados, fundido en grupa
    cuerpoPartes.push(pintarPlano(masa(Q(-0.254, 0.408, zt * 0.82), [0.52, -1, s * 0.05], 0.31, 0.170, 0.108), ORO));
    const rodilla = Q(-0.192, 0.318);
    const corvejon = Q(-0.314, 0.150);
    const cadT = [
      Q(-0.262, 0.382, zt * 0.90),  // nace DENTRO del muslo, más fino que él
      rodilla,                      // RODILLA (adelante)
      Q(-0.254, 0.230),             // media tibia
      corvejon,                     // CORVEJÓN (atrás): el zigzag
      Q(-0.304, 0.094),             // caña del metatarso
      Q(-0.288, 0.046),             // entra a la zarpa
    ];
    const TT = tDeCadena(cadT);
    patasPartes.push(pintarPlano(tuboCurva(cadT, perfilParadas([
      [TT[0], 0.050], [TT[1], 0.058], [(TT[1] + TT[2]) / 2, 0.053], [TT[2], 0.047],
      [(TT[2] + TT[3]) / 2, 0.034], [TT[3], 0.038],       // nudillo del corvejón
      [TT[4], 0.026], [TT[5], 0.031],
    ]), { segs: 52, radial: 20 }), ORO));
    // CALCÁNEO: el talón que apunta hacia atrás y arriba
    patasPartes.push(pintarPlano(masa([corvejon[0] - 0.022, corvejon[1] + 0.022, zt], [-0.8, 1, 0], 0.070, 0.036, 0.036), ORO));
    const zarpaT = poner(new THREE.SphereGeometry(0.053, 24, 18), Q(-0.282, 0.038), [0, 0, 0], [1.30, 0.72, 1.08]);
    patasPartes.push(pintarPlano(zarpaT, ORO));
    for (let k = 0; k < 4; k++) {
      const f = k / 3 - 0.5;
      patasPartes.push(pintarPlano(
        poner(new THREE.SphereGeometry(0.020, 12, 9), Q(-0.244, 0.029, zt + f * 0.054), [0, 0, 0], [1.15, 0.8, 1]), ORO));
    }
  }
  A.marca('zarpa', patasDelanteras, { modo: 'extremo', dir: [1, -0.4, 0.3] });

  /* ── LA COLA LARGA: más de medio cuerpo. Es la mitad de la silueta. ────── */
  const cola = tuboCurva([
    [-0.442, 0.548, 0],
    [-0.606, 0.522, 0.030],
    [-0.772, 0.452, 0.062],
    [-0.912, 0.356, 0.078],
    [-1.014, 0.258, 0.070],
    [-1.062, 0.176, 0.048],
    [-1.048, 0.116, 0.018],
  ], (t) => 0.053 * (1 - t) ** 0.55 + 0.017, { segs: 70, radial: 22 });
  pintarPlano(cola, ORO);
  colaPartes.push(cola);
  A.marca('cola', cola, { modo: 'extremo', dir: [-0.6, -1, 0.2] });

  /* ═══ EL PATRÓN ═══════════════════════════════════════════════════════════
     Cuatro pasadas, cada una sobre su propio grupo de piezas: así la siembra
     no se desbalancea por la densidad de vértices de una parte contra otra.  */
  const cuerpoGeo = fusionar(cuerpoPartes, 'jaguar-cuerpo');
  // ROSETAS en flanco y dorso — anillo roto con núcleo
  sembrarRosetas(cuerpoGeo, {
    n: 52, rMin: 0.056, rMax: 0.092, tinta: TINTA, semilla: 77,
    separacion: 0.94, grosor: 0.33, ruptura: 0.50, nucleos: 2,
    donde: (x, y) => y > 0.405,
  });
  // borrones SÓLIDOS del vientre (el jaguar los lleva llenos, no en roseta)
  sembrarManchas(cuerpoGeo, {
    n: 13, rMin: 0.021, rMax: 0.036, tinta: TINTA, semilla: 88,
    separacion: 1.5, donde: (x, y) => y < 0.425 && x > -0.34 && x < 0.44,
  });
  // …y la parte BAJA de muslo y hombro (que viven en el cuerpo para que la
  // roseta se estire sobre ellos) lleva manchas que van achicándose: el
  // patrón del animal se disuelve hacia la pata, no se corta en una línea
  sembrarManchas(cuerpoGeo, {
    n: 24, rMin: 0.014, rMax: 0.026, tinta: TINTA, semilla: 89, separacion: 1.28,
    donde: (x, y) => y < 0.42 && y > 0.18 && (Math.abs(x - 0.28) < 0.16 || Math.abs(x + 0.26) < 0.19),
  });

  const cabezaGeo = fusionar(cabezaPartes, 'jaguar-cabeza');
  sembrarManchas(cabezaGeo, {
    n: 30, rMin: 0.0105, rMax: 0.019, tinta: TINTA, semilla: 91, separacion: 1.35,
    donde: (x, y, z, col, i) => !(x > 0.79 && y < 0.56) && !(x < 0.66 && y > 0.62 && Math.abs(z) > 0.06),
  });
  const patasGeo = fusionar(patasPartes, 'jaguar-patas');
  sembrarManchas(patasGeo, {
    n: 74, rMin: 0.013, rMax: 0.025, tinta: TINTA, semilla: 95, separacion: 1.22,
  });
  const colaGeo = fusionar(colaPartes, 'jaguar-cola');
  // la cola es delgada: una mancha de radio mayor que su grueso la ENVUELVE y
  // sale negra entera. Radios cortos = borrones que hacia la punta se cierran
  // en anillos, que es como la lleva el animal.
  sembrarManchas(colaGeo, {
    n: 12, rMin: 0.015, rMax: 0.026, tinta: TINTA, semilla: 99, separacion: 1.9, dureza: 0.62,
  });

  const pelaje = hornearPelaje(fusionar([cuerpoGeo, cabezaGeo, patasGeo, colaGeo], 'jaguar-pelaje'), {
    yBajo: 0.02, yAlto: 0.70, ao: 0.19, moteado: 0.05, semilla: 7, cielo: 0.18, piso: 0.09, freq: 4.2,
  });
  const finos = hornearPelaje(fusionar(detalle, 'jaguar-detalle'), {
    yBajo: 0.0, yAlto: 0.70, ao: 0.14, moteado: 0.02, semilla: 8, cielo: 0.12,
  });

  const G = new THREE.Group();
  G.name = 'jaguar';
  const mat = materialPelaje({ roughness: 0.74, rim: 0.20, filo: 4.0, calido: [1.0, 0.88, 0.68] });
  const matFino = materialPelaje({ roughness: 0.34, rim: 0.14, filo: 4.8 });
  for (const [g, m] of [[pelaje, mat], [finos, matFino]]) {
    const malla = new THREE.Mesh(g, m);
    malla.castShadow = true;
    malla.receiveShadow = true;
    G.add(malla);
  }
  void r;

  return crearSer({
    especie: 'jaguar',
    reino: 'animal',
    estilo: 'naturalista',
    nivelDetalle: 2,
    grupo: G,
    puntos: [
      {
        id: 'mandibula', etiqueta: 'La mandíbula',
        descripcion: 'Cabeza ancha y cuadrada por los músculos maseteros: en proporción a su tamaño, la mordida más fuerte de todos los felinos. Es el único gato grande que mata perforando el cráneo entre las orejas, en vez de asfixiar por la garganta como los demás.',
        posicion: A.punto('mandibula'),
      },
      {
        id: 'lomo', etiqueta: 'Las rosetas',
        descripcion: 'Anillos negros ROTOS con uno a tres puntos ADENTRO. Ahí está la diferencia con el leopardo, que las tiene vacías. Bajo la luz picada del monte el patrón le rompe el contorno y el animal desaparece a plena vista. Además cada jaguar tiene un dibujo único: así se cuentan sin tocarlos.',
        posicion: A.punto('lomo'),
      },
      {
        id: 'cola', etiqueta: 'La cola',
        descripcion: 'Larga, más de la mitad del cuerpo, con borrones que hacia la punta se cierran en anillos. Le hace de contrapeso cuando gira en seco persiguiendo, y de timón cuando nada: el jaguar entra al agua sin problema y caza en el río.',
        posicion: A.punto('cola'),
      },
      {
        id: 'zarpa', etiqueta: 'Uñas retráctiles',
        descripcion: 'La uña se guarda dentro del dedo al caminar y sale al agarrar. Por eso la huella del jaguar es redonda y NO tiene marca de uña — al revés que la de un perro grande, con la que siempre se confunde en el barro.',
        posicion: A.punto('zarpa'),
      },
      {
        id: 'ojo', etiqueta: 'Ojos de noche',
        descripcion: 'Detrás de la retina lleva el tapetum lucidum, una capa que devuelve la luz que ya pasó y le da una segunda oportunidad de verla. Por eso los ojos brillan en la linterna y por eso conoce el monte de noche.',
        posicion: A.punto('ojo'),
      },
      {
        id: 'oreja', etiqueta: 'El ocelo de la oreja',
        descripcion: 'Oreja chica y redonda, negra por detrás con una mancha clara en el centro. Se ve justo cuando el animal se va: los cachorros siguen esa mancha, y a quien lo observa le queda la última señal antes de que se pierda en el monte.',
        posicion: A.punto('oreja'),
      },
    ],
    ficha: {
      nombreComun: 'Jaguar',
      nombreCientifico: 'Panthera onca',
      rol: 'Conoce el monte de noche. Es el felino más grande de América y el tope de la cadena: si hay jaguar hay presas, y si hay presas hay monte grande y entero. No se cuenta viéndolo — se cuenta por las rosetas, que son distintas en cada individuo.',
      pisoTermico: '',
      riesgo: 'UICN: Casi amenazado',
    },
    metrosPorUnidad: 1,
  });
}

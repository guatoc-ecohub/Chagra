// ── criaturas/guacamaya.js — GUACAMAYA · Ara macao ──────────────────────────
//
// Guacamaya bandera, POSADA en su rama. Tres decisiones sostienen la lectura:
//
//   1. UNA SOLA PIEL. El cuerpo entero —base de la cola, lomo, pecho, cuello y
//      cabeza— es UN solo loft continuo (tuboCurva con perfil de paradas), no
//      primitivas apiladas. Donde no hay unión, no hay costura.
//   2. EL PICO ES LA MITAD DE LA IDENTIDAD. Mandíbula superior color hueso,
//      enorme, muy alta en la base, con el gancho cayendo POR DEBAJO de la
//      inferior (negra y corta). El contraste hueso-sobre-rojo es lo que hace
//      que el pico se lea a cualquier distancia.
//   3. PLUMAJE = MASA. El ala plegada son tres volúmenes solapados pintados por
//      tractos (hombro rojo → banda amarilla de cobertoras → remeras azules);
//      la cola larguísima son láminas superpuestas. Ni una pluma contable.
//
// Postura: percha real. Rama diagonal, patas zigodáctilas que la envuelven
// (dos dedos adelante, dos atrás, garras clavadas), cola colgando casi hasta
// el piso. Nada de rotar el grupo: todo se construye ya posado.
//
// Unidades: METROS, mira a +X, y=0 es el piso.

import * as THREE from 'three';
import {
  rng, poner, hueso, pintarPlano, pintarPorVertice, pintarMancha, fusionar, hornearPelaje,
  tuboCurva, materialPelaje, crearAnclas, ruidoFbm, clamp01, masa,
  perfilParadas, tDeCadena, mechon, garraCurva, despeinar, suavePaso,
} from '../anatomia.js';

/* Paleta Ara macao — colores reales de la especie, sin mezclar con ararauna. */
const ROJO = '#d5311f';
const ROJO_PROF = '#961a0f';
const AMARILLO = '#ecc23e';
const AZUL = '#2b59c3';
const AZUL_OSC = '#16336f';
const AZUL_RABADILLA = '#7ba3dd';
const CARA = '#efe6d6';
const CARA_SOMBRA = '#d8c7ab';
const LINEA_CARA = '#cf5b45';
const PICO_HUESO = '#e9dcc0';
const PICO_NEGRO = '#211710';
const PICO_GANCHO = '#7b6a52';
const IRIS = '#e2cd6e';
const PUPILA = '#141008';
const PATA = '#3f3b37';
const PATA_CLARA = '#55504a';
const UÑA = '#191412';
const RAMA = '#6b4d2b';
const RAMA_OSC = '#463218';
const MUSGO = '#7d8f5e';

/* ── LA RAMA: eje diagonal, y todo lo que se agarra de ella ──────────────── */
const RAMA_A = [0.035, 0.235, -0.62];
const RAMA_B = [0.035, 0.555, 0.58];
const EJE_RAMA = new THREE.Vector3(0, RAMA_B[1] - RAMA_A[1], RAMA_B[2] - RAMA_A[2]).normalize();
const FRENTE = new THREE.Vector3(1, 0, 0);                       // exactamente ⟂ al eje
const CENIT = new THREE.Vector3().crossVectors(EJE_RAMA, FRENTE).normalize();
const R_PERCHA = 0.052;                                          // radio donde agarran

const centroRama = (z) => [
  RAMA_A[0],
  RAMA_A[1] + (RAMA_B[1] - RAMA_A[1]) * ((z - RAMA_A[2]) / (RAMA_B[2] - RAMA_A[2])),
  z,
];

/* Punto sobre el cilindro de la percha: φ=0 es el cenit, φ>0 envuelve hacia
   adelante (+X), φ<0 hacia atrás. `sA` desplaza a lo largo del eje. */
function puntoPercha(zPie, fi, rr, sA = 0) {
  const c = centroRama(zPie);
  const sf = Math.sin(fi), cf = Math.cos(fi);
  return [
    c[0] + FRENTE.x * sf * rr + EJE_RAMA.x * sA,
    c[1] + CENIT.y * cf * rr + EJE_RAMA.y * sA,
    c[2] + CENIT.z * cf * rr + EJE_RAMA.z * sA,
  ];
}

export function construirGuacamaya() {
  const r = rng(9107);
  const plumaje = [];
  const detalle = [];
  const ramaPartes = [];
  const A = crearAnclas();

  /* ── EL CUERPO ENTERO EN UN SOLO LOFT ─────────────────────────────────────
     La espina va de la base de la cola, sube por el lomo, dobla en el cuello
     y termina atravesando la cabeza hasta la frente. El radio hace todo el
     modelado: rabadilla, barriga llena, pecho, cuello apenas más angosto (la
     guacamaya casi no enseña cuello) y cráneo redondo. El remate delantero se
     esconde DENTRO de la base del pico: nunca se ve una tapa. */
  const espinazo = [
    [-0.150, 0.510, 0],
    [-0.105, 0.577, 0],
    [-0.030, 0.657, 0],
    [0.040, 0.740, 0],
    [0.062, 0.810, 0],
    [0.068, 0.870, 0],
    [0.095, 0.905, 0],
    [0.135, 0.917, 0],
    [0.172, 0.915, 0],
    [0.186, 0.913, 0],
  ];
  const tEsp = tDeCadena(espinazo);
  const radios = [0.044, 0.086, 0.106, 0.096, 0.072, 0.063, 0.0655, 0.058, 0.032, 0.013];
  const cuerpo = tuboCurva(
    espinazo,
    perfilParadas(tEsp.map((t, i) => [t, radios[i]])),
    { segs: 150, radial: 60 },
  );
  despeinar(cuerpo, { amp: 0.0045, freq: 6.5, semilla: 3 });

  /* Pintura del cuerpo: escarlata con contrasombra ventral, la CARA DESNUDA
     blanca envolviendo el frente de la cabeza (con sus hileras de plumitas
     finas, marca del género), y la rabadilla celeste de macao. */
  const ojoPos = [0.112, 0.923, 0.063];
  pintarPorVertice(cuerpo, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 5.2 + 7, y * 5.2, z * 5.2) - 0.5;
    const alto = clamp01((y - 0.50) / 0.42);
    c.set(ROJO_PROF).lerp(new THREE.Color(ROJO), clamp01(0.42 + alto * 0.42 + n * 0.22));

    // rabadilla y cobertoras superiores de la cola: celeste
    {
      const dx = (x + 0.148) / 0.085, dy = (y - 0.555) / 0.070, dz = z / 0.10;
      const d2 = dx * dx + dy * dy + dz * dz;
      const f = 1 - suavePaso(0.55, 1.0, d2);
      if (f > 0) c.lerp(new THREE.Color(AZUL_RABADILLA), f * (0.75 + n * 0.2));
    }

    // cara desnuda: parche de cachete alrededor del ojo, no un casco
    {
      const dx = (x - 0.138) / 0.048, dy = (y - 0.906) / 0.033, dz = z / 0.10;
      const d2 = dx * dx + dy * dy + dz * dz;
      const f = 1 - suavePaso(0.85, 1.12, d2);
      if (f > 0) {
        const grano = ruidoFbm(x * 26, y * 26, z * 26);
        c.lerp(new THREE.Color(CARA).lerp(new THREE.Color(CARA_SOMBRA), clamp01((grano - 0.3) * 1.4)), f);
        // hileras de plumitas: líneas finas onduladas, lejos del ojo
        const dOjo = Math.hypot(x - ojoPos[0], y - ojoPos[1]);
        const libre = suavePaso(0.022, 0.036, dOjo) * f;
        const hilera = Math.pow(0.5 + 0.5 * Math.sin(y * 300 + Math.sin(x * 80 + z * 60) * 2.0), 7);
        if (libre > 0) c.lerp(new THREE.Color(LINEA_CARA), hilera * libre * 0.45);
        // anillo periocular: pliegue de piel que ancla el ojo en el blanco
        const dOjo3 = Math.hypot(x - ojoPos[0], y - ojoPos[1], Math.abs(z) - ojoPos[2]);
        const anillo = Math.exp(-((dOjo3 - 0.017) ** 2) / 0.00003);
        if (anillo > 0.02) c.lerp(new THREE.Color('#8a7663'), anillo * 0.5 * f);
      }
    }
    return c;
  });
  plumaje.push(cuerpo);
  A.marca('lomo', cuerpo, { modo: 'extremo', dir: [0.1, 1, 0.2] });

  // plumón de nuca apenas insinuado, hundido en la silueta (nada de cuernos)
  for (const s of [1, -1]) {
    plumaje.push(pintarPlano(mechon([0.048, 0.868, s * 0.026], [-0.75, 0.18, s * 0.42], 0.040, 0.020, 6), ROJO));
  }

  /* ── OJOS: iris pajizo de macao, pupila y brillo ──────────────────────────── */
  let irisCercano = null;
  for (const s of [1, -1]) {
    const iris = poner(new THREE.SphereGeometry(0.0145, 18, 14), [0.112, 0.923, s * 0.0640], [0, 0, 0], [1, 1, 0.55]);
    detalle.push(pintarPlano(iris, IRIS));
    const pupila = poner(new THREE.SphereGeometry(0.0095, 14, 10), [0.113, 0.923, s * 0.0705], [0, 0, 0], [1, 1, 0.5]);
    detalle.push(pintarPlano(pupila, PUPILA));
    const brillo = poner(new THREE.SphereGeometry(0.0028, 8, 6), [0.117, 0.928, s * 0.0752]);
    detalle.push(pintarPlano(brillo, '#f2ede2'));
    if (s === 1) irisCercano = iris;
  }
  // el ancla va DEBAJO del ojo, sobre el cachete: el globito del visor no
  // puede taparle el ojo al ave
  A.marca('cara', irisCercano, { modo: 'centro', hacia: [0.2, -0.85, 0.5, 0.035] });

  /* ── EL PICO ──────────────────────────────────────────────────────────────
     Mandíbula superior: un tubo grueso que nace DENTRO de la frente, alto como
     media cabeza en la base, y cae en gancho hasta muy por debajo de la boca.
     Se aplasta en z (×0.44) para la quilla angosta y honda del pico real.
     Color hueso, con la cuña negra de la comisura y el gancho ahumado. */
  const picoSup = tuboCurva([
    [0.130, 0.918, 0],
    [0.166, 0.908, 0],
    [0.194, 0.883, 0],
    [0.211, 0.848, 0],
    [0.213, 0.812, 0],
    [0.205, 0.790, 0],
  ], perfilParadas([[0, 0.046], [0.28, 0.044], [0.55, 0.033], [0.78, 0.018], [0.93, 0.008], [1, 0.0035]]),
  { segs: 40, radial: 20 });
  poner(picoSup, [0, 0, 0], [0, 0, 0], [1, 1, 0.44]);
  pintarPorVertice(picoSup, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 16, y * 16, z * 16) - 0.5;
    c.set(PICO_HUESO).offsetHSL(0, 0, n * 0.05);
    // sombreado de forma: la quilla del culmen apenas más cálida que el flanco
    const flanco = clamp01(Math.abs(z) / 0.020);
    c.lerp(new THREE.Color('#d3c3a2'), flanco * 0.30);
    const margen = (1 - suavePaso(0.138, 0.152, x));
    if (margen > 0) c.lerp(new THREE.Color('#a4917a'), margen * 0.6);        // borde de pluma
    const cuna = suavePaso(0.894, 0.868, y) * (1 - suavePaso(0.155, 0.186, x));
    if (cuna > 0) c.lerp(new THREE.Color(PICO_NEGRO), cuna * 0.92);          // comisura negra
    const gancho = suavePaso(0.840, 0.795, y) * suavePaso(0.185, 0.207, x);
    if (gancho > 0) c.lerp(new THREE.Color(PICO_GANCHO), gancho * 0.55);     // punta ahumada
    const filo = suavePaso(0.900, 0.880, y) * suavePaso(0.155, 0.185, x) * (1 - suavePaso(0.195, 0.212, x));
    if (filo > 0) c.lerp(new THREE.Color('#b8a98a'), filo * 0.4);            // borde cortante
    return c;
  });
  detalle.push(picoSup);
  A.marca('pico', picoSup, { modo: 'extremo', dir: [0.55, -0.83, 0] });

  // mandíbula inferior: negra, corta, honda, la punta se guarda tras el gancho
  const picoInf = tuboCurva([
    [0.128, 0.862, 0],
    [0.158, 0.852, 0],
    [0.182, 0.857, 0],
    [0.196, 0.869, 0],
  ], perfilParadas([[0, 0.038], [0.5, 0.031], [0.85, 0.018], [1, 0.008]]), { segs: 24, radial: 14 });
  poner(picoInf, [0, 0, 0], [0, 0, 0], [1, 1, 0.52]);
  pintarPorVertice(picoInf, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 14, y * 14, z * 14) - 0.5;
    return c.set(PICO_NEGRO).offsetHSL(0, 0, n * 0.04 + 0.02);
  });
  detalle.push(picoInf);

  // narinas: dos puntos oscuros donde el pico toca la frente
  for (const s of [1, -1]) {
    detalle.push(pintarPlano(poner(new THREE.SphereGeometry(0.0042, 8, 6), [0.152, 0.952, s * 0.0135]), '#57493a'));
  }

  /* ── ALA PLEGADA = TRES MASAS PINTADAS POR TRACTOS ────────────────────────
     Hombro rojo → banda amarilla de cobertoras medianas → remeras azules que
     convergen sobre la rabadilla. Estrías finas de ruido anisótropo sugieren
     las barbas SIN dibujar plumas. */
  const alasCercanas = [];
  const pintarAla = (g, s) => pintarPorVertice(g, (x, y, z, i, c) => {
    const u = (x - 0.055) * -0.608 + (y - 0.765) * -0.793;   // avance hombro→punta
    const v = (x - 0.055) * -0.793 - (y - 0.765) * -0.608;   // través del ala
    const j = (ruidoFbm(x * 7 + s * 3, y * 7, z * 7) - 0.5) * 0.05;
    const t = u + j;
    const n = ruidoFbm(x * 5.2 + 7, y * 5.2, z * 5.2) - 0.5;
    c.set(ROJO_PROF).lerp(new THREE.Color(ROJO), clamp01(0.55 + n * 0.25));
    const aAmarillo = suavePaso(0.048, 0.075, t) * (1 - suavePaso(0.100, 0.135, t));
    if (aAmarillo > 0) c.lerp(new THREE.Color(AMARILLO), aAmarillo * 0.92);
    const aAzul = suavePaso(0.112, 0.180, t);
    if (aAzul > 0) c.lerp(new THREE.Color(AZUL), aAzul);
    const aOscuro = suavePaso(0.24, 0.37, t);
    if (aOscuro > 0) c.lerp(new THREE.Color(AZUL_OSC), aOscuro * 0.85);
    // moteado ancho + estrías de barbas: textura de tracto, no calcomanía
    const mota = ruidoFbm(x * 3.1 + s, y * 3.1, z * 3.1) - 0.5;
    c.multiplyScalar(1 + mota * 0.16);
    const barbas = 0.5 + 0.5 * Math.sin(v * 220 + (ruidoFbm(x * 9, y * 9, z * 9) - 0.5) * 4);
    const dondeBarbas = suavePaso(0.06, 0.12, t);
    c.multiplyScalar(1 - dondeBarbas * 0.05 * (1 - barbas));
    return c;
  });
  for (const s of [1, -1]) {
    const ala = masa([-0.045, 0.630, s * 0.096], [-0.55, -0.72, s * 0.07], 0.47, 0.175, 0.052, 30);
    const remeras = masa([-0.150, 0.508, s * 0.048], [-0.62, -0.76, s * 0.03], 0.30, 0.072, 0.030, 24);
    for (const g of [ala, remeras]) {
      despeinar(g, { amp: 0.010, freq: 9, semilla: 5 + s });
      pintarAla(g, s);
      plumaje.push(g);
      if (s === 1) alasCercanas.push(g);
    }
  }
  A.marca('plumas', alasCercanas, { modo: 'extremo', dir: [-0.6, -0.78, 0.15] });

  /* ── LA COLA LARGUÍSIMA ───────────────────────────────────────────────────
     Tan larga como el cuerpo o más — sin ella es un loro, no una guacamaya.
     Láminas superpuestas que cuelgan detrás de la percha hasta rozar el piso,
     rojas con la punta azul. */
  const colaPiezas = [];
  const pintarCola = (g) => pintarPorVertice(g, (x, y, z, i, c) => {
    const u = (x + 0.128) * -0.375 + (y - 0.545) * -0.927;
    const n = ruidoFbm(x * 6 + 11, y * 6, z * 6) - 0.5;
    c.set(ROJO_PROF).lerp(new THREE.Color(ROJO), clamp01(0.55 + n * 0.25));
    const aAzul = suavePaso(0.40, 0.53, u);
    if (aAzul > 0) c.lerp(new THREE.Color(AZUL), aAzul);
    const aOscuro = suavePaso(0.52, 0.60, u);
    if (aOscuro > 0) c.lerp(new THREE.Color(AZUL_OSC), aOscuro * 0.75);
    const barbas = 0.5 + 0.5 * Math.sin(z * 260 + (ruidoFbm(x * 8, y * 8, z * 8) - 0.5) * 3);
    c.multiplyScalar(1 - suavePaso(0.10, 0.25, u) * 0.06 * (1 - barbas));
    return c;
  });
  const coberteras = masa([-0.150, 0.470, 0], [-0.34, -0.86, 0], 0.24, 0.105, 0.048, 24);
  const timoneraCentral = masa([-0.243, 0.285, 0], [-0.375, -0.927, 0], 0.60, 0.092, 0.026, 30);
  colaPiezas.push(coberteras, timoneraCentral);
  for (const s of [1, -1]) {
    colaPiezas.push(masa([-0.222, 0.318, s * 0.018], [-0.36, -0.92, s * 0.05], 0.50, 0.075, 0.022, 26));
  }
  for (const g of colaPiezas) {
    despeinar(g, { amp: 0.006, freq: 10, semilla: 9 });
    pintarCola(g);
    plumaje.push(g);
  }
  A.marca('cola', [timoneraCentral, ...colaPiezas.slice(2)], { modo: 'extremo', dir: [-0.375, -0.927, 0] });

  /* ── PATAS ZIGODÁCTILAS QUE AGARRAN LA RAMA DE VERDAD ─────────────────────
     Dos dedos adelante, dos atrás, cada uno un tubo con nudillos que SIGUE el
     cilindro de la percha, y la garra clavándose al final. El muslo emplumado
     rojo tapa la salida del tarso, como en el ave real. */
  const garrasCercanas = [];
  const pintarPata = (g) => pintarPorVertice(g, (x, y, z, i, c) => {
    const esc = ruidoFbm(x * 40, y * 40, z * 40);
    return c.set(PATA).lerp(new THREE.Color(PATA_CLARA), clamp01((esc - 0.35) * 1.6) * 0.6);
  });
  for (const s of [1, -1]) {
    const zPie = s === 1 ? 0.085 : -0.062;
    const cPie = centroRama(zPie);

    // muslo emplumado (va al plumaje, no al detalle)
    plumaje.push(pintarPlano(masa([0.030, 0.560, s * 0.062], [0.06, -1, s * 0.14], 0.115, 0.064, 0.056, 20), ROJO));

    // tarso corto y gris
    const tarso = hueso([0.040, 0.552, s * 0.060], [0.042, cPie[1] + R_PERCHA + 0.014, zPie * 0.96], 0.019, 0.0145, 10);
    detalle.push(pintarPata(tarso));

    // dedos: [φ inicial → φ final, offset axial]; adelante los largos
    const dedos = [
      { fis: [0.30, 0.90, 1.42, 1.80], sA: 0.018, perfil: [[0, 0.0145], [0.4, 0.0115], [0.6, 0.0125], [1, 0.0085]] },
      { fis: [0.26, 0.84, 1.36, 1.72], sA: -0.016, perfil: [[0, 0.0140], [0.4, 0.0110], [0.6, 0.0120], [1, 0.0082]] },
      { fis: [-0.26, -0.80, -1.30, -1.66], sA: 0.014, perfil: [[0, 0.0132], [0.5, 0.0105], [1, 0.0075]] },
      { fis: [-0.30, -0.86, -1.36, -1.70], sA: -0.014, perfil: [[0, 0.0128], [0.5, 0.0100], [1, 0.0072]] },
    ];
    for (const dedo of dedos) {
      const pts = dedo.fis.map((fi, k) => puntoPercha(zPie, fi, R_PERCHA + 0.013 - k * 0.002, dedo.sA));
      const tubo = tuboCurva(pts, perfilParadas(dedo.perfil), { segs: 14, radial: 8 });
      detalle.push(pintarPata(tubo));
      // garra: sigue la tangente del envolvimiento y se clava hacia la corteza
      const fiFin = dedo.fis[3];
      const sf = Math.sin(fiFin), cf = Math.cos(fiFin);
      const sentido = fiFin > 0 ? 1 : -1;
      const dirGarra = [
        FRENTE.x * cf * sentido,
        -CENIT.y * sf * sentido,
        -CENIT.z * sf * sentido,
      ];
      const garra = garraCurva(pts[3], dirGarra, 0.028, 0.0056, 0.85);
      detalle.push(pintarPlano(garra, UÑA));
      if (s === 1) garrasCercanas.push(garra);
    }
  }
  A.marca('pata', garrasCercanas, { modo: 'extremo', dir: [0.5, -0.6, 0.6] });

  /* ── LA RAMA ──────────────────────────────────────────────────────────────
     Diagonal, con comba leve, más gruesa hacia el tronco (fuera de cuadro) y
     un muñón de rama rota. Corteza por ruido, liquen después del horneado. */
  const rama = tuboCurva([
    RAMA_A,
    [0.035, 0.335, -0.22],
    [0.035, 0.455, 0.20],
    RAMA_B,
  ], perfilParadas([[0, 0.060], [0.45, 0.053], [1, 0.040]]), { segs: 44, radial: 18 });
  pintarPorVertice(rama, (x, y, z, i, c) => {
    const veta = 0.5 + 0.5 * Math.sin((y * CENIT.y + z * EJE_RAMA.z) * 2 + Math.atan2(x - 0.035, y - centroRama(z)[1]) * 3
      + (ruidoFbm(x * 6, y * 6, z * 6) - 0.5) * 5);
    const n = ruidoFbm(x * 9 + 4, y * 9, z * 9);
    return c.set(RAMA).lerp(new THREE.Color(RAMA_OSC), clamp01(veta * 0.55 + (n - 0.5) * 0.5));
  });
  ramaPartes.push(rama);
  const munon = tuboCurva([
    [0.030, 0.330, -0.315],
    [0.005, 0.395, -0.345],
    [-0.012, 0.432, -0.360],
  ], perfilParadas([[0, 0.024], [0.7, 0.014], [1, 0.006]]), { segs: 12, radial: 9 });
  pintarPorVertice(munon, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 11, y * 11, z * 11);
    return c.set(RAMA_OSC).lerp(new THREE.Color(RAMA), clamp01((n - 0.3) * 1.2));
  });
  ramaPartes.push(munon);

  /* ── FUSIÓN, HORNEADO Y MONTAJE ───────────────────────────────────────── */
  const plumajeGeo = fusionar(plumaje, 'guacamaya-plumaje');
  const detalleGeo = fusionar(detalle, 'guacamaya-detalle');
  const ramaGeo = fusionar(ramaPartes, 'guacamaya-rama');

  hornearPelaje(plumajeGeo, { yBajo: 0.0, yAlto: 1.0, ao: 0.26, moteado: 0.05, semilla: 21, cielo: 0.22, freq: 2.8 });
  hornearPelaje(detalleGeo, { yBajo: 0.30, yAlto: 1.0, ao: 0.12, moteado: 0.02, semilla: 22, cielo: 0.10, freq: 2.2 });
  hornearPelaje(ramaGeo, { yBajo: 0.10, yAlto: 0.62, ao: 0.30, moteado: 0.10, semilla: 23, cielo: 0.20, freq: 2.4 });

  // liquen pálido sobre la corteza — después del horneado para que no se lave
  pintarMancha(ramaGeo, [0.080, 0.352, -0.28], 0.050, MUSGO, { dureza: 0.5, ruido: 0.30, semilla: 61, fuerza: 0.45 });
  pintarMancha(ramaGeo, [-0.005, 0.505, 0.30], 0.060, MUSGO, { dureza: 0.5, ruido: 0.35, semilla: 62, fuerza: 0.40 });
  pintarMancha(ramaGeo, [0.060, 0.272, -0.48], 0.040, MUSGO, { dureza: 0.5, ruido: 0.30, semilla: 63, fuerza: 0.35 });

  const G = new THREE.Group();
  G.name = 'guacamaya';
  const matPluma = materialPelaje({ roughness: 0.78, rim: 0.20, filo: 3.6, calido: [1.0, 0.88, 0.66] });
  const matFino = materialPelaje({ roughness: 0.34, rim: 0.12, filo: 4.4 });
  const matRama = materialPelaje({ roughness: 0.95, rim: 0.06, filo: 3.0, calido: [0.9, 0.85, 0.7] });
  for (const [g, m] of [[plumajeGeo, matPluma], [detalleGeo, matFino], [ramaGeo, matRama]]) {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    G.add(mesh);
  }

  if (typeof console !== 'undefined') {
    const probe = new THREE.Box3().setFromObject(G);
    const centro = new THREE.Vector3();
    probe.getCenter(centro);
    const tris = [plumajeGeo, detalleGeo, ramaGeo].reduce((s, g) => s + g.attributes.position.count / 3, 0);
    console.info('[guacamaya]', {
      yPie: +probe.min.y.toFixed(3),
      ramaCentroX: RAMA_A[0],
      dxAveRamaX: +(centro.x - RAMA_A[0]).toFixed(3),
      centroAveX: +centro.x.toFixed(3),
      alturaTotal: +(probe.max.y - probe.min.y).toFixed(3),
      triangulos: Math.round(tris),
      nota: 'posada en la rama; un solo loft cuerpo-cuello-cabeza',
    });
  }
  void r;

  return {
    grupo: G,
    metrosPorUnidad: 1,
    puntos: [
      {
        id: 'pico', etiqueta: 'Pico ganchudo',
        descripcion: 'Pico enorme y curvo, hecho para quebrar semillas duras y nueces. Es lo primero que la delata de lejos.',
        posicion: A.punto('pico'),
      },
      {
        id: 'cola', etiqueta: 'Cola larga',
        descripcion: 'Muy larga y afilada hacia la punta. Le da la silueta de guacamaya y ayuda a leerla entre las ramas.',
        posicion: A.punto('cola'),
      },
      {
        id: 'pata', etiqueta: 'Pata zigodáctila',
        descripcion: 'Dos dedos adelante y dos atrás, como en los loros grandes. Ese agarre le permite aferrarse a ramas y frutos.',
        posicion: A.punto('pata'),
      },
      {
        id: 'cara', etiqueta: 'Piel desnuda de la cara',
        descripcion: 'La zona clara de la cara no tiene el plumaje completo y deja ver el parche desnudo típico de las guacamayas.',
        posicion: A.punto('cara'),
      },
      {
        id: 'plumas', etiqueta: 'Plumas de vuelo',
        descripcion: 'Las primarias y secundarias forman el ala larga y potente que le permite volar entre dormidero y comedero.',
        posicion: A.punto('plumas'),
      },
    ],
  };
}

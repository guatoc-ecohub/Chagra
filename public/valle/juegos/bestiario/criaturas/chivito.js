// ── criaturas/chivito.js — CHIVITO DE PÁRAMO · Oxypogon sp. ────────────────
//
// Colibrí pequeño, hecho en metros y mirando a +X. La lectura depende de dos
// masas que no se pueden perder: el penacho de la coronilla y la barba que
// cae desde la garganta. Las alas son dos pares de masas cruzadas, no plumas
// contables: se leen como alas de vuelo rápido aun en la pose de vitrina.

import * as THREE from 'three';
import {
  rng, poner, hueso, pintarPlano, pintarPorVertice, pintarMancha, fusionar,
  hornearPelaje, tuboCurva, materialPelaje, crearAnclas, ruidoFbm, clamp01,
  masa, perfilParadas, mechon, despeinar,
} from '../anatomia.js';
import { crearSer } from '../../../lib3d/creatures/generarSer.js';

const VERDE_PROFUNDO = '#1b302c';
const VERDE = '#376658';
const VERDE_CLARO = '#73947c';
const PECHO = '#cdbf8c';
const BARBA = '#d8d0b0';
const BARBA_SOMBRA = '#78806b';
const CRESTA = '#b6ad83';
const CRESTA_SOMBRA = '#5c6a58';
const ALA = '#426e70';
const ALA_CLARA = '#8eaaa0';
const PICO = '#30271e';
const PICO_BASE = '#514531';
const LENGUA = '#c77c68';
const OJO = '#120f0b';
const OJO_BRILLO = '#f2e7c7';

function pintarPlumaje(geo, semilla, base = VERDE) {
  return pintarPorVertice(geo, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 80 + semilla, y * 70, z * 80) - 0.5;
    return c.set(base).lerp(new THREE.Color(VERDE_CLARO), clamp01(0.38 + n * 0.55));
  });
}

function pintarAlas(geo, semilla) {
  return pintarPorVertice(geo, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 90 + semilla, y * 75, z * 95) - 0.5;
    const borde = clamp01((y - 0.080) * 30) * 0.55;
    return c.set(ALA).lerp(new THREE.Color(ALA_CLARA), clamp01(0.34 + n * 0.45 + borde));
  });
}

export function construirChivito({ semilla = 20260812 } = {}) {
  const r = rng(semilla);
  const plumaje = [];
  const alas = [];
  const detalle = [];
  const A = crearAnclas();

  /* Un solo loft une cola, tórax, cuello y cráneo. Así la cabeza no queda
     como una esfera separada del cuerpo, y el ave conserva una silueta fina. */
  const espinazo = [
    [-0.030, 0.052, 0],
    [-0.021, 0.057, 0],
    [-0.005, 0.064, 0],
    [ 0.012, 0.071, 0],
    [ 0.026, 0.078, 0],
    [ 0.038, 0.084, 0],
    [ 0.045, 0.086, 0],
  ];
  const radios = [0.010, 0.017, 0.021, 0.022, 0.020, 0.019, 0.015];
  const cuerpo = tuboCurva(
    espinazo,
    perfilParadas(radios.map((radio, i) => [i / (radios.length - 1), radio])),
    { segs: 64, radial: 28 },
  );
  pintarPlumaje(cuerpo, semilla, VERDE_PROFUNDO);
  pintarMancha(cuerpo, [0.020, 0.073, 0], 0.032, PECHO, {
    dureza: 0.58,
    fuerza: 0.82,
    ruido: 0.12,
    semilla: semilla + 2,
    donde: (x) => x > -0.002,
  });
  despeinar(cuerpo, { amp: 0.0018, freq: 18, semilla: semilla + 3 });
  plumaje.push(cuerpo);
  A.marca('cuerpo', cuerpo, { modo: 'centro' });

  /* Cobertoras de la cola: una punta corta hacia atrás completa la silueta
     sin inflar la longitud real del animal. */
  for (const s of [-1, 1]) {
    const cola = masa([-0.028, 0.050, s * 0.004], [-1, -0.16, s * 0.12], 0.030, 0.011, 0.008, 18);
    pintarPlumaje(cola, semilla + 8 + s, VERDE);
    plumaje.push(cola);
  }

  /* Alas: dos láminas redondeadas por lado, cruzadas en el hombro. El borde
     claro evita que el ala se funda con el lomo verde en la vista oblicua. */
  const alasCercanas = [];
  for (const s of [-1, 1]) {
    const primaria = masa(
      [-0.006, 0.078, s * 0.018],
      [-0.40, 0.32, s * 0.86],
      0.074, 0.023, 0.0065, 24,
    );
    const secundaria = masa(
      [0.004, 0.076, s * 0.019],
      [-0.18, 0.55, s * 0.81],
      0.062, 0.019, 0.0060, 22,
    );
    for (const ala of [primaria, secundaria]) {
      pintarAlas(ala, semilla + 20 + s);
      despeinar(ala, { amp: 0.0012, freq: 22, semilla: semilla + 26 + s });
      alas.push(ala);
      if (s === 1) alasCercanas.push(ala);
    }
  }
  A.marca('alas', alasCercanas, { modo: 'centro' });

  /* Cresta: cinco masas suaves que nacen en la coronilla y se abren apenas
     hacia atrás. Son anchas y redondeadas para que se lean como penacho, no
     como cuernos ni como una fila de conos. */
  const crestaPartes = [];
  const crestaBases = [
    [0.014, 0.094, -0.010, -0.24, 0.97, -0.05, 0.022, 0.0090],
    [0.021, 0.096, -0.006, -0.16, 0.98, -0.03, 0.026, 0.0095],
    [0.028, 0.097,  0.000, -0.06, 1.00,  0.00, 0.030, 0.0100],
    [0.034, 0.095,  0.007,  0.08, 0.99,  0.05, 0.027, 0.0092],
    [0.039, 0.093,  0.013,  0.20, 0.97,  0.10, 0.022, 0.0085],
  ];
  for (let i = 0; i < crestaBases.length; i++) {
    const [x, y, z, dx, dy, dz, largo, ancho] = crestaBases[i];
    const mechonCresta = mechon([x, y, z], [dx, dy, dz], largo, ancho, 8);
    pintarPorVertice(mechonCresta, (vx, vy, vz, j, c) => {
      const n = ruidoFbm(vx * 120 + semilla + i, vy * 100, vz * 120) - 0.5;
      return c.set(i % 2 ? CRESTA : CRESTA_SOMBRA)
        .lerp(new THREE.Color(CRESTA), clamp01(0.42 + n * 0.55));
    });
    despeinar(mechonCresta, { amp: 0.0010, freq: 25, semilla: semilla + 35 + i });
    crestaPartes.push(mechonCresta);
  }
  plumaje.push(...crestaPartes);
  A.marca('cresta', crestaPartes, { modo: 'extremo', dir: [0, 1, 0] });

  /* Barba de garganta: una base compacta y cinco mechones que prolongan la
     misma masa hacia el piso. La superficie ancha asegura lectura de barba
     incluso cuando la cámara la mira de tres cuartos. */
  const barbaPartes = [
    masa([0.027, 0.055, 0], [0, -1, 0], 0.050, 0.024, 0.022, 24),
  ];
  const barbaBases = [
    [0.018, 0.059, -0.015, -0.12, -1.00, -0.05, 0.035, 0.0064],
    [0.025, 0.060, -0.008, -0.08, -1.00, -0.02, 0.042, 0.0070],
    [0.031, 0.060,  0.000,  0.00, -1.00,  0.00, 0.048, 0.0074],
    [0.037, 0.059,  0.008,  0.08, -1.00,  0.02, 0.041, 0.0068],
    [0.042, 0.057,  0.015,  0.14, -0.99,  0.05, 0.032, 0.0060],
  ];
  for (let i = 0; i < barbaBases.length; i++) {
    const [x, y, z, dx, dy, dz, largo, ancho] = barbaBases[i];
    const mechonBarba = mechon([x, y, z], [dx, dy, dz], largo, ancho, 8);
    pintarPorVertice(mechonBarba, (vx, vy, vz, j, c) => {
      const n = ruidoFbm(vx * 110 + semilla + i, vy * 90, vz * 110) - 0.5;
      return c.set(i % 2 ? BARBA : BARBA_SOMBRA)
        .lerp(new THREE.Color(BARBA), clamp01(0.38 + n * 0.50));
    });
    despeinar(mechonBarba, { amp: 0.0009, freq: 24, semilla: semilla + 45 + i });
    barbaPartes.push(mechonBarba);
  }
  for (const [i, parte] of barbaPartes.entries()) {
    if (i === 0) pintarPlumaje(parte, semilla + 42, BARBA_SOMBRA);
  }
  plumaje.push(...barbaPartes);
  A.marca('barba', barbaPartes, { modo: 'extremo', dir: [0, -1, 0] });

  /* Pico recto: dos segmentos alineados, sin gancho. La lengua queda bajo el
     borde lateral para que pueda verse desde la cámara heroica del visor. */
  const pico = hueso([0.038, 0.086, 0], [0.080, 0.082, 0], 0.0048, 0.0015, 12);
  pintarPorVertice(pico, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 160 + semilla, y * 140, z * 160) - 0.5;
    return c.set(PICO_BASE).lerp(new THREE.Color(PICO), clamp01(0.55 + n * 0.35));
  });
  detalle.push(pico);
  A.marca('pico', pico, { modo: 'extremo', dir: [1, -0.08, 0] });

  const lengua = tuboCurva(
    [[0.042, 0.081, 0.010], [0.059, 0.079, 0.011], [0.075, 0.078, 0.011]],
    perfilParadas([[0, 0.0026], [0.65, 0.0020], [1, 0.0005]]),
    { segs: 14, radial: 8 },
  );
  detalle.push(pintarPlano(lengua, LENGUA));
  A.marca('lengua', lengua, { modo: 'extremo', dir: [1, -0.2, 0.15] });

  /* Ojos a ambos lados: el anillo claro separa el ojo negro del plumaje y
     fija la dirección de la cabeza sin hacer una máscara artificial. */
  for (const s of [-1, 1]) {
    const aro = poner(new THREE.SphereGeometry(0.0068, 14, 10), [0.040, 0.091, s * 0.0185]);
    detalle.push(pintarPlano(aro, OJO_BRILLO));
    const ojo = poner(new THREE.SphereGeometry(0.0045, 12, 9), [0.043, 0.091, s * 0.0220]);
    detalle.push(pintarPlano(ojo, OJO));
    const brillo = poner(new THREE.SphereGeometry(0.0012, 8, 6), [0.045, 0.093, s * 0.0252]);
    detalle.push(pintarPlano(brillo, '#fff6db'));
  }

  /* Patas diminutas: no compiten con las cinco partes de la ficha, pero dejan
     el cuerpo apoyado en el piso del atlas en vez de hacerlo flotar. */
  for (const s of [-1, 1]) {
    const pierna = hueso([0.000, 0.047, s * 0.011], [-0.003, 0.022, s * 0.014], 0.0032, 0.0020, 7);
    detalle.push(pintarPlano(pierna, '#3d3830'));
    const pie = hueso([-0.003, 0.022, s * 0.014], [-0.012, 0.016, s * 0.017], 0.0020, 0.0008, 7);
    detalle.push(pintarPlano(pie, '#302b26'));
  }

  const plumajeGeo = fusionar(plumaje, 'chivito-plumaje');
  const alasGeo = fusionar(alas, 'chivito-alas');
  const detalleGeo = fusionar(detalle, 'chivito-detalle');
  hornearPelaje(plumajeGeo, { yBajo: 0.005, yAlto: 0.112, ao: 0.24, moteado: 0.04, semilla: semilla + 60, cielo: 0.20, freq: 3.0 });
  hornearPelaje(alasGeo, { yBajo: 0.025, yAlto: 0.115, ao: 0.16, moteado: 0.03, semilla: semilla + 61, cielo: 0.18, freq: 3.4 });
  hornearPelaje(detalleGeo, { yBajo: 0.005, yAlto: 0.105, ao: 0.10, moteado: 0.015, semilla: semilla + 62, cielo: 0.12, freq: 3.0 });

  const G = new THREE.Group();
  G.name = 'chivito';
  const mallaPlumaje = new THREE.Mesh(plumajeGeo, materialPelaje({ roughness: 0.84, rim: 0.22, filo: 3.8, calido: [1.0, 0.88, 0.65] }));
  const mallaAlas = new THREE.Mesh(alasGeo, materialPelaje({ roughness: 0.62, rim: 0.18, filo: 4.0, calido: [0.86, 0.96, 0.86] }));
  const mallaDetalle = new THREE.Mesh(detalleGeo, materialPelaje({ roughness: 0.46, rim: 0.15, filo: 4.2 }));
  for (const malla of [mallaPlumaje, mallaAlas, mallaDetalle]) {
    malla.castShadow = true;
    malla.receiveShadow = true;
    G.add(malla);
  }

  if (typeof console !== 'undefined') {
    const caja = new THREE.Box3().setFromObject(G);
    console.info('[chivito]', {
      yPiso: +caja.min.y.toFixed(4),
      anchoX: +(caja.max.x - caja.min.x).toFixed(4),
      altoY: +(caja.max.y - caja.min.y).toFixed(4),
      fondoZ: +(caja.max.z - caja.min.z).toFixed(4),
      semilla,
      nota: 'cresta y barba medidas sobre las geometrías que las construyen',
    });
  }
  void r;

  return crearSer({
    especie: 'Oxypogon sp.',
    reino: 'animal',
    estilo: 'naturalista',
    nivelDetalle: 2,
    grupo: G,
    metrosPorUnidad: 1,
    puntos: [
      {
        id: 'cresta', etiqueta: 'Cresta',
        descripcion: 'Penacho de la coronilla que sobresale sobre la cabeza y distingue al chivito del colibrí genérico.',
        posicion: A.punto('cresta'),
      },
      {
        id: 'barba', etiqueta: 'Barba',
        descripcion: 'Masa de plumas que cuelga desde la garganta y baja por delante del pecho.',
        posicion: A.punto('barba'),
      },
      {
        id: 'pico', etiqueta: 'Pico recto',
        descripcion: 'Pico largo y fino, alineado hacia delante sin el gancho de un loro.',
        posicion: A.punto('pico'),
      },
      {
        id: 'alas', etiqueta: 'Alas de batido rápido',
        descripcion: 'Dos masas de ala superpuestas por lado, elevadas y separadas del cuerpo para leer el vuelo del colibrí.',
        posicion: A.punto('alas'),
      },
      {
        id: 'lengua', etiqueta: 'Lengua',
        descripcion: 'Lengua fina que asoma bajo el pico y completa el aparato de alimentación del colibrí.',
        posicion: A.punto('lengua'),
      },
    ],
    ficha: {
      nombreComun: 'Chivito de páramo',
      nombreCientifico: 'Oxypogon sp.',
      rol: 'Colibrí de altura, de los que viven donde ya casi no hay árbol. Se le ve en el frailejón. Avisa antes de que cambie el tiempo — cuando baja la nube, baja él.',
      pisoTermico: 'Páramo de los Andes del norte',
      riesgo: '',
    },
  });
}

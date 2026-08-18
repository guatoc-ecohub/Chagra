// ── criaturas/zariguella.js — ZARIGÜEYA · Didelphis sp. ────────────────────
//
// Marsupial nocturno, de hocico largo, orejas desnudas y cola prensil. La
// silueta tiene que leerse de lejos: cara pálida sobre cuerpo oscuro, cola
// larga y casi sin pelo, marsupio visible y pie con pulgar oponible.
//
// Unidades: METROS, mira a +X, y=0 es el piso.

import * as THREE from 'three';
import {
  rng, poner, hueso, pintarPlano, pintarPorVertice, pintarMancha, fusionar, hornearPelaje,
  cuerpoOrganico, tuboCurva, garraCurva, orejaRedonda, materialPelaje, crearAnclas,
  ruidoFbm, clamp01, masa, perfilParadas, tDeCadena, mechon,
} from '../anatomia.js';

const CUERPO = '#2a2420';
const CUERPO_CLARO = '#4a4039';
const CARA = '#d4c7b2';
const CARA_OSC = '#5b4e43';
const ROSA = '#cfada1';
const NARIZ = '#1c1411';
const OJO = '#130f0c';
const DIENTES = '#efe5cf';
const UÑA = '#372b24';
const PELAJE = '#1e1814';

const LARGO = 1.05;
const espina = (t) => 0.26 + 0.012 * Math.sin(t * Math.PI) + 0.018 * Math.sin(t * Math.PI * 2.2);
const arriba = (t) => (0.15 + 0.026 * (1 - t) + 0.016 * Math.sin(t * Math.PI * 1.3)) * (0.90 + 0.08 * t);
const abajo = (t) => (0.14 + 0.034 * Math.sin(t * Math.PI) + 0.020 * (1 - t)) * (0.92 + 0.08 * (1 - t));
const lado = (t) => (0.17 + 0.020 * Math.sin(t * Math.PI * 0.9) + 0.010 * t) * (0.96 + 0.04 * (1 - t));

function puntoSobreTubo(puntos, t) {
  const curva = new THREE.CatmullRomCurve3(puntos.map((p) => new THREE.Vector3(...p)));
  return curva.getPointAt(t).toArray();
}

export function construirZariguella() {
  const r = rng(8023);
  const cuerpo = [];
  const mechones = [];
  const detalle = [];
  const A = crearAnclas();

  /* ── TORSO ────────────────────────────────────────────────────────────── */
  const torso = cuerpoOrganico({
    largo: LARGO, nSeg: 116, nRad: 74, semilla: 19, ruido: 0.028,
    espina, arriba, abajo, lado,
  });
  pintarPorVertice(torso, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 3.4 + 2.0, y * 3.4, z * 3.4) - 0.5;
    const pelaje = clamp01((n + 0.26) * 1.6);
    return c.set(CUERPO).lerp(new THREE.Color(CUERPO_CLARO), pelaje * 0.55);
  });
  cuerpo.push(torso);
  A.marca('lomo', torso, { modo: 'extremo', dir: [0.35, 1, 0.12] });

  const hombro = poner(new THREE.SphereGeometry(0.178, 30, 22), [0.280, 0.392, 0], [0, 0, 0.05], [1.16, 0.96, 1.00]);
  cuerpo.push(pintarPlano(hombro, CUERPO));
  const grupa = poner(new THREE.SphereGeometry(0.194, 30, 22), [-0.290, 0.348, 0], [0, 0, -0.05], [1.08, 1.00, 1.02]);
  cuerpo.push(pintarPlano(grupa, CUERPO));
  const pecho = poner(new THREE.SphereGeometry(0.156, 26, 20), [0.404, 0.350, 0], [0, 0, 0.20], [0.92, 1.00, 0.92]);
  cuerpo.push(pintarPlano(pecho, CUERPO));

  /* ── CABEZA: hocico largo y cara pálida ───────────────────────────────── */
  const craneo = poner(new THREE.SphereGeometry(0.128, 50, 36), [0.665, 0.410, 0], [0, 0, -0.04], [1.02, 0.90, 1.06]);
  pintarPorVertice(craneo, (x, y, z, i, c) => {
    const p = clamp01((x - 0.62) / 0.16);
    return c.copy(new THREE.Color(CARA)).lerp(new THREE.Color(CARA_OSC), p * 0.25);
  });
  cuerpo.push(craneo);

  const cachetes = [];
  for (const s of [1, -1]) {
    const cachete = poner(new THREE.SphereGeometry(0.082, 30, 22), [0.676, 0.360, s * 0.086], [0, 0, 0.04], [1.08, 0.92, 0.84]);
    cuerpo.push(pintarPlano(cachete, CARA));
    cachetes.push(cachete);
    const oreja = orejaRedonda([0.608, 0.510, s * 0.122], [0.12, 0.10, s * 0.98], 0.064, 0.26, 16);
    pintarPlano(oreja, ROSA);
    cuerpo.push(oreja);
    const interior = orejaRedonda([0.616, 0.512, s * 0.136], [0.12, 0.10, s * 0.98], 0.038, 0.18, 12);
    cuerpo.push(pintarPlano(interior, '#a9867e'));
    if (s === 1) A.marca('oreja', oreja, { modo: 'centro' });
  }

  const hocico = poner(new THREE.SphereGeometry(0.094, 42, 30), [0.812, 0.370, 0], [0, 0, -0.08], [1.28, 0.78, 1.00]);
  pintarPorVertice(hocico, (x, y, z, i, c) => {
    const d = clamp01((x - 0.77) / 0.12);
    return c.copy(new THREE.Color(CARA)).lerp(new THREE.Color(CARA_OSC), d * 0.22);
  });
  cuerpo.push(hocico);
  const menton = poner(new THREE.SphereGeometry(0.038, 18, 14), [0.805, 0.323, 0], [0, 0, -0.1], [1.08, 0.70, 0.92]);
  cuerpo.push(pintarPlano(menton, CARA));
  const nariz = poner(new THREE.SphereGeometry(0.026, 16, 12), [0.905, 0.375, 0], [0, 0, 0.08], [0.82, 0.90, 1.20]);
  detalle.push(pintarPlano(nariz, NARIZ));
  A.marca('hocico', nariz, { modo: 'extremo', dir: [1, 0, 0] });
  for (const s of [1, -1]) {
    detalle.push(pintarPlano(poner(new THREE.SphereGeometry(0.0075, 8, 6), [0.914, 0.375, s * 0.016]), '#0e0a09'));
  }
  const boca = poner(new THREE.SphereGeometry(0.030, 14, 10), [0.868, 0.330, 0], [0, 0, -0.18], [1.15, 0.28, 0.84]);
  detalle.push(pintarPlano(boca, '#2b1c18'));
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const diente = poner(new THREE.SphereGeometry(0.0068, 8, 6), [0.882 + t * 0.014, 0.345 - t * 0.006, (t - 0.5) * 0.013], [0, 0, 0], [1, 1.2, 1]);
    detalle.push(pintarPlano(diente, DIENTES));
  }

  /* ── MARSUIPIO ────────────────────────────────────────────────────────── */
  const marsupio = poner(new THREE.SphereGeometry(0.060, 20, 16), [0.322, 0.235, 0], [0, 0, 0.12], [1.22, 0.76, 1.10]);
  pintarPorVertice(marsupio, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 8, y * 8, z * 8);
    return c.copy(new THREE.Color('#bd9b8e')).lerp(new THREE.Color('#8f7468'), clamp01((n - 0.35) * 1.8));
  });
  cuerpo.push(marsupio);
  A.marca('marsupio', marsupio, { modo: 'centro' });

  /* ── PATAS ─────────────────────────────────────────────────────────────── */
  const colaPartes = [];
  const patas = [];
  const pies = [];
  const pulgar = [];
  for (const s of [1, -1]) {
    const z = s * 0.145;
    const P = (x, y, zz = z) => [x, y, zz];
    cuerpo.push(pintarPlano(masa(P(0.254, 0.290, z * 0.78), [0.15, -1, s * 0.08], 0.22, 0.080, 0.072), CUERPO));
    const cad = [
      P(0.242, 0.266, z * 0.82),
      P(0.226, 0.162),
      P(0.250, 0.060),
    ];
    patas.push(pintarPlano(tuboCurva(cad, perfilParadas([[0, 0.034], [0.55, 0.026], [1, 0.022]]), { segs: 18, radial: 10 }), CUERPO));
    const pie = poner(new THREE.SphereGeometry(0.060, 20, 14), P(0.266, 0.026), [0, 0, 0], [1.20, 0.62, 1.00]);
    pies.push(pintarPlano(pie, CUERPO));
    for (let k = 0; k < 4; k++) {
      const f = (k / 3 - 0.5);
      const adelante = k < 2 ? 1 : -1;
      const base = P(0.292 + (adelante > 0 ? 0.020 : -0.010), 0.034, z + f * 0.036);
      const dir = adelante > 0 ? [0.82, -0.10, f * 0.16] : [-0.54, -0.14, f * 0.14];
      const dedo = garraCurva(base, dir, adelante > 0 ? 0.060 : 0.042, adelante > 0 ? 0.011 : 0.009, 0.30);
      detalle.push(pintarPlano(dedo, UÑA));
      if (k === 3) pulgar.push(dedo);
    }
    if (s === 1) A.marca('pulgar', pulgar[pulgar.length - 1], { modo: 'extremo', dir: [-0.4, 0.2, -0.2] });
  }

  /* ── LA COLA PRENSIL ───────────────────────────────────────────────────── */
  const cola = tuboCurva([
    [-0.338, 0.288, 0],
    [-0.588, 0.250, 0.050],
    [-0.808, 0.202, 0.126],
    [-0.960, 0.124, 0.250],
    [-0.888, 0.068, 0.388],
    [-0.674, 0.086, 0.484],
    [-0.476, 0.146, 0.494],
  ], (t) => 0.070 - 0.030 * t + 0.007 * Math.sin(t * Math.PI * 3), { segs: 42, radial: 14 });
  pintarPorVertice(cola, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 11, y * 11, z * 11);
    const punta = clamp01((-x - 0.34) / 0.60);
    const vientre = clamp01((0.24 - y) / 0.24);
    const f = clamp01(punta * 0.72 + vientre * 0.18 + (n - 0.5) * 0.10);
    return c.copy(new THREE.Color('#b08976')).lerp(new THREE.Color('#e0d1bc'), f);
  });
  colaPartes.push(cola);
  const anclaCola = puntoSobreTubo([
    [-0.332, 0.284, 0],
    [-0.560, 0.248, 0.040],
    [-0.780, 0.205, 0.110],
    [-0.930, 0.132, 0.228],
    [-0.860, 0.078, 0.372],
    [-0.650, 0.096, 0.462],
    [-0.470, 0.152, 0.468],
  ], 0.96);
  A.marca('cola', colaPartes, { modo: 'extremo', dir: [-1, 0.1, 0.45] });

  /* ── FUSIÓN Y PELO ─────────────────────────────────────────────────────── */
  const pelaje = fusionar(cuerpo, 'zariguella-cuerpo');
  const finos = fusionar(detalle, 'zariguella-detalle');
  hornearPelaje(pelaje, { yBajo: 0.02, yAlto: 0.44, ao: 0.24, moteado: 0.08, semilla: 8, cielo: 0.18, freq: 3.6 });
  hornearPelaje(finos, { yBajo: 0.00, yAlto: 0.42, ao: 0.14, moteado: 0.03, semilla: 9, cielo: 0.12, freq: 2.8 });

  // Pelaje más largo y desordenado en el lomo y la grupa; la cara queda más limpia.
  for (let i = 0; i < 60; i++) {
    const t = 0.12 + r() * 0.72;
    const y = 0.34 + (r() - 0.5) * 0.14;
    const x = -0.48 + t * 0.98;
    const z = (r() - 0.5) * 0.22;
    const dir = [0.18 - (r() * 0.18), -0.75, z * 0.6];
    mechones.push(pintarPlano(mechon([x, y, z], dir, 0.055 + r() * 0.028, 0.020, 5), CUERPO));
  }
  const piel = fusionar([...cuerpo, ...colaPartes, ...mechones], 'zariguella-pelo');
  hornearPelaje(piel, {
    yBajo: 0.01, yAlto: 0.42, ao: 0.34, moteado: 0.10, semilla: 10, cielo: 0.22, piso: 0.08, freq: 4.1,
  });

  const G = new THREE.Group();
  G.name = 'zariguella';
  const mat = materialPelaje({ roughness: 0.94, rim: 0.24, filo: 3.2, calido: [1.0, 0.88, 0.70] });
  const matFino = materialPelaje({ roughness: 0.50, rim: 0.12, filo: 4.2 });
  for (const [g, m] of [[piel, mat], [finos, matFino]]) {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    G.add(mesh);
  }

  return {
    grupo: G,
    metrosPorUnidad: 1,
    puntos: [
      {
        id: 'cola', etiqueta: 'Cola prensil',
        descripcion: 'Larga, casi sin pelo y capaz de agarrarse: la usa como una mano extra para trepar, equilibrarse y llevar la cría cuando hace falta.',
        posicion: A.punto('cola'),
      },
      {
        id: 'marsupio', etiqueta: 'Marsupio',
        descripcion: 'La bolsa ventral donde termina de crecer la cría. Es la marca de que no es una rata: es un marsupial.',
        posicion: A.punto('marsupio'),
      },
      {
        id: 'hocico', etiqueta: 'Hocico y dentadura',
        descripcion: 'Hocico largo y puntudo, con dientes finos y muchos. Esa cara alargada es la que la saca del conjunto de los roedores a simple vista.',
        posicion: A.punto('hocico'),
      },
      {
        id: 'pulgar', etiqueta: 'Pulgar oponible',
        descripcion: 'El dedo interno del pie trasero se abre hacia adentro como un pulgar. Le ayuda a agarrar ramas y a moverse en los árboles.',
        posicion: A.punto('pulgar'),
      },
      {
        id: 'oreja', etiqueta: 'Orejas desnudas',
        descripcion: 'Grandes, finas y sin pelo. Las orejas desnudas completan la cara pálida y delatan al animal aun de noche.',
        posicion: A.punto('oreja'),
      },
    ],
  };
}

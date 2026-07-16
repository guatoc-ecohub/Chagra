/*
 * bosqueTakeB.geom — la GEOMETRÍA del Bosque Vivo TAKE B (estilizado Switch).
 *
 * Una de VARIAS tomas para que el operador elija. Esta es la GRÁFICA: color
 * por bandas (Zelda BOTW / Sable), silueta fuerte, diseño sobre foto-realismo.
 * Los principios:
 *
 *   · TERRENO: un anfiteatro de páramo — claro plano al centro (el escenario
 *     del Ent, donde vive la fauna a sus alturas de siempre) y una herradura
 *     de lomas alrededor con DOS portales (al fondo y a la derecha) por donde
 *     el ojo escapa a la cordillera lejana. El color va QUANTIZADO en bandas
 *     de altura (pajonal → monte → roca) con dithering en el borde, y la
 *     pendiente fuerte rompe a roca: se lee como ilustración, no como foto.
 *
 *   · QUEÑUAS ESTILIZADAS: tronco rojizo torcido (el papel del Polylepis) y
 *     el dosel como MASA — icosaedro SUBDIVIDIDO deformado con ruido de BAJA
 *     frecuencia y normales SUAVES (bultos grandes de silueta, cero facetas
 *     de dado), panza plana de sombrilla y gradiente de color horneado
 *     (penumbra abajo → sol arriba → contraluz en la piel).
 *
 *   · CORDILLERA en dos capas con perspectiva aérea HORNEADA (la capa lejana
 *     ya nace azulada): junto con la niebla dan el parallax de fondo.
 *
 * Tier-safe: `q` (calidad 0..1) gobierna segmentos y subdivisiones; los
 * conteos por tier viven en CONTEOS_TAKEB. Todo merge pasa por fusionarSeguro
 * (desindexa y TRUENA si mergeGeometries devolviera null — el bug conocido).
 * Headless: solo three + el kit de sombreadoVegetal. Cero assets externos.
 */
import * as THREE from 'three';
import {
  rng,
  ruidoFbm,
  fusionarSeguro,
  poner,
  pintarPorVertice,
  hornearFollaje,
  hornearCorteza,
  tuboOrganico,
  curvaTronco,
  taperTronco,
} from './sombreadoVegetal.js';

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

export const CONTEOS_TAKEB = {
  alto: { arbol: 24, frailejon: 15, pasto: 48, roca: 9, variantes: 4, segTerreno: 120, q: 1 },
  medio: { arbol: 14, frailejon: 9, pasto: 24, roca: 6, variantes: 3, segTerreno: 72, q: 0.6 },
  bajo: { arbol: 8, frailejon: 5, pasto: 0, roca: 3, variantes: 2, segTerreno: 44, q: 0.42 },
};

export const conteosDeTier = (tier) => CONTEOS_TAKEB[tier] || CONTEOS_TAKEB.medio;

/* -------------------------------------------------------------------------- */
/*  El RELIEVE: claro + herradura de lomas + portales                          */
/* -------------------------------------------------------------------------- */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (t) => {
  const s = clamp01(t);
  return s * s * (3 - 2 * s);
};
/* Campana angular (envuelve en ±π): cuánto pesa el portal en esta dirección. */
function campana(ang, centro, ancho) {
  const d = Math.atan2(Math.sin(ang - centro), Math.cos(ang - centro));
  return Math.exp(-(d * d) / (2 * ancho * ancho));
}

/**
 * Altura del terreno en (x,z). Determinista: los árboles, rocas y sombras de
 * contacto se POSAN encima. El claro central queda ≈0 (la fauna del registro
 * vive a alturas horneadas para suelo plano); las lomas suben en herradura.
 */
export function alturaTakeB(x, z) {
  const d = Math.hypot(x, z);
  const anillo = suave((d - 10) / 12);
  const ang = Math.atan2(z, x);
  // Tres portales: el del FONDO (-z, donde vive la cordillera), uno menor a
  // la derecha, y el DEL FRENTE (+z): el anfiteatro se abre hacia la cámara
  // — el escenario clásico — y la órbita nunca entierra el lente en la loma.
  const portal =
    1 -
    0.62 * campana(ang, -Math.PI / 2, 0.52) -
    0.34 * campana(ang, 0.3, 0.34) -
    0.72 * campana(ang, Math.PI / 2, 0.62);
  const lomas = 0.72 + 0.56 * ruidoFbm(x * 0.13 + 3.1, 0, z * 0.13);
  const alto = anillo * Math.max(0.1, portal) * 4.6 * lomas;
  // Ondulación menuda SOLO fuera del escenario del claro (fauna a y fijo).
  const micro = (ruidoFbm(x * 0.55 + 7.7, 0, z * 0.55) - 0.5) * 0.5 * suave((d - 5) / 4);
  return alto + micro;
}

/* Pendiente aproximada (0 plano → 1 pared) por diferencias finitas. */
function pendienteTakeB(x, z) {
  const e = 0.6;
  const dx = alturaTakeB(x + e, z) - alturaTakeB(x - e, z);
  const dz = alturaTakeB(x, z + e) - alturaTakeB(x, z - e);
  return clamp01(Math.hypot(dx, dz) / (2 * e));
}

/* -------------------------------------------------------------------------- */
/*  TERRENO por bandas                                                         */
/* -------------------------------------------------------------------------- */

/* Las bandas de altura (de claro a cumbre): pajonal dorado del páramo abajo,
   monte frío arriba, roca en la cresta. Quantizado = ilustración. */
const BANDAS = [
  new THREE.Color('#b9bd6a'), // pajonal soleado del claro
  new THREE.Color('#9cae57'),
  new THREE.Color('#7d9b4d'),
  new THREE.Color('#5d8748'),
  new THREE.Color('#49734f'), // monte alto frío
  new THREE.Color('#8d9ba5'), // roca de cumbre
];
const ROCA_LADERA = new THREE.Color('#6d7884');
const ESCENARIO = new THREE.Color('#cbc47c'); // el claro del Ent, más tibio

/**
 * La malla del terreno (84×84), pintada por vértice en bandas quantizadas.
 * @param {{seg?: number}} o
 */
export function geomTerrenoTakeB({ seg = 96 } = {}) {
  const g = new THREE.PlaneGeometry(84, 84, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, alturaTakeB(pos.getX(i), pos.getZ(i)));
  }
  g.computeVertexNormals();

  const tmp = new THREE.Color();
  pintarPorVertice(g, (x, y, z) => {
    // Banda por altura, con dithering de ruido para que el borde muerda.
    const t = clamp01(y / 6);
    const dith = (ruidoFbm(x * 0.9 + 17, 0, z * 0.9) - 0.5) * 0.9;
    const idx = Math.min(
      BANDAS.length - 1,
      Math.max(0, Math.round(t * (BANDAS.length - 1) + dith)),
    );
    tmp.copy(BANDAS[idx]);
    // La pendiente fuerte rompe a roca (los taludes se leen de una).
    const p = pendienteTakeB(x, z);
    if (p > 0.5) tmp.lerp(ROCA_LADERA, clamp01((p - 0.5) / 0.35) * 0.85);
    // El escenario del claro: un vaho tibio bajo el guardián (sutil).
    const d = Math.hypot(x, z);
    if (d < 4.2) tmp.lerp(ESCENARIO, suave(1 - d / 4.2) * 0.26);
    return tmp;
  });
  return g;
}

/* -------------------------------------------------------------------------- */
/*  QUEÑUA estilizada — el dosel como MASA                                     */
/* -------------------------------------------------------------------------- */

/*
 * Masa de dosel: icosaedro SUBDIVIDIDO (nada de d20 literal) deformado con
 * ruido de baja frecuencia — bultos grandes, silueta fuerte — con la panza
 * plana (sombrilla) y NORMALES SUAVES para que el toon lo lea como una masa.
 */
function masaDosel(radio, semilla, q = 1) {
  const g = new THREE.IcosahedronGeometry(radio, q > 0.55 ? 2 : 1);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  const f = 1.35 / radio; // frecuencia baja: bultos del tamaño de la masa
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = ruidoFbm(v.x * f + semilla, v.y * f + semilla * 0.7, v.z * f) - 0.5;
    v.multiplyScalar(1 + n * 0.52);
    // Panza plana de sombrilla: el dosel flota sobre el tronco.
    const piso = -radio * 0.34;
    if (v.y < piso) v.y = piso + (v.y - piso) * 0.3;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals(); // suaves: la masa, no las facetas
  return g;
}

/* La paleta del dosel por variante: del verde-agua frío al verde tibio. */
const DOSEL_PAL = [
  { base: '#28584a', sol: '#7cbb59', luz: '#d9e77f' },
  { base: '#2e6047', sol: '#8ec763', luz: '#e3ea8a' },
  { base: '#245245', sol: '#6cb058', luz: '#cfe07a' },
  { base: '#33654a', sol: '#96c968', luz: '#e8ec95' },
];

/**
 * Una queñua estilizada: tronco rojizo torcido + 2-4 masas de dosel con
 * gradiente horneado. UNA geometría fusionada (instanciable).
 * @param {{q?: number}} o
 */
export function geomQuenuaTakeB({ q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];
  const H = 2.6 + r() * 1.3;

  const curva = curvaTronco(
    { altura: H, inclina: 0.1 + r() * 0.12, sinuoso: 0.15, giro: r() * Math.PI * 2 },
    seed * 13 + 1,
  );
  const tronco = tuboOrganico(curva, {
    tubular: Math.max(6, Math.round(10 * q)),
    radial: Math.max(5, Math.round(7 * q)),
    taper: taperTronco(0.15 + r() * 0.05, 0.05, 0.42),
    arruga: 0.14,
    semilla: seed,
  });
  hornearCorteza(tronco, {
    grieta: '#5c3122',
    cuerpo: '#a8573b',
    cresta: '#d98e62',
    liquen: '#7a8f56',
    hastaLiquen: 0.45,
  });
  partes.push(tronco);

  const pal = DOSEL_PAL[seed % DOSEL_PAL.length];
  const punta = curva.getPointAt(1);

  // La masa mayor corona el tronco; 1-2 laterales cuelgan de media altura.
  const masas = [
    { c: [punta.x, punta.y + 0.34, punta.z], rad: 1.0 + r() * 0.45 },
  ];
  const nLat = 1 + Math.round(r() * 1.2);
  for (let i = 0; i < nLat; i++) {
    const tr = 0.52 + r() * 0.26;
    const p = curva.getPointAt(tr);
    const ang = r() * Math.PI * 2;
    const lejos = 0.55 + r() * 0.5;
    const c = [
      p.x + Math.cos(ang) * lejos,
      p.y + 0.25 + r() * 0.5,
      p.z + Math.sin(ang) * lejos,
    ];
    masas.push({ c, rad: 0.5 + r() * 0.38 });
    // La rama que sostiene la masa lateral.
    const rama = tuboOrganico(
      new THREE.CatmullRomCurve3([
        p.clone(),
        new THREE.Vector3(
          p.x + (c[0] - p.x) * 0.55,
          p.y + (c[1] - p.y) * 0.7,
          p.z + (c[2] - p.z) * 0.55,
        ),
        new THREE.Vector3(c[0], c[1] - 0.1, c[2]),
      ]),
      {
        tubular: 4,
        radial: 5,
        taper: (t) => Math.max(0.02, 0.07 * (1 - t) + 0.02),
        arruga: 0.1,
        semilla: seed + i * 3,
      },
    );
    hornearCorteza(rama, { grieta: '#5c3122', cuerpo: '#a8573b', cresta: '#c97f58' });
    partes.push(rama);
  }

  for (let i = 0; i < masas.length; i++) {
    const m = masas[i];
    const geo = masaDosel(m.rad, seed * 7 + i * 11, q);
    poner(geo, m.c, [r() * 0.4, r() * Math.PI, r() * 0.4]);
    hornearFollaje(geo, {
      base: pal.base,
      sol: pal.sol,
      luz: pal.luz,
      centro: m.c,
      radio: m.rad,
      ao: 0.5,
      manchas: 0.12,
    });
    partes.push(geo);
  }

  return fusionarSeguro(partes, `quenuaTakeB-${seed}`);
}

/* -------------------------------------------------------------------------- */
/*  FRAILEJÓN estilizado                                                       */
/* -------------------------------------------------------------------------- */

export function geomFrailejonTakeB({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];
  const h = 0.45 + r() * 0.55;

  // El tallo DELGADO con su enagua de hojas muertas (apenas más ancho abajo).
  const tallo = new THREE.CylinderGeometry(0.08, 0.13, h, 7);
  poner(tallo, [0, h / 2, 0], [0.02, r(), 0.03]);
  const cEnagua = new THREE.Color('#4d3e2a');
  const cTalloAlto = new THREE.Color('#75603f');
  const tmpT = new THREE.Color();
  pintarPorVertice(tallo, (x, y) => tmpT.copy(cEnagua).lerp(cTalloAlto, clamp01(y / h)));
  partes.push(tallo);

  // La ROSETA: dos anillos de hojas-cono DELGADAS apuntando arriba-afuera —
  // la estrella plateada del páramo (nada de sombreros de hongo).
  const cRosBase = new THREE.Color('#7e996a');
  const cRosPunta = new THREE.Color('#cfe0ae');
  const tmpR = new THREE.Color();
  const anillos = [
    { n: Math.max(6, Math.round(8 * q)), largo: 0.42, abre: 0.95, rad: 0.1 },
    { n: Math.max(5, Math.round(6 * q)), largo: 0.34, abre: 0.5, rad: 0.06 },
  ];
  for (const a of anillos) {
    for (let i = 0; i < a.n; i++) {
      const ang = (i / a.n) * Math.PI * 2 + r() * 0.3;
      const hoja = new THREE.ConeGeometry(0.055, a.largo, 5);
      // La hoja nace del cogollo y se abre hacia afuera-arriba.
      poner(
        hoja,
        [Math.cos(ang) * a.rad, h + 0.1, Math.sin(ang) * a.rad],
        [Math.sin(ang) * a.abre, 0, -Math.cos(ang) * a.abre],
      );
      const yBase = h + 0.1 - a.largo / 2;
      pintarPorVertice(hoja, (x, y) =>
        tmpR.copy(cRosBase).lerp(cRosPunta, clamp01((y - yBase) / a.largo)),
      );
      partes.push(hoja);
    }
  }

  // El cogollo plateado; a veces, la flor amarilla en su vara.
  const cogollo = new THREE.SphereGeometry(0.1, 8, 6);
  poner(cogollo, [0, h + 0.12, 0], [0, 0, 0], [1, 0.85, 1]);
  pintarPorVertice(cogollo, () => tmpR.copy(cRosPunta));
  partes.push(cogollo);

  if (r() > 0.55) {
    const vara = new THREE.CylinderGeometry(0.018, 0.024, 0.5, 5);
    poner(vara, [0.06, h + 0.36, 0.04], [0.08, 0, 0.12]);
    pintarPorVertice(vara, () => tmpR.copy(cRosBase));
    partes.push(vara);
    const flor = new THREE.SphereGeometry(0.07, 7, 5);
    poner(flor, [0.1, h + 0.62, 0.07], [0, 0, 0], [1, 0.7, 1]);
    const cFlor = new THREE.Color('#e9c64d');
    pintarPorVertice(flor, () => tmpR.copy(cFlor));
    partes.push(flor);
  }

  return fusionarSeguro(partes, `frailejonTakeB-${seed}`);
}

/* -------------------------------------------------------------------------- */
/*  PASTO y ROCA                                                               */
/* -------------------------------------------------------------------------- */

export function geomPastoTakeB(seed = 3) {
  const r = rng(seed);
  const partes = [];
  const cPie = new THREE.Color('#8f9a4a');
  const cPunta = new THREE.Color('#cdb161');
  const tmp = new THREE.Color();
  const n = 5;
  for (let i = 0; i < n; i++) {
    const alto = 0.3 + r() * 0.3;
    const hoja = new THREE.ConeGeometry(0.035, alto, 4);
    const ang = (i / n) * Math.PI * 2 + r();
    poner(
      hoja,
      [Math.cos(ang) * 0.07, alto / 2, Math.sin(ang) * 0.07],
      [Math.cos(ang) * 0.35, 0, Math.sin(ang) * 0.35],
    );
    pintarPorVertice(hoja, (x, y) => tmp.copy(cPie).lerp(cPunta, clamp01(y / alto)));
    partes.push(hoja);
  }
  return fusionarSeguro(partes, `pastoTakeB-${seed}`);
}

export function geomRocaTakeB(seed = 4) {
  const g = new THREE.DodecahedronGeometry(0.55, 0);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(1 + (ruidoFbm(v.x * 2 + seed, v.y * 2, v.z * 2) - 0.5) * 0.5);
    pos.setXYZ(i, v.x, v.y * 0.72, v.z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  const cBase = new THREE.Color('#4d5662');
  const cTope = new THREE.Color('#9aa5ae');
  const tmp = new THREE.Color();
  pintarPorVertice(g, (x, y) => tmp.copy(cBase).lerp(cTope, clamp01(y / 0.5 + 0.5)));
  return fusionarSeguro([g], `rocaTakeB-${seed}`);
}

/* -------------------------------------------------------------------------- */
/*  CORDILLERA en capas (perspectiva aérea horneada)                           */
/* -------------------------------------------------------------------------- */

const CAPAS_CORDILLERA = [
  { radio: 30, n: 7, base: '#41604f', cumbre: '#a7b8ac', hMin: 7, hMax: 13 },
  { radio: 42, n: 9, base: '#5d7385', cumbre: '#c3ccd4', hMin: 10, hMax: 18 },
];

/**
 * Un anillo de picos estilizados fusionado en UNA geometría, con el gradiente
 * base→cumbre horneado y el azul de la distancia ya puesto (capa 1).
 * @param {0|1} capa
 */
export function geomCordilleraTakeB(capa = 0, seed = 40) {
  const cfg = CAPAS_CORDILLERA[capa] || CAPAS_CORDILLERA[0];
  const r = rng(seed + capa * 17);
  const partes = [];
  const cBase = new THREE.Color(cfg.base);
  const cCumbre = new THREE.Color(cfg.cumbre);
  const tmp = new THREE.Color();
  for (let i = 0; i < cfg.n; i++) {
    const ang = (i / cfg.n) * Math.PI * 2 + r() * 0.5;
    const rad = cfg.radio * (0.92 + r() * 0.2);
    const h = cfg.hMin + r() * (cfg.hMax - cfg.hMin);
    const ancho = 4.2 + r() * 3.4;
    const pico = new THREE.ConeGeometry(ancho, h, 6);
    const pos = pico.attributes.position;
    const v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k);
      const n = ruidoFbm(v.x * 0.4 + i * 5, v.y * 0.4, v.z * 0.4) - 0.5;
      pos.setXYZ(k, v.x * (1 + n * 0.4), v.y, v.z * (1 + n * 0.4));
    }
    pos.needsUpdate = true;
    pico.computeVertexNormals();
    poner(pico, [Math.cos(ang) * rad, h / 2 - 1.2, Math.sin(ang) * rad], [0, r() * Math.PI, 0]);
    const yPie = -1.2;
    pintarPorVertice(pico, (x, y) => tmp.copy(cBase).lerp(cCumbre, clamp01((y - yPie) / h)));
    partes.push(pico);
  }
  return fusionarSeguro(partes, `cordilleraTakeB-${capa}`);
}

/* -------------------------------------------------------------------------- */
/*  DISTRIBUCIÓN: dónde vive cada cosa                                         */
/* -------------------------------------------------------------------------- */

/**
 * Siembra determinista de la toma B. Los árboles pueblan la herradura (y se
 * recortan contra el cielo en la cresta), los frailejones acompañan el claro
 * (el sector +x+z donde el colibrí del registro liba), el pasto y las rocas
 * rematan. Nada tapa el corredor cámara→Ent.
 * @param {{arbol:number, frailejon:number, pasto:number, roca:number, variantes:number}} c
 */
export function distribucionTakeB(c, seed = 99) {
  const r = rng(seed);
  const arboles = [];
  let intentos = 0;
  while (arboles.length < c.arbol && intentos++ < c.arbol * 20) {
    const ang = r() * Math.PI * 2;
    const d = 10.4 + r() * 7.2;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    // El corredor de la cámara (frente, +z) queda despejado.
    if (Math.abs(x) < 3.8 && z > 8) continue;
    arboles.push({
      x,
      z,
      y: alturaTakeB(x, z) - 0.08,
      // Tope de escala contenido: el Ent (~6 u) sigue siendo EL árbol mayor.
      esc: 0.72 + r() * 0.42,
      rot: r() * Math.PI * 2,
      variante: arboles.length % c.variantes,
    });
  }

  const frailejones = [];
  while (frailejones.length < c.frailejon) {
    const enSector = frailejones.length < Math.ceil(c.frailejon * 0.6);
    const ang = enSector ? 0.25 + r() * 0.95 : r() * Math.PI * 2;
    const d = enSector ? 3.4 + r() * 3.8 : 4 + r() * 4.5;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    if (Math.hypot(x, z) < 2.6) continue;
    frailejones.push({
      x,
      z,
      y: alturaTakeB(x, z) - 0.04,
      esc: 0.8 + r() * 0.5,
      rot: r() * Math.PI * 2,
      variante: 0,
    });
  }

  const pastos = [];
  while (pastos.length < c.pasto) {
    const ang = r() * Math.PI * 2;
    const d = 2.2 + r() * 7.6;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    pastos.push({
      x,
      z,
      y: alturaTakeB(x, z) - 0.03,
      esc: 0.7 + r() * 0.8,
      rot: r() * Math.PI * 2,
      variante: 0,
    });
  }

  const rocas = [];
  while (rocas.length < c.roca) {
    const ang = r() * Math.PI * 2;
    const d = 4 + r() * 11;
    const x = Math.cos(ang) * d;
    const z = Math.sin(ang) * d;
    if (Math.abs(x) < 2.5 && z > 6) continue;
    rocas.push({
      x,
      z,
      y: alturaTakeB(x, z) - 0.1,
      esc: 0.6 + r() * 1.2,
      rot: r() * Math.PI * 2,
      variante: 0,
    });
  }

  return { arboles, frailejones, pastos, rocas };
}

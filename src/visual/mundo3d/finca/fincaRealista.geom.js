/*
 * fincaRealista.geom — los ANIMALES y CULTIVOS de la finca, con anatomía real.
 *
 * Feedback directo del operador: la vaca tiene que parecer VACA, los cerdos se
 * tienen que distinguir POR RAZA y el maíz tiene que ser la mata real — nada de
 * cápsulas rosadas ni palos verdes. Los personajes rubber-hose (los 9 bichos)
 * NO viven aquí: esto es el ganado y la milpa del valle, y van REALISTAS
 * (low-poly, pero con las señas anatómicas que los hacen inequívocos).
 *
 * Razas reales de finca colombiana:
 *   · VACA — Holstein (blanca de manchas negras, ubre grande: la lechera de
 *     clima frío), criolla (caramelo, cuernos: el ganado del minifundio) y
 *     cebú/Brahman (gris-blanca con GIBA, papada y orejas caídas: tierra caliente).
 *   · CERDO — zungo costeño (negro, sin pelo, panza baja), san pedreño (negro
 *     de calcetines claros), duroc (colorado, dorso arqueado), landrace (rosado,
 *     LARGO, orejas que tapan los ojos) y pietrain (blanco manchado, jamones).
 *   · GALLINA campesina/negra/blanca + GALLO de cola verde tornasol.
 *   · PERRO criollo amarillo (el que nunca falta en una finca).
 *   · OVEJA criolla de vellón crema y cara oscura.
 *   · MAÍZ — caña con nudos, hojas lanceoladas arqueadas (las bajeras ya
 *     secándose), mazorca con capacho, granos asomados y BARBAS, y el penacho.
 *   · CAFETO — pisos de ramas horizontales, hoja oscura lustrosa y cerezas
 *     rojas/pintonas pegadas a la rama.
 *
 * TÉCNICA tier-safe (la misma de floraParamo.geom, DR §3): cada pieza se
 * FUSIONA en UNA geometría con color horneado en vertexColors → una draw-call
 * por malla. Los animales devuelven { cuerpo, cabeza, pivote }: la cabeza es
 * una geometría aparte (local al pivote del cuello) para que el consumidor
 * conserve el gesto vivo (pastar, picotear, hocicar) moviendo UN grupo.
 * Cero assets externos: todo procedural, corre headless (three core + merge).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  Utilidades (el mismo kit de floraParamo: pintar + posar + fusionar)        */
/* -------------------------------------------------------------------------- */

const UP = new THREE.Vector3(0, 1, 0);

/** Hornea un color plano en TODOS los vértices (atributo `color`). */
function pintar(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Coloca una geometría con posición/rotación/escala (transforma vértices). */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el eje +Y de la geometría hacia `dir` y la ubica en `pos`. */
function apuntar(geo, pos, dir, esc = [1, 1, 1]) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    q,
    new THREE.Vector3(esc[0], esc[1], esc[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Fusiona la lista de partes (ya coloreadas) en UNA geometría. Los poliedros
    (Icosahedron) vienen NO-indexados y el resto sí: se uniformiza todo a
    no-indexado antes del merge (si no, mergeGeometries devuelve null). */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  return mergeGeometries(buenas, false);
}

/** Pequeña variación determinista de color (que un hato no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/** Un cono/hoja ANCLADO por su base: el centro se corre medio largo hacia `dir`. */
function brote(attach, dir, radio, largo, escZ, segs = 4) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const hoja = new THREE.ConeGeometry(radio, largo, segs, 1);
  apuntar(
    hoja,
    [attach[0] + d.x * largo * 0.5, attach[1] + d.y * largo * 0.5, attach[2] + d.z * largo * 0.5],
    dir,
    [1, 1, escZ],
  );
  return hoja;
}

/* Caché de geometrías (las mismas args → la misma malla; nada se reconstruye
   al re-montar la escena). Chico: unas decenas de mallas menudas. */
const _cache = new Map();
function memo(clave, crear) {
  if (!_cache.has(clave)) _cache.set(clave, crear());
  return _cache.get(clave);
}

/* -------------------------------------------------------------------------- */
/*  VACA — Holstein / criolla / cebú (Brahman)                                 */
/* -------------------------------------------------------------------------- */

/*
 * Señas por raza (lo que hace que una vaca se lea como SU raza):
 *   holstein → blanca con MANCHAS negras grandes, ubre rosada llena, casi sin
 *              cuernos. La lechera del piso frío.
 *   criolla  → capa caramelo pareja, cuernos en lira, ubre discreta.
 *   cebu     → gris-blanca, GIBA sobre la cruz, PAPADA colgante y orejas
 *              grandes CAÍDAS. La vaca de tierra caliente.
 */
export const RAZAS_VACA = {
  holstein: {
    pelaje: '#f1ecdf', manchas: '#2a2521', hocico: '#b98a8a', ubre: '#e2ab9e',
    cuerno: 0.6, orejas: 'lado', giba: false, papada: false,
  },
  criolla: {
    pelaje: '#a5652f', manchas: null, hocico: '#7c5138', ubre: '#cf9c82',
    cuerno: 1.05, orejas: 'lado', giba: false, papada: false,
  },
  cebu: {
    pelaje: '#d9d5c7', manchas: null, hocico: '#524b44', ubre: '#d8b3a4',
    cuerno: 0.9, orejas: 'caida', giba: true, papada: true,
  },
};

/* Sitios deterministas de las manchas holstein: pegadas al flanco (z=±) y a la
   grupa, aplastadas contra el cuerpo — parches de capa, no pelotas. */
const MANCHAS_VACA = [
  { pos: [0.28, 0.86, 0.29], s: 0.20 },
  { pos: [-0.14, 0.74, 0.30], s: 0.17 },
  { pos: [-0.48, 0.92, 0.27], s: 0.19 },
  { pos: [0.08, 0.92, -0.29], s: 0.18 },
  { pos: [-0.34, 0.72, -0.30], s: 0.16 },
  { pos: [0.40, 0.76, -0.28], s: 0.14 },
  { pos: [-0.52, 1.04, 0.0], s: 0.17, techo: true }, // la de la grupa, vista desde arriba
];

/**
 * La vaca anatómica. Mira a +X, patas en y=0, cruz a ~1.15.
 * @returns {{cuerpo: THREE.BufferGeometry, cabeza: THREE.BufferGeometry, pivote: [number,number,number]}}
 */
export function geomVaca({ raza = 'holstein', ubre = true, q = 1 } = {}, seed = 21) {
  return memo(`vaca|${raza}|${ubre}|${q}`, () => {
    const R = RAZAS_VACA[raza] || RAZAS_VACA.holstein;
    const r = rng(seed);
    const p = [];

    // ── El tronco: barril + panza descolgada + pecho + grupa (masas reales) ──
    const barril = new THREE.CapsuleGeometry(0.32, 0.72, 4, 10);
    poner(barril, [0, 0.82, 0], [0, 0, Math.PI / 2]);
    p.push(pintar(barril, R.pelaje));
    const panza = new THREE.SphereGeometry(0.29, 10, 8);
    poner(panza, [-0.06, 0.70, 0], [0, 0, 0], [1.25, 0.85, 1.02]);
    p.push(pintar(panza, variar(R.pelaje, r, 0.04)));
    const pecho = new THREE.SphereGeometry(0.22, 8, 6);
    poner(pecho, [0.47, 0.72, 0]);
    p.push(pintar(pecho, R.pelaje));
    const grupa = new THREE.SphereGeometry(0.24, 8, 6);
    poner(grupa, [-0.50, 0.88, 0], [0, 0, -0.12], [1.05, 0.92, 0.96]);
    p.push(pintar(grupa, R.pelaje));
    // Huesos de cadera marcados (lo huesudo de una vaca real).
    for (const dz of [0.15, -0.15]) {
      const hueso = new THREE.IcosahedronGeometry(0.07, 0);
      poner(hueso, [-0.48, 1.04, dz]);
      p.push(pintar(hueso, variar(R.pelaje, r, 0.05)));
    }

    // ── Cuello: sube del pecho al pivote de la cabeza ──
    const cuello = new THREE.CylinderGeometry(0.10, 0.19, 0.48, 7, 1);
    apuntar(cuello, [0.62, 0.98, 0], [0.62, 0.55, 0]);
    p.push(pintar(cuello, R.pelaje));

    // ── Giba y papada del cebú (las señas del Brahman) ──
    if (R.giba) {
      const giba = new THREE.SphereGeometry(0.15, 8, 6);
      poner(giba, [0.30, 1.13, 0], [0, 0, 0.1], [0.85, 1.05, 0.8]);
      p.push(pintar(giba, variar(R.pelaje, r, 0.05)));
    }
    if (R.papada) {
      const papada = new THREE.CapsuleGeometry(0.065, 0.42, 4, 6);
      apuntar(papada, [0.58, 0.62, 0], [0.4, -1, 0], [1, 1, 0.45]);
      p.push(pintar(papada, variar(R.pelaje, r, 0.06)));
    }

    // ── Patas con corvejón y pezuña (muslo ancho → caña fina → casco) ──
    for (const [px, pz] of [[0.42, 0.19], [0.42, -0.19], [-0.44, 0.20], [-0.44, -0.20]]) {
      const muslo = new THREE.CylinderGeometry(0.055, 0.085, 0.46, 6, 1);
      poner(muslo, [px, 0.48, pz]);
      p.push(pintar(muslo, variar(R.pelaje, r, 0.04)));
      const cana = new THREE.CylinderGeometry(0.038, 0.05, 0.28, 6, 1);
      poner(cana, [px, 0.16, pz]);
      p.push(pintar(cana, variar(R.pelaje, r, 0.05)));
      const pezuna = new THREE.CylinderGeometry(0.052, 0.058, 0.09, 6, 1);
      poner(pezuna, [px, 0.045, pz]);
      p.push(pintar(pezuna, '#3c352d'));
    }

    // ── Ubre con tetillas (la seña de la vaca lechera) ──
    if (ubre) {
      const bolsa = new THREE.SphereGeometry(0.16, 9, 7);
      poner(bolsa, [-0.28, 0.50, 0], [0, 0, 0], [1.15, 0.9, 1.0]);
      p.push(pintar(bolsa, R.ubre));
      for (const [tx, tz] of [[-0.20, 0.07], [-0.20, -0.07], [-0.36, 0.07], [-0.36, -0.07]]) {
        const teta = new THREE.CylinderGeometry(0.016, 0.02, 0.08, 5, 1);
        poner(teta, [tx, 0.40, tz]);
        p.push(pintar(teta, variar(R.ubre, r, 0.06)));
      }
    }

    // ── Cola con borla ──
    const cola = new THREE.CylinderGeometry(0.016, 0.026, 0.5, 5, 1);
    apuntar(cola, [-0.70, 0.78, 0.02], [-0.22, -1, 0.08]);
    p.push(pintar(cola, variar(R.pelaje, r, 0.05)));
    const borla = new THREE.ConeGeometry(0.04, 0.13, 5, 1);
    apuntar(borla, [-0.80, 0.50, 0.05], [-0.15, -1, 0.06]);
    p.push(pintar(borla, R.manchas || '#3c352d'));

    // ── Manchas de capa (holstein): parches aplastados contra el cuerpo ──
    if (R.manchas && q > 0.35) {
      for (const m of MANCHAS_VACA) {
        const mancha = new THREE.SphereGeometry(m.s, 8, 6);
        const esc = m.techo ? [1.1, 0.4, 1.1] : [1, 0.8, 0.32];
        poner(mancha, m.pos, [r() * 0.6, r() * Math.PI, 0], esc);
        p.push(pintar(mancha, variar(R.manchas, r, 0.05)));
      }
    }

    const cuerpo = fusionar(p);

    // ── La CABEZA (local al pivote del cuello): pasta subiendo y bajando ──
    const c = [];
    const craneo = new THREE.SphereGeometry(0.14, 10, 8);
    poner(craneo, [0.09, -0.01, 0], [0, 0, 0], [1.2, 1, 0.85]);
    c.push(pintar(craneo, R.pelaje));
    const testuz = new THREE.CylinderGeometry(0.085, 0.115, 0.17, 7, 1);
    poner(testuz, [0.22, -0.06, 0], [0, 0, Math.PI / 2 + 0.25]);
    c.push(pintar(testuz, R.pelaje));
    const morro = new THREE.CylinderGeometry(0.09, 0.098, 0.11, 8, 1);
    poner(morro, [0.325, -0.10, 0], [0, 0, Math.PI / 2 + 0.25]);
    c.push(pintar(morro, R.hocico));
    for (const oz of [0.045, -0.045]) {
      const ollar = new THREE.SphereGeometry(0.016, 5, 4);
      poner(ollar, [0.375, -0.09, oz]);
      c.push(pintar(ollar, '#2c2521'));
    }
    for (const oz of [0.115, -0.115]) {
      const ojo = new THREE.SphereGeometry(0.026, 6, 5);
      poner(ojo, [0.15, 0.05, oz]);
      c.push(pintar(ojo, '#241d18'));
    }
    // Orejas: de lado (holstein/criolla) o grandes y CAÍDAS (cebú).
    const caida = R.orejas === 'caida';
    for (const lado of [1, -1]) {
      const oreja = brote(
        [0.01, caida ? 0.05 : 0.09, lado * 0.135],
        caida ? [0.12, -0.55, lado * 0.9] : [0.08, 0.35, lado],
        caida ? 0.062 : 0.05,
        caida ? 0.22 : 0.16,
        0.45,
        5,
      );
      c.push(pintar(oreja, variar(R.pelaje, r, 0.07)));
    }
    // Cuernos (escala por raza; la holstein casi ni los muestra).
    if (R.cuerno > 0.2) {
      for (const lado of [1, -1]) {
        const cuerno = brote(
          [0.0, 0.125, lado * 0.075],
          [-0.12, 0.9, lado * 0.55],
          0.028,
          0.17 * R.cuerno,
          1,
          5,
        );
        c.push(pintar(cuerno, '#d9cdb2'));
      }
    }
    // Mancha de cara holstein (media cara oscura, la clásica).
    if (R.manchas && q > 0.35) {
      const mcara = new THREE.SphereGeometry(0.085, 7, 6);
      poner(mcara, [0.10, 0.045, 0.09], [0, 0.4, 0], [1, 0.9, 0.5]);
      c.push(pintar(mcara, R.manchas));
    }

    return { cuerpo, cabeza: fusionar(c), pivote: [0.80, 1.10, 0] };
  });
}

/* -------------------------------------------------------------------------- */
/*  CERDO — por RAZA (pedido explícito: que se distingan)                      */
/* -------------------------------------------------------------------------- */

/*
 * Señas por raza:
 *   zungo      → criollo costeño: NEGRO, lampiño, panza descolgada casi al piso.
 *   sanpedreno → criollo paisa: negro con calcetines claros y punta de trompa clara.
 *   duroc      → colorado ladrillo, dorso ARQUEADO, oreja a media asta.
 *   landrace   → rosado, el más LARGO, orejotas al frente que tapan los ojos.
 *   pietrain   → blanco de MANCHAS negras, jamones y paletas musculosas.
 */
export const RAZAS_CERDO = {
  zungo: {
    pelaje: '#2e2926', trompa: '#4c423c', panza: 1.3, largo: 0.95,
    orejas: 'caida', arco: 0, jamon: 1, manchas: null, calcetin: null,
  },
  sanpedreno: {
    pelaje: '#332b26', trompa: '#c9a58e', panza: 1.15, largo: 0.98,
    orejas: 'caida', arco: 0, jamon: 1, manchas: null, calcetin: '#d8cec0',
  },
  duroc: {
    pelaje: '#8e4a2b', trompa: '#7c4630', panza: 1, largo: 1.02,
    orejas: 'gacha', arco: 1, jamon: 1.08, manchas: null, calcetin: null,
  },
  landrace: {
    pelaje: '#e5b6a3', trompa: '#d89a88', panza: 1.05, largo: 1.24,
    orejas: 'tapaojos', arco: 0, jamon: 1, manchas: null, calcetin: null,
  },
  pietrain: {
    pelaje: '#e4ded3', trompa: '#cfa290', panza: 0.95, largo: 1.0,
    orejas: 'parada', arco: 0, jamon: 1.28, manchas: '#37312d', calcetin: null,
  },
};

/* Manchas del pietrain: sobre jamones, paletas y flancos. */
const MANCHAS_CERDO = [
  { pos: [-0.30, 0.46, 0.16], s: 0.11 },
  { pos: [0.20, 0.50, -0.17], s: 0.09 },
  { pos: [-0.05, 0.56, 0.19], s: 0.08 },
  { pos: [0.28, 0.44, 0.16], s: 0.08 },
  { pos: [-0.26, 0.40, -0.17], s: 0.10 },
];

/**
 * El cerdo por raza. Mira a +X, patas en y=0, lomo a ~0.62.
 * @returns {{cuerpo: THREE.BufferGeometry, cabeza: THREE.BufferGeometry, pivote: [number,number,number]}}
 */
export function geomCerdo({ raza = 'zungo', q = 1 } = {}, seed = 31) {
  return memo(`cerdo|${raza}|${q}`, () => {
    const R = RAZAS_CERDO[raza] || RAZAS_CERDO.zungo;
    const r = rng(seed);
    const L = R.largo;
    const p = [];

    // ── Tronco: barril + panza (el zungo la arrastra) + jamones + paletas ──
    const barril = new THREE.CapsuleGeometry(0.235, 0.44 * L, 4, 10);
    poner(barril, [0, 0.46, 0], [0, 0, Math.PI / 2]);
    p.push(pintar(barril, R.pelaje));
    const panza = new THREE.SphereGeometry(0.21, 9, 7);
    poner(panza, [0, 0.46 - 0.085 * R.panza, 0], [0, 0, 0], [1.25 * L, 0.8 * R.panza, 1.0]);
    p.push(pintar(panza, variar(R.pelaje, r, 0.04)));
    if (R.arco) {
      // El lomo arqueado del duroc: una loma sobre el espinazo.
      const lomo = new THREE.SphereGeometry(0.19, 8, 6);
      poner(lomo, [0, 0.60, 0], [0, 0, 0], [1.15, 0.55, 0.9]);
      p.push(pintar(lomo, variar(R.pelaje, r, 0.04)));
    }
    for (const lado of [1, -1]) {
      const jamon = new THREE.SphereGeometry(0.155 * R.jamon, 8, 6);
      poner(jamon, [-0.30 * L, 0.42, lado * 0.095], [0, 0, 0], [1, 1.05, 0.9]);
      p.push(pintar(jamon, variar(R.pelaje, r, 0.05)));
      const paleta = new THREE.SphereGeometry(0.125 * (R.jamon > 1.1 ? 1.15 : 1), 8, 6);
      poner(paleta, [0.24 * L, 0.47, lado * 0.10]);
      p.push(pintar(paleta, variar(R.pelaje, r, 0.05)));
    }

    // ── Patas cortas con pezuña (calcetines claros si la raza los trae) ──
    for (const [px, pz] of [[0.28 * L, 0.13], [0.28 * L, -0.13], [-0.30 * L, 0.14], [-0.30 * L, -0.14]]) {
      const pata = new THREE.CylinderGeometry(0.042, 0.052, 0.26, 6, 1);
      poner(pata, [px, 0.17, pz]);
      p.push(pintar(pata, R.calcetin || variar(R.pelaje, r, 0.04)));
      const pezuna = new THREE.CylinderGeometry(0.046, 0.05, 0.06, 6, 1);
      poner(pezuna, [px, 0.03, pz]);
      p.push(pintar(pezuna, '#332c26'));
    }

    // ── La colita en tirabuzón ──
    const cola = new THREE.TorusGeometry(0.048, 0.015, 5, 10);
    poner(cola, [-0.44 * L, 0.56, 0], [0, Math.PI / 2, 0.4]);
    p.push(pintar(cola, variar(R.pelaje, r, 0.06)));

    // ── Manchas del pietrain ──
    if (R.manchas && q > 0.35) {
      for (const m of MANCHAS_CERDO) {
        const mancha = new THREE.SphereGeometry(m.s, 7, 6);
        poner(mancha, [m.pos[0] * L, m.pos[1], m.pos[2]], [r(), r() * Math.PI, 0], [1, 0.85, 0.4]);
        p.push(pintar(mancha, variar(R.manchas, r, 0.06)));
      }
    }

    const cuerpo = fusionar(p);

    // ── CABEZA (pivote al frente): hocica el suelo ──
    const c = [];
    const craneo = new THREE.SphereGeometry(0.145, 9, 7);
    poner(craneo, [0.06, -0.02, 0], [0, 0, 0], [1.25, 1, 0.95]);
    c.push(pintar(craneo, R.pelaje));
    const papadita = new THREE.SphereGeometry(0.09, 7, 6);
    poner(papadita, [0.07, -0.12, 0], [0, 0, 0], [1.1, 0.7, 0.9]);
    c.push(pintar(papadita, variar(R.pelaje, r, 0.05)));
    const trompa = new THREE.CylinderGeometry(0.06, 0.075, 0.15, 7, 1);
    poner(trompa, [0.235, -0.055, 0], [0, 0, Math.PI / 2 + 0.18]);
    c.push(pintar(trompa, R.pelaje));
    // El disco del morro (la nariz de cerdo, inconfundible) + ollares.
    const disco = new THREE.CylinderGeometry(0.062, 0.062, 0.035, 8, 1);
    poner(disco, [0.315, -0.07, 0], [0, 0, Math.PI / 2 + 0.18]);
    c.push(pintar(disco, R.trompa));
    for (const oz of [0.026, -0.026]) {
      const ollar = new THREE.SphereGeometry(0.012, 5, 4);
      poner(ollar, [0.335, -0.066, oz]);
      c.push(pintar(ollar, '#241f1b'));
    }
    for (const oz of [0.10, -0.10]) {
      const ojo = new THREE.SphereGeometry(0.02, 6, 5);
      poner(ojo, [0.13, 0.055, oz]);
      c.push(pintar(ojo, '#1f1a16'));
    }
    // Orejas: la firma de cada raza.
    const OREJAS = {
      caida: { dir: (l) => [0.45, -0.4, l * 0.8], r: 0.06, largo: 0.18 },
      gacha: { dir: (l) => [0.7, -0.15, l * 0.55], r: 0.058, largo: 0.17 },
      tapaojos: { dir: (l) => [0.85, -0.5, l * 0.3], r: 0.075, largo: 0.23 },
      parada: { dir: (l) => [0.15, 0.9, l * 0.45], r: 0.055, largo: 0.16 },
    };
    const O = OREJAS[R.orejas] || OREJAS.caida;
    for (const lado of [1, -1]) {
      const oreja = brote([0.04, 0.10, lado * 0.10], O.dir(lado), O.r, O.largo, 0.4, 5);
      c.push(pintar(oreja, variar(R.pelaje, r, 0.07)));
    }

    return { cuerpo, cabeza: fusionar(c), pivote: [0.40 * L, 0.52, 0] };
  });
}

/**
 * Lechón: la cría en UNA sola malla (no pivota la cabeza — trota detrás de la
 * marrana). Hereda el pelaje de su raza.
 */
export function geomLechon({ raza = 'landrace' } = {}, seed = 37) {
  return memo(`lechon|${raza}`, () => {
    const R = RAZAS_CERDO[raza] || RAZAS_CERDO.landrace;
    const r = rng(seed);
    const p = [];
    const barril = new THREE.CapsuleGeometry(0.085, 0.15, 4, 8);
    poner(barril, [0, 0.16, 0], [0, 0, Math.PI / 2]);
    p.push(pintar(barril, variar(R.pelaje, r, 0.05)));
    const cabeza = new THREE.SphereGeometry(0.062, 8, 6);
    poner(cabeza, [0.13, 0.17, 0], [0, 0, 0], [1.15, 1, 0.95]);
    p.push(pintar(cabeza, R.pelaje));
    const trompita = new THREE.CylinderGeometry(0.026, 0.03, 0.05, 6, 1);
    poner(trompita, [0.20, 0.155, 0], [0, 0, Math.PI / 2]);
    p.push(pintar(trompita, R.trompa));
    for (const lado of [1, -1]) {
      const oreja = brote([0.135, 0.215, lado * 0.04], [0.4, 0.35, lado * 0.7], 0.024, 0.06, 0.4, 4);
      p.push(pintar(oreja, variar(R.pelaje, r, 0.08)));
      for (const px of [0.09, -0.08]) {
        const pata = new THREE.CylinderGeometry(0.016, 0.02, 0.1, 5, 1);
        poner(pata, [px, 0.06, lado * 0.05]);
        p.push(pintar(pata, variar(R.pelaje, r, 0.05)));
      }
    }
    const colita = new THREE.TorusGeometry(0.02, 0.007, 4, 8);
    poner(colita, [-0.15, 0.2, 0], [0, Math.PI / 2, 0]);
    p.push(pintar(colita, R.pelaje));
    return fusionar(p);
  });
}

/* -------------------------------------------------------------------------- */
/*  GALLINA / GALLO                                                            */
/* -------------------------------------------------------------------------- */

export const TIPOS_GALLINA = {
  campesina: { plumas: '#9a5a2e', pecho: '#7c4524', cola: '#5e3a20', cresta: 0.8, gallo: false },
  negra: { plumas: '#2c2825', pecho: '#3a332e', cola: '#232019', cresta: 0.8, gallo: false },
  blanca: { plumas: '#e9e3d4', pecho: '#ddd5c2', cola: '#cfc6b0', cresta: 0.9, gallo: false },
  gallo: { plumas: '#a34f22', pecho: '#3a2c20', cola: '#1f3a2c', cresta: 1.5, gallo: true },
};

/**
 * Gallina de verdad: pechuga baja, rabadilla alzada, abanico de cola, alas
 * plegadas, cresta y barbillas. El gallo lleva cola verde tornasol en hoz.
 * Mira a +X. @returns {{cuerpo, cabeza, pivote}}
 */
export function geomGallina({ tipo = 'campesina', q = 1 } = {}, seed = 41) {
  return memo(`gallina|${tipo}|${q}`, () => {
    const T = TIPOS_GALLINA[tipo] || TIPOS_GALLINA.campesina;
    const r = rng(seed);
    const p = [];

    // Cuerpo en gota: pechuga adelante-abajo, rabadilla arriba-atrás.
    const cuerpo = new THREE.SphereGeometry(0.155, 10, 8);
    poner(cuerpo, [0, 0.26, 0], [0, 0, 0.38], [1.4, 1, 0.92]);
    p.push(pintar(cuerpo, T.plumas));
    const pechuga = new THREE.SphereGeometry(0.105, 8, 6);
    poner(pechuga, [0.10, 0.21, 0], [0, 0, 0.3], [1.1, 1, 0.85]);
    p.push(pintar(pechuga, T.pecho));
    // Alas plegadas a los flancos.
    for (const lado of [1, -1]) {
      const ala = new THREE.SphereGeometry(0.105, 8, 6);
      poner(ala, [-0.02, 0.28, lado * 0.115], [0.15 * lado, 0, 0.5], [1.35, 0.75, 0.32]);
      p.push(pintar(ala, variar(T.plumas, r, 0.1)));
    }
    // El abanico de la cola (el gallo, hoces largas verde tornasol).
    const nPlumas = T.gallo ? 4 : 3;
    for (let i = 0; i < nPlumas; i++) {
      const abre = (i - (nPlumas - 1) / 2) * 0.32;
      const largo = (T.gallo ? 0.34 : 0.22) * (1 - Math.abs(abre) * 0.35);
      const pluma = brote(
        [-0.17, 0.36, 0],
        [-0.85, T.gallo ? 0.55 - Math.abs(abre) * 0.4 : 0.75, abre * 0.5],
        T.gallo ? 0.052 : 0.06,
        largo,
        0.3,
        4,
      );
      p.push(pintar(pluma, variar(T.cola, r, 0.12)));
    }
    // Muslos emplumados + patas + dedos.
    for (const lado of [1, -1]) {
      const muslo = new THREE.SphereGeometry(0.055, 7, 5);
      poner(muslo, [0.02, 0.16, lado * 0.06]);
      p.push(pintar(muslo, variar(T.plumas, r, 0.08)));
      const pata = new THREE.CylinderGeometry(0.012, 0.014, 0.13, 5, 1);
      poner(pata, [0.03, 0.065, lado * 0.055]);
      p.push(pintar(pata, '#caa03c'));
      if (q > 0.5) {
        for (const dd of [-0.35, 0, 0.35]) {
          const dedo = brote([0.03, 0.008, lado * 0.055], [1, 0.05, dd], 0.008, 0.05, 1, 3);
          p.push(pintar(dedo, '#caa03c'));
        }
      }
    }

    const cuerpoGeo = fusionar(p);

    // ── CABEZA + CUELLO (pivotan juntos: el picoteo) ──
    const c = [];
    const cuello = new THREE.CylinderGeometry(0.038, 0.055, 0.17, 6, 1);
    apuntar(cuello, [0.035, 0.075, 0], [0.45, 1, 0]);
    c.push(pintar(cuello, T.plumas));
    const cabeza = new THREE.SphereGeometry(0.068, 8, 6);
    poner(cabeza, [0.085, 0.16, 0], [0, 0, 0], [1.1, 1, 0.9]);
    c.push(pintar(cabeza, T.plumas));
    const pico = brote([0.14, 0.15, 0], [1, -0.12, 0], 0.02, 0.065, 1, 4);
    c.push(pintar(pico, '#d8a03c'));
    // Cresta dentada (2-3 pinchos) + barbillas colgantes.
    const nCresta = T.gallo ? 3 : 2;
    for (let i = 0; i < nCresta; i++) {
      const pincho = brote(
        [0.055 + i * 0.035, 0.215, 0],
        [0.15 - i * 0.15, 1, 0],
        0.02 * T.cresta,
        0.055 * T.cresta,
        0.5,
        4,
      );
      c.push(pintar(pincho, '#c8352a'));
    }
    for (const lado of [1, -1]) {
      const barbilla = new THREE.SphereGeometry(0.02 * T.cresta, 5, 4);
      poner(barbilla, [0.115, 0.10, lado * 0.02], [0, 0, 0], [1, 1.4, 0.7]);
      c.push(pintar(barbilla, '#c8352a'));
      const ojo = new THREE.SphereGeometry(0.014, 5, 4);
      poner(ojo, [0.10, 0.17, lado * 0.055]);
      c.push(pintar(ojo, '#1f1a14'));
    }

    return { cuerpo: cuerpoGeo, cabeza: fusionar(c), pivote: [0.11, 0.30, 0] };
  });
}

/* -------------------------------------------------------------------------- */
/*  PERRO criollo                                                              */
/* -------------------------------------------------------------------------- */

/**
 * El perro criollo amarillo que no falta en ninguna finca: pecho hondo, orejas
 * a media asta y cola alzada. Mira a +X. @returns {{cuerpo, cabeza, pivote}}
 */
export function geomPerro({ q = 1 } = {}, seed = 51) {
  return memo(`perro|${q}`, () => {
    const PELAJE = '#c08b4d';
    const CREMA = '#e2c9a0';
    const r = rng(seed);
    const p = [];

    const tronco = new THREE.CapsuleGeometry(0.115, 0.28, 4, 8);
    poner(tronco, [0, 0.37, 0], [0, 0, Math.PI / 2 - 0.08]);
    p.push(pintar(tronco, PELAJE));
    const pecho = new THREE.SphereGeometry(0.115, 8, 6);
    poner(pecho, [0.16, 0.36, 0], [0, 0, 0], [1, 1.15, 0.95]);
    p.push(pintar(pecho, variar(PELAJE, r, 0.05)));
    const pechera = new THREE.SphereGeometry(0.075, 7, 5);
    poner(pechera, [0.22, 0.30, 0], [0, 0, 0], [0.8, 1.1, 0.8]);
    p.push(pintar(pechera, CREMA));
    const anca = new THREE.SphereGeometry(0.10, 8, 6);
    poner(anca, [-0.17, 0.36, 0], [0, 0, 0], [1, 1.05, 0.9]);
    p.push(pintar(anca, PELAJE));
    // Patas (finas, de perro flaco de finca).
    for (const [px, pz] of [[0.17, 0.07], [0.17, -0.07], [-0.17, 0.08], [-0.17, -0.08]]) {
      const pata = new THREE.CylinderGeometry(0.026, 0.032, 0.32, 5, 1);
      poner(pata, [px, 0.16, pz]);
      p.push(pintar(pata, variar(PELAJE, r, 0.06)));
    }
    // Cola alzada en curva (dos tramos), punta crema.
    const cola1 = new THREE.CylinderGeometry(0.018, 0.026, 0.16, 5, 1);
    apuntar(cola1, [-0.27, 0.46, 0], [-0.7, 0.8, 0.1]);
    p.push(pintar(cola1, PELAJE));
    const cola2 = brote([-0.33, 0.52, 0.01], [-0.25, 0.95, 0.15], 0.018, 0.13, 1, 5);
    p.push(pintar(cola2, CREMA));
    const cuello = new THREE.CylinderGeometry(0.06, 0.09, 0.18, 6, 1);
    apuntar(cuello, [0.25, 0.46, 0], [0.7, 0.75, 0]);
    p.push(pintar(cuello, PELAJE));

    const cuerpo = fusionar(p);

    // ── CABEZA (pivote: mira/ladea) ──
    const c = [];
    const craneo = new THREE.SphereGeometry(0.085, 9, 7);
    poner(craneo, [0.04, 0.01, 0], [0, 0, 0], [1.1, 1, 0.9]);
    c.push(pintar(craneo, PELAJE));
    const hocico = new THREE.CylinderGeometry(0.038, 0.052, 0.11, 6, 1);
    poner(hocico, [0.135, -0.02, 0], [0, 0, Math.PI / 2 + 0.15]);
    c.push(pintar(hocico, variar(PELAJE, r, 0.08)));
    const nariz = new THREE.SphereGeometry(0.022, 5, 4);
    poner(nariz, [0.19, -0.012, 0]);
    c.push(pintar(nariz, '#241d18'));
    for (const lado of [1, -1]) {
      const oreja = brote([0.02, 0.075, lado * 0.055], [0.1, 0.5, lado * 0.85], 0.035, 0.11, 0.4, 4);
      c.push(pintar(oreja, variar('#8a5f33', r, 0.06)));
      const ojo = new THREE.SphereGeometry(0.016, 5, 4);
      poner(ojo, [0.095, 0.035, lado * 0.055]);
      c.push(pintar(ojo, '#1f1a14'));
    }

    return { cuerpo, cabeza: fusionar(c), pivote: [0.33, 0.55, 0] };
  });
}

/* -------------------------------------------------------------------------- */
/*  OVEJA criolla                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Oveja criolla: vellón crema abultado (lana de verdad, no una bola), cara y
 * patas oscuras, copete de lana. Mira a +X. @returns {{cuerpo, cabeza, pivote}}
 */
export function geomOveja({ q = 1 } = {}, seed = 61) {
  return memo(`oveja|${q}`, () => {
    const LANA = '#e9e4d6';
    const OSCURO = '#4a4038';
    const r = rng(seed);
    const p = [];

    // El vellón: masa central + borlas que rompen la silueta (lana, no esfera).
    const masa = new THREE.SphereGeometry(0.26, 9, 7);
    poner(masa, [0, 0.46, 0], [0, 0, 0], [1.3, 1, 1.05]);
    p.push(pintar(masa, LANA));
    const nBorlas = Math.max(4, Math.round(7 * q));
    for (let i = 0; i < nBorlas; i++) {
      const ang = (i / nBorlas) * Math.PI * 2 + r() * 0.5;
      const borla = new THREE.IcosahedronGeometry(0.11 + r() * 0.06, 0);
      poner(borla, [Math.cos(ang) * 0.24, 0.46 + (r() - 0.35) * 0.16, Math.sin(ang) * 0.16]);
      p.push(pintar(borla, variar(LANA, r, 0.06)));
    }
    for (const [px, pz] of [[0.18, 0.10], [0.18, -0.10], [-0.18, 0.11], [-0.18, -0.11]]) {
      const pata = new THREE.CylinderGeometry(0.026, 0.032, 0.3, 5, 1);
      poner(pata, [px, 0.15, pz]);
      p.push(pintar(pata, OSCURO));
    }
    const colita = new THREE.ConeGeometry(0.045, 0.13, 5, 1);
    apuntar(colita, [-0.33, 0.42, 0], [-0.5, -1, 0]);
    p.push(pintar(colita, variar(LANA, r, 0.06)));

    const cuerpo = fusionar(p);

    const c = [];
    const cara = new THREE.SphereGeometry(0.092, 8, 6);
    poner(cara, [0.05, -0.01, 0], [0, 0, 0], [1.2, 1, 0.85]);
    c.push(pintar(cara, OSCURO));
    const copete = new THREE.SphereGeometry(0.06, 6, 5);
    poner(copete, [0.0, 0.07, 0], [0, 0, 0], [1.1, 0.8, 1]);
    c.push(pintar(copete, LANA));
    for (const lado of [1, -1]) {
      const oreja = brote([0.02, 0.03, lado * 0.08], [0.15, -0.15, lado], 0.028, 0.09, 0.45, 4);
      c.push(pintar(oreja, variar(OSCURO, r, 0.08)));
      const ojo = new THREE.SphereGeometry(0.015, 5, 4);
      poner(ojo, [0.10, 0.025, lado * 0.06]);
      c.push(pintar(ojo, '#171310'));
    }

    return { cuerpo, cabeza: fusionar(c), pivote: [0.30, 0.52, 0] };
  });
}

/* -------------------------------------------------------------------------- */
/*  MAÍZ — la mata real                                                        */
/* -------------------------------------------------------------------------- */

const PAL_MAIZ = {
  cana: '#5f7f36',
  nudo: '#7d9448',
  hoja: '#5d8034',
  hoja2: '#6c9040',
  hojaSeca: '#a09553',
  capacho: '#87a949',
  grano: '#e2c04c',
  barbas: '#a8683a',
  penacho: '#d4bd6e',
};

/**
 * UNA mata de maíz (~1.7 de alto): caña con nudos, hojas lanceoladas que suben
 * arqueadas y quiebran la punta (las bajeras ya secas), mazorca pegada a la
 * caña con capacho + granos asomados + barbas, y el penacho de espigas arriba.
 */
export function geomMataMaiz({ q = 1, conMazorca = true } = {}, seed = 71) {
  const r = rng(seed);
  const p = [];
  const NSEG = 4;
  const LSEG = 0.42;
  const lean = (r() - 0.5) * 0.1; // la caña apenas se ladea; las hojas salen del eje

  // ── La caña por tramos, con NUDOS (anillos) en las junturas ──
  for (let i = 0; i < NSEG; i++) {
    const y0 = i * LSEG;
    const rTop = 0.034 - i * 0.006;
    const seg = new THREE.CylinderGeometry(rTop, rTop + 0.007, LSEG, 6, 1);
    poner(seg, [lean * (i + 0.5) * LSEG, y0 + LSEG / 2, 0], [0, 0, lean]);
    p.push(pintar(seg, variar(PAL_MAIZ.cana, r, 0.06)));
    if (i > 0) {
      const nudo = new THREE.CylinderGeometry(rTop + 0.012, rTop + 0.012, 0.024, 6, 1);
      poner(nudo, [lean * i * LSEG, y0, 0]);
      p.push(pintar(nudo, PAL_MAIZ.nudo));
    }
  }

  // ── Hojas dísticas: alternan de lado, suben arqueadas y la punta CAE ──
  const nHojas = Math.max(5, Math.round(8 * q));
  for (let i = 0; i < nHojas; i++) {
    const h = 0.22 + (i / nHojas) * 1.05;
    const lado = i % 2 === 0 ? 1 : -1;
    const azim = lado * (1 + (r() - 0.5) * 0.5);
    const dirX = Math.cos(azim);
    const dirZ = Math.sin(azim);
    const seca = i < 2 && q > 0.4; // las bajeras amarillean
    const col = seca ? PAL_MAIZ.hojaSeca : r() > 0.5 ? PAL_MAIZ.hoja : PAL_MAIZ.hoja2;
    const largoBase = 0.42 - (i / nHojas) * 0.1;
    // tramo 1: sube abierta desde la caña
    const base = brote([dirX * 0.03, h, dirZ * 0.03], [dirX * 0.85, 0.8, dirZ * 0.85], 0.045, largoBase, 0.2, 4);
    p.push(pintar(base, variar(col, r, 0.08)));
    // tramo 2: la punta quiebra y cae (lanceolada de verdad)
    const px = dirX * (0.03 + 0.62 * largoBase);
    const pz = dirZ * (0.03 + 0.62 * largoBase);
    const punta = brote([px, h + largoBase * 0.58, pz], [dirX, seca ? -0.75 : -0.35, dirZ], 0.034, largoBase * 0.85, 0.2, 4);
    p.push(pintar(punta, variar(col, r, 0.1)));
  }

  // ── La mazorca: pegada a la caña, capacho + granos asomados + barbas ──
  if (conMazorca) {
    const azim = r() * Math.PI * 2;
    const mx = Math.cos(azim) * 0.07;
    const mz = Math.sin(azim) * 0.07;
    const hM = 0.68;
    const dirM = [Math.cos(azim) * 0.5, 0.85, Math.sin(azim) * 0.5];
    const capacho = new THREE.CapsuleGeometry(0.055, 0.15, 4, 8);
    apuntar(capacho, [mx, hM, mz], dirM);
    p.push(pintar(capacho, PAL_MAIZ.capacho));
    // los granos asoman por la punta del capacho
    const grano = new THREE.SphereGeometry(0.035, 6, 5);
    poner(grano, [mx + dirM[0] * 0.14, hM + 0.13, mz + dirM[2] * 0.14], [0, 0, 0], [0.9, 1.2, 0.9]);
    p.push(pintar(grano, PAL_MAIZ.grano));
    const barbas = brote(
      [mx + dirM[0] * 0.17, hM + 0.17, mz + dirM[2] * 0.17],
      [dirM[0] * 1.4, 0.5, dirM[2] * 1.4],
      0.026,
      0.1,
      0.6,
      4,
    );
    p.push(pintar(barbas, PAL_MAIZ.barbas));
  }

  // ── El penacho (la espiga macho) corona la caña ──
  const topY = NSEG * LSEG;
  const espiga = brote([0, topY - 0.02, 0], [lean * 0.5, 1, 0], 0.014, 0.26, 1, 4);
  p.push(pintar(espiga, PAL_MAIZ.penacho));
  const nEspigas = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nEspigas; i++) {
    const ang = (i / nEspigas) * Math.PI * 2 + r();
    const ramita = brote(
      [0, topY - 0.03, 0],
      [Math.cos(ang) * 0.55, 0.8, Math.sin(ang) * 0.55],
      0.011,
      0.16,
      1,
      4,
    );
    p.push(pintar(ramita, variar(PAL_MAIZ.penacho, r, 0.08)));
  }

  return fusionar(p);
}

/**
 * La MILPA completa en UNA geometría (1 draw-call): matas en dos surcos con
 * jitter y escalas variadas — un cultivo sembrado, no un palo repetido.
 */
export function geomMilpa({ q = 1, matas = 6 } = {}, seed = 73) {
  return memo(`milpa|${q}|${matas}`, () => {
    const r = rng(seed);
    const p = [];
    const porSurco = Math.ceil(matas / 2);
    let k = 0;
    for (let sx = 0; sx < 2; sx++) {
      for (let i = 0; i < porSurco && k < matas; i++, k++) {
        const mata = geomMataMaiz({ q, conMazorca: r() > 0.3 }, seed + k * 13 + 1);
        const esc = 0.82 + r() * 0.3;
        poner(
          mata,
          [(sx - 0.5) * 0.62 + (r() - 0.5) * 0.12, 0, (i - (porSurco - 1) / 2) * 0.5 + (r() - 0.5) * 0.14],
          [0, r() * Math.PI * 2, 0],
          [esc, esc, esc],
        );
        p.push(mata);
      }
    }
    return fusionar(p);
  });
}

/* -------------------------------------------------------------------------- */
/*  CAFETO — el arbusto bandera, cargado de cereza                              */
/* -------------------------------------------------------------------------- */

const PAL_CAFE = {
  tronco: '#6b4a2e',
  rama: '#7c5a38',
  hoja: '#2e4c28',
  hoja2: '#3a5c30',
  cerezaRoja: '#c23227',
  cerezaPintona: '#d99a3c',
  cerezaVerde: '#7fae4a',
};

/**
 * Un cafeto (~0.95): tronco fino con PISOS de ramas horizontales (más largas
 * abajo → silueta cónica), hoja oscura lustrosa y cerezas pegadas a la rama
 * en todos los puntos de maduración (verde/pintona/roja).
 */
export function geomCafeto({ q = 1 } = {}, seed = 81) {
  const r = rng(seed);
  const p = [];

  const tronco = new THREE.CylinderGeometry(0.028, 0.042, 0.6, 6, 1);
  poner(tronco, [0, 0.3, 0], [0, 0, (r() - 0.5) * 0.08]);
  p.push(pintar(tronco, PAL_CAFE.tronco));

  const nPisos = Math.max(3, Math.round(4 * q) + 1);
  for (let piso = 0; piso < nPisos; piso++) {
    const y = 0.24 + piso * (0.48 / nPisos);
    const largo = 0.42 - piso * 0.07;
    const giro = piso * 1.2 + r() * 0.5;
    for (const lado of [0, Math.PI]) {
      const ang = giro + lado;
      const dir = [Math.cos(ang), -0.1 - r() * 0.08, Math.sin(ang)];
      const rama = brote([0, y, 0], dir, 0.014, largo, 1, 4);
      p.push(pintar(rama, PAL_CAFE.rama));
      // follaje: hojas por pares a lo largo de la rama
      for (const f of [0.5, 0.85]) {
        const hx = dir[0] * largo * f;
        const hz = dir[2] * largo * f;
        const hy = y + dir[1] * largo * f;
        const hoja = new THREE.SphereGeometry(0.075 + r() * 0.035, 7, 5);
        poner(hoja, [hx, hy + 0.03, hz], [r(), r(), r()], [1.25, 0.6, 1]);
        p.push(pintar(hoja, variar(r() > 0.5 ? PAL_CAFE.hoja : PAL_CAFE.hoja2, r, 0.07)));
      }
      // cerezas: racimitos PEGADOS a la rama (así fructifica el café)
      if (q > 0.4) {
        for (const f of [0.3, 0.55, 0.75]) {
          if (r() > 0.75) continue;
          const cx = dir[0] * largo * f;
          const cz = dir[2] * largo * f;
          const cy = y + dir[1] * largo * f - 0.02;
          const madurez = r();
          const col = madurez > 0.55 ? PAL_CAFE.cerezaRoja : madurez > 0.3 ? PAL_CAFE.cerezaPintona : PAL_CAFE.cerezaVerde;
          const cereza = new THREE.SphereGeometry(0.02, 5, 4);
          poner(cereza, [cx + (r() - 0.5) * 0.02, cy, cz + (r() - 0.5) * 0.02]);
          p.push(pintar(cereza, variar(col, r, 0.08)));
        }
      }
    }
  }
  // cogollo arriba
  const cogollo = new THREE.SphereGeometry(0.07, 6, 5);
  poner(cogollo, [0, 0.62, 0], [0, 0, 0], [1.1, 0.7, 1.1]);
  p.push(pintar(cogollo, PAL_CAFE.hoja2));

  return fusionar(p);
}

/** El cafetal del landmark: 3 cafetos distintos fusionados (1 draw-call). */
export function geomCafetal({ q = 1 } = {}, seed = 83) {
  return memo(`cafetal|${q}`, () => {
    const r = rng(seed);
    const p = [];
    const sitios = [
      [-0.5, 0, 0.05],
      [0.12, 0, 0.42],
      [0.55, 0, -0.12],
    ];
    sitios.forEach((s, i) => {
      const cafeto = geomCafeto({ q }, seed + i * 7 + 1);
      const esc = 0.9 + r() * 0.25;
      poner(cafeto, s, [0, r() * Math.PI * 2, 0], [esc, esc, esc]);
      p.push(cafeto);
    });
    return fusionar(p);
  });
}

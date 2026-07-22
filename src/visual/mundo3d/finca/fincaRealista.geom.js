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

/* Las caderas de la vaca (x, z, ¿trasera?) y la altura del pivote: compartidas
   entre la res de patas fijas y la articulada para que ambas pisen igual. */
const CADERAS_VACA = /** @type {[number, number, boolean][]} */ ([
  [0.44, 0.17, false], [0.44, -0.17, false], [-0.46, 0.18, true], [-0.46, -0.18, true],
]);
const Y_CADERA_VACA = 0.72;

/**
 * La vaca anatómica. Mira a +X, patas en y=0, cruz a ~1.1.
 * `cuerno` (opcional) escala los cuernos por encima de la raza — la ternera va
 * mocha aunque sea criolla.
 * `articulada` (opt-in) entrega las patas como PIEZAS SUELTAS con pivote en la
 * cadera (para escenas que columpian las patas al andar — el mercado). Con el
 * default las patas van fusionadas al cuerpo, como siempre (valle/hato).
 * @returns {{cuerpo: THREE.BufferGeometry, cabeza: THREE.BufferGeometry, pivote: [number,number,number], patas?: THREE.BufferGeometry[], caderas?: [number,number][], yCadera?: number}}
 */
export function geomVaca({ raza = 'holstein', ubre = true, cuerno = null, q = 1, articulada = false } = {}, seed = 21) {
  return memo(`vaca|${raza}|${ubre}|${cuerno}|${q}|${articulada}|${seed}`, () => {
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

    // ── Patas nacidas de la masa (muslo→caña→pezuña, con jitter) ──
    //    Articulada: cada pata se construye EN SU SITIO (mismas manchas y mismo
    //    horneado que el cuerpo — sin costura de color) y luego se traslada al
    //    origen para colgarla de un grupo pivotado en la cadera.
    /** @type {THREE.BufferGeometry[]} */
    const patasSueltas = [];
    for (const [px, pz, atras] of CADERAS_VACA) {
      const destino = articulada ? [] : p;
      pataCuadrupedo(destino, {
        x: px, z: pz, yCadera: Y_CADERA_VACA, rMuslo: 0.1, rCana: 0.046,
        pelaje: R.pelaje, pezuna: '#3c352d', r, atras, pintor: pinta,
      });
      if (articulada) {
        const pata = hornearPelaje(fusionarHato(destino, `vaca-${raza}-pata`), {
          yBajo: 0.04, yAlto: 1.0, ao: 0.42, moteado: 0.06, semilla: seed,
        });
        pata.translate(-px, -Y_CADERA_VACA, -pz);
        patasSueltas.push(pata);
      }
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

    /** @type {{cuerpo: THREE.BufferGeometry, cabeza: THREE.BufferGeometry, pivote: [number,number,number], patas?: THREE.BufferGeometry[], caderas?: [number,number][], yCadera?: number}} */
    const res = { cuerpo, cabeza, pivote: [0.82, 1.08, 0] };
    if (articulada) {
      res.patas = patasSueltas;
      res.caderas = CADERAS_VACA.map(([px, pz]) => /** @type {[number, number]} */ ([px, pz]));
      res.yCadera = Y_CADERA_VACA;
    }
    return res;
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
      const barbilla = new THREE.SphereGeometry(0.019 * T.cresta, 6, 5);
      poner(barbilla, [0.115, 0.1, lado * 0.018], [0, 0, 0], [1, 1.45, 0.65]);
      c.push(pintarPlano(barbilla, '#c8352a'));
      const ojo = new THREE.SphereGeometry(0.013, 5, 4);
      poner(ojo, [0.1, 0.17, lado * 0.052]);
      c.push(pintarPlano(ojo, '#1f1a14'));
    }
    const cabezaGeo = hornearPelaje(fusionarHato(c, `cabeza-gallina-${tipo}`), {
      yBajo: -0.02, yAlto: 0.2, ao: 0.22, moteado: 0.07, semilla: seed + 3,
    });

    return { cuerpo, cabeza: cabezaGeo, pivote: [0.11, 0.3 + alza, 0] };
  });
}

/* -------------------------------------------------------------------------- */
/*  PERROS — criollo de finca + las razas del arreo (dálmata y beagle)         */
/* -------------------------------------------------------------------------- */

/**
 * MANCHAS REDONDAS de dálmata (FCI 107: negras, REDONDAS, bien definidas y
 * SEPARADAS — nunca ruido celular): siembra discos deterministas sobre la
 * malla YA fusionada, eligiendo centros entre los vértices CLAROS (así jamás
 * caen sobre nariz/ojos/orejas ya oscuros) y rechazando el que pise a otro.
 * Cada vértice dentro del disco se funde a negro con borde corto — a este
 * conteo de polígonos la interpolación lo redondea sola. Se aplica ANTES de
 * hornearPelaje para que el AO sombree también la mancha.
 */
function sembrarManchasRedondas(geo, { n = 14, rMin = 0.045, rMax = 0.07, negro = '#26262b', semilla = 1, separacion = 1.2 } = {}) {
  const pos = geo.attributes.position;
  const col = geo.attributes.color;
  const r = rng(semilla);
  const centros = [];
  for (let intento = 0; intento < n * 40 && centros.length < n; intento++) {
    const i = Math.floor(r() * pos.count);
    if ((col.getX(i) + col.getY(i) + col.getZ(i)) / 3 < 0.6) continue; // solo piel blanca
    const cx = pos.getX(i);
    const cy = pos.getY(i);
    const cz = pos.getZ(i);
    const rad = rMin + r() * (rMax - rMin);
    let pisa = false;
    for (const m of centros) {
      if (Math.hypot(cx - m[0], cy - m[1], cz - m[2]) < (rad + m[3]) * separacion) {
        pisa = true;
        break;
      }
    }
    if (!pisa) centros.push([cx, cy, cz, rad]);
  }
  const cNegro = new THREE.Color(negro);
  const cV = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let cubre = 0;
    for (const [mx, my, mz, rad] of centros) {
      const d = Math.hypot(x - mx, y - my, z - mz);
      if (d < rad) cubre = Math.max(cubre, clamp01((rad - d) / (rad * 0.35)));
    }
    if (cubre > 0) {
      cV.fromBufferAttribute(col, i).lerp(cNegro, cubre);
      col.setXYZ(i, cV.r, cV.g, cV.b);
    }
  }
  return geo;
}

/** Pata canina parametrizable (muslo→caña→garra, solapadas y con jitter):
    la comparten dálmata (larga y fina) y beagle (corta y fuerte). */
function pataCanina(p, r, { x, z, atras, yMuslo, hMuslo, rMuslo, yCana, hCana, rCana, yGarra, rGarra, colorMuslo, colorCana, colorGarra }) {
  const j = () => (r() - 0.5) * 0.012;
  const dx = x + j();
  const dz = z + j();
  const muslo = new THREE.CylinderGeometry(rMuslo, rCana * 1.15, hMuslo, 7, 1);
  poner(muslo, [dx, yMuslo, dz], [0, 0, (atras ? -0.09 : 0.04) + j() * 3]);
  p.push(pintarPlano(muslo, colorMuslo));
  const bajaX = dx + (atras ? -0.018 : 0.008);
  const cana = new THREE.CylinderGeometry(rCana, rCana * 0.85, hCana, 6, 1);
  poner(cana, [bajaX, yCana, dz], [0, 0, j() * 2]);
  p.push(pintarPlano(cana, colorCana));
  const garra = new THREE.SphereGeometry(rGarra, 7, 5);
  poner(garra, [bajaX + 0.012, yGarra, dz], [0, 0, 0], [1.3, 0.65, 1]);
  p.push(pintarPlano(garra, colorGarra));
}

/*
 * DÁLMATA (FCI 107) — la silueta ES la raza: cuerpo casi CUADRADO (largo≈alto),
 * atlético, pecho profundo con cintura recogida, patas LARGAS y elegantes,
 * cuello erguido, hocico largo y parejo, orejas medianas caídas pegadas a la
 * mejilla, cola larga de sable en S suave (JAMÁS enroscada). Blanco puro con
 * manchas negras redondas sembradas (~35% del manto). Mira a +X, cruz ~0.5.
 *
 * `andante`: devuelve el perro DESARMADO para caminar de verdad — cuerpo sin
 * patas ni cola, cada pata como pieza aparte con pivote en el hombro/cadera y
 * la cola con pivote en la raíz (para el helicóptero del cariño). Además el
 * alma de OLIVER: ojos entrecerrados de felicidad, sonrisa perruna con
 * comisuras arriba y lengua corta, y collar rojo de perro de casa.
 */
function perroDalmata(q, seed, andante = false) {
  const BLANCO = '#f3efe7';
  const NEGRO = '#26262b';
  const r = rng(seed);
  const p = [];
  const nSeg = Math.max(13, Math.round(18 * q));
  const nRad = Math.max(11, Math.round(14 * q));

  const torso = cuerpoOrganico({
    largo: 0.66,
    nSeg,
    nRad,
    semilla: seed,
    ruido: 0.018,
    espina: (t) => 0.455 + 0.035 * campana(t, 0.85, 0.3) - 0.012 * campana(t, 0.4, 0.35),
    arriba: (t) => (0.075 + 0.012 * campana(t, 0.8, 0.35)) * remate(t, 0.42),
    abajo: (t) => (0.05 + 0.115 * campana(t, 0.74, 0.38)) * remate(t, 0.46),
    lado: (t) => (0.075 + 0.016 * campana(t, 0.78, 0.35)) * remate(t, 0.46),
  });
  p.push(pintarPlano(torso, BLANCO));
  const anca = new THREE.SphereGeometry(0.072, 10, 8);
  poner(anca, [-0.22, 0.45, 0], [0, 0, 0.12], [1, 1, 0.8]);
  p.push(pintarPlano(anca, BLANCO));
  // Patas LARGAS y finas: casi la mitad de la altura es aire bajo el pecho.
  // Pivote del hombro/cadera arriba del muslo: de ahí cuelga la pata andante.
  const PIV_PATA = 0.45;
  const POS_PATAS = /** @type {[number, number, boolean][]} */ (
    [[0.24, 0.055, false], [0.24, -0.055, false], [-0.22, 0.065, true], [-0.22, -0.065, true]]
  );
  const armaPata = (destino, x, z, atras) => pataCanina(destino, r, {
    x, z, atras,
    yMuslo: 0.32, hMuslo: 0.28, rMuslo: 0.042,
    yCana: 0.13, hCana: 0.22, rCana: 0.017,
    yGarra: 0.02, rGarra: 0.022,
    colorMuslo: BLANCO, colorCana: BLANCO, colorGarra: BLANCO,
  });
  if (!andante) for (const [px, pz, atras] of POS_PATAS) armaPata(p, px, pz, atras);
  // Cola de SABLE larga en S suave: cae del anca y el último tercio se
  // endereza con un latigazo leve — nunca la rosca del criollo.
  const cp = [];
  const cola1 = new THREE.CylinderGeometry(0.012, 0.02, 0.2, 6, 2);
  apuntar(cola1, [-0.378, 0.426, 0.008], [-0.87, -0.49, 0.09]);
  cp.push(pintarPlano(cola1, BLANCO));
  const cola2 = new THREE.CylinderGeometry(0.007, 0.013, 0.16, 6, 1);
  apuntar(cola2, [-0.533, 0.381, 0.031], [-0.98, 0.06, 0.21]);
  cp.push(pintarPlano(cola2, BLANCO));
  const puntaCola = new THREE.SphereGeometry(0.009, 6, 5);
  poner(puntaCola, [-0.611, 0.386, 0.048]);
  cp.push(pintarPlano(puntaCola, BLANCO));
  if (!andante) p.push(...cp);
  // Cuello ERGUIDO y largo (porte de carroza, no el cuello bajo del criollo).
  const cuello = new THREE.CylinderGeometry(0.052, 0.085, 0.21, 9, 2);
  apuntar(cuello, [0.3, 0.52, 0], [0.55, 0.85, 0], [1, 1, 0.8]);
  p.push(pintarPlano(cuello, BLANCO));
  if (andante) {
    // Collar ROJO de perro querido (Oliver es de la niña, no un callejero).
    const collar = new THREE.TorusGeometry(0.072, 0.014, 7, 14);
    collar.rotateX(Math.PI / 2);
    apuntar(collar, [0.276, 0.475, 0], [0.55, 0.85, 0], [1, 1, 0.85]);
    p.push(pintarPlano(collar, '#a83232'));
    // La PLAQUITA de latón colgando al frente del collar: el destello que
    // dice "perro con casa" incluso a distancia de valle. Fusionada: 0 draws.
    const placa = new THREE.SphereGeometry(0.016, 6, 5);
    poner(placa, [0.335, 0.42, 0], [0, 0, 0], [0.8, 1.15, 0.5]);
    p.push(pintarPlano(placa, '#c8963a'));
  }

  const cuerpo = hornearPelaje(
    sembrarManchasRedondas(fusionarHato(p, 'perro-dalmata'), {
      n: 15, rMin: 0.045, rMax: 0.07, negro: NEGRO, semilla: seed + 11,
    }),
    { yBajo: 0.015, yAlto: 0.56, ao: 0.34, moteado: 0.05, semilla: seed },
  );

  // ── CABEZA: cráneo alargado, hocico LARGO y parejo con stop suave, orejas
  //    medianas caídas NEGRAS (cachorro de carroza), manchitas en la cara ──
  const c = [];
  const craneo = new THREE.SphereGeometry(0.08, 11, 9);
  poner(craneo, [0.015, 0.005, 0], [0, 0, -0.05], [1.25, 0.92, 0.82]);
  c.push(pintarPlano(craneo, BLANCO));
  const hocico = new THREE.SphereGeometry(0.047, 9, 7);
  poner(hocico, [0.15, -0.02, 0], [0, 0, -0.12], [1.95, 0.66, 0.62]);
  c.push(pintarPlano(hocico, BLANCO));
  const nariz = new THREE.SphereGeometry(0.017, 6, 5);
  poner(nariz, [0.235, -0.005, 0]);
  c.push(pintarPlano(nariz, '#1c1815'));
  for (const lado of [1, -1]) {
    const oreja = orejaPetalo([0.0, 0.07, lado * 0.052], [0.05, -0.75, lado * 0.62], 0.115, 0.062, 0.28);
    c.push(pintarPlano(oreja, NEGRO));
    if (andante) {
      // Ojos ENTRECERRADOS de felicidad: media luna inclinada, no botón.
      const ojo = new THREE.SphereGeometry(0.015, 6, 4);
      poner(ojo, [0.09, 0.032, lado * 0.05], [0, 0, 0.35], [1.25, 0.38, 0.7]);
      c.push(pintarPlano(ojo, '#1f1a14'));
    } else {
      const ojo = new THREE.SphereGeometry(0.014, 5, 4);
      poner(ojo, [0.09, 0.03, lado * 0.05]);
      c.push(pintarPlano(ojo, '#1f1a14'));
    }
  }
  if (andante) {
    // La SONRISA perruna de Oliver: boca abierta oscura bajo el hocico,
    // comisuras LEVANTADAS a los lados y una lengua corta rosa — risueño.
    const boca = new THREE.SphereGeometry(0.032, 8, 6);
    poner(boca, [0.155, -0.05, 0], [0, 0, -0.15], [1.35, 0.5, 0.75]);
    c.push(pintarPlano(boca, '#33201f'));
    const lenguita = new THREE.SphereGeometry(0.02, 7, 5);
    poner(lenguita, [0.163, -0.058, 0.004], [0, 0, -0.3], [1.35, 0.5, 0.8]);
    c.push(pintarPlano(lenguita, '#d9737f'));
    for (const lado of [1, -1]) {
      const comisura = new THREE.SphereGeometry(0.009, 5, 4);
      poner(comisura, [0.115, -0.026, lado * 0.04]);
      c.push(pintarPlano(comisura, '#33201f'));
    }
  }
  const cabezaFusion = fusionarHato(c, `cabeza-perro-dalmata${andante ? '-andante' : ''}`);
  if (andante) {
    // El PARCHE de Oliver: la mancha negra sobre el ojo izquierdo — su seña
    // particular (la misma del dibujo 2D aprobado), legible desde lejos
    // donde las motas chicas ya se funden. Disco determinista con borde
    // corto, pintado ANTES del AO para que el horneado lo sombree también.
    const posA = cabezaFusion.attributes.position;
    const colA = cabezaFusion.attributes.color;
    const cParche = new THREE.Color(NEGRO);
    const cTmp = new THREE.Color();
    for (let vi = 0; vi < posA.count; vi++) {
      const d = Math.hypot(posA.getX(vi) - 0.075, posA.getY(vi) - 0.045, posA.getZ(vi) - 0.055);
      if (d < 0.052) {
        cTmp.fromBufferAttribute(colA, vi).lerp(cParche, clamp01((0.052 - d) / 0.018));
        colA.setXYZ(vi, cTmp.r, cTmp.g, cTmp.b);
      }
    }
  }
  const cabeza = hornearPelaje(
    sembrarManchasRedondas(cabezaFusion, {
      n: 5, rMin: 0.018, rMax: 0.032, negro: NEGRO, semilla: seed + 17, separacion: 1.4,
    }),
    { yBajo: -0.1, yAlto: 0.1, ao: 0.24, moteado: 0.04, semilla: seed + 3 },
  );

  if (!andante) return { cuerpo, cabeza, pivote: [0.4, 0.6, 0] };

  // Piezas articuladas: 4 patas colgando de su pivote (hombro/cadera) y la
  // cola con pivote en la raíz. Cada pata lleva sus manchitas — un dálmata de
  // patas impolutas se lee plástico.
  const patas = POS_PATAS.map(([px, pz, atras], k) => {
    const pl = [];
    armaPata(pl, 0, 0, atras);
    const geo = hornearPelaje(
      sembrarManchasRedondas(fusionarHato(pl, `pata-dalmata-${k}`), {
        n: 2, rMin: 0.018, rMax: 0.032, negro: NEGRO, semilla: seed + 21 + k * 7,
      }),
      { yBajo: 0.015, yAlto: 0.5, ao: 0.3, moteado: 0.04, semilla: seed + k },
    );
    geo.translate(0, -PIV_PATA, 0);
    return { geom: geo, pivote: /** @type {[number,number,number]} */ ([px, PIV_PATA, pz]) };
  });
  // La cola también lleva sus motas (una cola impoluta se lee plástica).
  const colaGeo = hornearPelaje(
    sembrarManchasRedondas(fusionarHato(cp, 'cola-dalmata'), {
      n: 3, rMin: 0.016, rMax: 0.026, negro: NEGRO, semilla: seed + 29, separacion: 1.1,
    }),
    { yBajo: 0.3, yAlto: 0.52, ao: 0.22, moteado: 0.04, semilla: seed + 5 },
  );
  colaGeo.translate(0.291, -0.475, 0.001); // la raíz de la cola al origen
  return {
    cuerpo, cabeza, pivote: [0.4, 0.6, 0],
    patas,
    cola: { geom: colaGeo, pivote: /** @type {[number,number,number]} */ ([-0.291, 0.475, -0.001]) },
    lengua: null,
    largoPata: PIV_PATA,
  };
}

/*
 * BEAGLE (FCI 161) — compacto y BAJITO: cuerpo más largo que alto (~5:4),
 * espalda corta y nivelada, patas CORTAS y fuertes, hocico ancho casi
 * cuadrado, orejas MUY largas anchas y caídas (casi tapan el hocico) y cola
 * corta ERGUIDA con punta blanca (la "bandera" del rastreador). Tricolor
 * clásico: silla negra en el lomo, canela en cabeza/hombros/anca, blanco en
 * panza, pecho, patas y punta de cola. Mira a +X, cruz ~0.38.
 *
 * `andante`: perro desarmado para el ciclo de marcha (patas y cola con
 * pivote propio) + el alma de DANTE el baboso: boca abierta de jadeo, cejas
 * canela, collar verde y una LENGUA aparte que cuelga y se mece — con
 * `punta` como anclaje para la gota de baba.
 */
function perroBeagle(q, seed, andante = false) {
  const BLANCO = '#f2ecdc';
  const NEGRO = '#2a2622';
  const CANELA = '#a5622c';
  const OREJA = '#5f3d20';
  const r = rng(seed);
  const p = [];
  const nSeg = Math.max(11, Math.round(15 * q));
  const nRad = Math.max(10, Math.round(12 * q));

  // Torso long-and-low: lomo nivelado, barril lleno, casi sin cintura.
  const torso = cuerpoOrganico({
    largo: 0.58,
    nSeg,
    nRad,
    semilla: seed,
    ruido: 0.022,
    espina: (t) => 0.3 + 0.015 * campana(t, 0.8, 0.4),
    arriba: (t) => (0.085 + 0.01 * campana(t, 0.5, 0.6)) * remate(t, 0.45),
    abajo: (t) => (0.08 + 0.07 * campana(t, 0.62, 0.5)) * remate(t, 0.5),
    lado: (t) => (0.1 + 0.01 * campana(t, 0.7, 0.4)) * remate(t, 0.5),
  });
  // Tricolor pintado por vértice SOBRE el loft (bordes con ruido, no serrucho):
  // silla negra arriba, canela en el flanco, blanco en bajos y pechera.
  const cB = new THREE.Color(BLANCO);
  const cN = new THREE.Color(NEGRO);
  const cC = new THREE.Color(CANELA);
  pintarPorVertice(torso, (x, y, z, i, c) => {
    const n = (ruidoFbm(x * 4.2 + seed, y * 4.2, z * 4.2) - 0.5) * 0.05;
    if (y < 0.2 + n) return c.copy(cB); // panza y bajos
    if (x > 0.2 + n) return c.copy(cB); // pechera
    if (y > 0.3 + n && x > -0.23 && x < 0.09) return c.copy(cN); // la silla
    return c.copy(cC); // flancos, hombros, transiciones
  });
  p.push(torso);
  const anca = new THREE.SphereGeometry(0.075, 10, 8);
  poner(anca, [-0.19, 0.31, 0], [0, 0, 0.12], [1, 1, 0.85]);
  p.push(pintarPlano(anca, CANELA));
  const pechera = new THREE.SphereGeometry(0.06, 9, 7);
  poner(pechera, [0.24, 0.24, 0], [0, 0, 0.5], [0.75, 1.05, 0.68]);
  p.push(pintarPlano(pechera, BLANCO));
  // Patas CORTAS y fuertes, blancas (fuego canela en los muslos delanteros).
  // Pivote bajito (cadera de perro salchichón): de ahí cuelga la pata andante.
  const PIV_PATA = 0.22;
  const POS_PATAS = /** @type {[number, number, boolean][]} */ (
    [[0.2, 0.06, false], [0.2, -0.06, false], [-0.18, 0.07, true], [-0.18, -0.07, true]]
  );
  const armaPata = (destino, x, z, atras) => pataCanina(destino, r, {
    x, z, atras,
    yMuslo: 0.155, hMuslo: 0.15, rMuslo: 0.045,
    yCana: 0.065, hCana: 0.11, rCana: 0.021,
    yGarra: 0.018, rGarra: 0.024,
    colorMuslo: atras ? BLANCO : CANELA, colorCana: BLANCO, colorGarra: BLANCO,
  });
  if (!andante) for (const [px, pz, atras] of POS_PATAS) armaPata(p, px, pz, atras);
  // La BANDERA: cola corta ERGUIDA (base negra que sigue la silla, punta
  // blanca bien marcada — así el rastreador se ve entre el pasto).
  const cp = [];
  const cola = new THREE.CylinderGeometry(0.011, 0.017, 0.17, 6, 2);
  apuntar(cola, [-0.278, 0.44, 0], [-0.33, 0.94, 0]);
  pintarPorVertice(cola, (x, y, z, i, c) => c.copy(y > 0.465 ? cB : cN));
  cp.push(cola);
  const puntaBandera = new THREE.SphereGeometry(0.014, 6, 5);
  poner(puntaBandera, [-0.308, 0.525, 0]);
  cp.push(pintarPlano(puntaBandera, BLANCO));
  if (!andante) p.push(...cp);
  // Cuello corto y macizo.
  const cuello = new THREE.CylinderGeometry(0.058, 0.088, 0.14, 9, 2);
  apuntar(cuello, [0.26, 0.36, 0], [0.8, 0.6, 0], [1, 1, 0.85]);
  p.push(pintarPlano(cuello, CANELA));
  if (andante) {
    // Collar VERDE del baboso mayor de la casa.
    const collar = new THREE.TorusGeometry(0.078, 0.014, 7, 14);
    collar.rotateX(Math.PI / 2);
    apuntar(collar, [0.235, 0.345, 0], [0.8, 0.6, 0], [1, 1, 0.88]);
    p.push(pintarPlano(collar, '#3a7d44'));
    // Y su PLAQUITA de latón, gemela de la de Oliver: los dos son perros
    // CON CASA y la placa lo dice desde lejos. Fusionada: 0 draws extra.
    const placa = new THREE.SphereGeometry(0.014, 6, 5);
    poner(placa, [0.292, 0.298, 0], [0, 0, 0], [0.8, 1.15, 0.5]);
    p.push(pintarPlano(placa, '#c8963a'));
  }

  const cuerpo = hornearPelaje(fusionarHato(p, 'perro-beagle'), {
    yBajo: 0.015, yAlto: 0.42, ao: 0.36, moteado: 0.06, semilla: seed,
  });

  // ── CABEZA: cráneo abombado, hocico ANCHO y corto con lista blanca al
  //    frente, ojos grandes dulces y las orejas ENORMES colgando bajo la
  //    quijada — de lejos, el beagle SON las orejas ──
  const c = [];
  const craneo = new THREE.SphereGeometry(0.082, 11, 9);
  poner(craneo, [0.01, 0.015, 0], [0, 0, -0.06], [1.1, 1.05, 0.9]);
  pintarPorVertice(craneo, (x, y, z, i, cc) => {
    if (Math.abs(z) < 0.016 && x > 0.02) return cc.copy(cB); // la lista
    return cc.copy(cC);
  });
  c.push(craneo);
  const hocico = new THREE.SphereGeometry(0.05, 9, 7);
  poner(hocico, [0.115, -0.025, 0], [0, 0, -0.15], [1.45, 0.72, 0.85]);
  pintarPorVertice(hocico, (x, y, z, i, cc) => cc.copy(x > 0.14 || y < -0.045 ? cB : cC));
  c.push(hocico);
  const nariz = new THREE.SphereGeometry(0.019, 6, 5);
  poner(nariz, [0.185, -0.012, 0]);
  c.push(pintarPlano(nariz, '#241d18'));
  for (const lado of [1, -1]) {
    const oreja = orejaPetalo([0.015, 0.055, lado * 0.06], [0.1, -0.9, lado * 0.35], 0.175, 0.095, 0.25);
    c.push(pintarPlano(oreja, variar(OREJA, r, 0.05)));
    const ojo = new THREE.SphereGeometry(0.016, 5, 4);
    poner(ojo, [0.075, 0.035, lado * 0.05]);
    c.push(pintarPlano(ojo, '#241709'));
    if (andante) {
      // Cejas canela del tricolor: los dos puntos que hacen "cara de beagle".
      const ceja = new THREE.SphereGeometry(0.011, 5, 4);
      poner(ceja, [0.062, 0.072, lado * 0.042], [0, 0, 0], [1.2, 0.7, 1]);
      c.push(pintarPlano(ceja, '#7d4a1e'));
    }
  }
  if (andante) {
    // Boca ABIERTA de jadeo — la lengua va aparte, articulada, con su baba.
    const boca = new THREE.SphereGeometry(0.03, 8, 6);
    poner(boca, [0.14, -0.052, 0], [0, 0, -0.2], [1.25, 0.5, 0.72]);
    c.push(pintarPlano(boca, '#33201f'));
  }
  const cabezaFusionB = fusionarHato(c, `cabeza-perro-beagle${andante ? '-andante' : ''}`);
  if (andante) {
    // El HOCICO ESCARCHADO de Dante: 15 años se llevan con canas. Un velo
    // blanco-hueso que sube desde la trufa por el puente del hocico y ralea
    // hacia el cráneo — la seña de perro VIEJO que se lee incluso a
    // distancia de valle. Pintado por vértice ANTES del AO (el horneado lo
    // sombrea también); las piezas OSCURAS (trufa, boca, ojos) se protegen
    // por luminancia para que la cara no pierda su dibujo.
    const posB = cabezaFusionB.attributes.position;
    const colB = cabezaFusionB.attributes.color;
    const cEscarcha = new THREE.Color('#eae3d3');
    const cTmpB = new THREE.Color();
    for (let vi = 0; vi < posB.count; vi++) {
      cTmpB.fromBufferAttribute(colB, vi);
      if (cTmpB.r + cTmpB.g + cTmpB.b < 0.55) continue; // trufa/boca/ojos intactos
      const d = Math.hypot(posB.getX(vi) - 0.16, posB.getY(vi) + 0.028, posB.getZ(vi));
      const f = clamp01((0.088 - d) / 0.055) * 0.85;
      if (f <= 0) continue;
      cTmpB.lerp(cEscarcha, f);
      colB.setXYZ(vi, cTmpB.r, cTmpB.g, cTmpB.b);
    }
  }
  const cabeza = hornearPelaje(cabezaFusionB, {
    yBajo: -0.12, yAlto: 0.1, ao: 0.24, moteado: 0.05, semilla: seed + 3,
  });

  if (!andante) return { cuerpo, cabeza, pivote: [0.34, 0.44, 0] };

  const patas = POS_PATAS.map(([px, pz, atras], k) => {
    const pl = [];
    armaPata(pl, 0, 0, atras);
    const geo = hornearPelaje(fusionarHato(pl, `pata-beagle-${k}`), {
      yBajo: 0.012, yAlto: 0.26, ao: 0.3, moteado: 0.05, semilla: seed + k,
    });
    geo.translate(0, -PIV_PATA, 0);
    return { geom: geo, pivote: /** @type {[number,number,number]} */ ([px, PIV_PATA, pz]) };
  });
  const colaGeo = hornearPelaje(fusionarHato(cp, 'cola-beagle'), {
    yBajo: 0.34, yAlto: 0.54, ao: 0.2, moteado: 0.04, semilla: seed + 5,
  });
  colaGeo.translate(0.25, -0.36, 0); // la raíz de la bandera al origen
  // La LENGUA del baboso, en coords locales de su pivote (la boca): cuelga
  // hacia afuera y abajo; `punta` es donde nace la gota de baba.
  const lp = [];
  const lengua1 = new THREE.SphereGeometry(0.036, 8, 6);
  poner(lengua1, [0.04, -0.025, 0], [0.12, 0, -0.5], [1.5, 0.34, 0.55]);
  lp.push(pintarPlano(lengua1, '#d9737f'));
  const lengua2 = new THREE.SphereGeometry(0.017, 6, 5);
  poner(lengua2, [0.085, -0.052, 0], [0, 0, -0.35], [1.05, 0.45, 0.85]);
  lp.push(pintarPlano(lengua2, '#c4606e'));
  const lenguaGeo = fusionarHato(lp, 'lengua-beagle');
  return {
    cuerpo, cabeza, pivote: [0.34, 0.44, 0],
    patas,
    cola: { geom: colaGeo, pivote: /** @type {[number,number,number]} */ ([-0.25, 0.36, 0]) },
    lengua: {
      geom: lenguaGeo,
      pivote: /** @type {[number,number,number]} */ ([0.135, -0.045, 0.006]),
      punta: /** @type {[number,number,number]} */ ([0.09, -0.062, 0]),
    },
    largoPata: PIV_PATA,
  };
}

/**
 * Perro de finca por raza. `criollo` (default) es el amarillo de siempre:
 * pecho hondo, cintura recogida, orejas a media asta y cola enroscada sobre
 * el lomo. `dalmata` y `beagle` son las razas del arreo del hato, con
 * anatomía Y capa propias (la silueta es lo que se lee de lejos — no basta
 * recolorear al criollo). Mira a +X. @returns {{cuerpo, cabeza, pivote}}
 */
export function geomPerro({ raza = 'criollo', q = 1 } = {}, seed = 51) {
  return memo(`perro|${raza}|${q}|${seed}`, () => {
    if (raza === 'dalmata') return perroDalmata(q, seed);
    if (raza === 'beagle') return perroBeagle(q, seed);
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

/**
 * Perro ANDANTE: la misma raza pero DESARMADA para caminar de verdad — cuerpo
 * sin patas ni cola, 4 patas con pivote en hombro/cadera (orden: delantera
 * izq, delantera der, trasera izq, trasera der), cola con pivote en la raíz
 * y (el beagle) lengua articulada con anclaje de baba. `largoPata` es el
 * largo real de la pata en unidades de malla: el consumidor deriva de ahí la
 * ZANCADA para atar el ciclo de paso al desplazamiento (cero patinaje).
 * Costo: 7 draw calls por perro (8 el beagle con lengua) contra 2 del
 * fusionado — son dos perros protagonistas, no un rebaño.
 * @returns {{cuerpo, cabeza, pivote, patas: {geom, pivote}[], cola: {geom, pivote}, lengua: null|{geom, pivote, punta}, largoPata: number}}
 */
export function geomPerroAndante({ raza = 'dalmata', q = 1 } = {}, seed = 51) {
  return memo(`perroAndante|${raza}|${q}|${seed}`, () =>
    raza === 'beagle' ? perroBeagle(q, seed, true) : perroDalmata(q, seed, true));
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

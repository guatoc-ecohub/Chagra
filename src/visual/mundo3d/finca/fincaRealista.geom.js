/*
 * fincaRealista.geom — los ANIMALES del corral, con anatomía y sombreado reales.
 *
 * Veredicto del operador (dos veces): "formas muy geométricas, aún no parecen
 * animales reales". El diagnóstico del DR realismo-3d (2026-06-19) aplica
 * palabra por palabra al hato:
 *
 *   1. SILUETA: un animal armado como unión de cápsulas y esferas perfectas se
 *      lee como juguete — el contorno es lo primero que el ojo evalúa. Aquí el
 *      torso es UN loft orgánico (`cuerpoOrganico`): secciones elípticas sobre
 *      una espina dorsal curva, con cruz, caída de lomo, grupa y panza
 *      descolgada continuas + ruido determinista que rompe la perfección.
 *   2. SOMBREADO: el color plano por pieza delata el poliedro. `hornearPelaje`
 *      hornea en vertexColors (gratis en runtime, corre en Android barato) la
 *      luz de cielo arriba, la oclusión de panza/entre-patas abajo y un moteado
 *      sutil de pelaje. Las MANCHAS de capa (holstein, pietrain) van PINTADAS
 *      por vértice con ruido — parches de piel, no pelotas pegadas que abultan
 *      la silueta.
 *   3. NORMALES SUAVES — la trampa fina: `computeVertexNormals()` sobre una
 *      geometría DESINDEXADA calcula normales POR CARA → flat shading aunque el
 *      material sea suave. Por eso `fusionarHato` NO recalcula normales: las
 *      partes llegan con sus normales suaves (primitivas o loft indexado) y la
 *      fusión las preserva. El material del hato (animales.jsx) va sin
 *      flatShading — a diferencia de MATERIAL_FINCA, que la arboleda necesita.
 *   4. REPETICIÓN: cada fábrica acepta `seed` (dos ovejas ≠ la misma oveja) y
 *      el consumidor añade jitter determinista por instancia.
 *
 * Las señas POR RAZA (pedido explícito del operador — él tiene cerdos):
 *   · VACA Holstein (manchas negras de capa, ubre llena, MOCHA — sin cuernos),
 *     criolla (caramelo, cuernos en lira) y cebú/Brahman (giba, papada,
 *     orejones caídos).
 *   · CERDO criollo colombiano (las TRES razas del banco de germoplasma de
 *     AGROSAVIA): zungo pelado (negro, panza baja), san pedreño (negro PELUDO,
 *     hocico corto, orejas RECTAS medianas) y casco de mula (capa
 *     rojiza-amarillenta y CASCO ENTERO sin hendidura, como el de una mula).
 *     Más las comerciales: duroc (colorado, dorso arqueado), landrace (rosado
 *     LARGO, orejas tapaojos) y pietrain (blanco manchado, jamones) + lechones.
 *   · GALLINA campesina/negra/blanca + gallo de cola en hoz verde tornasol.
 *   · PERRO criollo amarillo y OVEJA criolla de vellón por mechones.
 *
 * TÉCNICA tier-safe: cada animal se FUSIONA en cuerpo (una malla) + cabeza
 * (otra, local al pivote del cuello para conservar el gesto vivo) → 2 draw
 * calls por animal con UN material compartido. Cero assets, cero texturas,
 * corre headless (three core + merge).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  rng,
  ruidoFbm,
  poner,
  apuntar,
  pintarPorVertice,
  pintarPlano,
  desindexar,
} from '../bosque/sombreadoVegetal.js';

/* -------------------------------------------------------------------------- */
/*  Fusión + horneado del hato                                                 */
/* -------------------------------------------------------------------------- */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Fusiona las partes de un animal en UNA geometría, con las mismas garantías
 * anti-null de `fusionarSeguro` (desindexar TODO + validar atributos + tronar
 * fuerte) pero SIN recalcular normales: sobre geometría desindexada,
 * `computeVertexNormals` produce normales por-cara y el animal vuelve a ser un
 * poliedro por más suave que sea el material. Las normales suaves que traen
 * las primitivas y el loft SE PRESERVAN. El `uv` se descarta (el material del
 * hato no usa mapas) para que primitivas-con-uv y loft-sin-uv fusionen parejo.
 */
function fusionarHato(partes, etiqueta) {
  const buenas = partes.filter(Boolean).map((g) => {
    const geo = desindexar(g);
    if (geo.attributes.uv) geo.deleteAttribute('uv');
    return geo;
  });
  if (!buenas.length) throw new Error(`[fincaRealista] "${etiqueta}": sin partes que fusionar.`);
  const ref = Object.keys(buenas[0].attributes).sort().join(',');
  for (let i = 0; i < buenas.length; i++) {
    const attrs = Object.keys(buenas[i].attributes).sort().join(',');
    if (attrs !== ref) {
      throw new Error(
        `[fincaRealista] "${etiqueta}": la parte ${i} tiene atributos [${attrs}], se esperaba `
        + `[${ref}]. mergeGeometries devolvería null y el animal quedaría INVISIBLE sin error.`,
      );
    }
  }
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error(
      `[fincaRealista] "${etiqueta}": mergeGeometries devolvió NULL (mezcla indexada/no-indexada `
      + 'o atributos dispares). El animal habría quedado invisible.',
    );
  }
  return g;
}

/**
 * Hornea el sombreado del animal SOBRE la malla ya fusionada (posiciones y
 * normales finales): multiplica el color de cada vértice por
 *   · luz de cielo (las superficies que miran arriba se encienden),
 *   · oclusión de panza (gradiente de altura: entre las patas y bajo el vientre
 *     vive la penumbra — el AO barato que separa un bicho de un juguete),
 *   · sombra propia de las caras que miran al suelo,
 *   · moteado sutil de pelaje (ruido determinista, nunca por frame).
 */
function hornearPelaje(geo, { yBajo = 0.05, yAlto = 0.9, ao = 0.38, moteado = 0.07, semilla = 1 } = {}) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const col = geo.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nor.getY(i);
    const cielo = 0.82 + 0.18 * Math.max(0, ny);
    const alt = clamp01((y - yBajo) / Math.max(0.001, yAlto - yBajo));
    let oc = 1 - ao + ao * alt;
    if (ny < 0) oc *= 1 + ny * 0.16; // la cara que mira al piso, en sombra propia
    const mota = 1 + (ruidoFbm(x * 2.7 + semilla, y * 2.7, z * 2.7) - 0.5) * moteado * 2;
    const f = cielo * oc * mota;
    col.setXYZ(i, col.getX(i) * f, col.getY(i) * f, col.getZ(i) * f);
  }
  return geo;
}

/** Pequeña variación determinista de color (que un hato no sea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/**
 * MANCHAS DE CAPA pintadas por vértice: el ruido decide dónde la piel es
 * mancha y dónde es fondo. Como se evalúa en coordenadas del ANIMAL ya armado,
 * el parche continúa sin costura de una pieza a la vecina (torso → cuello).
 * Cero geometría extra: la silueta queda limpia (una mancha de vaca es piel,
 * no una piedra pegada).
 */
function pintarManchas(geo, base, mancha, { escala = 1.6, umbral = 0.58, semilla = 1 } = {}) {
  const cb = new THREE.Color(base);
  const cm = new THREE.Color(mancha);
  const tmp = new THREE.Color();
  const banda = 0.05; // borde suave: sin esto el umbral duro serrucha el parche
  return pintarPorVertice(geo, (x, y, z) => {
    const n = ruidoFbm(x * escala + semilla * 7.31, y * escala + semilla * 1.7, z * escala);
    const mezcla = clamp01((n - (umbral - banda)) / (banda * 2));
    return tmp.copy(cb).lerp(cm, mezcla);
  });
}

/** MECHÓN de lana SUAVE: esfera deformada con ruido, indexada, con normales
    recalculadas ANTES de fusionar — bulto blando, no roca facetada (el
    matojoHoja del bosque es no-indexado y se lee cristal en un vellón). */
function mechonLana(radio, semilla = 1, deform = 0.3) {
  const g = new THREE.SphereGeometry(radio, 9, 7);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = ruidoFbm(v.x * 2.4 + semilla, v.y * 2.4, v.z * 2.4) - 0.5;
    v.multiplyScalar(1 + n * deform * 2);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Un cono ANCLADO por su base (cuernos, plumas, picos): el centro se corre
    medio largo hacia `dir`. */
function brote(attach, dir, radio, largo, escZ, segs = 5) {
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

/** OREJA de pétalo: esfera aplastada orientada hacia `dir` — punta REDONDA.
    Un cono en la cabeza se lee como púa; una oreja real es una hoja carnosa. */
function orejaPetalo(attach, dir, largo, ancho, grosor = 0.3) {
  const g = new THREE.SphereGeometry(0.5, 9, 7);
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  apuntar(
    g,
    [attach[0] + d.x * largo * 0.42, attach[1] + d.y * largo * 0.42, attach[2] + d.z * largo * 0.42],
    dir,
    [ancho, largo, ancho * grosor],
  );
  return g;
}

/* -------------------------------------------------------------------------- */
/*  El torso orgánico — la silueta es lo que el ojo lee primero                */
/* -------------------------------------------------------------------------- */

/**
 * Loft de TORSO: anillos elípticos a lo largo del eje X (cola en t=0, pecho en
 * t=1) sobre una espina dorsal con altura variable. Radios independientes
 * hacia arriba (lomo), abajo (panza descolgada) y los lados, más ruido
 * orgánico determinista. INDEXADO → `computeVertexNormals` da normales suaves
 * reales (se llama aquí, ANTES de desindexar en la fusión).
 *
 * @param {object} o
 * @param {number} o.largo           largo total en X.
 * @param {(t:number)=>number} o.espina  altura del eje en t.
 * @param {(t:number)=>number} o.arriba  radio del lomo (espina → arriba).
 * @param {(t:number)=>number} o.abajo   radio de la panza (espina → abajo).
 * @param {(t:number)=>number} o.lado    medio-ancho.
 * @param {number} [o.nSeg] anillos a lo largo.  @param {number} [o.nRad] vértices por anillo.
 * @param {number} [o.ruido] amplitud relativa del relieve orgánico.
 * @param {number} [o.semilla] desfase del ruido.
 */
function cuerpoOrganico({ largo, espina, arriba, abajo, lado, nSeg = 16, nRad = 12, ruido = 0.025, semilla = 1 }) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= nSeg; i++) {
    const t = i / nSeg;
    const x = -largo / 2 + t * largo;
    const cy = espina(t);
    for (let j = 0; j < nRad; j++) {
      const a = (j / nRad) * Math.PI * 2;
      const s = Math.sin(a);
      const c = Math.cos(a);
      const n = (ruidoFbm(x * 3.1 + semilla, s * 1.9 + semilla, c * 1.9) - 0.5) * 2 * ruido;
      const ry = (s >= 0 ? arriba(t) : abajo(t)) * (1 + n);
      pos.push(x, cy + s * ry, c * lado(t) * (1 + n));
    }
  }
  for (let i = 0; i < nSeg; i++) {
    for (let j = 0; j < nRad; j++) {
      const a = i * nRad + j;
      const b = i * nRad + ((j + 1) % nRad);
      const c = (i + 1) * nRad + j;
      const d = (i + 1) * nRad + ((j + 1) % nRad);
      idx.push(a, c, b, b, c, d);
    }
  }
  // Tapas (los perfiles ya llegan angostos a las puntas → remate redondeado).
  const iCola = pos.length / 3;
  pos.push(-largo / 2 - largo * 0.02, espina(0), 0);
  const iPecho = pos.length / 3;
  pos.push(largo / 2 + largo * 0.02, espina(1), 0);
  for (let j = 0; j < nRad; j++) {
    idx.push(iCola, j, (j + 1) % nRad);
    const base = nSeg * nRad;
    idx.push(iPecho, base + ((j + 1) % nRad), base + j);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  geo.computeVertexNormals(); // indexado → suaves de verdad
  return geo;
}

/** Campana suave 0→1→0 centrada en `c` con ancho `w` (perfiles de panza/giba). */
const campana = (t, c, w) => {
  const u = clamp01(1 - Math.abs(t - c) / w);
  return u * u * (3 - 2 * u);
};

/** Remate de puntas: 1 en el centro, cae a `min` en t=0 y t=1 (que el loft
    cierre redondeado, no en tubo cortado). */
const remate = (t, min = 0.35) => min + (1 - min) * Math.sin(Math.PI * clamp01(t)) ** 0.6;

/* Patas de cuadrúpedo: muslo carnoso ANCHO ARRIBA que nace dentro de la masa
   del cuerpo (nada de postes desconectados), caña fina, pezuña oscura.
   Jitter determinista por pata: ningún animal para perfectamente cuadrado. */
function pataCuadrupedo(p, { x, z, yCadera, rMuslo, rCana, pelaje, pezuna, r, atras = false, pintor = null }) {
  const j = () => (r() - 0.5) * 0.02;
  const dx = x + j();
  const dz = z + j();
  const pinta = pintor || ((g, c) => pintarPlano(g, c));
  const muslo = new THREE.CylinderGeometry(rMuslo, rCana * 1.1, yCadera * 0.55, 8, 2);
  poner(muslo, [dx, yCadera * 0.66, dz], [j() * 3, 0, (atras ? -0.05 : 0.03) + j() * 2]);
  p.push(pinta(muslo, variar(pelaje, r, 0.05)));
  const cana = new THREE.CylinderGeometry(rCana, rCana * 0.88, yCadera * 0.42, 7, 1);
  poner(cana, [dx + (atras ? -0.012 : 0.006), yCadera * 0.22, dz], [0, 0, j() * 2]);
  p.push(pinta(cana, variar(pelaje, r, 0.06)));
  const casco = new THREE.CylinderGeometry(rCana * 1.02, rCana * 1.12, yCadera * 0.09, 7, 1);
  poner(casco, [dx + (atras ? -0.012 : 0.006), yCadera * 0.045, dz]);
  p.push(pintarPlano(casco, pezuna));
}

/* Caché de geometrías (mismas args → misma malla; nada se reconstruye al
   re-montar la escena). Chico: unas decenas de mallas menudas. */
const _cache = new Map();
function memo(clave, crear) {
  if (!_cache.has(clave)) _cache.set(clave, crear());
  return _cache.get(clave);
}

/* -------------------------------------------------------------------------- */
/*  VACA — Holstein / criolla / cebú (Brahman)                                 */
/* -------------------------------------------------------------------------- */

export const RAZAS_VACA = {
  holstein: {
    pelaje: '#f2ecdf', manchas: '#26211d', hocico: '#c39793', ubre: '#e2ab9e',
    cuerno: 0, orejas: 'lado', giba: false, papada: false,
  },
  criolla: {
    pelaje: '#a5652f', manchas: null, hocico: '#7c5138', ubre: '#cf9c82',
    cuerno: 0.9, orejas: 'lado', giba: false, papada: true,
  },
  cebu: {
    pelaje: '#d9d5c7', manchas: null, hocico: '#524b44', ubre: '#d8b3a4',
    cuerno: 0.8, orejas: 'caida', giba: true, papada: true,
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
    const nSeg = Math.max(14, Math.round(20 * q));
    const nRad = Math.max(11, Math.round(15 * q));
    const escCuerno = cuerno ?? R.cuerno;
    // El pintor de pelaje: manchas de capa pintadas (holstein) o color pleno.
    const pinta = R.manchas
      ? (g, c) => pintarManchas(g, c, R.manchas, { escala: 1.5, umbral: 0.56, semilla: seed })
      : (g, c) => pintarPlano(g, c);

    // ── El torso ES UNA silueta: grupa alta y huesuda, lomo que cae apenas,
    //    cruz marcada, pecho hondo y la panza de vaca descolgada al medio ──
    const torso = cuerpoOrganico({
      largo: 1.32,
      nSeg,
      nRad,
      semilla: seed,
      ruido: 0.02,
      espina: (t) => 0.9 + 0.05 * campana(t, 0.08, 0.22) - 0.035 * campana(t, 0.45, 0.35) + 0.04 * campana(t, 0.9, 0.2),
      arriba: (t) => (0.17 + 0.02 * campana(t, 0.1, 0.3)) * remate(t, 0.3),
      abajo: (t) => (0.24 + 0.17 * campana(t, 0.42, 0.5) + 0.05 * campana(t, 0.92, 0.25)) * remate(t, 0.42),
      lado: (t) => (0.27 + 0.02 * campana(t, 0.15, 0.3) - 0.02 * campana(t, 0.75, 0.3)) * remate(t, 0.4),
    });
    p.push(pinta(torso, R.pelaje));
    // Huesos de cadera marcados (lo huesudo de una vaca real).
    for (const dz of [0.16, -0.16]) {
      const hueso = new THREE.SphereGeometry(0.07, 9, 7);
      poner(hueso, [-0.52, 1.0, dz], [0, 0, 0], [1.15, 0.75, 0.75]);
      p.push(pinta(hueso, variar(R.pelaje, r, 0.04)));
    }

    // ── Cuello macizo y CORTO del pecho al pivote de la cabeza (las manchas
    //    pintadas continúan del torso al cuello sin costura) ──
    const cuello = new THREE.CylinderGeometry(0.13, 0.23, 0.42, 10, 3);
    apuntar(cuello, [0.66, 0.94, 0], [0.66, 0.5, 0], [1, 1, 0.7]);
    p.push(pinta(cuello, R.pelaje));

    // ── Giba y papada (cebú); papada leve en la criolla ──
    if (R.giba) {
      const giba = new THREE.SphereGeometry(0.14, 10, 8);
      poner(giba, [0.4, 1.12, 0], [0, 0, 0.15], [0.9, 1.1, 0.7]);
      p.push(pintarPlano(giba, variar(R.pelaje, r, 0.05)));
    }
    if (R.papada) {
      const papada = new THREE.CapsuleGeometry(0.06, R.giba ? 0.44 : 0.3, 4, 8);
      apuntar(papada, [0.62, 0.6, 0], [0.45, -1, 0], [1, 1, 0.45]);
      p.push(pintarPlano(papada, variar(R.pelaje, r, 0.06)));
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

    // ── Ubre con tetillas (la seña de la lechera) ──
    if (ubre) {
      const bolsa = new THREE.SphereGeometry(0.155, 11, 9);
      poner(bolsa, [-0.28, 0.52, 0], [0, 0, 0], [1.2, 0.95, 1.0]);
      p.push(pintarPlano(bolsa, R.ubre));
      for (const [tx, tz] of [[-0.2, 0.07], [-0.2, -0.07], [-0.37, 0.07], [-0.37, -0.07]]) {
        const teta = new THREE.CylinderGeometry(0.016, 0.021, 0.09, 6, 1);
        poner(teta, [tx, 0.42, tz]);
        p.push(pintarPlano(teta, variar(R.ubre, r, 0.06)));
      }
    }

    // ── Cola con borla ──
    const cola = new THREE.CylinderGeometry(0.015, 0.028, 0.52, 6, 2);
    apuntar(cola, [-0.66, 0.82, 0.02], [-0.2, -1, 0.08]);
    p.push(pintarPlano(cola, variar(R.pelaje, r, 0.05)));
    const borla = new THREE.ConeGeometry(0.032, 0.1, 6, 1);
    apuntar(borla, [-0.75, 0.56, 0.05], [-0.2, -1, 0.08]);
    p.push(pintarPlano(borla, R.manchas || '#3c352d'));

    const cuerpo = hornearPelaje(fusionarHato(p, `vaca-${raza}`), {
      yBajo: 0.04, yAlto: 1.0, ao: 0.42, moteado: 0.06, semilla: seed,
    });

    // ── La CABEZA (local al pivote del cuello): cráneo ancho, testuz recta,
    //    morro REDONDEADO — la cabeza de vaca, no una pelota con un tubo ──
    const c = [];
    const pintaCara = R.manchas
      ? (g, col) => pintarManchas(g, col, R.manchas, { escala: 2.4, umbral: 0.55, semilla: seed + 11 })
      : (g, col) => pintarPlano(g, col);
    const craneo = new THREE.SphereGeometry(0.15, 13, 11);
    poner(craneo, [0.06, 0.0, 0], [0, 0, -0.1], [1.25, 1.02, 0.82]);
    c.push(pintaCara(craneo, R.pelaje));
    const testuz = new THREE.SphereGeometry(0.115, 11, 9);
    poner(testuz, [0.24, -0.06, 0], [0, 0, -0.35], [1.35, 0.85, 0.72]);
    c.push(pintaCara(testuz, R.pelaje));
    const morro = new THREE.SphereGeometry(0.098, 11, 9);
    poner(morro, [0.37, -0.115, 0], [0, 0, -0.3], [1.05, 0.75, 0.8]);
    c.push(pintarPlano(morro, R.hocico));
    for (const oz of [0.045, -0.045]) {
      const ollar = new THREE.SphereGeometry(0.015, 6, 5);
      poner(ollar, [0.43, -0.1, oz], [0, 0, 0], [1, 0.65, 1]);
      c.push(pintarPlano(ollar, '#2c2521'));
    }
    for (const oz of [0.108, -0.108]) {
      const ojo = new THREE.SphereGeometry(0.024, 7, 6);
      poner(ojo, [0.14, 0.045, oz]);
      c.push(pintarPlano(ojo, '#241d18'));
    }
    // Orejas de pétalo: horizontales y ligeramente caídas (grandes en el cebú).
    // En la holstein van del color de la mancha de cabeza — la clásica.
    const caida = R.orejas === 'caida';
    const colorOreja = R.manchas ? variar(R.manchas, r, 0.08) : variar(R.pelaje, r, 0.07);
    for (const lado of [1, -1]) {
      const oreja = orejaPetalo(
        [0.0, caida ? 0.04 : 0.06, lado * 0.125],
        caida ? [0.1, -0.55, lado * 0.85] : [0.02, -0.12, lado],
        caida ? 0.2 : 0.14,
        caida ? 0.1 : 0.085,
        0.28,
      );
      c.push(pintarPlano(oreja, colorOreja));
    }
    if (escCuerno > 0.2) {
      for (const lado of [1, -1]) {
        const cuerno1 = brote([0.0, 0.115, lado * 0.065], [-0.08, 0.9, lado * 0.5], 0.024, 0.16 * escCuerno, 1, 6);
        c.push(pintarPlano(cuerno1, '#d9cdb2'));
      }
    }
    const cabeza = hornearPelaje(fusionarHato(c, `cabeza-vaca-${raza}`), {
      yBajo: -0.2, yAlto: 0.15, ao: 0.3, moteado: 0.05, semilla: seed + 3,
    });

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

export const RAZAS_CERDO = {
  zungo: {
    pelaje: '#2e2926', trompa: '#4c423c', panza: 1.35, largo: 0.95,
    orejas: 'caida', arco: 0, jamon: 1, manchas: null, calcetin: null,
  },
  // San Pedreño: negro de PELO ABUNDANTE (el contraste legible con el Zungo
  // pelado → moteado de pelaje reforzado), HOCICO CORTO (perfil cóncavo) y
  // OREJAS RECTAS y medianas — fuente Agrosavia/SciELO; el `caida` anterior
  // contradecía la fuente. El "calcetín claro" quedó NO VERIFICADO en el
  // brief (ops/BRIEF-FABLE-ANIMALES-COLOMBIANOS.md §2.2) → NO se dibuja.
  sanpedreno: {
    pelaje: '#332b26', trompa: '#c9a58e', panza: 1.15, largo: 0.98,
    orejas: 'parada', arco: 0, jamon: 1, manchas: null, calcetin: null,
    trompaCorta: 0.72, pelo: 2.6,
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
  // Casco de Mula: la TERCERA raza criolla porcina colombiana (banco de
  // germoplasma AGROSAVIA; Orinoquía — Meta, Casanare). Capa entre roja y
  // amarillenta (NO negra, a diferencia de zungo y san pedreño) y su seña
  // única: el casco ENTERO, sin hendidura, como el de una mula (sindactilia).
  cascoDeMula: {
    pelaje: '#a8683a', trompa: '#8a5636', panza: 1.08, largo: 1.0,
    orejas: 'caida', arco: 0, jamon: 1, manchas: null, calcetin: null,
    casco: 'entero',
  },
};
// Grafías que llegan del dato real (mundoData trae 'sanpedreño' con ñ; un
// hato de farmOS puede escribir 'casco de mula'): registrar alias para que
// ninguna raza criolla caiga en silencio al fallback (patrón CorralVivo).
RAZAS_CERDO['sanpedreño'] = RAZAS_CERDO.sanpedreno;
RAZAS_CERDO['casco de mula'] = RAZAS_CERDO.cascoDeMula;
RAZAS_CERDO.cascodemula = RAZAS_CERDO.cascoDeMula;

// El hato puede registrar la raza sin eñe. Ambas grafías deben usar la misma
// ficha para evitar que una de ellas caiga al cerdo zungo por defecto.
RAZAS_CERDO['sanpedreño'] = RAZAS_CERDO.sanpedreno;

/**
 * El cerdo por raza. Mira a +X, patas en y=0, lomo a ~0.62.
 * @returns {{cuerpo: THREE.BufferGeometry, cabeza: THREE.BufferGeometry, pivote: [number,number,number]}}
 */
export function geomCerdo({ raza = 'zungo', q = 1 } = {}, seed = 31) {
  return memo(`cerdo|${raza}|${q}|${seed}`, () => {
    const R = RAZAS_CERDO[raza] || RAZAS_CERDO.zungo;
    const r = rng(seed);
    const L = R.largo;
    const p = [];
    const nSeg = Math.max(13, Math.round(17 * q));
    const nRad = Math.max(11, Math.round(14 * q));
    const pinta = R.manchas
      ? (g, c) => pintarManchas(g, c, R.manchas, { escala: 2.4, umbral: 0.6, semilla: seed })
      : (g, c) => pintarPlano(g, c);

    // ── El torso cilíndrico-macizo del cerdo: lomo casi recto (arqueado en el
    //    duroc), panza que en el zungo casi barre el piso, jamones atrás ──
    const torso = cuerpoOrganico({
      largo: 0.92 * L,
      nSeg,
      nRad,
      semilla: seed,
      ruido: 0.02,
      espina: (t) => 0.42 + (R.arco ? 0.05 * campana(t, 0.5, 0.5) : 0.012 * campana(t, 0.55, 0.45)),
      arriba: (t) => (0.155 + 0.012 * campana(t, 0.45, 0.4)) * remate(t, 0.42),
      abajo: (t) => (0.17 + 0.1 * R.panza * campana(t, 0.48, 0.52)) * remate(t, 0.48),
      lado: (t) => (0.185 + 0.02 * campana(t, 0.2, 0.35)) * remate(t, 0.5),
    });
    p.push(pinta(torso, R.pelaje));
    for (const lado of [1, -1]) {
      const jamon = new THREE.SphereGeometry(0.145 * R.jamon, 11, 9);
      poner(jamon, [-0.32 * L, 0.4, lado * 0.09], [0, 0, 0.1], [1.05, 1.15, 0.85]);
      p.push(pinta(jamon, variar(R.pelaje, r, 0.05)));
      const paleta = new THREE.SphereGeometry(0.115 * (R.jamon > 1.1 ? 1.15 : 1), 10, 8);
      poner(paleta, [0.26 * L, 0.45, lado * 0.095], [0, 0, 0], [1, 1.1, 0.8]);
      p.push(pinta(paleta, variar(R.pelaje, r, 0.05)));
    }

    // ── Patas cortas. La pezuña porcina va HENDIDA (dos dedos con canal al
    //    medio)… salvo en el Casco de Mula, cuyo casco es ENTERO y redondo
    //    como el de una mula — SU rasgo firma, y se dibuja. ──
    for (const [px, pz, atras] of /** @type {[number, number, boolean][]} */ ([[0.28 * L, 0.12, false], [0.28 * L, -0.12, false], [-0.31 * L, 0.13, true], [-0.31 * L, -0.13, true]])) {
      const j = () => (r() - 0.5) * 0.015;
      const pata = new THREE.CylinderGeometry(0.052, 0.04, 0.24, 8, 1);
      poner(pata, [px + j(), 0.15, pz + j()], [j() * 2, 0, (atras ? -0.04 : 0.03) + j() * 2]);
      p.push(pintarPlano(pata, R.calcetin || variar(R.pelaje, r, 0.04)));
      if (R.casco === 'entero') {
        // Casco de mula: UNA uña entera color cuerno, más ancha y visible.
        const casco = new THREE.CylinderGeometry(0.05, 0.058, 0.075, 10, 1);
        poner(casco, [px, 0.038, pz]);
        p.push(pintarPlano(casco, '#7a5f43'));
      } else {
        for (const dz of [0.026, -0.026]) {
          const dedo = new THREE.CylinderGeometry(0.023, 0.027, 0.06, 7, 1);
          poner(dedo, [px, 0.03, pz + dz]);
          p.push(pintarPlano(dedo, '#332c26'));
        }
      }
    }

    // ── La colita en tirabuzón, chiquita y pegada al jamón ──
    const cola = new THREE.TorusGeometry(0.032, 0.011, 6, 12);
    poner(cola, [-0.47 * L, 0.5, 0], [0.35, Math.PI / 2, 0.4]);
    p.push(pintarPlano(cola, variar(R.pelaje, r, 0.06)));

    const cuerpo = hornearPelaje(fusionarHato(p, `cerdo-${raza}`), {
      // `pelo` refuerza el moteado del pelaje: el San Pedreño peludo se lee
      // áspero contra el Zungo pelado y liso.
      yBajo: 0.02, yAlto: 0.58, ao: 0.4, moteado: 0.07 * (R.pelo || 1), semilla: seed,
    });

    // ── CABEZA (pivote al frente): hocica el suelo ──
    const c = [];
    const craneo = new THREE.SphereGeometry(0.14, 12, 10);
    poner(craneo, [0.06, -0.02, 0], [0, 0, -0.12], [1.28, 1, 0.92]);
    c.push(pinta(craneo, R.pelaje));
    const papadita = new THREE.SphereGeometry(0.088, 9, 8);
    poner(papadita, [0.07, -0.115, 0], [0, 0, 0], [1.15, 0.7, 0.85]);
    c.push(pintarPlano(papadita, variar(R.pelaje, r, 0.05)));
    // `trompaCorta` acorta el hocico (San Pedreño: perfil corto y cóncavo).
    const tl = R.trompaCorta || 1;
    const trompa = new THREE.CylinderGeometry(0.058 + 0.006 * (1 - tl), 0.078, 0.16 * tl, 10, 2);
    poner(trompa, [0.15 + 0.08 * tl, -0.06, 0], [0, 0, Math.PI / 2 + 0.22], [1, 1, 0.88]);
    c.push(pintarPlano(trompa, R.pelaje));
    // El disco del morro (la nariz de cerdo, inconfundible) + ollares.
    const xMorro = 0.15 + 0.165 * tl;
    const disco = new THREE.CylinderGeometry(0.06, 0.06, 0.032, 11, 1);
    poner(disco, [xMorro, -0.08 + 0.012 * (1 - tl), 0], [0, 0, Math.PI / 2 + 0.22]);
    c.push(pintarPlano(disco, R.trompa));
    for (const oz of [0.024, -0.024]) {
      const ollar = new THREE.SphereGeometry(0.011, 5, 4);
      poner(ollar, [xMorro + 0.018, -0.076 + 0.012 * (1 - tl), oz]);
      c.push(pintarPlano(ollar, '#241f1b'));
    }
    for (const oz of [0.095, -0.095]) {
      const ojo = new THREE.SphereGeometry(0.018, 6, 5);
      poner(ojo, [0.125, 0.05, oz]);
      c.push(pintarPlano(ojo, '#1f1a16'));
    }
    // Orejas de pétalo: la firma de cada raza.
    const OREJAS = {
      caida: { dir: (l) => [0.4, -0.45, l * 0.75], largo: 0.16, ancho: 0.1 },
      gacha: { dir: (l) => [0.65, -0.2, l * 0.55], largo: 0.15, ancho: 0.095 },
      tapaojos: { dir: (l) => [0.8, -0.5, l * 0.3], largo: 0.2, ancho: 0.13 },
      parada: { dir: (l) => [0.15, 0.85, l * 0.45], largo: 0.13, ancho: 0.085 },
    };
    const O = OREJAS[R.orejas] || OREJAS.caida;
    for (const lado of [1, -1]) {
      const oreja = orejaPetalo([0.05, 0.09, lado * 0.09], O.dir(lado), O.largo, O.ancho, 0.3);
      c.push(pintarPlano(oreja, variar(R.pelaje, r, 0.07)));
    }
    const cabeza = hornearPelaje(fusionarHato(c, `cabeza-cerdo-${raza}`), {
      yBajo: -0.18, yAlto: 0.12, ao: 0.28, moteado: 0.06 * (R.pelo || 1), semilla: seed + 3,
    });

    return { cuerpo, cabeza, pivote: [0.42 * L, 0.5, 0] };
  });
}

/**
 * Lechón: la cría en UNA sola malla (no pivota la cabeza — trota detrás de la
 * marrana). Hereda el pelaje de su raza.
 */
export function geomLechon({ raza = 'landrace' } = {}, seed = 37) {
  return memo(`lechon|${raza}|${seed}`, () => {
    const R = RAZAS_CERDO[raza] || RAZAS_CERDO.landrace;
    const r = rng(seed);
    const p = [];
    const torso = cuerpoOrganico({
      largo: 0.3,
      nSeg: 10,
      nRad: 9,
      semilla: seed,
      ruido: 0.03,
      espina: () => 0.155,
      arriba: (t) => 0.07 * remate(t, 0.45),
      abajo: (t) => (0.075 + 0.025 * campana(t, 0.5, 0.5)) * remate(t, 0.5),
      lado: (t) => 0.068 * remate(t, 0.5),
    });
    p.push(pintarPlano(torso, variar(R.pelaje, r, 0.05)));
    const cabeza = new THREE.SphereGeometry(0.058, 10, 8);
    poner(cabeza, [0.155, 0.165, 0], [0, 0, -0.15], [1.2, 1, 0.9]);
    p.push(pintarPlano(cabeza, R.pelaje));
    const trompita = new THREE.CylinderGeometry(0.024, 0.03, 0.05, 8, 1);
    poner(trompita, [0.215, 0.15, 0], [0, 0, Math.PI / 2 + 0.2]);
    p.push(pintarPlano(trompita, R.trompa));
    for (const lado of [1, -1]) {
      const oreja = orejaPetalo([0.17, 0.2, lado * 0.035], [0.35, 0.3, lado * 0.7], 0.05, 0.034, 0.3);
      p.push(pintarPlano(oreja, variar(R.pelaje, r, 0.08)));
      for (const px of [0.1, -0.09]) {
        const pata = new THREE.CylinderGeometry(0.017, 0.014, 0.1, 6, 1);
        poner(pata, [px + (r() - 0.5) * 0.012, 0.05, lado * 0.045]);
        p.push(pintarPlano(pata, variar(R.pelaje, r, 0.05)));
      }
    }
    const colita = new THREE.TorusGeometry(0.015, 0.005, 5, 9);
    poner(colita, [-0.16, 0.18, 0], [0.3, Math.PI / 2, 0]);
    p.push(pintarPlano(colita, R.pelaje));
    return hornearPelaje(fusionarHato(p, `lechon-${raza}`), {
      yBajo: 0.01, yAlto: 0.24, ao: 0.35, moteado: 0.06, semilla: seed,
    });
  });
}

/* -------------------------------------------------------------------------- */
/*  GALLINA / GALLO                                                            */
/* -------------------------------------------------------------------------- */

export const TIPOS_GALLINA = {
  campesina: { plumas: '#9a5a2e', pecho: '#7c4524', cola: '#5e3a20', cresta: 0.8, gallo: false },
  negra: { plumas: '#2c2825', pecho: '#3a332e', cola: '#232019', cresta: 0.8, gallo: false },
  blanca: { plumas: '#e9e3d4', pecho: '#ddd5c2', cola: '#cfc6b0', cresta: 0.9, gallo: false },
  gallo: { plumas: '#a34f22', pecho: '#3a2c20', cola: '#1f3a2c', cresta: 1.15, gallo: true },
};

/**
 * Gallina de verdad: pechuga baja, rabadilla alzada, abanico de cola, alas
 * plegadas, cresta y barbillas. El gallo lleva cola verde tornasol en hoz.
 * Mira a +X. @returns {{cuerpo, cabeza, pivote}}
 */
export function geomGallina({ tipo = 'campesina', q = 1 } = {}, seed = 41) {
  return memo(`gallina|${tipo}|${q}|${seed}`, () => {
    const T = TIPOS_GALLINA[tipo] || TIPOS_GALLINA.campesina;
    const r = rng(seed);
    const p = [];

    // Cuerpo en gota: pechuga adelante-abajo, rabadilla arriba-atrás — un loft
    // inclinado, no una esfera escalada.
    const alza = T.gallo ? 0.05 : 0; // el gallo anda más erguido que las gallinas
    const torso = cuerpoOrganico({
      largo: 0.4,
      nSeg: 12,
      nRad: 11,
      semilla: seed,
      ruido: 0.035,
      espina: (t) => 0.22 + alza + 0.14 * (1 - t) - 0.03 * campana(t, 0.7, 0.4),
      arriba: (t) => (0.1 + 0.03 * campana(t, 0.35, 0.5)) * remate(t, 0.35),
      abajo: (t) => (0.09 + 0.075 * campana(t, 0.62, 0.45)) * remate(t, 0.4),
      lado: (t) => (0.105 + 0.01 * campana(t, 0.5, 0.4)) * remate(t, 0.4),
    });
    p.push(pintarPlano(torso, T.plumas));
    const pechuga = new THREE.SphereGeometry(0.095, 10, 8);
    poner(pechuga, [0.1, 0.2, 0], [0, 0, 0.3], [1.1, 1, 0.8]);
    p.push(pintarPlano(pechuga, T.pecho));
    // Alas plegadas HUNDIDAS en el flanco (parche de pluma, no globo aparte).
    for (const lado of [1, -1]) {
      const ala = new THREE.SphereGeometry(0.1, 10, 8);
      poner(ala, [-0.03, 0.28, lado * 0.082], [0.15 * lado, 0, 0.55], [1.3, 0.62, 0.26]);
      p.push(pintarPlano(ala, variar(T.plumas, r, 0.1)));
    }
    // La cola: la gallina un abanico corto alzado; el gallo HOCES que arquean
    // de verdad — cadena de 3 tramos encadenados punta-a-base, cada uno girando
    // hacia abajo (la curva de la pluma, no una cuchilla recta).
    if (T.gallo) {
      // Base: abanico corto de pluma oscura en la rabadilla (masa de cola).
      for (let i = 0; i < 3; i++) {
        const abre = (i - 1) * 0.3;
        const pluma = brote([-0.14, 0.42, 0], [-0.8, 0.65, abre * 0.5], 0.05, 0.16, 0.3, 5);
        p.push(pintarPlano(pluma, variar('#4a2c18', r, 0.12)));
      }
      // Las HOCES: arcos de toro finos (curva LISA — la pluma que sube y cae),
      // cada una con su radio y su apertura lateral.
      const nHoces = 4;
      for (let i = 0; i < nHoces; i++) {
        const abre = (i - (nHoces - 1) / 2) * 0.5;
        const radio = 0.13 + (1 - Math.abs(abre)) * 0.05 + r() * 0.015;
        const hoz = new THREE.TorusGeometry(radio, 0.013, 6, 14, Math.PI * 0.85);
        // El arco vive en el plano XY; se planta en la rabadilla, girado para
        // que suba por detrás y caiga, con apertura lateral por pluma.
        poner(
          hoz,
          [-0.16, 0.3 + radio * 0.35, abre * 0.05],
          [abre * 0.55, abre * 0.35, 0.55 - Math.abs(abre) * 0.2],
        );
        p.push(pintarPlano(hoz, variar(T.cola, r, 0.16)));
      }
    } else {
      for (let i = 0; i < 3; i++) {
        const abre = (i - 1) * 0.32;
        const largo = 0.22 * (1 - Math.abs(abre) * 0.35);
        const pluma = brote([-0.16, 0.37, 0], [-0.85, 0.75, abre * 0.5], 0.058, largo, 0.28, 5);
        p.push(pintarPlano(pluma, variar(T.cola, r, 0.14)));
      }
    }
    // Muslos emplumados + patas + dedos.
    for (const lado of [1, -1]) {
      const muslo = new THREE.SphereGeometry(0.055, 8, 7);
      poner(muslo, [0.02, 0.16, lado * 0.055]);
      p.push(pintarPlano(muslo, variar(T.plumas, r, 0.08)));
      const pata = new THREE.CylinderGeometry(0.011, 0.013, 0.13, 6, 1);
      poner(pata, [0.03 + (r() - 0.5) * 0.01, 0.065, lado * 0.05]);
      p.push(pintarPlano(pata, '#caa03c'));
      if (q > 0.5) {
        for (const dd of [-0.35, 0, 0.35]) {
          const dedo = brote([0.03, 0.008, lado * 0.05], [1, 0.05, dd], 0.008, 0.05, 1, 4);
          p.push(pintarPlano(dedo, '#caa03c'));
        }
      }
    }

    const cuerpo = hornearPelaje(fusionarHato(p, `gallina-${tipo}`), {
      yBajo: 0.02, yAlto: 0.4, ao: 0.32, moteado: 0.09, semilla: seed,
    });

    // ── CABEZA + CUELLO (pivotan juntos: el picoteo) ──
    const c = [];
    const cuello = new THREE.CylinderGeometry(0.036, 0.055, 0.17, 9, 2);
    apuntar(cuello, [0.035, 0.075, 0], [0.45, 1, 0]);
    c.push(pintarPlano(cuello, T.plumas));
    const cabeza = new THREE.SphereGeometry(0.065, 10, 8);
    poner(cabeza, [0.085, 0.16, 0], [0, 0, -0.1], [1.15, 1, 0.85]);
    c.push(pintarPlano(cabeza, T.plumas));
    const pico = brote([0.14, 0.15, 0], [1, -0.12, 0], 0.019, 0.065, 1, 5);
    c.push(pintarPlano(pico, '#d8a03c'));
    // Cresta dentada (2-3 pinchos) + barbillas colgantes.
    const nCresta = T.gallo ? 3 : 2;
    for (let i = 0; i < nCresta; i++) {
      const pincho = brote(
        [0.055 + i * 0.035, 0.213, 0],
        [0.15 - i * 0.15, 1, 0],
        0.02 * T.cresta,
        0.055 * T.cresta,
        0.5,
        5,
      );
      c.push(pintarPlano(pincho, '#c8352a'));
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
    const nSeg = Math.max(11, Math.round(15 * q));
    const nRad = Math.max(10, Math.round(12 * q));

    // Torso HORIZONTAL de perro flaco de finca: pecho hondo tras los hombros,
    // cintura recogida, grupa que cae apenas.
    const torso = cuerpoOrganico({
      largo: 0.6,
      nSeg,
      nRad,
      semilla: seed,
      ruido: 0.025,
      espina: (t) => 0.37 + 0.035 * campana(t, 0.82, 0.35) - 0.008 * campana(t, 0.3, 0.35),
      arriba: (t) => (0.08 + 0.015 * campana(t, 0.8, 0.35)) * remate(t, 0.42),
      abajo: (t) => (0.065 + 0.085 * campana(t, 0.72, 0.4) - 0.015 * campana(t, 0.22, 0.28)) * remate(t, 0.48),
      lado: (t) => (0.09 + 0.018 * campana(t, 0.78, 0.35)) * remate(t, 0.48),
    });
    p.push(pintarPlano(torso, PELAJE));
    // Pechera crema HUNDIDA en el pecho (parche de pelo, no una pelota).
    const pechera = new THREE.SphereGeometry(0.062, 9, 7);
    poner(pechera, [0.27, 0.31, 0], [0, 0, 0.5], [0.75, 1.05, 0.62]);
    p.push(pintarPlano(pechera, CREMA));
    const anca = new THREE.SphereGeometry(0.08, 10, 8);
    poner(anca, [-0.2, 0.37, 0], [0, 0, 0.15], [1, 1.02, 0.82]);
    p.push(pintarPlano(anca, variar(PELAJE, r, 0.05)));
    // Patas finas y CONECTADAS: la caña nace DENTRO del muslo (solapadas),
    // nada de huesos partidos con tapa a la vista.
    for (const [px, pz, atras] of /** @type {[number, number, boolean][]} */ ([[0.21, 0.06, false], [0.21, -0.06, false], [-0.19, 0.07, true], [-0.19, -0.07, true]])) {
      const j = () => (r() - 0.5) * 0.012;
      const dx = px + j();
      const dz = pz + j();
      const muslo = new THREE.CylinderGeometry(0.046, 0.023, 0.22, 7, 1);
      poner(muslo, [dx, 0.26, dz], [0, 0, (atras ? -0.09 : 0.04) + j() * 3]);
      p.push(pintarPlano(muslo, variar(PELAJE, r, 0.06)));
      const bajaX = dx + (atras ? -0.021 : 0.009);
      const cana = new THREE.CylinderGeometry(0.02, 0.017, 0.17, 6, 1);
      poner(cana, [bajaX, 0.1, dz], [0, 0, j() * 2]);
      p.push(pintarPlano(cana, variar(PELAJE, r, 0.07)));
      const garra = new THREE.SphereGeometry(0.024, 7, 5);
      poner(garra, [bajaX + 0.012, 0.02, dz], [0, 0, 0], [1.3, 0.65, 1]);
      p.push(pintarPlano(garra, CREMA));
    }
    // La cola del criollo: ARCO carnoso enroscado sobre el lomo.
    const cola = new THREE.TorusGeometry(0.088, 0.024, 7, 12, Math.PI * 1.2);
    poner(cola, [-0.27, 0.47, 0.03], [0.35, 0.3, -0.6]);
    p.push(pintarPlano(cola, variar(PELAJE, r, 0.05)));
    // Cuello corto y macizo que sube al pivote.
    const cuello = new THREE.CylinderGeometry(0.06, 0.095, 0.17, 9, 2);
    apuntar(cuello, [0.28, 0.44, 0], [0.75, 0.65, 0], [1, 1, 0.82]);
    p.push(pintarPlano(cuello, PELAJE));

    const cuerpo = hornearPelaje(fusionarHato(p, 'perro'), {
      yBajo: 0.015, yAlto: 0.46, ao: 0.36, moteado: 0.07, semilla: seed,
    });

    // ── CABEZA (pivote: mira/ladea): cráneo redondo, hocico que AFINA, orejas
    //    de pétalo a media asta — perro criollo, no zorro de palo ──
    const c = [];
    const craneo = new THREE.SphereGeometry(0.088, 11, 9);
    poner(craneo, [0.02, 0.01, 0], [0, 0, -0.08], [1.15, 0.98, 0.86]);
    c.push(pintarPlano(craneo, PELAJE));
    // Hocico LARGO que afina — perro criollo, no osezno.
    const hocico = new THREE.SphereGeometry(0.05, 9, 7);
    poner(hocico, [0.14, -0.025, 0], [0, 0, -0.3], [1.7, 0.68, 0.66]);
    c.push(pintarPlano(hocico, variar(PELAJE, r, 0.08)));
    const nariz = new THREE.SphereGeometry(0.018, 6, 5);
    poner(nariz, [0.215, -0.012, 0]);
    c.push(pintarPlano(nariz, '#241d18'));
    for (const lado of [1, -1]) {
      // Orejas a media asta que CAEN a los lados (la punta quebrada del criollo).
      const oreja = orejaPetalo([0.0, 0.068, lado * 0.055], [-0.08, 0.28, lado * 0.95], 0.105, 0.06, 0.3);
      c.push(pintarPlano(oreja, variar('#8a5f33', r, 0.06)));
      const ojo = new THREE.SphereGeometry(0.014, 5, 4);
      poner(ojo, [0.085, 0.033, lado * 0.052]);
      c.push(pintarPlano(ojo, '#1f1a14'));
    }
    const cabeza = hornearPelaje(fusionarHato(c, 'cabeza-perro'), {
      yBajo: -0.1, yAlto: 0.1, ao: 0.25, moteado: 0.06, semilla: seed + 3,
    });

    return { cuerpo, cabeza, pivote: [0.38, 0.55, 0] };
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
 * Oveja criolla: vellón crema por MECHONES (matojos deformados con ruido — lana
 * de verdad, no una bola), cara y patas oscuras, copete. Mira a +X.
 * @returns {{cuerpo, cabeza, pivote}}
 */
export function geomOveja({ q = 1 } = {}, seed = 61) {
  return memo(`oveja|${q}|${seed}`, () => {
    const LANA = '#e9e4d6';
    const OSCURO = '#4a4038';
    const r = rng(seed);
    const p = [];

    // La masa del vellón: un loft rechoncho…
    const torso = cuerpoOrganico({
      largo: 0.62,
      nSeg: 12,
      nRad: 10,
      semilla: seed,
      ruido: 0.06,
      espina: (t) => 0.46 + 0.02 * campana(t, 0.3, 0.4),
      arriba: (t) => (0.19 + 0.02 * campana(t, 0.4, 0.5)) * remate(t, 0.45),
      abajo: (t) => (0.17 + 0.03 * campana(t, 0.5, 0.5)) * remate(t, 0.5),
      lado: (t) => 0.2 * remate(t, 0.5),
    });
    p.push(pintarPlano(torso, LANA));
    // …más MECHONES SUAVES que rompen la silueta (deterministas por seed).
    const nBorlas = Math.max(5, Math.round(9 * q));
    for (let i = 0; i < nBorlas; i++) {
      const ang = (i / nBorlas) * Math.PI * 2 + r() * 0.6;
      const borla = mechonLana(0.09 + r() * 0.05, seed + i * 3, 0.28);
      poner(borla, [
        Math.cos(ang) * (0.2 + r() * 0.08),
        0.5 + (r() - 0.4) * 0.14,
        Math.sin(ang) * (0.13 + r() * 0.05),
      ]);
      p.push(pintarPlano(borla, variar(LANA, r, 0.07)));
    }
    for (const [px, pz] of [[0.18, 0.09], [0.18, -0.09], [-0.18, 0.1], [-0.18, -0.1]]) {
      const j = (r() - 0.5) * 0.015;
      const pata = new THREE.CylinderGeometry(0.026, 0.028, 0.3, 6, 1);
      poner(pata, [px + j, 0.15, pz + j], [0, 0, j * 4]);
      p.push(pintarPlano(pata, OSCURO));
    }
    const colita = new THREE.ConeGeometry(0.042, 0.13, 6, 1);
    apuntar(colita, [-0.34, 0.44, 0], [-0.5, -1, 0]);
    p.push(pintarPlano(colita, variar(LANA, r, 0.06)));

    const cuerpo = hornearPelaje(fusionarHato(p, 'oveja'), {
      yBajo: 0.03, yAlto: 0.62, ao: 0.4, moteado: 0.08, semilla: seed,
    });

    const c = [];
    const cara = new THREE.SphereGeometry(0.088, 10, 8);
    poner(cara, [0.05, -0.01, 0], [0, 0, -0.15], [1.25, 1, 0.8]);
    c.push(pintarPlano(cara, OSCURO));
    const copete = mechonLana(0.06, seed + 7, 0.28);
    poner(copete, [0.0, 0.07, 0], [0, 0, 0], [1.15, 0.8, 1.05]);
    c.push(pintarPlano(copete, LANA));
    for (const lado of [1, -1]) {
      const oreja = orejaPetalo([0.02, 0.03, lado * 0.07], [0.12, -0.2, lado], 0.085, 0.05, 0.3);
      c.push(pintarPlano(oreja, variar(OSCURO, r, 0.08)));
      const ojo = new THREE.SphereGeometry(0.014, 5, 4);
      poner(ojo, [0.1, 0.025, lado * 0.058]);
      c.push(pintarPlano(ojo, '#171310'));
    }
    const cabeza = hornearPelaje(fusionarHato(c, 'cabeza-oveja'), {
      yBajo: -0.08, yAlto: 0.1, ao: 0.25, moteado: 0.06, semilla: seed + 3,
    });

    return { cuerpo, cabeza, pivote: [0.32, 0.5, 0] };
  });
}

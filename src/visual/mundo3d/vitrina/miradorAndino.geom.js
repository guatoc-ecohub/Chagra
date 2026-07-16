/*
 * miradorAndino.geom — el PAISAJE REALISTA de la Vitrina Maestra.
 *
 * REINVENCIÓN (feedback 2026-07-14: "está feíta, bien feíta"): la vitrina deja
 * de ser botones sobre un fondo plano y pasa a ser un MIRADOR ANDINO a la hora
 * dorada. Registro visual: los MUNDOS van realistas (los personajes rubber-hose
 * viven en el chrome DOM, no aquí). Este módulo aplica el DR
 * realismo-3d-vegetacion (2026-06-19) al paisaje:
 *
 *   · Cielo = DOMO con gradiente vertical horneado en vertexColors (no un color
 *     plano de fondo): horizonte ámbar → cénit azul desaturado.
 *   · Cordilleras = CRESTAS de ruido fractal (bandas cilíndricas desplazadas),
 *     tres planos de profundidad con perspectiva atmosférica horneada y nieve
 *     en la capa lejana (el guiño a la Sierra). Nada de esferas-loma.
 *   · Terreno = plano CONTINUO ondulado por fbm con variación de color por
 *     vértice (pasto seco/húmedo, tierra pisada en la plaza y el sendero).
 *     El ojo caza el patrón plano al instante (DR §1): se rompe con ruido.
 *   · Portales = arcos de PIEDRA SECA campesina: bloques individuales con
 *     jitter determinista de escala/rotación, variación de color por bloque,
 *     AO radial horneado (la cara interior del arco, más oscura) y musgo en
 *     las juntas altas. Lenguaje de camino real, no aro de parque temático.
 *
 * TÉCNICA tier-safe: todo se FUSIONA en pocas geometrías con color horneado
 * (vertexColors) → una draw-call por pieza. Cero assets externos. Corre
 * headless (three core + merge puro): testeable en vitest sin WebGL.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO al mezclar geometrías indexadas
 * con no-indexadas (Icosahedron/Dodecahedron NO traen índice; Cone/Box/Cylinder
 * sí). Ya mordió tres veces. Aquí `fusionar()` DESINDEXA todas las partes antes
 * de fusionar y TRUENA si el resultado es null.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  Paleta del mirador (hora dorada andina)                                    */
/* -------------------------------------------------------------------------- */

export const PALM = {
  // Cielo (gradiente del domo)
  cieloCenit: '#8aa7c4', // azul desaturado de tarde
  cieloMedio: '#cbd3cd',
  cieloHorizonte: '#f0cf92', // ámbar de hora dorada
  neblina: '#ddc9a2', // color de la niebla de distancia (fog)

  // Cordilleras (perspectiva atmosférica: cerca oscuro → lejos pálido)
  cordCerca: '#49573f',
  cordMedia: '#5f6a63',
  cordLejos: '#8a94a4',
  nieve: '#f2f1e8',

  // Terreno
  pastoBase: '#5d7241',
  pastoSeco: '#8a9155',
  pastoHumedo: '#465f35',
  tierraPisada: '#9a8054',
  tierraHumeda: '#6b5638',

  // Agua (río andino: turbio-verdoso, nunca azul piscina)
  agua: '#6f96a0',
  aguaHonda: '#3d5c66',
  espuma: '#dbe8e2',

  // Piedra del arco
  piedra: '#8c8579',
  piedraClara: '#a29a8a',
  piedraOscura: '#6e685e',
  musgoPiedra: '#5c6a3c',
  liquen: '#9aa86a',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades (fusión segura + horneado de color)                             */
/* -------------------------------------------------------------------------- */

/**
 * Fusiona partes en UNA geometría. DESINDEXA todo antes (icosaedros y
 * dodecaedros vienen sin índice; cilindros y conos con él — mezclarlos
 * devuelve null EN SILENCIO). Si aun así falla, TRUENA: mejor un error de
 * build que una especie invisible en producción.
 * @param {THREE.BufferGeometry[]} partes
 * @param {string} quien — etiqueta para el error
 * @returns {THREE.BufferGeometry}
 */
export function fusionar(partes, quien = 'miradorAndino') {
  const buenas = partes
    .filter(Boolean)
    .map((p) => {
      const plana = p.index ? p.toNonIndexed() : p;
      if (plana !== p) p.dispose();
      // Sin texturas no hay uv: descartarlo uniforma los atributos (una parte
      // CON uv y otra SIN uv también producen el null silencioso).
      plana.deleteAttribute('uv');
      plana.deleteAttribute('uv1');
      plana.deleteAttribute('uv2');
      return plana;
    });
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error(
      `${quien}: mergeGeometries devolvió null — atributos incompatibles entre partes`,
    );
  }
  buenas.forEach((p) => p.dispose());
  return g;
}

/**
 * Hornea un color plano en todos los vértices (atributo `color`).
 * @param {THREE.BufferGeometry} geo
 * @param {THREE.Color|string} color
 */
export function pintar(geo, color) {
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

/**
 * Hornea color POR VÉRTICE con una función (x,y,z,i) → THREE.Color.
 * La base del sombreado sin texturas del DR: gradientes de altura, AO fingido
 * y parches de ruido viven aquí.
 * @param {THREE.BufferGeometry} geo
 * @param {(x:number,y:number,z:number,i:number) => THREE.Color} fn
 */
export function pintarPorVertice(geo, fn) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i);
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/**
 * Coloca una geometría (posición/rotación/escala aplicadas a los vértices).
 * @param {THREE.BufferGeometry} geo
 * @param {[number,number,number]} [pos]
 * @param {[number,number,number]} [rot]
 * @param {[number,number,number]} [scale]
 */
export function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Variación determinista de un color base (bosque no plano — DR §2). */
export function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* Ruido de valor 1D/2D determinista y barato (sin libs): interpola hashes. */
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Ruido de valor 1D suavizado en [0,1]. */
export function ruido1D(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i + seed * 57.31) * (1 - u) + hash1(i + 1 + seed * 57.31) * u;
}

/** fbm 1D: 3 octavas de ruido de valor, [0,1]. */
export function fbm1D(x, seed = 0) {
  return (
    ruido1D(x, seed) * 0.55 +
    ruido1D(x * 2.13, seed + 7) * 0.3 +
    ruido1D(x * 4.7, seed + 13) * 0.15
  );
}

/** Ruido de valor 2D suavizado en [0,1]. */
export function ruido2D(x, z, seed = 0) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const h = (a, b) => hash1(a * 157.7 + b * 311.3 + seed * 53.7);
  const a = h(xi, zi) * (1 - u) + h(xi + 1, zi) * u;
  const b = h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u;
  return a * (1 - v) + b * v;
}

/** fbm 2D: 3 octavas, [0,1]. */
export function fbm2D(x, z, seed = 0) {
  return (
    ruido2D(x, z, seed) * 0.55 +
    ruido2D(x * 2.17, z * 2.17, seed + 5) * 0.3 +
    ruido2D(x * 4.9, z * 4.9, seed + 11) * 0.15
  );
}

/* -------------------------------------------------------------------------- */
/*  CIELO — domo con gradiente vertical horneado                               */
/* -------------------------------------------------------------------------- */

/*
 * Media esfera vista desde adentro. El gradiente horneado (horizonte cálido →
 * cénit azul) reemplaza el `<color attach="background">` plano: la mitad del
 * encuadre es cielo, y un cielo con gradiente es el salto de realismo más
 * barato que existe (1 draw-call, MeshBasic, sin luz ni fog).
 */
export function geomCieloDomo(radio = 60) {
  const geo = new THREE.SphereGeometry(radio, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const cenit = new THREE.Color(PALM.cieloCenit);
  const medio = new THREE.Color(PALM.cieloMedio);
  const horiz = new THREE.Color(PALM.cieloHorizonte);
  pintarPorVertice(geo, (x, y) => {
    const t = THREE.MathUtils.clamp(y / (radio * 0.85), 0, 1);
    const c = new THREE.Color();
    if (t < 0.28) c.lerpColors(horiz, medio, t / 0.28);
    else c.lerpColors(medio, cenit, (t - 0.28) / 0.72);
    return c;
  });
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  CORDILLERAS — crestas fractales con perspectiva atmosférica                */
/* -------------------------------------------------------------------------- */

/**
 * Una banda de cordillera: franja cilíndrica alrededor de la escena cuya
 * arista superior sigue un perfil fbm (picos y portezuelos reales, no lomas
 * de esfera). Color horneado por capa: cuanto más lejos, más se funde con el
 * cielo (perspectiva atmosférica); la capa lejana lleva nieve en las cumbres.
 * Las TRES capas se fusionan en UNA geometría → 1 draw-call.
 */
export function geomCordilleras(seed = 21) {
  const capas = [
    { radio: 22, base: PALM.cordCerca, hMin: 2.2, hMax: 6.0, haz: 0.12, nieve: false, freq: 1.35 },
    { radio: 32, base: PALM.cordMedia, hMin: 4.0, hMax: 9.5, haz: 0.34, nieve: false, freq: 1.0 },
    { radio: 44, base: PALM.cordLejos, hMin: 6.5, hMax: 14.5, haz: 0.52, nieve: true, freq: 0.75 },
  ];
  // La recesión atmosférica va hacia el AZUL-GRIS de la bruma de distancia;
  // solo el pie de monte se funde al ámbar del horizonte (lerp abajo).
  const bruma = new THREE.Color('#b3c0cc');
  const cielo = new THREE.Color(PALM.cieloHorizonte);
  const nieve = new THREE.Color(PALM.nieve);
  const partes = capas.map((capa, ci) => {
    const N = 96;
    // Solo el arco que la cámara ve (la cámara vive en z≈+13 mirando a -z):
    // θ ∈ [-140°, 140°] alrededor de -z. Cerrar el círculo detrás de la cámara
    // desperdiciaría vértices que jamás entran al encuadre.
    const a0 = -Math.PI * 0.78;
    const a1 = Math.PI * 0.78;
    const posiciones = [];
    const colores = [];
    const base = new THREE.Color(capa.base).lerp(bruma, capa.haz);
    const sombraLadera = base.clone().multiplyScalar(0.82);
    for (let i = 0; i < N; i++) {
      const t0 = i / N;
      const t1 = (i + 1) / N;
      const perfil = (t) => {
        const h = fbm1D(t * 14 * capa.freq, seed + ci * 31);
        // picos más marcados: eleva el contraste del fbm
        const k = Math.pow(h, 1.4);
        return capa.hMin + k * (capa.hMax - capa.hMin);
      };
      const punto = (t, y) => {
        const a = a0 + (a1 - a0) * t;
        return [Math.sin(a) * capa.radio, y, -Math.cos(a) * capa.radio];
      };
      const h0 = perfil(t0);
      const h1 = perfil(t1);
      const p00 = punto(t0, -1.5);
      const p01 = punto(t0, h0);
      const p10 = punto(t1, -1.5);
      const p11 = punto(t1, h1);
      // dos triángulos por segmento
      posiciones.push(...p00, ...p10, ...p01, ...p01, ...p10, ...p11);
      // color por vértice: base abajo (fundida a bruma), ladera con leve
      // variación, nieve encima del umbral en la capa lejana
      const colorEn = (y, t) => {
        const c = base.clone();
        // laderas: variación sutil por segmento (rompe lo plano)
        c.lerp(sombraLadera, ruido1D(t * 23, seed + 77) * 0.5);
        // pie de monte fundido a la bruma del horizonte
        const pie = THREE.MathUtils.clamp(1 - y / 3.2, 0, 1);
        c.lerp(cielo, pie * 0.55);
        if (capa.nieve && y > capa.hMax * 0.58) {
          const s = THREE.MathUtils.clamp((y - capa.hMax * 0.58) / (capa.hMax * 0.16), 0, 1);
          c.lerp(nieve, s * 0.95);
        }
        return c;
      };
      const cs = [colorEn(-1.5, t0), colorEn(-1.5, t1), colorEn(h0, t0), colorEn(h0, t0), colorEn(-1.5, t1), colorEn(h1, t1)];
      cs.forEach((c) => colores.push(c.r, c.g, c.b));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posiciones), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colores), 3));
    g.computeVertexNormals();
    return g;
  });
  return fusionar(partes, 'geomCordilleras');
}

/* -------------------------------------------------------------------------- */
/*  TERRENO — pradera continua ondulada con color por vértice                  */
/* -------------------------------------------------------------------------- */

/*
 * El claro del mirador: un plano desplazado por fbm — casi llano en la plaza
 * de los portales, ondulado afuera y trepando hacia el pie de las cordilleras.
 * El color por vértice rompe el "verde plano de cancha": parches secos y
 * húmedos por ruido, tierra pisada en la plaza y el sendero de entrada, y
 * orillas húmedas donde corre la quebrada.
 */
/**
 * Altura del terreno en (x,z) — la MISMA fórmula que hornea geomTerreno, para
 * que árboles, lomitas y umbrales se siembren A NIVEL (nada flotando).
 * @param {number} x
 * @param {number} z
 * @param {number} [seed]
 */
export function alturaTerreno(x, z, seed = 33) {
  const r = Math.hypot(x, z);
  const onda = (fbm2D(x * 0.09, z * 0.09, seed) - 0.5) * 2; // [-1,1]
  const plaza = THREE.MathUtils.smoothstep(r, 9, 17); // 0 adentro → 1 afuera
  const falda = THREE.MathUtils.smoothstep(r, 18, 30); // trepa al pie del monte
  return onda * (0.05 + plaza * 0.6) + falda * 2.2 + onda * falda * 0.8;
}

export function geomTerreno({ segmentos = 56 } = {}, seed = 33) {
  const L = 64;
  const geo = new THREE.PlaneGeometry(L, L, segmentos, segmentos);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;

  const pastoBase = new THREE.Color(PALM.pastoBase);
  const pastoSeco = new THREE.Color(PALM.pastoSeco);
  const pastoHumedo = new THREE.Color(PALM.pastoHumedo);
  const tierra = new THREE.Color(PALM.tierraPisada);
  const tierraHumeda = new THREE.Color(PALM.tierraHumeda);

  // 1) Desplazamiento: plaza llana (r<11), ondulación creciente afuera.
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, alturaTerreno(pos.getX(i), pos.getZ(i), seed));
  }
  geo.computeVertexNormals();

  // 2) Color por vértice: parches + plaza y sendero de tierra + orilla húmeda.
  pintarPorVertice(geo, (x, y, z) => {
    const c = pastoBase.clone();
    // parches secos / húmedos por ruido (dos escalas)
    const seco = fbm2D(x * 0.16 + 40, z * 0.16, seed + 3);
    const humedo = fbm2D(x * 0.07 - 21, z * 0.07 + 13, seed + 9);
    c.lerp(pastoSeco, THREE.MathUtils.smoothstep(seco, 0.55, 0.85) * 0.7);
    c.lerp(pastoHumedo, THREE.MathUtils.smoothstep(humedo, 0.58, 0.85) * 0.6);
    // la plaza de los portales: pasto pisado que abre a tierra
    const r = Math.hypot(x, z);
    const pisada = 1 - THREE.MathUtils.smoothstep(r, 4.5, 9.5);
    c.lerp(tierra, pisada * 0.45);
    // el sendero de entrada (viene de la cámara, x≈0, z>0), con borde ruidoso
    const borde = (fbm1D(z * 0.7, seed + 17) - 0.5) * 1.1;
    const dx = Math.abs(x - borde);
    if (z > 2 && z < 20) {
      const sendero = 1 - THREE.MathUtils.smoothstep(dx, 0.7, 1.7);
      c.lerp(tierra, sendero * 0.55);
    }
    // orilla húmeda de la quebrada (cauce aproximado: diagonal x≈2.2−0.28·z)
    const dQ = Math.abs(x - (2.2 - z * 0.28));
    if (z > -12 && z < 14) {
      const orilla = 1 - THREE.MathUtils.smoothstep(dQ, 0.8, 2.4);
      c.lerp(tierraHumeda, orilla * 0.35);
    }
    // leve gradiente de altura (lo alto, más dorado por el sol rasante)
    c.lerp(pastoSeco, THREE.MathUtils.clamp(y * 0.16, 0, 0.35));
    return c;
  });
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  QUEBRADA — cinta de agua que baja al reflejo del cielo                     */
/* -------------------------------------------------------------------------- */

/** El cauce de la quebrada como puntos [x,z] (de lejos-atrás a cerca-frente). */
export const CAUCE_QUEBRADA = [
  [-1.4, -13.5],
  [0.2, -9.5],
  [1.0, -5.5],
  [1.6, -1.5],
  [2.0, 2.5],
  [2.6, 6.5],
  [3.4, 10.5],
];

/*
 * Cinta de agua siguiendo el cauce, con color horneado: centro hondo oscuro,
 * orillas claras (el reflejo rasante del cielo) y motas de espuma junto a las
 * piedras. Una geometría; los destellos animados van aparte (points).
 */
export function geomQuebrada(seed = 55) {
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  const honda = new THREE.Color(PALM.aguaHonda);
  const clara = new THREE.Color(PALM.agua);
  const cieloRef = new THREE.Color(PALM.cieloHorizonte);

  const ancho = 0.68;
  for (let s = 0; s < CAUCE_QUEBRADA.length - 1; s++) {
    const [x0, z0] = CAUCE_QUEBRADA[s];
    const [x1, z1] = CAUCE_QUEBRADA[s + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const largo = Math.hypot(dx, dz) + 0.5;
    const rotY = Math.atan2(dx, dz);
    const g = new THREE.PlaneGeometry(ancho, largo, 4, 6);
    g.rotateX(-Math.PI / 2);
    // color: centro hondo → orilla clara con destello de cielo
    pintarPorVertice(g, (x, _y, z) => {
      const t = Math.abs(x) / (ancho / 2);
      const c = honda.clone().lerp(clara, Math.pow(t, 1.5));
      c.lerp(cieloRef, Math.max(0, t - 0.8) * 0.5);
      // chispas de corriente horneadas (varían a lo largo)
      const chispa = ruido2D(x * 6 + 9, z * 2.2, seed + s);
      if (chispa > 0.9) c.lerp(new THREE.Color(PALM.espuma), 0.4);
      return c;
    });
    poner(g, [(x0 + x1) / 2, 0.035, (z0 + z1) / 2], [0, rotY, 0]);
    partes.push(g);
  }
  return fusionar(partes, 'geomQuebrada');
}

/** Piedras de orilla a lo largo del cauce (fusionadas, color variado). */
export function geomPiedrasQuebrada(seed = 66) {
  const r = rng(seed);
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  for (let s = 0; s < CAUCE_QUEBRADA.length - 1; s++) {
    const [x0, z0] = CAUCE_QUEBRADA[s];
    const n = 2 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const lado = r() > 0.5 ? 1 : -1;
      const p = new THREE.DodecahedronGeometry(0.1 + r() * 0.14, 0);
      poner(
        p,
        [x0 + lado * (0.55 + r() * 0.5), 0.03 + r() * 0.04, z0 + r() * 2.4],
        [r() * 0.6, r() * Math.PI, r() * 0.5],
        [1, 0.65 + r() * 0.3, 1],
      );
      pintar(p, variar(PALM.piedra, r, 0.12));
      partes.push(p);
    }
  }
  return fusionar(partes, 'geomPiedrasQuebrada');
}

/* -------------------------------------------------------------------------- */
/*  ARCO DE PIEDRA SECA — el portal campesino                                  */
/* -------------------------------------------------------------------------- */

/*
 * Arco de mampostería de piedra seca (lenguaje de camino real): dovelas
 * individuales con jitter determinista de tamaño/giro, jambas más gordas en la
 * base, color de piedra variado por bloque, AO radial horneado (la cara que
 * mira a la boca del arco queda en sombra) y musgo/líquen en las juntas altas.
 * UNA geometría → un InstancedMesh la repite en los 12 portales.
 */
export function geomArcoPiedra({ q = 1 } = {}, seed = 88) {
  const r = rng(seed);
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  const R = 0.98; // radio del anillo de dovelas
  const nBloques = Math.max(10, Math.round(15 * q));
  // El arco abre abajo (el umbral es el suelo): θ recorre -122°..122° desde
  // el cénit del aro.
  const a0 = THREE.MathUtils.degToRad(-122);
  const a1 = THREE.MathUtils.degToRad(122);

  const piedras = [PALM.piedra, PALM.piedraClara, PALM.piedraOscura];
  for (let i = 0; i < nBloques; i++) {
    const t = i / (nBloques - 1);
    const a = a0 + (a1 - a0) * t;
    const esClave = Math.abs(a) < 0.14; // la dovela clave, arriba
    const esJamba = t < 0.09 || t > 0.91; // las jambas de la base
    const ancho = (esClave ? 0.4 : esJamba ? 0.42 : 0.33) * (0.92 + r() * 0.16);
    const alto = (esJamba ? 0.34 : 0.26) * (0.9 + r() * 0.2);
    const fondo = 0.34 * (0.9 + r() * 0.2);
    const bloque = new THREE.BoxGeometry(ancho, alto, fondo);
    // orientar la dovela tangente al aro + jitter de giro
    const x = Math.sin(a) * R;
    const y = Math.cos(a) * R;
    poner(
      bloque,
      [x + (r() - 0.5) * 0.03, y + (r() - 0.5) * 0.03, (r() - 0.5) * 0.04],
      [(r() - 0.5) * 0.08, (r() - 0.5) * 0.08, -a + (r() - 0.5) * 0.07],
    );
    // color por bloque + AO radial horneado: los vértices que miran a la boca
    // (radio menor) se oscurecen — la sombra de la garganta sin costo.
    const base = variar(piedras[Math.floor(r() * piedras.length)], r, 0.09);
    const conLiquen = r() > 0.72;
    const liquen = new THREE.Color(PALM.liquen);
    pintarPorVertice(bloque, (vx, vy) => {
      const rad = Math.hypot(vx, vy);
      const ao = THREE.MathUtils.clamp((rad - (R - 0.22)) / 0.42, 0, 1); // 0 = cara interior
      const c = base.clone().multiplyScalar(0.74 + ao * 0.3);
      if (conLiquen) {
        const mancha = ruido2D(vx * 9, vy * 9, seed + i);
        if (mancha > 0.78) c.lerp(liquen, 0.5);
      }
      return c;
    });
    partes.push(bloque);
  }

  // Musgo en las juntas altas (el páramo se trepa a la piedra).
  const nMusgo = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nMusgo; i++) {
    const a = (r() - 0.5) * 1.6;
    const m = new THREE.IcosahedronGeometry(0.05 + r() * 0.035, 0);
    poner(m, [Math.sin(a) * (R + 0.12), Math.cos(a) * (R + 0.12), (r() - 0.5) * 0.18], [0, 0, 0], [1, 0.6, 1]);
    pintar(m, variar(PALM.musgoPiedra, r, 0.15));
    partes.push(m);
  }

  // Umbral: laja de piso + dos piedras de pie de jamba.
  const laja = new THREE.BoxGeometry(2.3, 0.09, 0.9);
  poner(laja, [0, -R - 0.16, 0.18], [0, 0, (r() - 0.5) * 0.02]);
  pintarPorVertice(laja, (vx) => variar(PALM.piedraOscura, r, 0.05).multiplyScalar(0.9 + Math.abs(vx) * 0.06));
  partes.push(laja);
  for (const lado of [-1, 1]) {
    const pie = new THREE.DodecahedronGeometry(0.16, 0);
    poner(pie, [lado * (R + 0.18), -R + 0.02, 0.22], [r(), r(), 0], [1, 0.7, 1]);
    pintar(pie, variar(PALM.piedra, r, 0.1));
    partes.push(pie);
  }

  return fusionar(partes, 'geomArcoPiedra');
}

/* -------------------------------------------------------------------------- */
/*  LAJAS DEL SENDERO — piedras pisables hacia la plaza                        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  LOMITAS — los asientos de pasto de la fila de atrás                        */
/* -------------------------------------------------------------------------- */

/**
 * Lomas suaves de pasto donde se asienta la terraza de atrás, con la misma
 * variación de color del terreno (nunca un verde plano). UNA geometría.
 * @param {Array<[number,number,number]>} centros — [x, y, z] del centro de cada loma
 * @param {number} seed
 */
export function geomLomitas(centros, seed = 44) {
  const pastoBase = new THREE.Color(PALM.pastoBase);
  const pastoSeco = new THREE.Color(PALM.pastoSeco);
  const pastoHumedo = new THREE.Color(PALM.pastoHumedo);
  const partes = centros.map(([cx, cy, cz], i) => {
    const g = new THREE.SphereGeometry(1.7, 14, 10);
    // ondular apenas el perfil para que no se lea "esfera"
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const n = 1 + (ruido2D(pos.getX(v) * 1.7 + i * 9, pos.getZ(v) * 1.7, seed) - 0.5) * 0.22;
      pos.setXYZ(v, pos.getX(v) * n, pos.getY(v), pos.getZ(v) * n);
    }
    pintarPorVertice(g, (x, y, z) => {
      const c = pastoBase.clone();
      c.lerp(pastoSeco, ruido2D(x * 3 + i * 7, z * 3, seed + 5) * 0.55 + Math.max(0, y) * 0.14);
      c.lerp(pastoHumedo, ruido2D(x * 1.3 - 4, z * 1.3 + i, seed + 11) * 0.4);
      return c;
    });
    poner(g, [cx, cy, cz], [0, 0, 0], [1.3, 0.75, 1.15]);
    return g;
  });
  return fusionar(partes, 'geomLomitas');
}

/* -------------------------------------------------------------------------- */
/*  BANCALES — los andenes de cultivo donde se asientan los pisos térmicos     */
/* -------------------------------------------------------------------------- */

/**
 * Terrazas de cultivo (andenes campesinos) que suben la montaña del mirador:
 * cada fila de portales se asienta en su bancal. Cada bancal es una MESETA
 * anular (el piso del andén, pasto con parches y cota apenas ondulada) más su
 * TALUD al frente (el muro de tierra viva, oscuro al pie — AO horneado, con
 * el pasto descolgándose por el borde). UNA geometría para todos.
 *
 * El talud se construye como arco de cilindro centrado en −z (donde vive la
 * montaña). Sus normales nacen apuntando AFUERA del eje (lejos de la cámara):
 * se espeja en X para voltear el winding (el arco es simétrico: la forma no
 * cambia) y se niegan las normales a mano — la cara que la cámara ve queda
 * front-face y con luz correcta.
 *
 * @param {Array<{radio:number, altura:number, caida:number, arco:number}>} filas
 *   radio: radio medio del andén · altura: cota del piso · caida: alto del
 *   talud (que se hunde en el andén de abajo) · arco: medio-ángulo (grados)
 *   del abanico, medido desde −z.
 * @param {number} seed
 */
export function geomBancales(filas, seed = 77) {
  const pastoBase = new THREE.Color(PALM.pastoBase);
  const pastoSeco = new THREE.Color(PALM.pastoSeco);
  const pastoHumedo = new THREE.Color(PALM.pastoHumedo);
  const tierra = new THREE.Color(PALM.tierraHumeda);
  const tierraClara = new THREE.Color(PALM.tierraPisada);
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  filas.forEach((f, fi) => {
    const A = THREE.MathUtils.degToRad(f.arco);
    const rIn = f.radio - 1.9;
    const rOut = f.radio + 1.8;

    // La meseta: anillo en XY (θ=π/2−A..π/2+A cae en −z tras acostarlo) con la
    // cota ondulada en z ANTES de rotar (z pre-rotación = altura post-rotación).
    const meseta = new THREE.RingGeometry(rIn, rOut, 36, 3, Math.PI / 2 - A, A * 2);
    const posM = meseta.attributes.position;
    for (let v = 0; v < posM.count; v++) {
      posM.setZ(v, (ruido2D(posM.getX(v) * 0.6 + fi * 11, posM.getY(v) * 0.6, seed) - 0.5) * 0.18);
    }
    pintarPorVertice(meseta, (x, y) => {
      const c = pastoBase.clone();
      c.lerp(pastoSeco, ruido2D(x * 2.1 + fi * 13, y * 2.1, seed + 3) * 0.5);
      c.lerp(pastoHumedo, ruido2D(x * 0.9 - 7, y * 0.9 + fi, seed + 9) * 0.4);
      return c;
    });
    poner(meseta, [0, f.altura, 0], [-Math.PI / 2, 0, 0]);
    partes.push(meseta);

    // El talud: arco de cilindro (θ=π−A..π+A ⇒ centrado en −z), pie más ancho.
    const talud = new THREE.CylinderGeometry(
      rIn + 0.02,
      rIn + 0.6,
      f.caida,
      36,
      3,
      true,
      Math.PI - A,
      A * 2,
    );
    pintarPorVertice(talud, (x, y, z) => {
      const t = THREE.MathUtils.clamp(y / f.caida + 0.5, 0, 1); // 1 = borde alto
      /* el talud vive EN PASTO (talud campesino), la tierra asoma por parches
         y hacia el pie — nunca un muro oscuro */
      const c = pastoBase.clone().lerp(pastoSeco, ruido2D(x * 2.3, y * 2.3 + fi * 7, seed + 13) * 0.5);
      c.lerp(tierra.clone().lerp(tierraClara, ruido2D(x * 1.7, z * 1.7 + fi * 5, seed + 21) * 0.6), 0.55 - t * 0.35);
      c.multiplyScalar(0.88 + t * 0.18); // sombra suave hacia el pie
      return c;
    });
    // espejo en X (winding volteado, forma intacta) + normales negadas: la
    // cara visible desde la cámara queda front-face con luz correcta.
    talud.scale(-1, 1, 1);
    const nrm = talud.attributes.normal;
    for (let v = 0; v < nrm.count; v++) {
      nrm.setXYZ(v, -nrm.getX(v), -nrm.getY(v), -nrm.getZ(v));
    }
    poner(talud, [0, f.altura - f.caida / 2, 0]);
    partes.push(talud);
  });
  return fusionar(partes, 'geomBancales');
}

export function geomLajasSendero(seed = 99) {
  const r = rng(seed);
  /** @type {THREE.BufferGeometry[]} */
  const partes = [];
  for (let i = 0; i < 9; i++) {
    const z = 11.5 - i * 1.15;
    const x = (fbm1D(z * 0.7, seed + 17) - 0.5) * 1.1 + (r() - 0.5) * 0.4;
    const laja = new THREE.CylinderGeometry(0.32 + r() * 0.16, 0.36 + r() * 0.16, 0.05, 7);
    poner(laja, [x, 0.03, z], [0, r() * Math.PI, 0], [1, 1, 0.8 + r() * 0.3]);
    pintar(laja, variar(PALM.piedraClara, r, 0.1));
    partes.push(laja);
  }
  return fusionar(partes, 'geomLajasSendero');
}

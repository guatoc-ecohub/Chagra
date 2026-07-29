/*
 * sueloRico.geom — el SUELO de calibre Switch, reutilizable por toda escena 3D.
 *
 * Encargo del operador (2026-07-16): que el piso de las escenas deje de ser un
 * círculo Lambert plano y se lea como terreno de un juego de consola del más
 * alto calibre — superando al valle. Este módulo es el SISTEMA:
 *
 *   · RELIEVE: heightfield por fbm de 4 octavas (ruido de valor con giro entre
 *     octavas — mata los artefactos alineados al eje) + warp de dominio suave.
 *     Lomos y hondonadas reales, microrelieve al ras y falda que trepa al
 *     horizonte. El claro central queda LLANO para el héroe de la escena.
 *   · SENDERO: una polilínea serpentea el terreno; el relieve se RECORTA hacia
 *     la cota del camino (corte-y-relleno campesino: el trillo se lee pisado,
 *     no pintado) y el color abre a tierra con borde ruidoso y orilla húmeda.
 *   · COLOR POR ZONA (vertexColors, cero texturas): musgo/pasto base, hondonada
 *     húmeda y oscura, lomo seco pajizo, ROCA que asoma en la pendiente fuerte,
 *     parches de hojarasca, y AO fingido por concavidad (el laplaciano de la
 *     altura oscurece los hoyos — la luz no entra a las hondonadas).
 *   · DETALLE CERCANO: piedras medio enterradas, matas de paja, raíces asomando
 *     y florecitas — arquetipos fusionados (1 draw-call por tipo vía instancias)
 *     con AO horneado en la base, distribuidos POR el relieve (nada flota).
 *
 * Contrato de reuso: `crearSueloRico(opts)` devuelve { alturaDe, pendienteDe,
 * … }; la escena reparte ese `alturaDe` a TODO lo que siembre (flora, fauna,
 * sombras de contacto) — el mismo contrato que el valle usa con sus landmarks.
 *
 * Corre headless (three core + merge puro): testeable en vitest sin WebGL.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO al mezclar indexadas con
 * no-indexadas. `fusionar()` desindexa TODO y truena si el merge falla.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  Paleta del suelo de páramo (la escena puede traer la suya)                 */
/* -------------------------------------------------------------------------- */

export const PALETA_PARAMO = {
  base: '#5f6d43', // pasto-musgo del claro
  pastoVivo: '#66784a',
  humedo: '#44583a', // hondonadas: verde hondo y mojado (rico, no negro)
  seco: '#99905a', // lomos: paja dorada batida por el viento
  hojarasca: '#7c6743', // manto de hojas caídas bajo los árboles
  tierraSenda: '#9b8154', // el trillo pisado
  tierraHumeda: '#63523a', // orilla del sendero y barro
  roca: '#867e6d', // el afloramiento en la pendiente (piedra cálida de páramo)
  rocaClara: '#a89d85',
  liquen: '#9aa86a',
  raiz: '#6b5138',
  paja: '#9a8d56',
  pajaVerde: '#75824c',
  flor: '#e8e3c9', // florecita de páramo (blanco hueso)
  florMiel: '#d9b45a',
};

/* -------------------------------------------------------------------------- */
/*  Ruido: valor 2D con suavizado quíntico, fbm con giro entre octavas         */
/* -------------------------------------------------------------------------- */

function hash2(x, z, seed) {
  const s = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Ruido de valor 2D en [0,1], suavizado quíntico (normales sin quiebres). */
export function ruidoValor2D(x, z, seed = 0) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  // quíntico: 6t⁵−15t⁴+10t³ (derivada continua → computeVertexNormals suave)
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
  const v = zf * zf * zf * (zf * (zf * 6 - 15) + 10);
  const a = hash2(xi, zi, seed) * (1 - u) + hash2(xi + 1, zi, seed) * u;
  const b = hash2(xi, zi + 1, seed) * (1 - u) + hash2(xi + 1, zi + 1, seed) * u;
  return a * (1 - v) + b * v;
}

/* Giro fijo entre octavas (~37°): rompe la retícula del ruido de valor. */
const GIRO_C = Math.cos(0.65);
const GIRO_S = Math.sin(0.65);

/**
 * fbm de 4 octavas en [0,1] con rotación del dominio entre octavas.
 * @param {number} x
 * @param {number} z
 * @param {number} [seed]
 * @param {number} [octavas]
 */
export function fbmSuelo(x, z, seed = 0, octavas = 4) {
  let amp = 0.5;
  let suma = 0;
  let norm = 0;
  let px = x;
  let pz = z;
  for (let o = 0; o < octavas; o++) {
    suma += ruidoValor2D(px, pz, seed + o * 13) * amp;
    norm += amp;
    const nx = px * GIRO_C - pz * GIRO_S;
    pz = (px * GIRO_S + pz * GIRO_C) * 2.07;
    px = nx * 2.07;
    amp *= 0.5;
  }
  return suma / norm;
}

/* -------------------------------------------------------------------------- */
/*  Fusión segura + horneado (mismas garantías que miradorAndino)              */
/* -------------------------------------------------------------------------- */

/**
 * Fusiona partes en UNA geometría: desindexa todo, borra uv y TRUENA si
 * mergeGeometries devuelve null (mejor error de build que suelo invisible).
 * @param {THREE.BufferGeometry[]} partes
 * @param {string} quien
 */
export function fusionar(partes, quien = 'sueloRico') {
  const buenas = partes.filter(Boolean).map((p) => {
    const plana = p.index ? p.toNonIndexed() : p;
    if (plana !== p) p.dispose();
    plana.deleteAttribute('uv');
    plana.deleteAttribute('uv1');
    plana.deleteAttribute('uv2');
    return plana;
  });
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error(`${quien}: mergeGeometries devolvió null — atributos incompatibles`);
  }
  buenas.forEach((p) => p.dispose());
  return g;
}

/**
 * Hornea color POR VÉRTICE con (x,y,z,i) → THREE.Color.
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

/** Coloca una geometría (matriz aplicada a los vértices). */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  EL SUELO — factoría: relieve + sendero como funciones puras                */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} OpcionesSuelo
 * @property {number} [tam] — lado del terreno (unidades de mundo)
 * @property {number} [seed]
 * @property {number} [amplitud] — alto de los lomos grandes
 * @property {number} [micro] — alto del microrelieve al ras
 * @property {{radio:number, transicion:number}|null} [claro] — zona llana central (cota 0) para el héroe
 * @property {{inicio:number, fin:number, altura:number}|null} [falda] — el terreno trepa hacia el borde
 * @property {{puntos:Array<[number,number]>, ancho:number}|null} [sendero] — trillo [x,z] que corta el relieve
 * @property {Record<string,string>} [paleta]
 */

/**
 * @typedef {Object} SueloRico
 * @property {(x:number, z:number) => number} alturaDe — cota del terreno (con sendero recortado)
 * @property {(x:number, z:number) => number} pendienteDe — 0 llano … ~1 vertical
 * @property {(x:number, z:number) => {d:number, y:number}} senderoCerca — distancia al trillo y cota del trillo
 * @property {Required<OpcionesSuelo>} opts
 */

/**
 * Crea el suelo: devuelve las FUNCIONES (alturaDe/pendienteDe) que la escena
 * reparte a todo lo que siembre, y que geomSueloRico hornea en la malla.
 * @param {OpcionesSuelo} [opciones]
 * @returns {SueloRico}
 */
export function crearSueloRico(opciones = {}) {
  const opts = {
    tam: 64,
    seed: 31,
    amplitud: 1.5,
    micro: 0.1,
    claro: { radio: 2.4, transicion: 6.5 },
    falda: { inicio: 17, fin: 30, altura: 2.6 },
    sendero: null,
    paleta: PALETA_PARAMO,
    ...opciones,
  };
  const { seed } = opts;

  /* Cota del trillo por punto (se fija al crear: el carve no es recursivo). */
  const senda = opts.sendero;
  const cotas = [];

  /* Relieve SIN sendero: lomos + micro + claro + falda. */
  const alturaBase = (x, z) => {
    // warp de dominio suave: los lomos dejan de ser "manchas de ruido"
    const wx = x + (fbmSuelo(x * 0.05 + 40, z * 0.05, seed + 91, 2) - 0.5) * 5;
    const wz = z + (fbmSuelo(x * 0.05, z * 0.05 - 27, seed + 47, 2) - 0.5) * 5;
    let lomas = (fbmSuelo(wx * 0.062, wz * 0.062, seed) - 0.5) * 2; // [-1,1]
    // el fbm normalizado se apretuja hacia 0: tanh EXPANDE el cuerpo del ruido
    // (lomos gordos, hondonadas hondas) sin pasarse de ±1
    lomas = Math.tanh(lomas * 2.2);
    // crestas un pelo más marcadas, hondonadas anchas (asimetría natural)
    lomas = Math.sign(lomas) * Math.pow(Math.abs(lomas), 1.12);
    const micro = (fbmSuelo(x * 0.55, z * 0.55, seed + 7, 3) - 0.5) * 2;

    const r = Math.hypot(x, z);
    let mask = 1;
    if (opts.claro) {
      mask = THREE.MathUtils.smoothstep(r, opts.claro.radio, opts.claro.radio + opts.claro.transicion);
    }
    let h = lomas * opts.amplitud * mask + micro * opts.micro * (0.35 + 0.65 * mask);
    if (opts.falda) {
      const f = THREE.MathUtils.smoothstep(r, opts.falda.inicio, opts.falda.fin);
      h += f * opts.falda.altura + f * lomas * opts.amplitud * 0.7;
    }
    return h;
  };

  if (senda && senda.puntos.length >= 2) {
    for (const [px, pz] of senda.puntos) cotas.push(alturaBase(px, pz));
  }

  /** Distancia a la polilínea del sendero + cota interpolada del trillo. */
  const senderoCerca = (x, z) => {
    if (!senda || senda.puntos.length < 2) return { d: Infinity, y: 0 };
    let mejorD = Infinity;
    let mejorY = 0;
    for (let s = 0; s < senda.puntos.length - 1; s++) {
      const [ax, az] = senda.puntos[s];
      const [bx, bz] = senda.puntos[s + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz || 1e-9;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
      const qx = ax + dx * t;
      const qz = az + dz * t;
      const d = Math.hypot(x - qx, z - qz);
      if (d < mejorD) {
        mejorD = d;
        mejorY = cotas[s] + (cotas[s + 1] - cotas[s]) * t;
      }
    }
    return { d: mejorD, y: mejorY };
  };

  /* Cota final: el sendero RECORTA el relieve hacia su rasante (corte-y-
     relleno) y se hunde un pelín — el trillo pisado de verdad. */
  const alturaDe = (x, z) => {
    let h = alturaBase(x, z);
    if (senda) {
      const { d, y } = senderoCerca(x, z);
      const carve = 1 - THREE.MathUtils.smoothstep(d, senda.ancho * 0.45, senda.ancho * 1.9);
      if (carve > 0) {
        // borde con vaivén: el corte no es una zanja recta de máquina
        const vaiven = (fbmSuelo(x * 0.6 + 9, z * 0.6, seed + 23, 2) - 0.5) * 0.12;
        h = THREE.MathUtils.lerp(h, y - 0.085 + vaiven, carve * 0.9);
      }
    }
    return h;
  };

  const pendienteDe = (x, z, e = 0.4) => {
    const dx = (alturaDe(x + e, z) - alturaDe(x - e, z)) / (2 * e);
    const dz = (alturaDe(x, z + e) - alturaDe(x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  };

  return { alturaDe, pendienteDe, senderoCerca, opts };
}

/* -------------------------------------------------------------------------- */
/*  LA MALLA — plano desplazado + color por zona                               */
/* -------------------------------------------------------------------------- */

/**
 * Hornea la malla del suelo: desplaza el plano con `alturaDe` y pinta POR ZONA
 * (humedad en hondonadas, paja en lomos, roca en pendiente, hojarasca, trillo,
 * AO por concavidad). El costo vive en el build de la geometría, no en el frame.
 * @param {SueloRico} suelo
 * @param {{segmentos?: number}} [cfg]
 */
export function geomSueloRico(suelo, { segmentos = 56 } = {}) {
  const { alturaDe, pendienteDe, senderoCerca, opts } = suelo;
  const { seed, tam } = opts;
  const P = opts.paleta;
  const geo = new THREE.PlaneGeometry(tam, tam, segmentos, segmentos);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, alturaDe(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();

  const base = new THREE.Color(P.base);
  const pastoVivo = new THREE.Color(P.pastoVivo);
  const humedo = new THREE.Color(P.humedo);
  const seco = new THREE.Color(P.seco);
  const hojarasca = new THREE.Color(P.hojarasca);
  const tierraSenda = new THREE.Color(P.tierraSenda);
  const tierraHumeda = new THREE.Color(P.tierraHumeda);
  const roca = new THREE.Color(P.roca);
  const rocaClara = new THREE.Color(P.rocaClara);

  const e = Math.max(0.6, tam / segmentos); // paso del laplaciano ≈ celda
  pintarPorVertice(geo, (x, y, z, i) => {
    const c = base.clone();

    // parches vivos/apagados a dos escalas (nunca un verde de cancha)
    c.lerp(pastoVivo, THREE.MathUtils.smoothstep(fbmSuelo(x * 0.13 + 60, z * 0.13, seed + 3, 3), 0.48, 0.8) * 0.55);

    // concavidad (laplaciano): >0 hondonada, <0 cresta
    const lap =
      (alturaDe(x + e, z) + alturaDe(x - e, z) + alturaDe(x, z + e) + alturaDe(x, z - e) - 4 * y) /
      (e * e);
    const hondo = THREE.MathUtils.clamp(lap * 1.4, 0, 1);
    const cresta = THREE.MathUtils.clamp(-lap * 1.6, 0, 1);

    // HONDONADA: húmeda, verde hondo (nunca un manchón negro: el húmedo es RICO)
    const charco = fbmSuelo(x * 0.09 - 31, z * 0.09 + 18, seed + 9, 3);
    c.lerp(humedo, THREE.MathUtils.clamp(hondo * 0.6 + THREE.MathUtils.smoothstep(charco, 0.62, 0.88) * 0.25, 0, 0.75));

    // LOMO: paja seca dorada, más cuanto más alto y convexo — la zona que CANTA
    const altoRel = THREE.MathUtils.clamp((y - 0.1) / Math.max(0.001, opts.amplitud), 0, 1);
    c.lerp(seco, THREE.MathUtils.clamp(cresta * 0.65 + altoRel * 0.65, 0, 0.95) * (0.5 + fbmSuelo(x * 0.3, z * 0.3, seed + 15, 2) * 0.5));

    // HOJARASCA: parches pardos donde el terreno es amable (pendiente baja)
    const pend = pendienteDe(x, z);
    const mHoja = THREE.MathUtils.smoothstep(fbmSuelo(x * 0.17 + 12, z * 0.17 - 44, seed + 21, 3), 0.55, 0.8);
    c.lerp(hojarasca, mHoja * (1 - THREE.MathUtils.smoothstep(pend, 0.3, 0.6)) * 0.7);

    // ROCA: aflora en la pendiente fuerte, con umbral ruidoso (vetas, no franja)
    const veta = (fbmSuelo(x * 0.35 - 8, z * 0.35 + 27, seed + 27, 3) - 0.5) * 0.22;
    const mRoca = THREE.MathUtils.smoothstep(pend, 0.42 + veta, 0.72 + veta);
    if (mRoca > 0) {
      const tRoca = roca.clone().lerp(rocaClara, fbmSuelo(x * 0.8, z * 0.8, seed + 33, 2));
      c.lerp(tRoca, mRoca * 0.92);
    }

    // SENDERO: tierra pisada al centro, orilla húmeda al borde (borde ruidoso)
    if (opts.sendero) {
      const { d } = senderoCerca(x, z);
      const borde = (fbmSuelo(x * 0.7 + 3, z * 0.7 - 6, seed + 39, 2) - 0.5) * 0.5;
      const nucleo = 1 - THREE.MathUtils.smoothstep(d + borde, opts.sendero.ancho * 0.32, opts.sendero.ancho * 0.85);
      const orilla = 1 - THREE.MathUtils.smoothstep(d + borde, opts.sendero.ancho * 0.7, opts.sendero.ancho * 1.7);
      c.lerp(tierraHumeda, THREE.MathUtils.clamp(orilla - nucleo, 0, 1) * 0.5);
      c.lerp(tierraSenda, nucleo * 0.88);
      // huellas: motas más oscuras dentro del trillo
      if (nucleo > 0.5 && fbmSuelo(x * 1.6, z * 1.6, seed + 45, 2) > 0.62) {
        c.lerp(tierraHumeda, 0.35);
      }
    }

    // AO fingido: los hoyos comen luz; las crestas la reciben
    c.multiplyScalar(1 - hondo * 0.18 + cresta * 0.12);

    // jitter por vértice ±4%: mata el banding del lerp
    c.multiplyScalar(0.96 + hash2(i, i * 0.37, seed + 51) * 0.08);
    return c;
  });
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  DETALLE CERCANO — arquetipos fusionados (para instanciar)                  */
/* -------------------------------------------------------------------------- */

/**
 * Piedra de páramo: racimo de 2-3 dodecaedros deformados medio enterrados,
 * luz horneada de arriba (cara superior clara, base oscura = AO de contacto)
 * y pecas de líquen. El origen queda EN el suelo (y=0 = línea de tierra).
 * @param {number} [seed]
 * @param {Record<string,string>} [P]
 */
export function geomPiedraSuelo(seed = 101, P = PALETA_PARAMO) {
  const r = rng(seed);
  const partes = [];
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const rad = 0.22 + r() * 0.2;
    const p = new THREE.DodecahedronGeometry(rad, 0);
    // deformar: que ninguna piedra sea el sólido platónico de catálogo
    const pp = p.attributes.position;
    for (let v = 0; v < pp.count; v++) {
      const k = 1 + (hash2(pp.getX(v) * 7, pp.getZ(v) * 7, seed + i) - 0.5) * 0.34;
      pp.setXYZ(v, pp.getX(v) * k, pp.getY(v) * k, pp.getZ(v) * k);
    }
    poner(
      p,
      [(r() - 0.5) * 0.5, rad * (0.22 + r() * 0.2), (r() - 0.5) * 0.5],
      [r() * 0.7, r() * Math.PI, r() * 0.7],
      [1, 0.62 + r() * 0.3, 1],
    );
    const tone = new THREE.Color(P.roca).lerp(new THREE.Color(P.rocaClara), r());
    const liquen = new THREE.Color(P.liquen);
    const conLiquen = r() > 0.4;
    pintarPorVertice(p, (vx, vy, vz) => {
      const c = tone.clone().multiplyScalar(0.72 + THREE.MathUtils.clamp(vy * 1.6 + 0.35, 0, 1) * 0.42);
      if (conLiquen && ruidoValor2D(vx * 8, vz * 8, seed + i * 3) > 0.74) c.lerp(liquen, 0.55);
      return c;
    });
    partes.push(p);
  }
  return fusionar(partes, 'geomPiedraSuelo');
}

/**
 * Mata de paja de páramo: abanico de conos finos, base oscura (AO) y puntas
 * doradas encendidas — la "hierba" que rompe la planitud al ras.
 * @param {number} [seed]
 * @param {Record<string,string>} [P]
 */
export function geomMataPaja(seed = 202, P = PALETA_PARAMO) {
  const r = rng(seed);
  const partes = [];
  const paja = new THREE.Color(P.paja);
  const verde = new THREE.Color(P.pajaVerde);
  const punta = new THREE.Color(P.seco);
  const n = 9 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const alto = 0.42 + r() * 0.34;
    const hoja = new THREE.ConeGeometry(0.032 + r() * 0.02, alto, 4);
    const inclinacion = 0.16 + r() * 0.46;
    const rumbo = r() * Math.PI * 2;
    poner(
      hoja,
      [Math.cos(rumbo) * 0.09, alto * 0.44, Math.sin(rumbo) * 0.09],
      [Math.cos(rumbo + Math.PI / 2) * inclinacion, rumbo, Math.sin(rumbo + Math.PI / 2) * inclinacion],
    );
    const tono = (r() > 0.4 ? paja : verde).clone().multiplyScalar(1.0 + r() * 0.25);
    const oscuro = tono.clone().multiplyScalar(0.42);
    pintarPorVertice(hoja, (_vx, vy) => {
      const t = THREE.MathUtils.clamp(vy / alto + 0.15, 0, 1);
      // base en sombra (AO de mata), cuerpo dorado, PUNTA encendida por el sol
      return oscuro.clone().lerp(tono, Math.pow(t, 0.75)).lerp(punta, Math.max(0, t - 0.62) * 1.9);
    });
    partes.push(hoja);
  }
  return fusionar(partes, 'geomMataPaja');
}

/**
 * Raíz que asoma: dos-tres jorobas de raíz (arcos de toro) medio hundidas,
 * corteza oscura con lomo pulido por el paso — el detalle que ancla los
 * árboles al suelo en vez de posarlos encima.
 * @param {number} [seed]
 * @param {Record<string,string>} [P]
 */
export function geomRaizSuelo(seed = 303, P = PALETA_PARAMO) {
  const r = rng(seed);
  const partes = [];
  const corteza = new THREE.Color(P.raiz);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const radio = 0.3 + r() * 0.34;
    const gordo = 0.045 + r() * 0.035;
    const arco = new THREE.TorusGeometry(radio, gordo, 5, 10, Math.PI * (0.55 + r() * 0.3));
    poner(
      arco,
      [(r() - 0.5) * 0.7, -radio * 0.35, (r() - 0.5) * 0.7],
      [Math.PI / 2 + (r() - 0.5) * 0.3, 0, r() * Math.PI * 2],
      [1, 1, 0.8],
    );
    // ojo: tras rotar, el "lomo" de la joroba es el y máximo del arco
    pintarPorVertice(arco, (_vx, vy) => {
      const t = THREE.MathUtils.clamp(vy * 3 + 0.4, 0, 1);
      return corteza.clone().multiplyScalar(0.62 + t * 0.55);
    });
    partes.push(arco);
  }
  return fusionar(partes, 'geomRaizSuelo');
}

/**
 * Florecitas de páramo: tallitos con cabeza clara — el acento que hace vivir
 * el musgo. Baratas: 3 tallos por mata, instanciadas aparte.
 * @param {number} [seed]
 * @param {Record<string,string>} [P]
 */
export function geomFlorecitas(seed = 404, P = PALETA_PARAMO) {
  const r = rng(seed);
  const partes = [];
  const verde = new THREE.Color(P.pajaVerde);
  for (let i = 0; i < 3; i++) {
    const alto = 0.16 + r() * 0.14;
    const x = (r() - 0.5) * 0.16;
    const z = (r() - 0.5) * 0.16;
    const tallo = new THREE.CylinderGeometry(0.006, 0.009, alto, 3);
    poner(tallo, [x, alto / 2, z], [(r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3]);
    pintarPorVertice(tallo, (_vx, vy) => verde.clone().multiplyScalar(0.55 + (vy / alto) * 0.5));
    partes.push(tallo);
    const flor = new THREE.IcosahedronGeometry(0.028 + r() * 0.016, 0);
    poner(flor, [x, alto + 0.015, z], [0, 0, 0], [1, 0.72, 1]);
    const tono = new THREE.Color(r() > 0.55 ? P.flor : P.florMiel).multiplyScalar(0.92 + r() * 0.16);
    pintarPorVertice(flor, (_vx, vy) => tono.clone().multiplyScalar(0.8 + THREE.MathUtils.clamp(vy * 8 + 0.5, 0, 1) * 0.25));
    partes.push(flor);
  }
  return fusionar(partes, 'geomFlorecitas');
}

/**
 * Lajas del sendero: piedras pisables sembradas SOBRE la rasante del trillo,
 * hundidas apenas, con vaivén lateral (nadie pone lajas con regla).
 * @param {SueloRico} suelo
 * @param {number} [cada] — una laja cada tantas unidades de camino
 * @param {number} [seed]
 */
export function geomLajasSendero(suelo, cada = 1.35, seed = 505) {
  const senda = suelo.opts.sendero;
  if (!senda || senda.puntos.length < 2) return null;
  const P = suelo.opts.paleta;
  const r = rng(seed);
  const partes = [];
  for (let s = 0; s < senda.puntos.length - 1; s++) {
    const [ax, az] = senda.puntos[s];
    const [bx, bz] = senda.puntos[s + 1];
    const largo = Math.hypot(bx - ax, bz - az);
    const pasos = Math.max(1, Math.round(largo / cada));
    for (let i = 0; i < pasos; i++) {
      const t = (i + 0.5) / pasos;
      const x = ax + (bx - ax) * t + (r() - 0.5) * senda.ancho * 0.5;
      const z = az + (bz - az) * t + (r() - 0.5) * senda.ancho * 0.5;
      const laja = new THREE.CylinderGeometry(0.2 + r() * 0.12, 0.24 + r() * 0.12, 0.045, 6);
      poner(
        laja,
        [x, suelo.alturaDe(x, z) + 0.012, z],
        [(r() - 0.5) * 0.06, r() * Math.PI, (r() - 0.5) * 0.06],
        [1, 1, 0.72 + r() * 0.4],
      );
      // laja cálida y soleada: piedra clara con un beso de la tierra del trillo
      const tono = new THREE.Color(P.rocaClara)
        .lerp(new THREE.Color(P.tierraSenda), 0.22)
        .multiplyScalar(0.98 + r() * 0.18);
      pintarPorVertice(laja, (_vx, vy) => tono.clone().multiplyScalar(vy > 0 ? 1.06 : 0.74));
      partes.push(laja);
    }
  }
  return partes.length ? fusionar(partes, 'geomLajasSendero') : null;
}

/* -------------------------------------------------------------------------- */
/*  DISTRIBUCIÓN — sembrar detalle POR el relieve                              */
/* -------------------------------------------------------------------------- */

/**
 * Siembra `n` puntos de detalle sobre el suelo. Cada item trae pos (con la Y
 * del terreno), rotY, escala y tint — el formato que ya consumen los
 * InstancedMesh de flora (FloraParamo.Especie y equivalentes).
 * @param {SueloRico} suelo
 * @param {number} n
 * @param {{
 *   seed?: number, rMin?: number, rMax?: number,
 *   eMin?: number, eMax?: number, varia?: number,
 *   evitaSendero?: number,      — descartar a menos de tantos anchos del trillo
 *   pendienteMin?: number, pendienteMax?: number,
 *   hundir?: number,            — enterrar la base (fracción de escala)
 * }} [o]
 */
export function distribuirDetalle(suelo, n, o = {}) {
  const r = rng(o.seed ?? 606);
  const rMin = o.rMin ?? (suelo.opts.claro ? suelo.opts.claro.radio * 0.7 : 1);
  const rMax = o.rMax ?? suelo.opts.tam * 0.42;
  const eMin = o.eMin ?? 0.8;
  const eMax = o.eMax ?? 1.3;
  const items = [];
  let intentos = 0;
  while (items.length < n && intentos < n * 14) {
    intentos++;
    const ang = r() * Math.PI * 2;
    const rad = rMin + (rMax - rMin) * Math.sqrt(r());
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    if (o.evitaSendero && suelo.opts.sendero) {
      const { d } = suelo.senderoCerca(x, z);
      if (d < suelo.opts.sendero.ancho * o.evitaSendero) continue;
    }
    const pend = suelo.pendienteDe(x, z);
    if (o.pendienteMax != null && pend > o.pendienteMax) continue;
    if (o.pendienteMin != null && pend < o.pendienteMin) continue;
    const escala = eMin + r() * (eMax - eMin);
    items.push({
      pos: [x, suelo.alturaDe(x, z) - (o.hundir ?? 0.03) * escala, z],
      rotY: r() * Math.PI * 2,
      escala,
      tint: tinte(r, o.varia ?? 0.12),
    });
  }
  return items;
}

/** Tinte por instancia (mismo formato que floraParamo). */
function tinte(r, amt) {
  const f = 1 + (r() - 0.5) * amt;
  const h = (r() - 0.5) * amt * 0.4;
  const cl = (v) => Math.max(0.7, Math.min(1.16, v));
  return [cl(f + h), cl(f), cl(f - h * 0.6)];
}

/* -------------------------------------------------------------------------- */
/*  PRESUPUESTO por tier — cuánto detalle siembra cada gama                    */
/* -------------------------------------------------------------------------- */

/**
 * Conteos de detalle por tier (Android barato = gama baja frugal).
 * @param {'alto'|'medio'|'bajo'} tier
 */
export function detalleDeTier(tier) {
  if (tier === 'alto') return { piedras: 34, matas: 260, raices: 8, flores: 56 };
  if (tier === 'medio') return { piedras: 18, matas: 100, raices: 4, flores: 22 };
  return { piedras: 8, matas: 30, raices: 0, flores: 0 };
}

/*
 * micorrizas.geom — la GEOMETRÍA y los DATOS de la RED MICORRÍZICA del suelo
 * vivo (el "wood-wide web"), en funciones PURAS y testeables (three-core, corre
 * headless — cero contexto GL, cero azar por frame, cero assets externos).
 *
 * ── LA BIOLOGÍA QUE ENSEÑA (grounded, DR-micorrizas §1) ─────────────────────
 * Los hongos micorrízicos arbusculares (HMA) se enredan en las raíces: la mata
 * les da CARBONO (azúcares de la fotosíntesis) y ellos le devuelven FÓSFORO y
 * AGUA que su micelio busca lejos, donde la raíz sola no llega. El micelio no se
 * queda en una mata: CONECTA plantas distintas bajo tierra y REPARTE nutrientes
 * entre ellas — por eso el maíz, el fríjol y la ahuyama (las tres hermanas) se
 * ayudan por debajo, y por eso un árbol madre alimenta a las maticas nuevas a su
 * sombra. Esta red se DAÑA con la quema, la labranza que la parte, el exceso de
 * fósforo y los fungicidas; se CUIDA con coberturas, compost y no arar de más.
 *
 * ── EL MODELO ───────────────────────────────────────────────────────────────
 * El suelo es un GRAFO: NODOS (puntas de raíz donde ocurre el intercambio —
 * arbúsculos —, uniones del micelio y esporas) unidos por HILOS (hifas). Los
 * hilos que cruzan de una planta a OTRA son PUENTES: ahí se lee el reparto. Por
 * los hilos viajan PULSOS de nutrientes (fósforo/agua ↔ carbono), en los dos
 * sentidos en los puentes (la mata da azúcar, el hongo devuelve mineral).
 *
 * El componente r3f (`EscenaMicorrizas.jsx`) consume esto y le pone luz
 * bioluminiscente, material aditivo y vida (los pulsos que corren).
 */
import * as THREE from 'three';
import {
  ruidoFbm,
  pintarPorVertice,
  fusionarSeguro,
} from '../bosque/sombreadoVegetal.js';

/* PRNG determinista (mismo suelo en cada carga; nada de Math.random). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/*
 * PALETA ANDINA BIOLUMINISCENTE. La tierra es un fondo cálido casi negro; el
 * micelio brilla en un verde-turquesa frío de hongo de bosque; los pulsos hablan
 * por color: FÓSFORO = ámbar dorado (el mineral que sube a la mata), AGUA = azul
 * pálido, CARBONO = verde vivo (el azúcar que baja al hongo). Las esporas son
 * perlas malva. Nada estridente: luz de luciérnaga bajo tierra.
 */
export const PALETA = {
  tierra: new THREE.Color('#120c09'), // fondo de la tierra (cálido, casi negro)
  tierraAlta: new THREE.Color('#241811'), // tierra cerca de la superficie
  micelio: new THREE.Color('#37d6b0'), // hifa: turquesa de hongo
  micelioTenue: new THREE.Color('#1c6f63'), // hifa lejana (se apaga en la niebla)
  puente: new THREE.Color('#7ef0c8'), // el puente entre plantas: más claro
  nodo: new THREE.Color('#9df5da'), // unión del micelio (blanco-verde)
  arbusculo: new THREE.Color('#ffd27a'), // punta de raíz: sitio de intercambio (cálido)
  espora: new THREE.Color('#d8b6f0'), // espora: perla malva (memoria del suelo)
  raiz: new THREE.Color('#c8a878'), // raíz viva
  raizPunta: new THREE.Color('#e7cf9a'), // puntita de raíz que busca
  fosforo: new THREE.Color('#ffc766'), // pulso: fósforo (mineral → mata)
  agua: new THREE.Color('#8fd4ff'), // pulso: agua (→ mata)
  carbono: new THREE.Color('#8ef06a'), // pulso: carbono/azúcar (mata → hongo)
  tallo: new THREE.Color('#5f8a3a'), // tallitos sobre la superficie
  piedra: new THREE.Color('#565060'), // piedra del perfil (gris frío, nunca roba el ojo)
};

/* Volumen del suelo (metros-escena). La superficie está en y=0; abajo es
   negativo. El slab es ANCHO y de poca profundidad en Z: la red mira a la
   cámara como una vitrina de acuario de tierra, con algo de fondo para dar
   volumen. */
export const SUELO = { ancho: 7.4, hondo: 5.2, z0: 0.9, zAtras: -1.5 };

/*
 * PARÁMETROS por tier (tier-safe, DR §6). El "wow" vive en 'alto' (más nodos,
 * más hilos, pulsos densos, el Ent asomando); 'medio' es frugal (menos red, sin
 * PBR); 'bajo' es el mínimo digno (se lee la red, sin pulsos ni Ent — la escena
 * cae a su espejo 2D en equipo humilde, pero si algo la fuerza, aguanta).
 */
export const PARAMS_TIER = {
  alto: {
    nodosLibres: 22, pulsos: 130, tubK: 20, tubM: 6, radioHilo: 0.016,
    motas: 90, conEnt: true, entTier: 'alto', vecinos: 2, radialRaiz: 7,
    pelusaPorHilo: 5, mantoPorPunta: 16, pelosPorRaiz: 22, segEntorno: 30, piedras: 9,
  },
  medio: {
    nodosLibres: 14, pulsos: 54, tubK: 12, tubM: 5, radioHilo: 0.015,
    motas: 40, conEnt: true, entTier: 'medio', vecinos: 2, radialRaiz: 6,
    pelusaPorHilo: 3, mantoPorPunta: 10, pelosPorRaiz: 13, segEntorno: 18, piedras: 6,
  },
  bajo: {
    nodosLibres: 8, pulsos: 0, tubK: 8, tubM: 4, radioHilo: 0.014,
    motas: 0, conEnt: false, entTier: 'bajo', vecinos: 1, radialRaiz: 5,
    pelusaPorHilo: 2, mantoPorPunta: 6, pelosPorRaiz: 8, segEntorno: 10, piedras: 4,
  },
};

/** Parámetros del suelo vivo para un tier (desconocido → 'medio'). */
export const paramsDeTier = (tier) => PARAMS_TIER[tier] || PARAMS_TIER.medio;

/*
 * LAS PLANTAS de la chagra, ancladas en la superficie. Las tres hermanas (maíz,
 * fríjol, ahuyama) que se reparten el suelo, y —al fondo— el ÁRBOL madre (la
 * queñua/Ent) cuyas raíces también se enchufan a la red y alimentan a las
 * maticas. `x` es su sitio en la superficie; `raices` cuántas puntas bajan;
 * `hondo` hasta dónde llegan; `tinte` para su tallito.
 */
export const PLANTAS = [
  { id: 'maiz', x: -2.55, z: 0.15, raices: 3, hondo: 2.7, esparce: 1.0, tinte: '#93b24e', arbol: false },
  { id: 'frijol', x: -0.55, z: 0.35, raices: 3, hondo: 2.1, esparce: 0.85, tinte: '#6fae4a', arbol: false, fija: true },
  { id: 'ahuyama', x: 1.5, z: 0.2, raices: 3, hondo: 1.8, esparce: 1.25, tinte: '#c98f3c', arbol: false },
  { id: 'arbol', x: 3.05, z: -0.6, raices: 4, hondo: 3.4, esparce: 1.35, tinte: '#8a5a33', arbol: true },
];

/** Punto sobre una curva de Bézier cuadrática (a→c→b). Puro, para hilos y pulsos. */
export function bezier2(a, c, b, t, out = new THREE.Vector3()) {
  const u = 1 - t;
  const w0 = u * u;
  const w1 = 2 * u * t;
  const w2 = t * t;
  return out.set(
    w0 * a.x + w1 * c.x + w2 * b.x,
    w0 * a.y + w1 * c.y + w2 * b.y,
    w0 * a.z + w1 * c.z + w2 * b.z,
  );
}

/*
 * Sistema de RAÍCES de una planta: una raíz-madre que baja y se afina + raicillas
 * laterales. Devuelve las curvas (para el tubo) y las PUNTAS (nodos de
 * intercambio de la red). Coords de mundo (y negativo = hacia abajo).
 */
export function raicesDePlanta(planta, seed) {
  const r = rng(seed);
  const base = new THREE.Vector3(planta.x, -0.02, planta.z);
  const curvas = [];
  const puntas = [];
  const n = planta.raices;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.9;
    const esparce = planta.esparce * (0.6 + r() * 0.7);
    const largo = planta.hondo * (0.7 + r() * 0.4);
    const dx = Math.cos(ang) * esparce;
    const dz = Math.sin(ang) * esparce * 0.45; // menos en Z (el slab es delgado)
    // baja curvándose: arranca casi recta, se abre y busca lateral al final
    const p0 = base.clone();
    const p1 = base.clone().add(new THREE.Vector3(dx * 0.28, -largo * 0.42, dz * 0.3 + (r() - 0.5) * 0.2));
    const p2 = base.clone().add(new THREE.Vector3(dx * 0.72, -largo * 0.78, dz * 0.7 + (r() - 0.5) * 0.25));
    const p3 = base.clone().add(new THREE.Vector3(dx, -largo, dz));
    const curva = new THREE.CatmullRomCurve3([p0, p1, p2, p3], false, 'catmullrom', 0.5);
    const r0 = planta.arbol ? 0.09 + r() * 0.03 : 0.05 + r() * 0.02;
    curvas.push({ curva, r0, arbol: planta.arbol });
    puntas.push({ pos: p3.clone(), tipo: 'raiz', planta: planta.id, arbol: planta.arbol });
    // una raicilla intermedia con su puntita (más sitios de intercambio)
    if (r() > 0.35) {
      const pm = bezier2(p0, p1, p3, 0.62).clone();
      const lateral = pm.clone().add(new THREE.Vector3((r() - 0.5) * 0.7, -0.35 - r() * 0.3, (r() - 0.5) * 0.3));
      curvas.push({
        curva: new THREE.CatmullRomCurve3([pm, pm.clone().lerp(lateral, 0.5), lateral], false, 'catmullrom', 0.5),
        r0: r0 * 0.55, arbol: planta.arbol,
      });
      puntas.push({ pos: lateral, tipo: 'raiz', planta: planta.id, arbol: planta.arbol });
    }
  }
  return { curvas, puntas };
}

/* Todas las raíces + todas las puntas (nodos-raíz) de la chagra. */
export function sistemaRaices(seed = 11) {
  const curvas = [];
  const puntasRaiz = [];
  PLANTAS.forEach((p, i) => {
    const { curvas: c, puntas } = raicesDePlanta(p, seed + i * 31);
    curvas.push(...c);
    puntasRaiz.push(...puntas);
  });
  return { curvas, puntasRaiz };
}

/*
 * NODOS LIBRES del micelio: uniones de hifas repartidas en el volumen ENTRE las
 * raíces (donde el hongo explora la tierra). Se siembran con sesgo hacia el
 * centro y la media-profundidad para que la red LLENE el espacio entre plantas
 * sin amontonarse. Algunas son ESPORAS (memoria del suelo).
 */
export function nodosLibres(n, seed = 23) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * SUELO.ancho * 0.92;
    const y = -0.35 - r() * (SUELO.hondo * 0.62); // casi todos en la franja viva
    const z = SUELO.zAtras + r() * (SUELO.z0 - SUELO.zAtras);
    const espora = r() > 0.82;
    out.push({ pos: new THREE.Vector3(x, y, z), tipo: espora ? 'espora' : 'nodo', planta: null });
  }
  return out;
}

/* Distancia al cuadrado (barata, para vecindad). */
function d2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/* El punto medio de un hilo, con SAG (cuelga un poco) y ruido determinista:
   así la hifa se lee orgánica, no un palo recto entre dos puntos. */
function medioHilo(a, b, r) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const largo = a.distanceTo(b);
  mid.y -= largo * (0.06 + r() * 0.05); // cuelga hacia abajo
  mid.x += (r() - 0.5) * largo * 0.18;
  mid.z += (r() - 0.5) * largo * 0.18;
  return mid;
}

/*
 * CONSTRUYE LA RED: dado el conjunto de nodos (puntas de raíz + libres), teje los
 * HILOS con estructura legible (no un amasijo):
 *   1) cada nodo se une a sus `vecinos` más cercanos (grafo k-vecinos, dedup) —
 *      esto da una malla natural, con aire, no espagueti;
 *   2) se AÑADEN puentes explícitos entre plantas vecinas (una punta de una
 *      planta ↔ el nodo más cercano de OTRA planta): son la lección (el reparto
 *      entre plantas distintas), y se marcan `puente` para brillar más y llevar
 *      pulsos en ambos sentidos.
 * Se acotan los hilos largísimos (evita cruces que ensucian la lectura).
 *
 * @returns {{nodos: Array, hilos: Array<{a,b,mid,puente,grosor,color,ida}>}}
 */
export function construirRed(puntasRaiz, libres, { vecinos = 2 } = {}, seed = 37) {
  const r = rng(seed);
  const nodos = [...puntasRaiz, ...libres];
  const maxLargo2 = 3.1 * 3.1; // no unir puntos demasiado lejos
  const clave = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);
  const vistos = new Set();
  const hilos = [];

  const empujar = (i, j, puente) => {
    if (i === j) return;
    const k = clave(i, j);
    if (vistos.has(k)) {
      if (puente) {
        const h = hilos.find((x) => x.k === k);
        if (h) h.puente = true;
      }
      return;
    }
    const a = nodos[i].pos, b = nodos[j].pos;
    if (!puente && d2(a, b) > maxLargo2) return;
    vistos.add(k);
    hilos.push({
      k,
      a: a.clone(),
      b: b.clone(),
      mid: medioHilo(a, b, r),
      puente: !!puente,
      grosor: puente ? 1.5 : 0.7 + r() * 0.5,
      // color del hilo: el puente más claro; el resto turquesa con leve variación
      color: puente ? PALETA.puente : PALETA.micelio.clone().lerp(PALETA.micelioTenue, r() * 0.5),
      ida: r() > 0.5,
    });
  };

  // 1) k-vecinos: cada nodo con sus más cercanos
  for (let i = 0; i < nodos.length; i++) {
    const orden = [];
    for (let j = 0; j < nodos.length; j++) if (j !== i) orden.push([j, d2(nodos[i].pos, nodos[j].pos)]);
    orden.sort((p, q) => p[1] - q[1]);
    for (let v = 0; v < Math.min(vecinos, orden.length); v++) empujar(i, orden[v][0], false);
  }

  // 2) PUENTES entre plantas vecinas: por cada par de plantas contiguas, une la
  //    punta de raíz de una con la punta más cercana de la otra (el reparto).
  const porPlanta = new Map();
  puntasRaiz.forEach((p, idx) => {
    if (!porPlanta.has(p.planta)) porPlanta.set(p.planta, []);
    porPlanta.get(p.planta).push(idx); // idx en `nodos` (puntasRaiz va primero)
  });
  const plantas = [...porPlanta.keys()];
  for (let pi = 0; pi < plantas.length - 1; pi++) {
    const a = porPlanta.get(plantas[pi]);
    const b = porPlanta.get(plantas[pi + 1]);
    // el par (una punta de A, una punta de B) más cercano entre las dos plantas
    let mejor = null, md = Infinity;
    for (const i of a) for (const j of b) {
      const dd = d2(nodos[i].pos, nodos[j].pos);
      if (dd < md) { md = dd; mejor = [i, j]; }
    }
    if (mejor) empujar(mejor[0], mejor[1], true);
  }

  return { nodos, hilos };
}

/** La curva (Bézier cuadrática) de un hilo — para el tubo y para los pulsos. */
export function curvaHilo(hilo) {
  const a = hilo.a instanceof THREE.Vector3 ? hilo.a : new THREE.Vector3(...hilo.a);
  const b = hilo.b instanceof THREE.Vector3 ? hilo.b : new THREE.Vector3(...hilo.b);
  const c = hilo.mid instanceof THREE.Vector3 ? hilo.mid : new THREE.Vector3(...hilo.mid);
  return new THREE.QuadraticBezierCurve3(a, c, b);
}

/*
 * Une varias BufferGeometry (misma estructura: position, normal, color, index)
 * en UNA sola → un draw-call para toda la red. Puro three-core. Descarta las
 * originales del cálculo (el consumidor libera la resultante).
 */
export function mergeGeos(geos) {
  let nVert = 0, nIdx = 0;
  for (const g of geos) {
    nVert += g.attributes.position.count;
    nIdx += g.index ? g.index.count : 0;
  }
  const position = new Float32Array(nVert * 3);
  const normal = new Float32Array(nVert * 3);
  const color = new Float32Array(nVert * 3);
  const index = new Uint32Array(nIdx);
  let vOff = 0, iOff = 0;
  for (const g of geos) {
    const p = g.attributes.position.array;
    const nrm = g.attributes.normal ? g.attributes.normal.array : null;
    const col = g.attributes.color ? g.attributes.color.array : null;
    position.set(p, vOff * 3);
    if (nrm) normal.set(nrm, vOff * 3);
    if (col) color.set(col, vOff * 3);
    const gi = g.index.array;
    for (let k = 0; k < gi.length; k++) index[iOff + k] = gi[k] + vOff;
    vOff += g.attributes.position.count;
    iOff += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('color', new THREE.BufferAttribute(color, 3));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}

/*
 * GEOMETRÍA de toda la RED en una sola malla: un tubo finísimo por hilo (con
 * color de vértice = su glow, un poco más brillante hacia el centro para que el
 * hilo "respire"), todos fundidos en una BufferGeometry. Un solo draw-call.
 */
export function geometriaRed(hilos, { tubK = 16, tubM = 5, radioHilo = 0.016 } = {}) {
  const geos = [];
  const tmp = new THREE.Color();
  for (const h of hilos) {
    const curva = curvaHilo(h);
    const radio = radioHilo * h.grosor;
    const geo = new THREE.TubeGeometry(curva, tubK, radio, tubM, false);
    const nAnillo = tubM + 1;
    const count = geo.attributes.position.count;
    const colores = new Float32Array(count * 3);
    for (let k = 0; k < count; k++) {
      const anillo = Math.floor(k / nAnillo);
      const t = anillo / tubK;
      // brillo mayor en el centro del hilo (perfil de campana suave)
      const glow = 0.72 + 0.28 * Math.sin(t * Math.PI);
      tmp.copy(h.color).multiplyScalar(glow);
      colores[k * 3] = tmp.r;
      colores[k * 3 + 1] = tmp.g;
      colores[k * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    geos.push(geo);
  }
  const merged = mergeGeos(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}

/*
 * PULSOS de nutrientes que viajan por los hilos. Cada pulso:
 *   { hilo, t0, vel, dir, color, tipo }
 * En los PUENTES corren en los DOS sentidos y con dos monedas: el mineral que
 * SUBE a la mata (fósforo/agua, cálido/azul) y el azúcar que BAJA al hongo
 * (carbono, verde). En hilos normales, pulsos sueltos y más lentos. Se reparten
 * hasta el presupuesto `total` del tier.
 */
export function pulsosDeRed(hilos, total, seed = 53) {
  if (!total) return [];
  const r = rng(seed);
  const out = [];
  const puentes = [];
  hilos.forEach((h, i) => { if (h.puente) puentes.push(i); });

  // 1) los puentes primero (la lección): pulsos en los dos sentidos
  for (const i of puentes) {
    if (out.length >= total) break;
    // mineral sube (t: 1→0, del suelo hacia la mata) — fósforo/agua
    out.push({
      hilo: i, t0: r(), vel: 0.14 + r() * 0.05, dir: -1,
      color: r() > 0.5 ? PALETA.fosforo : PALETA.agua, tipo: 'mineral', tam: 1.25,
    });
    if (out.length >= total) break;
    // azúcar baja (t: 0→1, de la mata al hongo) — carbono
    out.push({
      hilo: i, t0: r(), vel: 0.12 + r() * 0.05, dir: 1,
      color: PALETA.carbono, tipo: 'carbono', tam: 1.1,
    });
  }

  // 2) el resto de pulsos, repartidos en hilos al azar (más en puentes)
  let guard = 0;
  while (out.length < total && guard < total * 8) {
    guard++;
    const usarPuente = puentes.length && r() > 0.55;
    const i = usarPuente ? puentes[(r() * puentes.length) | 0] : (r() * hilos.length) | 0;
    const moneda = r();
    const color = moneda > 0.62 ? PALETA.fosforo : moneda > 0.34 ? PALETA.carbono : PALETA.agua;
    out.push({
      hilo: i, t0: r(), vel: 0.07 + r() * 0.06, dir: r() > 0.5 ? 1 : -1,
      color, tipo: 'suelto', tam: 0.8 + r() * 0.4,
    });
  }
  return out;
}

/*
 * GEOMETRÍA de las RAÍCES: un tubo tapereado por curva (grueso en la base →
 * puntita fina), con color de vértice que va de raíz viva a la punta clara que
 * busca. Todas fundidas en UNA malla (un draw-call). El taper se logra
 * reescalando cada anillo del tubo respecto a su centro.
 */
export function tuboRaizGeom(raizCurvas, { radial = 6, tubular = 16 } = {}) {
  if (!raizCurvas.length) return null;
  const geos = [];
  const v = new THREE.Vector3();
  const off = new THREE.Vector3();
  const col = new THREE.Color();
  for (const { curva, r0 } of raizCurvas) {
    const geo = new THREE.TubeGeometry(curva, tubular, 1, radial, false);
    const pos = geo.attributes.position;
    const nAnillo = radial + 1;
    const centros = [];
    for (let i = 0; i <= tubular; i++) centros.push(curva.getPointAt(i / tubular));
    const colores = new Float32Array(pos.count * 3);
    for (let k = 0; k < pos.count; k++) {
      const anillo = Math.floor(k / nAnillo);
      const t = anillo / tubular;
      const centro = centros[Math.min(anillo, centros.length - 1)];
      v.fromBufferAttribute(pos, k);
      off.subVectors(v, centro);
      const radio = r0 * (1 - 0.82 * t) + 0.006; // se afina hacia la punta
      v.copy(centro).addScaledVector(off, radio);
      pos.setXYZ(k, v.x, v.y, v.z);
      col.copy(PALETA.raiz).lerp(PALETA.raizPunta, t);
      colores[k * 3] = col.r; colores[k * 3 + 1] = col.g; colores[k * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colores, 3));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geos.push(geo);
  }
  const merged = mergeGeos(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}

/*
 * MOTAS del suelo: partículas suspendidas (vida microscópica, humedad) que
 * derivan lento en el volumen. Devuelve posiciones + fase para el vaivén.
 */
export function motasSuelo(n, seed = 71) {
  if (!n) return [];
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    pos: new THREE.Vector3(
      (r() - 0.5) * SUELO.ancho,
      -0.2 - r() * SUELO.hondo * 0.85,
      SUELO.zAtras - 0.4 + r() * (SUELO.z0 - SUELO.zAtras + 0.8),
    ),
    fase: r() * Math.PI * 2,
    esc: 0.5 + r() * 0.9,
  }));
}

/*
 * TALLITOS sobre la superficie (la pista de que ARRIBA hay matas: las tres
 * hermanas). Cortos, de color de cada planta; son contexto, no protagonistas
 * (el suelo bajo tierra es la estrella). Devuelve specs de dibujo.
 */
export function tallosSuperficie() {
  return PLANTAS.filter((p) => !p.arbol).map((p) => ({
    id: p.id, x: p.x, z: p.z, tinte: p.tinte,
    alto: p.id === 'maiz' ? 1.15 : p.id === 'frijol' ? 0.8 : 0.5,
    ahuyama: p.id === 'ahuyama',
  }));
}

/* ══════════════════════════════════════════════════════════════════════════
 * PASADA DE ARTE «SUELO VIVO» — mirada Humboldt: MASA, no low-poly.
 *
 * Lo que sigue existe porque la escena original tenía tres mentiras visuales
 * que la vitrina del Ent (corteSuelo.geom, tercera pasada) ya había aprendido
 * a no decir:
 *
 *   1. El suelo era un PLANO de color plano — y "suelo vivo" no puede ser la
 *      única cosa muerta del cuadro. Ahora es un entorno horneado por vértice
 *      (grano fbm, oscuridad LOCAL en grietas, humus arriba → mineral frío
 *      abajo, piedras medio enterradas) y —la receta que resolvió la banda
 *      oscura de la vitrina— la RED LE HORNEA SU LUZ: la tierra se enciende
 *      cerca de los filamentos y se queda oscura en los huecos.
 *   2. Las hifas eran hilos contables. El micelio real es VELLO: por eso la
 *      pelusa (ramillas finas que exploran) y el MANTO que forra cada punta
 *      de raíz — la vaina hifal, que es literalmente la lección ("el hongo
 *      forra la raíz"). Van como LineSegments aditivos: cientos de filamentos
 *      en un draw-call.
 *   3. Las raíces bajaban peladas. Una raíz viva está cubierta de PELOS
 *      RADICALES; sin ellos el tubo se lee a plástico.
 *
 * Todo determinista (rng con semilla), puro three-core, testeable headless.
 * ════════════════════════════════════════════════════════════════════════ */

/*
 * MUESTRAS DE LUZ de la red: puntos a lo largo de cada hilo con la fuerza con
 * que alumbran la tierra vecina (los puentes alumbran más: son la lección).
 * Es el insumo de `entornoSuelo` — la misma receta de `muestrasDeLuz` de la
 * vitrina del Ent, aplicada al acuario completo.
 */
export function muestrasDeRed(hilos) {
  const out = [];
  const p = new THREE.Vector3();
  for (const h of hilos) {
    const curva = curvaHilo(h);
    const n = h.puente ? 7 : 4;
    const fuerza = h.puente ? 1 : 0.55;
    for (let i = 0; i <= n; i++) {
      curva.getPoint(i / n, p);
      out.push({ x: p.x, y: p.y, z: p.z, fuerza });
    }
  }
  return out;
}

/* Arma una BufferGeometry de líneas (position + color) desde arrays planos. */
function geoLineas(pts, cols) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3));
  return geo;
}

/*
 * LA PELUSA DE LA RED — el micelio como masa, no como diagrama.
 *
 * Dos pelambres en una sola geometría de LineSegments (aditiva, un draw-call):
 *   · el VELLO de cada hifa: ramillas finas que salen del hilo a explorar la
 *     tierra, con el brillo cayendo a negro en la punta (en aditivo, negro =
 *     invisible: el filamento se DESVANECE en vez de cortarse);
 *   · el MANTO hifal: en cada punta de raíz, un rizo denso de filamentos que
 *     ENVUELVE el arbúsculo — el hongo forrando la raíz, que es la frase
 *     central de la simbiosis hecha geometría.
 */
export function pelusaDeRed(hilos, puntasRaiz, { porHilo = 4, manto = 12 } = {}, seed = 97) {
  const r = rng(seed);
  const pts = [];
  const cols = [];
  const c0 = new THREE.Color();
  const c1 = new THREE.Color();
  const c2 = new THREE.Color();
  const base = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const tip = new THREE.Vector3();
  const d = new THREE.Vector3();
  const seg = (a, b, ca, cb) => {
    pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    cols.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b);
  };

  for (const h of hilos) {
    const curva = curvaHilo(h);
    const nRam = Math.max(0, Math.round(porHilo * (h.puente ? 1.5 : 1)));
    for (let k = 0; k < nRam; k++) {
      curva.getPoint(0.12 + r() * 0.76, base);
      d.set(r() - 0.5, r() - 0.62, r() - 0.5).normalize(); // leve sesgo a bajar
      const len = 0.09 + r() * 0.17;
      mid.copy(base).addScaledVector(d, len * 0.5);
      mid.y -= len * 0.16;
      mid.x += (r() - 0.5) * len * 0.3;
      tip.copy(base).addScaledVector(d, len);
      tip.y -= len * 0.34;
      c0.copy(h.color).multiplyScalar(0.5);
      c1.copy(h.color).multiplyScalar(0.24);
      c2.copy(h.color).multiplyScalar(0.05);
      seg(base, mid, c0, c1);
      seg(mid, tip, c1, c2);
    }
  }

  for (const p of puntasRaiz) {
    for (let k = 0; k < manto; k++) {
      const az = r() * Math.PI * 2;
      const el = (r() - 0.35) * Math.PI * 0.9;
      d.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el) * 0.7).normalize();
      base.copy(p.pos).addScaledVector(d, 0.015 + r() * 0.02);
      const len = 0.05 + r() * 0.1;
      mid.copy(base).addScaledVector(d, len * 0.5);
      // el rizo: la hifa envuelve la punta, no dispara recto
      mid.x += Math.cos(az + Math.PI / 2) * len * 0.35;
      mid.z += Math.sin(az + Math.PI / 2) * len * 0.35;
      tip.copy(base).addScaledVector(d, len * 0.85);
      tip.x += Math.cos(az + Math.PI / 2) * len * 0.6;
      tip.z += Math.sin(az + Math.PI / 2) * len * 0.6;
      c0.copy(PALETA.micelio).lerp(PALETA.arbusculo, 0.35).multiplyScalar(0.5);
      c1.copy(PALETA.micelio).multiplyScalar(0.3);
      c2.copy(PALETA.micelioTenue).multiplyScalar(0.08);
      seg(base, mid, c0, c1);
      seg(mid, tip, c1, c2);
    }
  }

  return geoLineas(pts, cols);
}

/*
 * PELOS RADICALES: la borra fina que cubre el tramo bajo de cada raíz. Van con
 * blending NORMAL (la raíz es materia, no luz): pelitos cortos, radiales al
 * tubo, con leve caída, del pardo de la raíz a la puntita clara que busca.
 */
export function pelosRadicales(raizCurvas, { porRaiz = 14 } = {}, seed = 101) {
  const r = rng(seed);
  const pts = [];
  const cols = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const ay = new THREE.Vector3();
  const d = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c0 = new THREE.Color();
  const c1 = new THREE.Color();
  for (const { curva, r0, arbol } of raizCurvas) {
    const n = Math.max(2, Math.round(porRaiz * (arbol ? 1.35 : 1)));
    for (let k = 0; k < n; k++) {
      const u = 0.3 + r() * 0.68;
      curva.getPoint(u, p);
      curva.getTangent(u, t);
      if (Math.abs(t.y) < 0.9) ay.set(0, 1, 0); else ay.set(1, 0, 0);
      d.crossVectors(t, ay).normalize();
      d.applyAxisAngle(t, r() * Math.PI * 2);
      d.y -= 0.35;
      d.normalize();
      const len = 0.04 + r() * 0.07 + r0 * 0.6;
      a.copy(p).addScaledVector(d, r0 * 0.7 * (1 - u * 0.6));
      b.copy(a).addScaledVector(d, len);
      c0.copy(PALETA.raiz).multiplyScalar(0.55);
      c1.copy(PALETA.raizPunta).multiplyScalar(0.85);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      cols.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b);
    }
  }
  return geoLineas(pts, cols);
}

/*
 * EL ENTORNO DEL SUELO — la tierra con INFORMACIÓN, no un color plano.
 *
 * Tres piezas fundidas en UNA malla (un draw-call, normales preservadas para
 * que el relieve no salga facetado):
 *   · la PARED del fondo: relieve fbm, humus cálido arriba → mineral frío en
 *     la hondura, grietas de oscuridad LOCAL, y la luz de la RED horneada
 *     encima (cerca del filamento la tierra se enciende; en los huecos, no);
 *   · el TECHO: la cara de abajo de la capa superficial, colgando en bultos
 *     (humus, raicillas), con el sol filtrándose apenas hacia el frente;
 *   · PIEDRAS medio enterradas en la pared: deformadas una a una con fbm y
 *     pintadas con su panza en penumbra — masa, nunca el icosaedro literal.
 */
export function entornoSuelo({ luces = [], seg = 18, piedras = 6 } = {}, seed = 91) {
  const r = rng(seed);
  const brillo = PALETA.micelio;
  const RADIO_LUZ = 1.6;
  const aplicarGlow = (c, x, y, z, fuerzaMax) => {
    if (!luces.length) return;
    let max = 0;
    for (let i = 0; i < luces.length; i++) {
      const l = luces[i];
      const dx = x - l.x;
      const dy = y - l.y;
      const dz = z - l.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const cae = (1 - Math.min(1, dist / RADIO_LUZ)) * l.fuerza;
      if (cae > max) max = cae;
    }
    if (max > 0) c.lerp(brillo, max * max * fuerzaMax);
  };

  /* la PARED del fondo, con relieve */
  const anchoP = SUELO.ancho + 6;
  const altoP = SUELO.hondo + 3.4;
  const zPared = SUELO.zAtras - 0.55;
  const pared = new THREE.PlaneGeometry(anchoP, altoP, Math.round(seg * 1.5), seg);
  pared.translate(0, -altoP / 2 + 2.1, 0);
  const pp = pared.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i);
    const y = pp.getY(i);
    const n = ruidoFbm(x * 0.9 + 7, y * 0.9, 3.1);
    const n2 = ruidoFbm(x * 2.7 + 31, y * 2.7, 9.7);
    pp.setZ(i, pp.getZ(i) + (n - 0.5) * 0.5 + (n2 - 0.5) * 0.18);
  }
  pared.computeVertexNormals();
  pared.translate(0, 0, zPared);
  /*
   * Los HORIZONTES del perfil, la lección de la vitrina del Ent trasladada al
   * acuario: humus → zona de raíces → banda micorrízica → roca madre. La
   * primera versión pintaba la pared con la tierra-fondo (#120c09, casi negro)
   * y contra la niebla negra la pared entera DESAPARECÍA: el «suelo vivo» se
   * seguía leyendo como vacío y las piedras quedaban flotando en la nada. Los
   * horizontes van en penumbra (nunca compiten con la red aditiva) pero se
   * LEEN; la banda micorrízica sigue siendo la más oscura A PROPÓSITO — es el
   * fondo contra el que resalta el bioluminiscente, contraste local y no
   * global. La onda fbm evita horizontes a nivel de albañil.
   */
  const HORIZONTES_PARED = [
    { hasta: -0.55, color: new THREE.Color('#4a3325') }, // humus
    { hasta: -1.75, color: new THREE.Color('#63492f') }, // zona de raíces
    { hasta: -3.7, color: new THREE.Color('#3a2c20') }, // banda micorrízica
    { hasta: -Infinity, color: new THREE.Color('#4d4a55') }, // hacia la roca madre
  ];
  const colorHorizontePared = (y) => {
    for (const h of HORIZONTES_PARED) if (y > h.hasta) return h.color;
    return HORIZONTES_PARED[HORIZONTES_PARED.length - 1].color;
  };
  const fibra = new THREE.Color('#6b4a2a');
  const arriba = new THREE.Color('#0d1410');
  pintarPorVertice(pared, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 2.2 + 13, y * 2.2, z * 2.2);
    if (y > 0.05) {
      // por encima de la línea de tierra: la penumbra del mundo de arriba
      c.copy(PALETA.tierra).lerp(arriba, Math.min(1, (y - 0.05) / 1.6));
      c.multiplyScalar(0.75 + n * 0.3);
      return c;
    }
    const onda = (ruidoFbm(x * 0.42 + 21, 0, z * 0.42) - 0.5) * 0.5;
    c.copy(colorHorizontePared(y + onda));
    // penumbra con grano: la oscuridad fuerte es LOCAL (grieta), no global.
    // El rango se calibró con la pared en rojo puro (test empírico): por
    // debajo de ~0.8 la tierra parda cae bajo el umbral visible contra la
    // niebla negra y el perfil entero desaparece.
    c.multiplyScalar(0.85 + n * 0.85);
    if (n > 0.72) c.lerp(fibra, (n - 0.72) * 1.1);
    // compensación de niebla: el pie de la pared queda más lejos de la cámara
    // y la niebla se lo comía a negro — se le devuelve lo que la niebla quita
    c.multiplyScalar(1 + 0.4 * Math.min(1, Math.max(0, (-y - 2.6) / 3.2)));
    // viñeteo: lejos del centro, la tierra cae en sombra y el ojo va a la red
    c.multiplyScalar(1 - 0.35 * Math.min(1, Math.max(0, (Math.abs(x) - 3.4) / 3)));
    aplicarGlow(c, x, y, z, 0.55);
    return c;
  });

  /* el TECHO: la capa superficial vista desde abajo, colgando en bultos */
  const profT = SUELO.z0 - SUELO.zAtras + 1.3;
  const techo = new THREE.PlaneGeometry(
    SUELO.ancho + 3, profT,
    Math.round(seg * 1.4), Math.max(4, Math.round(seg * 0.4)),
  );
  techo.rotateX(Math.PI / 2); // queda en XZ mirando hacia abajo (−y)
  techo.translate(0, 0, SUELO.zAtras + (SUELO.z0 - SUELO.zAtras) / 2 - 0.25);
  const tp = techo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i);
    const z = tp.getZ(i);
    const n = ruidoFbm(x * 1.7 + 3, 0.5, z * 1.7);
    tp.setY(i, tp.getY(i) - 0.02 - n * 0.16);
  }
  techo.computeVertexNormals();
  const humusTecho = PALETA.tierraAlta.clone().lerp(new THREE.Color('#4a3325'), 0.5);
  const solTecho = new THREE.Color('#3d2c17');
  const frioTecho = new THREE.Color('#233a32');
  pintarPorVertice(techo, (x, y, z, i, c) => {
    const n = ruidoFbm(x * 3.1 + 23, y * 3.1, z * 3.1);
    c.copy(humusTecho).multiplyScalar(1.0 + n * 0.7);
    // hacia el frente (z0) el sol de arriba se filtra apenas
    const sol = Math.max(0, (z - SUELO.zAtras) / (SUELO.z0 - SUELO.zAtras));
    c.lerp(solTecho, Math.min(1, sol) * 0.45);
    // el bulto que cuelga atrapa la luz fría del subsuelo
    c.lerp(frioTecho, Math.min(0.35, Math.max(0, -y - 0.08) * 1.6));
    aplicarGlow(c, x, y, z, 0.4);
    return c;
  });

  /* PIEDRAS medio enterradas en la pared (cada una deformada con su semilla) */
  const partes = [pared, techo];
  const v = new THREE.Vector3();
  for (let i = 0; i < piedras; i++) {
    const radio = 0.16 + r() * 0.26;
    const g = new THREE.IcosahedronGeometry(radio, 1);
    const gp = g.attributes.position;
    const sem = r() * 40;
    for (let k = 0; k < gp.count; k++) {
      v.fromBufferAttribute(gp, k);
      const n = ruidoFbm(v.x * 3.4 + sem, v.y * 3.4, v.z * 3.4) - 0.5;
      v.multiplyScalar(1 + n * 0.5);
      gp.setXYZ(k, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    // confinadas a la franja donde la pared se LEE: una piedra sobre fondo
    // negro no es una piedra enterrada, es un grumo flotando
    const x = (r() - 0.5) * (SUELO.ancho + 2);
    const y = -0.7 - r() * 2.5;
    const zC = zPared + 0.2 + radio * 0.35;
    g.translate(x, y, zC);
    pintarPorVertice(g, (px, py, pz, k2, c) => {
      const n = ruidoFbm(px * 4.2 + 17, py * 4.2, pz * 4.2);
      c.copy(PALETA.piedra).multiplyScalar(0.75 + n * 0.7);
      // la panza que mira al fondo queda en penumbra (media enterrada)
      c.multiplyScalar(0.7 + 0.3 * Math.min(1, Math.max(0, (pz - zPared) / radio)));
      aplicarGlow(c, px, py, pz, 0.5);
      return c;
    });
    partes.push(g);
  }

  return fusionarSeguro(partes, 'entorno-suelo-vivo', { preservarNormales: true });
}

/* Una hoja de maíz: lámina arqueada con canal central, filo ondulado y punta
   afinada. Nace en +y; se orienta al colocarla. */
function hojaMaiz(largo, ancho, arco, semilla) {
  const g = new THREE.PlaneGeometry(ancho, largo, 2, 8);
  const gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const y = gp.getY(i);
    const t = y / largo + 0.5; // 0 base → 1 punta
    const filo = Math.sin(t * Math.PI * 3 + semilla) * 0.008 * t;
    const canal = (1 - Math.abs(x) / (ancho / 2)) * 0.018;
    gp.setXYZ(i, (x + filo) * (1 - t * 0.75), y, t * t * arco + canal * (1 - t));
  }
  g.computeVertexNormals();
  return g;
}

/* Una hoja redonda (fríjol/ahuyama): disco lobulado, abombado, de borde caído. */
function hojaRedonda(radio, lobulos, domo, semilla) {
  const g = new THREE.CircleGeometry(radio, 16);
  const gp = g.attributes.position;
  for (let i = 0; i < gp.count; i++) {
    let x = gp.getX(i);
    let y = gp.getY(i);
    const rad = Math.sqrt(x * x + y * y);
    if (rad > 1e-6) {
      const ang = Math.atan2(y, x);
      const lob = 1 + (lobulos ? Math.sin(ang * lobulos + semilla) * 0.13 : 0);
      const esc = lob * (1 + (ruidoFbm(Math.cos(ang) * 2 + semilla, Math.sin(ang) * 2, 0.5) - 0.5) * 0.18);
      x *= esc;
      y *= esc;
    }
    const t = Math.min(1, rad / radio);
    gp.setXYZ(i, x, y, -(t * t) * domo);
  }
  g.computeVertexNormals();
  return g;
}

/* Coloca una geometría: la escala, la orienta (+y hacia `dir`, con giro) y la
   traslada. Versión local de `apuntar` (evita ampliar la superficie pública
   del taller por una necesidad de este módulo). */
function plantar(g, pos, dir, giro = 0) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  if (giro) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro));
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]), q, new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(m);
  return g;
}

/*
 * LAS HOJAS de la superficie — reemplazan los conos facetados (`flatShading`)
 * de la versión anterior, que eran exactamente la estética prohibida. Cada
 * planta recibe su hoja de verdad: el maíz sus láminas arqueadas, el fríjol
 * sus foliolos redondos, la ahuyama sus hojas anchas lobuladas a ras de
 * tierra. Una sola malla fundida, gradiente horneado (penumbra en la base →
 * sol en la punta, vena central más oscura).
 */
export function hojasSuperficie(seed = 103) {
  const r = rng(seed);
  const partes = [];
  const sol = new THREE.Color('#d8e07a');
  for (const t of tallosSuperficie()) {
    const cBase = new THREE.Color(t.tinte).multiplyScalar(0.62);
    const cSol = new THREE.Color(t.tinte).lerp(sol, 0.42);
    const pintarHojaLarga = (g, largo, ancho) => pintarPorVertice(g, (x, y, z, i, c) => {
      const u = y / largo + 0.5;
      c.copy(cBase).lerp(cSol, u * 0.75);
      const n = ruidoFbm(x * 9 + seed, y * 9, z * 9);
      c.multiplyScalar(0.8 + n * 0.35);
      if (Math.abs(x) < ancho * 0.09) c.multiplyScalar(0.82); // la vena central
      return c;
    });
    const pintarHojaRedonda = (g, radio) => pintarPorVertice(g, (x, y, z, i, c) => {
      const rad = Math.min(1, Math.sqrt(x * x + y * y + z * z) / (radio * 1.15));
      c.copy(cSol).lerp(cBase, rad * 0.85); // nervaduras claras al centro
      const n = ruidoFbm(x * 7 + seed * 2, y * 7, z * 7);
      c.multiplyScalar(0.82 + n * 0.3);
      return c;
    });
    if (t.id === 'maiz') {
      for (let k = 0; k < 4; k++) {
        const largo = 0.42 + r() * 0.22;
        const ancho = 0.075;
        const g = hojaMaiz(largo, ancho, 0.2 + r() * 0.12, r() * 9);
        pintarHojaLarga(g, largo, ancho);
        const az = k * 2.4 + r() * 0.5;
        const lean = 0.55 + r() * 0.45;
        plantar(
          g,
          [t.x + Math.cos(az) * 0.05, 0.28 + (k / 4) * t.alto * 0.62 + r() * 0.06, t.z + Math.sin(az) * 0.05],
          [Math.cos(az) * Math.sin(lean), Math.cos(lean), Math.sin(az) * Math.sin(lean)],
          r() * Math.PI,
        );
        partes.push(g);
      }
    } else if (t.ahuyama) {
      for (let k = 0; k < 2; k++) {
        const radio = 0.19 + r() * 0.06;
        const g = hojaRedonda(radio, 5, 0.06, r() * 9);
        pintarHojaRedonda(g, radio);
        g.rotateX(-Math.PI / 2 + (r() - 0.5) * 0.5);
        g.rotateY(r() * Math.PI * 2);
        g.translate(t.x + (r() - 0.5) * 0.42, 0.1 + r() * 0.12, t.z + (r() - 0.5) * 0.3);
        partes.push(g);
      }
    } else {
      for (let k = 0; k < 3; k++) {
        const radio = 0.08 + r() * 0.025;
        const g = hojaRedonda(radio, 0, 0.035, r() * 9);
        pintarHojaRedonda(g, radio);
        g.rotateX(-Math.PI / 2 + (r() - 0.5) * 0.7);
        g.rotateY(r() * Math.PI * 2);
        g.translate(t.x + (r() - 0.5) * 0.2, 0.25 + k * 0.2 + r() * 0.06, t.z + (r() - 0.5) * 0.16);
        partes.push(g);
      }
    }
  }
  return fusionarSeguro(partes, 'hojas-superficie', { preservarNormales: true });
}

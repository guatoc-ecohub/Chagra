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
  },
  medio: {
    nodosLibres: 14, pulsos: 54, tubK: 12, tubM: 5, radioHilo: 0.015,
    motas: 40, conEnt: true, entTier: 'medio', vecinos: 2, radialRaiz: 6,
  },
  bajo: {
    nodosLibres: 8, pulsos: 0, tubK: 8, tubM: 4, radioHilo: 0.014,
    motas: 0, conEnt: false, entTier: 'bajo', vecinos: 1, radialRaiz: 5,
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

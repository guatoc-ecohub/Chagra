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

/* ═══════════════════════════════════════════════════════════════════════════════
 * ── EL CORTE DEL SUELO: LAS CAPAS QUE EL ENT ENSEÑA (la lección) ──────────────
 *
 * Todo lo que sigue es la maquinaria del CORTE de suelo del mundo del Ent
 * maestro. Vive aquí —y no en el componente— porque es geometría y datos puros:
 * headless, determinista, sin GL y sin azar por frame.
 *
 * ── LA VERDAD QUE EL ARTE TIENE QUE DECIR (corpus de micorrizas + DR) ─────────
 *  · El suelo no es tierra muerta: es un MERCADO. La mata fabrica azúcar con el
 *    sol y NO sabe fabricar fósforo; el hongo no hace fotosíntesis pero SÍ
 *    alcanza el fósforo y el agua en poros donde la raíz jamás cabe —la hifa es
 *    muchísimo más fina que un pelo absorbente—. Se lo cambian. Nadie regala.
 *  · El trueque pasa en un sitio concreto y con nombre: el ARBÚSCULO, un
 *    arbolito de hifas que el hongo arma DENTRO de la célula de la raíz. De ahí
 *    "micorriza arbuscular" (AMF), la de casi toda la chagra: maíz, fríjol, papa,
 *    café, frutales. La ECTOmicorriza (roble, pino, aliso, eucalipto) es otra
 *    cosa: no entra a la célula, envuelve la raicilla como un guante.
 *  · El fósforo del trueque no sale de la nada: NACE DE LA ROCA MADRE que se
 *    fractura con siglos de paciencia. Por eso la lección cierra abajo.
 *  · El fríjol trae otro socio: Rhizobium, en nódulos rosados, que fija
 *    nitrógeno del aire; el micelio mueve parte de ese nitrógeno al maíz. El
 *    mercado tiene TRES monedas —azúcar, fósforo/agua, nitrógeno—, no una.
 *  · Lo que rompe el mercado: la QUEMA (mata la red al instante), el ARADO (le
 *    corta los cables), el fungicida, la compactación y el suelo pelado al sol.
 *  · Pero el suelo tiene MEMORIA: las esporas aguantan, y si hay un rastrojo
 *    vecino la red vuelve a tejerse. Por eso el corte enseña los DOS suelos
 *    pegados —el vivo y el mismo potrero arado y quemado— y las hifas cruzando
 *    de vuelta. La lección no termina en la culpa: termina en que se puede.
 * ═════════════════════════════════════════════════════════════════════════════ */

/* ── Utilidades de fundido (todo el corte busca pocos draw-calls) ──────────── */

/*
 * Los poliedros de three (icosaedro, dodecaedro, octaedro) vienen SIN índice y
 * `mergeGeos` lo exige. Les pone un índice trivial sin tocar un vértice: así se
 * puede fundir cualquier primitiva sin pensar de cuál viene.
 */
export function indexar(geo) {
  if (geo.index) return geo;
  const n = geo.attributes.position.count;
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}

/*
 * Pinta una geometría con color por vértice. Con `punta`, degrada `base`→`punta`
 * a lo largo de su eje Y LOCAL: así una hoja se aclara hacia la punta y una raíz
 * hacia el pelito que busca. `mergeGeos` exige color en TODO lo que funde: hay
 * que pintar siempre ANTES de aplicar la matriz (si no, el degradado se tuerce).
 */
export function pintarGeo(geo, base, punta = null) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const c = new THREE.Color();
  let y0 = Infinity;
  let y1 = -Infinity;
  if (punta) {
    for (let i = 0; i < n; i++) {
      const y = pos.getY(i);
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const rango = y1 - y0 || 1;
  for (let i = 0; i < n; i++) {
    if (punta) c.copy(base).lerp(punta, (pos.getY(i) - y0) / rango);
    else c.copy(base);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/* Mete una PIEZA (una primitiva) pintada y transformada en la lista a fundir. */
function pieza(geos, geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], esc = 1, punta = null } = {}) {
  const s = Array.isArray(esc) ? new THREE.Vector3(...esc) : new THREE.Vector3(esc, esc, esc);
  pintarGeo(indexar(geo), color, punta);
  geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...pos),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
    s,
  ));
  geos.push(geo);
  return geos;
}

/* Funde y libera: el patrón de todo el corte (una malla, un draw-call). */
function fundir(geos) {
  if (!geos.length) return null;
  const out = mergeGeos(geos);
  geos.forEach((g) => g.dispose());
  return out;
}

/* ── La PALETA del corte ──────────────────────────────────────────────────────
 * Aparte de PALETA (que es la del suelo bioluminiscente) porque aquí mandan
 * otras leyes: arriba es diorama a plena luz de páramo —tierra, hoja, bicho— y
 * solo la banda del hongo brilla. Las cuatro etapas de la hoja son un RELOJ: si
 * el campesino ve el degradado de verde a negro, ya entendió la descomposición
 * sin que nadie se la explique.
 */
export const PALETA_SUELO = {
  // hojarasca: las cuatro etapas del tiempo, de la hoja de ayer al humus
  hojaFresca: new THREE.Color('#8ea63c'),
  hojaFrescaPunta: new THREE.Color('#b9c95e'),
  hojaOcre: new THREE.Color('#a4692c'),
  hojaOcrePunta: new THREE.Color('#c98a41'),
  hojaEncaje: new THREE.Color('#9a8154'), // solo nervios: el encaje que queda
  hojaEncajePunta: new THREE.Color('#c0a877'),
  hojaMantillo: new THREE.Color('#42301e'), // fragmentos: ya casi es tierra
  hojaMantilloPunta: new THREE.Color('#57402a'),
  // el suelo VIVO
  humus: new THREE.Color('#1d130c'),
  humusGrumo: new THREE.Color('#2e1e13'),
  agregado: new THREE.Color('#241811'), // el grumo que la glomalina pega
  gota: new THREE.Color('#79c2e6'), // agua guardada en el poro
  /* El túnel NO puede ser del color del humus o no se vería, y un túnel que no
     se ve no enseña nada. Va más claro y más cálido a propósito: sus paredes son
     turrículo —lo que la lombriz ya digirió—, que de verdad es otro material,
     más granulado y más claro que la tierra de alrededor. */
  tunel: new THREE.Color('#3a2617'),
  // el suelo CANSADO: el mismo potrero, arado y quemado
  costra: new THREE.Color('#a2917a'), // pelado al sol: se sella y escurre
  humusFlaco: new THREE.Color('#5d4d3a'),
  suela: new THREE.Color('#87775f'), // el pie de arado: la costra dura del disco
  subsueloPobre: new THREE.Color('#8b7458'),
  ceniza: new THREE.Color('#c3bbb0'),
  hifaRota: new THREE.Color('#5a6560'), // el cable cortado: ya no brilla
  esporaDormida: new THREE.Color('#8d7a9c'), // la memoria que aguanta esperando
  // roca madre
  rocaSana: new THREE.Color('#3d3c46'),
  rocaFracturada: new THREE.Color('#54535f'),
  saprolita: new THREE.Color('#6f5e46'), // la roca ya podrida: tierra recién nacida
  vetaMineral: new THREE.Color('#c9b48a'),
  // los que trabajan
  lombriz: new THREE.Color('#bf7d84'),
  clitelo: new THREE.Color('#dda9a3'),
  milpies: new THREE.Color('#5f3620'),
  ciempies: new THREE.Color('#c07434'),
  escarabajo: new THREE.Color('#251d16'),
  colembolo: new THREE.Color('#dbe4c2'),
  acaro: new THREE.Color('#a8542e'),
  bacteria: new THREE.Color('#9ff0d8'),
  // el trueque
  nitrogeno: new THREE.Color('#ff9fb8'), // lo que el fríjol fija y el hongo reparte
  nodulo: new THREE.Color('#d9697f'),
  celula: new THREE.Color('#b9d194'), // la pared de la célula de la raíz
  celulaDentro: new THREE.Color('#22301c'),
  vesicula: new THREE.Color('#ffdf9e'), // el hongo guarda grasa para la seca
  manto: new THREE.Color('#d8c48e'), // ectomicorriza: el guante sobre la raicilla
};

/* ── El BLOQUE del corte ──────────────────────────────────────────────────────
 * Una vitrina: ancha, poco honda en Z, con la CARA frontal expuesta al que mira.
 * La franja de la izquierda es el suelo CANSADO y `sutura` es la línea del arado
 * que los separa: el mismo potrero, dos manejos.
 */
export const CORTE = { ancho: 3.6, prof: 1.7, cara: 0.85, cansado: 0.8 };
export const CORTE_X = {
  izq: -CORTE.ancho / 2, // -1.80
  sutura: -CORTE.ancho / 2 + CORTE.cansado, // -1.00: la línea del arado
  der: CORTE.ancho / 2, // 1.80
};

/*
 * EL PERFIL VIVO: la lección, de arriba abajo. Cada capa lleva el rótulo que el
 * Ent enseña. Los `alto` están en metros-escena y NO son arbitrarios: la banda
 * del hongo y la de raíces son las gordas porque son las que hay que mirar.
 */
export const PERFIL_VIVO = [
  {
    id: 'hojarasca', nombre: 'Hojarasca', alto: 0.40, color: '#5c3d22',
    hint: 'La cobija del suelo: la hoja de ayer volviéndose comida.',
  },
  {
    id: 'humus', nombre: 'Humus', alto: 1.00, color: '#1d130c',
    hint: 'Tierra negra y esponjosa. Aquí se guarda el agua del verano.',
  },
  {
    id: 'raices', nombre: 'Zona de raíces', alto: 1.15, color: '#33210f',
    hint: 'Pivotante o fasciculada: cada mata bebe a su manera.',
  },
  {
    id: 'micorrizas', nombre: 'Red micorrízica', alto: 1.20, color: '#120d0a',
    hint: 'El trueque: la mata paga azúcar, el hongo devuelve fósforo y agua.',
  },
  {
    id: 'roca', nombre: 'Roca madre', alto: 0.85, color: '#3d3c46',
    hint: 'De aquí nace la tierra —y el fósforo—, con siglos de paciencia.',
  },
];

/*
 * EL PERFIL CANSADO: el mismo hondo total, repartido como lo reparte el maltrato.
 * No es una caricatura, es lo que se ve al borde de un potrero quemado y arado:
 * sin hojarasca, una costra sellada, un dedo de humus flaco, el PIE DE ARADO
 * (esa suela dura que deja el disco a la misma profundidad, año tras año) y la
 * roca ya ahí arribita porque lo de encima se lo llevó el agua.
 */
export const PERFIL_CANSADO = [
  { id: 'costra', alto: 0.10, color: '#a2917a' },
  { id: 'humusFlaco', alto: 0.20, color: '#5d4d3a' },
  { id: 'suela', alto: 0.13, color: '#87775f' },
  { id: 'subsuelo', alto: 1.87, color: '#8b7458' },
  { id: 'roca', alto: 2.30, color: '#4a4954' },
];

/* Hondo total del corte. Los dos perfiles DEBEN sumar lo mismo: son el mismo
   potrero cortado por el mismo sitio, y si no cuadran, la lección miente. */
export const HONDO_CORTE = PERFIL_VIVO.reduce((s, c) => s + c.alto, 0);

/*
 * Apila un perfil: superficie en y=0, hacia abajo negativo. Devuelve cada capa
 * con su centro (`cy`), su `techo` y su `piso`.
 */
export function apilarPerfil(perfil) {
  let techo = 0;
  return perfil.map((c) => {
    const piso = techo - c.alto;
    const capa = { ...c, cy: techo - c.alto / 2, techo, piso };
    techo = piso;
    return capa;
  });
}

/** La capa del perfil vivo con ese id, ya apilada (techo/piso reales). */
export function capaVivo(id) {
  return apilarPerfil(PERFIL_VIVO).find((c) => c.id === id);
}

/* ── LAS HOJAS: hoja de verdad, reconocible, no confeti café ─────────────────
 * Las seis que de verdad caen en una chagra de altura y en el páramo del Ent:
 * del monte el ALISO (ovada, punta larga, borde aserrado) y el ENCENILLO
 * (compuesta, con el raquis alado que lo delata); de la propia QUEÑUA su hojita
 * compuesta diminuta; y del cultivo las tres hermanas: la cinta del MAÍZ, la
 * trifoliada del FRÍJOL y la palma acorazonada de la AHUYAMA. Si el campesino no
 * las reconoce, la capa no enseña nada.
 */
export const ESPECIES_HOJA = ['quenua', 'aliso', 'encenillo', 'maiz', 'frijol', 'ahuyama'];

/*
 * Silueta de una hoja simple: se muestrea la MEDIA hoja derecha sobre una spline
 * y se espeja. `hombro` = a qué altura está lo más ancho (0.3 ovada, 0.6
 * obovada); `dientes` = cuánto muerde el aserrado del borde (0 = margen liso).
 */
function siluetaOvada({ largo = 1, ancho = 0.45, hombro = 0.4, dientes = 0, n = 20 }) {
  const w = ancho / 2;
  const curva = new THREE.SplineCurve([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(w * 0.5, largo * hombro * 0.3),
    new THREE.Vector2(w, largo * hombro),
    new THREE.Vector2(w * 0.78, largo * (hombro + (1 - hombro) * 0.45)),
    new THREE.Vector2(w * 0.3, largo * (hombro + (1 - hombro) * 0.84)),
    new THREE.Vector2(0, largo),
  ]);
  const der = curva.getPoints(n);
  if (dientes > 0) {
    // el diente del borde apunta hacia la punta de la hoja (así muerde de verdad)
    for (let i = 1; i < der.length - 1; i++) {
      const d = i % 2 ? dientes : -dientes * 0.3;
      der[i].x += w * d;
      der[i].y += largo * d * 0.22;
    }
  }
  const pts = [...der];
  for (let i = der.length - 2; i >= 1; i--) pts.push(new THREE.Vector2(-der[i].x, der[i].y));
  return pts;
}

/*
 * Silueta PALMADA (la ahuyama): radio con lóbulos, y un seno acorazonado en la
 * base —ese golpe de corazón es lo que la hace inconfundible de lejos.
 */
function siluetaPalmada({ largo = 1, lobulos = 5, hendidura = 0.3, n = 56 }) {
  const abre = Math.PI * 0.88;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = -abre + (i / n) * (abre * 2);
    const lob = Math.pow(Math.abs(Math.cos((a * lobulos) / 2)), 0.55);
    const r = largo * (1 - hendidura + hendidura * lob);
    pts.push(new THREE.Vector2(Math.sin(a) * r * 0.92, Math.cos(a) * r));
  }
  pts.push(new THREE.Vector2(0, -largo * 0.06)); // el peciolo cierra el seno
  return pts;
}

/* Un pedacito roto de hoja: polígono irregular. La etapa 3 no son hojas chiquitas
   —son FRAGMENTOS—, y mentir ahí sería mentir sobre la descomposición. */
function siluetaFragmento(r) {
  const n = 7;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rad = 0.018 + r() * 0.026;
    return new THREE.Vector2(Math.cos(a) * rad, Math.sin(a) * rad * 0.78);
  });
}

/* Puntos 2D → THREE.Shape, con rotación/escala/traslación (para las compuestas). */
function formaDe(pts, { rot = 0, dx = 0, dy = 0, esc = 1 } = {}) {
  const co = Math.cos(rot);
  const si = Math.sin(rot);
  const s = new THREE.Shape();
  pts.forEach((p, i) => {
    const x = (p.x * co - p.y * si) * esc + dx;
    const y = (p.x * si + p.y * co) * esc + dy;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  });
  return s;
}

/* Una TIRA recta (un nervio, una pared de célula): cuadrilátero de a→b. */
function tira(x0, y0, x1, y1, grosor) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * grosor * 0.5;
  const ny = (dx / L) * grosor * 0.5;
  const s = new THREE.Shape();
  s.moveTo(x0 + nx, y0 + ny);
  s.lineTo(x1 + nx, y1 + ny);
  s.lineTo(x1 - nx, y1 - ny);
  s.lineTo(x0 - nx, y0 - ny);
  return s;
}

/* Medidas de cada hoja en un solo sitio: la lámina y el nervio tienen que salir
   de los MISMOS números o el encaje no le queda a la hoja. */
const HOJA_MEDIDA = {
  quenua: { largo: 0.075, ancho: 0.05, hombro: 0.58, dientes: 0, pares: 2 },
  aliso: { largo: 0.30, ancho: 0.17, hombro: 0.36, dientes: 0.09, pares: 6 },
  encenillo: { largo: 0.07, ancho: 0.042, hombro: 0.42, dientes: 0.11, pares: 2 },
  maiz: { largo: 0.62, ancho: 0.075, hombro: 0.45, dientes: 0, paralelo: true },
  frijol: { largo: 0.16, ancho: 0.115, hombro: 0.34, dientes: 0, pares: 4 },
  ahuyama: { largo: 0.20, ancho: 0.20, palmada: true, pares: 5 },
};

/** Las FORMAS de una hoja (una por lámina; las compuestas traen varias). */
export function hojaFormas(id) {
  const M = HOJA_MEDIDA[id];
  switch (id) {
    case 'aliso':
      return [formaDe(siluetaOvada(M))];
    case 'maiz':
      return [formaDe(siluetaOvada({ ...M, n: 16 }))];
    case 'ahuyama':
      return [formaDe(siluetaPalmada({ largo: M.largo, lobulos: 5 }))];
    case 'frijol': {
      // trifoliada: el foliolo de la punta y los dos de los lados
      const f = siluetaOvada(M);
      return [
        formaDe(f, { dy: 0.10 }),
        formaDe(f, { rot: 0.95, dx: -0.05, dy: 0.05, esc: 0.88 }),
        formaDe(f, { rot: -0.95, dx: 0.05, dy: 0.05, esc: 0.88 }),
      ];
    }
    case 'quenua': {
      // imparipinnada: foliolitos diminutos a lado y lado del raquis + el impar
      const f = siluetaOvada({ ...M, n: 12 });
      const out = [formaDe(f, { dy: 0.095 })];
      for (const s of [-1, 1]) {
        out.push(formaDe(f, { rot: s * 1.15, dx: s * 0.032, dy: 0.058, esc: 0.9 }));
        out.push(formaDe(f, { rot: s * 1.25, dx: s * 0.03, dy: 0.016, esc: 0.8 }));
      }
      return out;
    }
    case 'encenillo': {
      // compuesta con el RAQUIS ALADO (la firma del encenillo) + foliolos serrados
      const f = siluetaOvada({ ...M, n: 10 });
      const out = [
        formaDe(siluetaOvada({ largo: 0.28, ancho: 0.035, hombro: 0.5, n: 10 })),
        formaDe(f, { dy: 0.235, esc: 0.85 }),
      ];
      for (let i = 0; i < 3; i++) {
        const dy = 0.06 + i * 0.06;
        const esc = 1 - i * 0.12;
        out.push(formaDe(f, { rot: 1.25, dx: -0.011, dy, esc }));
        out.push(formaDe(f, { rot: -1.25, dx: 0.011, dy, esc }));
      }
      return out;
    }
    default:
      return [formaDe(siluetaOvada({ largo: 0.2, ancho: 0.1 }))];
  }
}

/*
 * Los NERVIOS de una hoja: el central y los secundarios que salen hacia la punta
 * (o, en el maíz, los PARALELOS que lo delatan como pasto). Es lo único que
 * queda cuando la hoja se esqueletiza: ese encaje que uno encuentra escarbando
 * la hojarasca vieja y que es la prueba de que algo se la comió.
 */
export function venasFormas(id) {
  const M = HOJA_MEDIDA[id] || HOJA_MEDIDA.aliso;
  const out = [];
  if (M.paralelo) {
    // maíz: nervios paralelos de punta a punta, el central más grueso
    const k = 5;
    for (let i = 0; i < k; i++) {
      const x = ((i - (k - 1) / 2) / ((k - 1) / 2)) * (M.ancho * 0.34);
      out.push(tira(x * 0.25, M.largo * 0.02, x, M.largo * 0.97, i === 2 ? 0.009 : 0.005));
    }
    return out;
  }
  if (M.palmada) {
    // ahuyama: los nervios salen del peciolo, uno por lóbulo (palmada de verdad)
    out.push(tira(0, -M.largo * 0.05, 0, M.largo * 0.9, 0.011));
    for (const s of [-1, 1]) {
      for (let i = 1; i <= 2; i++) {
        const a = s * i * 0.62;
        const r = M.largo * (0.78 - i * 0.06);
        out.push(tira(0, -M.largo * 0.02, Math.sin(a) * r, Math.cos(a) * r, 0.008));
      }
    }
    return out;
  }
  // el resto: pinnada — nervio central + pares que suben en diagonal a la punta
  out.push(tira(0, 0, 0, M.largo, 0.011));
  const pares = M.pares || 5;
  for (let i = 0; i < pares; i++) {
    const t = 0.16 + (i / pares) * 0.66;
    const y0 = M.largo * t;
    const y1 = y0 + M.largo * 0.19;
    const w = (M.ancho / 2) * (0.86 - t * 0.5);
    out.push(tira(0, y0, w, y1, 0.0055));
    out.push(tira(0, y0, -w, y1, 0.0055));
  }
  return out;
}

/*
 * Las que se esqueletizan a la vista. Son las de lámina SIMPLE a propósito: una
 * hoja compuesta —queñua, encenillo, fríjol— no deja un encaje entero, se
 * desarma en foliolos y cada uno se va por su lado. Dibujar el encaje de una
 * compuesta sería inventar. Estas tres sí dejan la caladura que uno encuentra
 * escarbando, y su nervadura sale de las MISMAS medidas que su lámina.
 */
export const ESPECIES_ENCAJE = ['aliso', 'maiz', 'ahuyama'];

/*
 * La malla de una hoja (o de su encaje de nervios). Cada lámina va en su propio
 * plano en Z —un pelo de separación— para que los foliolos no peleen con el
 * raquis. Sin pintar: la pinta quien la siembra, según su etapa.
 */
export function hojaGeom(id, { venas = false } = {}) {
  const formas = venas ? venasFormas(id) : hojaFormas(id);
  const geos = formas.map((f, i) => {
    const g = new THREE.ShapeGeometry(f, 6);
    g.translate(0, 0, i * 0.0008);
    return indexar(pintarGeo(g, PALETA_SUELO.hojaOcre));
  });
  return fundir(geos);
}

/* Enrolla una hoja: la seca se acartucha en canoa. z += k·x² sobre la lámina
   plana — barato, y es exactamente lo que hace una hoja al morirse. */
function rizarGeo(geo, k) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) + k * x * x);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* Las cuatro ETAPAS: es un reloj, y se lee de arriba (hoja de ayer) a abajo
   (tierra). Etapa 2 no tiene lámina: solo el encaje de nervios. */
const ETAPA = [
  { col: PALETA_SUELO.hojaFresca, punta: PALETA_SUELO.hojaFrescaPunta, rizo: 0.6, venas: false, esc: 1 },
  { col: PALETA_SUELO.hojaOcre, punta: PALETA_SUELO.hojaOcrePunta, rizo: 7, venas: false, esc: 0.92 },
  { col: PALETA_SUELO.hojaEncaje, punta: PALETA_SUELO.hojaEncajePunta, rizo: 4, venas: true, esc: 0.85 },
  { col: PALETA_SUELO.hojaMantillo, punta: PALETA_SUELO.hojaMantilloPunta, rizo: 2, venas: false, esc: 0.7 },
];

/*
 * LA HOJARASCA del corte: hojas reconocibles en las cuatro etapas, sembradas por
 * PROFUNDIDAD para que el tiempo se lea solo —arriba la hoja entera de ayer;
 * más abajo, ocre y acartuchada; luego solo el encaje de nervios; al fondo,
 * fragmentos que ya son casi humus—. Van casi paralelas a la cara del corte
 * (convención de vitrina: si se acostaran como en el potrero, se verían de canto
 * y no se reconocería ninguna, que es justo el pecado a corregir).
 * Todo fundido en UNA malla.
 */
export function hojarascaCorte({ x0, x1, techo, piso, cara, n = 26, seed = 17 }) {
  const r = rng(seed);
  const geos = [];
  const cache = new Map();
  const base = (id, venas) => {
    const k = `${id}|${venas}`;
    if (!cache.has(k)) cache.set(k, hojaGeom(id, { venas }));
    return cache.get(k);
  };
  const alto = techo - piso;
  for (let i = 0; i < n; i++) {
    const t = Math.min(0.999, (i + r() * 0.8) / n); // 0 arriba → 1 abajo
    const e = Math.min(3, Math.floor(t * 4));
    const E = ETAPA[e];
    const lista = E.venas ? ESPECIES_ENCAJE : ESPECIES_HOJA;
    const id = lista[(r() * lista.length) | 0];
    let geo;
    if (e === 3) {
      // fragmentos: ya no son hoja de nadie, son pedazos
      geo = indexar(new THREE.ShapeGeometry(formaDe(siluetaFragmento(r)), 4));
    } else {
      geo = base(id, E.venas).clone();
    }
    rizarGeo(geo, E.rizo * (0.6 + r() * 0.8));
    pintarGeo(geo, E.col, E.punta);
    const esc = E.esc * (0.8 + r() * 0.45);
    // las de arriba se acuestan más (recién caídas); las hondas se aplastan
    const tumbe = (0.5 - t) * 0.9 + (r() - 0.5) * 0.5;
    geo.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(
        x0 + 0.12 + r() * (x1 - x0 - 0.24),
        techo - 0.05 - t * (alto - 0.08),
        cara - 0.015 - r() * 0.1,
      ),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(tumbe, (r() - 0.5) * 0.7, r() * Math.PI * 2)),
      new THREE.Vector3(esc, esc, esc),
    ));
    geos.push(geo);
  }
  cache.forEach((g) => g.dispose());
  return fundir(geos);
}

/*
 * Las hojas que van CAYENDO de la copa del Ent al corte. Pocas: la hojarasca no
 * es una lluvia, es un goteo paciente —y ese goteo es justamente la lección
 * (todos los días cae un poquito y por eso hay suelo).
 */
export function hojasCayendo(n = 5, seed = 29) {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({
    especie: ESPECIES_HOJA[(r() * ESPECIES_HOJA.length) | 0],
    x: -1.5 + r() * 3.0,
    z: 0.2 + r() * 0.5,
    fase: r() * Math.PI * 2,
    vel: 0.1 + r() * 0.08,
    giro: 0.3 + r() * 0.6,
    esc: 0.8 + r() * 0.5,
    alto: 1.4 + r() * 1.1, // desde dónde arranca a caer sobre el corte
  }));
}

/* ── LOS QUE TRABAJAN ────────────────────────────────────────────────────────
 * Fauna con oficio, no fauna de adorno. El MILPIÉS es el que de verdad tritura
 * la hoja (lento, acorazado, se enrolla); el CIEMPIÉS no come hoja: caza al que
 * la come, y por eso es plano y rápido; el ESCARABAJO entierra la materia y con
 * eso airea; el COLÉMBOLO y el ÁCARO son el gentío que nadie ve y que hace la
 * mayor parte del trabajo. Cada uno, una malla fundida.
 */

/* Cuerpo por segmentos a lo largo de un arco: el plano corporal de un miriápodo. */
function cuerpoSegmentado(geos, { seg, largo, radio, color, arco = 0.5, patas = 0, patLargo = 0, patCol }) {
  for (let i = 0; i < seg; i++) {
    const t = i / (seg - 1);
    const a = (t - 0.5) * arco;
    const x = (t - 0.5) * largo;
    const y = -Math.cos(a) * largo * 0.12 + largo * 0.1;
    const rr = radio * (0.55 + 0.45 * Math.sin(Math.PI * (0.15 + t * 0.85)));
    pieza(geos, new THREE.SphereGeometry(rr, 6, 5), color, { pos: [x, y, 0] });
    if (patas && i > 0 && i < seg - 1) {
      for (const s of [-1, 1]) {
        pieza(geos, new THREE.CylinderGeometry(patLargo * 0.12, patLargo * 0.06, patLargo, 3), patCol || color, {
          pos: [x, y - rr * 0.5, s * rr * 0.7],
          rot: [s * 0.9, 0, 0],
        });
      }
    }
  }
}

/** La malla de un bicho del suelo (fundida y pintada; mira hacia +X). */
export function bichoGeom(tipo) {
  const geos = [];
  const S = PALETA_SUELO;
  if (tipo === 'milpies') {
    // acorazado, cilíndrico, muchas patitas cortas: el triturador de hojarasca
    cuerpoSegmentado(geos, {
      seg: 11, largo: 0.3, radio: 0.028, color: S.milpies, arco: 1.9,
      patas: 1, patLargo: 0.03, patCol: new THREE.Color('#8a5730'),
    });
    for (const s of [-1, 1]) {
      pieza(geos, new THREE.CylinderGeometry(0.0035, 0.002, 0.05, 3), new THREE.Color('#8a5730'), {
        pos: [0.16, 0.05, s * 0.012], rot: [0, 0, -0.7],
      });
    }
  } else if (tipo === 'ciempies') {
    // aplanado y de patas largas: el cazador, no come hoja
    cuerpoSegmentado(geos, {
      seg: 12, largo: 0.36, radio: 0.02, color: S.ciempies, arco: 1.1,
      patas: 1, patLargo: 0.055, patCol: new THREE.Color('#e0a05a'),
    });
    pieza(geos, new THREE.SphereGeometry(0.026, 6, 5), S.ciempies, { pos: [0.19, 0.04, 0], esc: [1, 0.7, 1.1] });
    for (const s of [-1, 1]) {
      pieza(geos, new THREE.CylinderGeometry(0.003, 0.0015, 0.07, 3), new THREE.Color('#e0a05a'), {
        pos: [0.22, 0.06, s * 0.012], rot: [0, 0, -0.9],
      });
    }
  } else if (tipo === 'escarabajo') {
    // el que entierra la materia: con eso airea sin que nadie le pague
    pieza(geos, new THREE.SphereGeometry(0.055, 7, 6), S.escarabajo, { pos: [0, 0.05, 0], esc: [1.3, 0.62, 0.95] });
    pieza(geos, new THREE.SphereGeometry(0.03, 6, 5), new THREE.Color('#3a2c20'), { pos: [0.07, 0.045, 0] });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        pieza(geos, new THREE.CylinderGeometry(0.005, 0.003, 0.06, 3), new THREE.Color('#3a2c20'), {
          pos: [-0.03 + i * 0.035, 0.02, s * 0.04], rot: [s * 1.0, 0, 0.3],
        });
      }
    }
  } else if (tipo === 'colembolo') {
    // la FURCA doblada bajo el vientre: se suelta y salta. Por eso "saltarín".
    pieza(geos, new THREE.SphereGeometry(0.05, 6, 5), S.colembolo, { pos: [0, 0.05, 0], esc: [1.5, 0.85, 0.9] });
    pieza(geos, new THREE.SphereGeometry(0.028, 6, 5), new THREE.Color('#eef3dd'), { pos: [0.07, 0.055, 0] });
    pieza(geos, new THREE.CylinderGeometry(0.005, 0.002, 0.075, 3), new THREE.Color('#b9c69a'), {
      pos: [-0.05, 0.02, 0], rot: [0, 0, 1.35],
    });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        pieza(geos, new THREE.CylinderGeometry(0.004, 0.002, 0.045, 3), new THREE.Color('#b9c69a'), {
          pos: [-0.02 + i * 0.03, 0.025, s * 0.03], rot: [s * 1.05, 0, 0.2],
        });
      }
    }
  } else if (tipo === 'acaro') {
    // redondo y de OCHO patas: no es insecto, es pariente de la araña
    pieza(geos, new THREE.SphereGeometry(0.045, 7, 6), S.acaro, { pos: [0, 0.045, 0], esc: [1.1, 0.85, 1] });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        pieza(geos, new THREE.CylinderGeometry(0.0045, 0.002, 0.05, 3), new THREE.Color('#c9713f'), {
          pos: [-0.025 + i * 0.02, 0.03, s * 0.03], rot: [s * 1.1, 0, -0.5 + i * 0.35],
        });
      }
    }
  }
  return fundir(geos);
}

/* ── LAS RAÍCES: la arquitectura que de verdad las distingue ─────────────────
 * PIVOTANTE (fríjol, ahuyama, los árboles): una raíz madre gruesa que se hunde
 * derecho a buscar el agua honda, y de ella salen las laterales. Aguanta el
 * verano porque llega abajo.
 * FASCICULADA (el maíz y todos los pastos): un manojo de raíces del mismo
 * calibre que salen de la base y tejen una malla SOMERA. Agarra el suelo como
 * una mano, pero se sufre en el verano —y por eso el maíz es el que más depende
 * de la red del hongo—.
 * Arrancan arriba, en el humus, y bajan CRUZANDO las bandas: las capas son un
 * modo de nombrar el suelo, no tabiques.
 */
export const MATAS_CORTE = [
  { id: 'maiz', x: -0.5, tipo: 'fasciculada', raices: 9, hondo: 1.8, esparce: 0.62, r0: 0.026 },
  { id: 'frijol', x: 0.5, tipo: 'pivotante', raices: 6, hondo: 2.5, esparce: 0.42, r0: 0.05, nodulos: 8 },
  { id: 'ahuyama', x: 1.35, tipo: 'pivotante', raices: 5, hondo: 2.1, esparce: 0.5, r0: 0.042 },
];

/* Dónde queda la bolsa de agua que las raíces van a buscar (hidrotropismo: la
   raíz no adivina, sigue el gradiente de humedad — y se ve). */
export const BOLSA_AGUA = { x: 1.0, y: -2.28, r: 0.3 };

export function raicesCorte({ techo = -0.3, cara, tier = 'alto', seed = 91 }) {
  const r = rng(seed);
  /* Los pelos tiran de su PROPIO azar. Si comieran del mismo `r`, cambiar de
     tier le movería la arquitectura a la mata —y el tier quita detalle, no
     redibuja la planta—: el fríjol tiene que ser el mismo fríjol en el celular
     viejo y en el bueno. */
  const rp = rng(seed + 7);
  const curvas = [];
  const puntas = [];
  const pelos = [];
  const nodulos = [];
  const porPelo = tier === 'alto' ? 3 : tier === 'medio' ? 2 : 1;
  const zBase = cara - 0.28;

  const sembrarPelos = (curva) => {
    // los pelos absorbentes viven en el ÚLTIMO tramo: atrás la raíz ya se
    // suberizó y no absorbe nada. Son cortísimos —y esa es la lección: al lado
    // de una hifa, un pelo absorbente no es nada.
    const m = tier === 'bajo' ? 3 : 6;
    for (let i = 0; i < m; i++) {
      const t = 0.6 + (i / m) * 0.38;
      const pos = curva.getPointAt(t);
      const tan = curva.getTangentAt(t).normalize();
      const per = new THREE.Vector3(-tan.y, tan.x, 0).normalize();
      for (let k = 0; k < porPelo; k++) {
        const dir = per.clone().applyAxisAngle(tan, (k / porPelo) * Math.PI * 2 + rp() * 0.7).normalize();
        pelos.push({ pos: pos.clone(), dir, largo: 0.035 + rp() * 0.028 });
      }
    }
  };

  for (const M of MATAS_CORTE) {
    const base = new THREE.Vector3(M.x, techo, zBase + (r() - 0.5) * 0.1);
    if (M.tipo === 'fasciculada') {
      for (let i = 0; i < M.raices; i++) {
        const lado = (i / (M.raices - 1) - 0.5) * 2; // -1 → 1
        const dx = lado * M.esparce * (0.75 + r() * 0.5);
        const largo = M.hondo * (0.62 + r() * 0.45) * (1 - Math.abs(lado) * 0.24);
        const p3 = base.clone().add(new THREE.Vector3(dx, -largo, (r() - 0.5) * 0.3));
        const curva = new THREE.CatmullRomCurve3([
          base.clone(),
          base.clone().add(new THREE.Vector3(dx * 0.42, -largo * 0.3, (r() - 0.5) * 0.12)),
          base.clone().add(new THREE.Vector3(dx * 0.86, -largo * 0.68, (r() - 0.5) * 0.2)),
          p3,
        ], false, 'catmullrom', 0.5);
        curvas.push({ curva, r0: M.r0 * (0.85 + r() * 0.3) });
        puntas.push({ pos: p3.clone(), tipo: 'raiz', planta: M.id, arbol: false });
        sembrarPelos(curva);
      }
      continue;
    }
    // PIVOTANTE: la madre derecho al fondo…
    const meta = M.id === 'ahuyama'
      ? new THREE.Vector3(BOLSA_AGUA.x, BOLSA_AGUA.y, zBase) // …y esta va por el agua
      : base.clone().add(new THREE.Vector3((r() - 0.5) * 0.25, -M.hondo, 0));
    const madre = new THREE.CatmullRomCurve3([
      base.clone(),
      base.clone().lerp(meta, 0.35).add(new THREE.Vector3((r() - 0.5) * 0.12, 0, 0)),
      base.clone().lerp(meta, 0.72).add(new THREE.Vector3((r() - 0.5) * 0.14, 0, 0)),
      meta.clone(),
    ], false, 'catmullrom', 0.5);
    curvas.push({ curva: madre, r0: M.r0 });
    puntas.push({ pos: meta.clone(), tipo: 'raiz', planta: M.id, arbol: false });
    sembrarPelos(madre);
    // …y de ella salen las laterales
    for (let i = 0; i < M.raices - 1; i++) {
      const t = 0.22 + (i / (M.raices - 1)) * 0.6;
      const desde = madre.getPointAt(t);
      const s = i % 2 ? 1 : -1;
      const largo = M.esparce * (0.7 + r() * 0.75);
      const fin = desde.clone().add(new THREE.Vector3(s * largo, -largo * (0.45 + r() * 0.5), (r() - 0.5) * 0.28));
      const lat = new THREE.CatmullRomCurve3([
        desde.clone(),
        desde.clone().lerp(fin, 0.5).add(new THREE.Vector3(0, largo * 0.14, 0)),
        fin,
      ], false, 'catmullrom', 0.5);
      curvas.push({ curva: lat, r0: M.r0 * 0.42 });
      puntas.push({ pos: fin.clone(), tipo: 'raiz', planta: M.id, arbol: false });
      if (tier !== 'bajo') sembrarPelos(lat);
      // los NÓDULOS del fríjol: ahí adentro el Rhizobium saca nitrógeno del aire
      // y le cobra azúcar. Son rosados por dentro de verdad (leghemoglobina), y
      // son otro socio distinto del hongo: el mercado tiene más de un puesto.
      if (M.nodulos) {
        const k = 2 + ((r() * 2) | 0);
        for (let j = 0; j < k; j++) {
          nodulos.push({
            pos: lat.getPointAt(0.25 + r() * 0.6),
            r: 0.026 + r() * 0.016,
          });
        }
      }
    }
  }
  const geo = tuboRaizGeom(curvas, { radial: tier === 'alto' ? 6 : 4, tubular: tier === 'alto' ? 14 : 8 });
  return { geo, curvas, puntas, pelos, nodulos: nodulos.slice(0, 10) };
}

/* ── EL ARBÚSCULO: donde de verdad pasa el trueque ───────────────────────────
 * El hongo entra en la célula de la raíz y se ramifica ADENTRO como un arbolito
 * —de ahí el nombre "arbuscular"— hasta tener tantísima superficie de contacto
 * que el intercambio se vuelve fácil. No es una metáfora bonita: es literalmente
 * un árbol de hifas dentro de una célula viva, y es el mostrador del mercado.
 */
export function arbusculoGeom({ alto = 0.26, niveles = 4, seed = 5 } = {}) {
  const r = rng(seed);
  const geos = [];
  const ejeZ = new THREE.Vector3(0, 0, 1);
  const ejeX = new THREE.Vector3(1, 0, 0);
  const ramificar = (a, dir, largo, radio, nivel) => {
    const b = a.clone().addScaledVector(dir, largo);
    const geo = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, radio, 4, false);
    pintarGeo(indexar(geo), PALETA.arbusculo.clone().lerp(PALETA_SUELO.vesicula, nivel / niveles));
    geos.push(geo);
    if (nivel >= niveles) return;
    const n = nivel === 0 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const abre = (i - (n - 1) / 2) * (0.95 / (nivel * 0.45 + 1)) + (r() - 0.5) * 0.22;
      const d = dir.clone().applyAxisAngle(ejeZ, abre).applyAxisAngle(ejeX, (r() - 0.5) * 0.45).normalize();
      ramificar(b, d, largo * (0.66 + r() * 0.14), radio * 0.7, nivel + 1);
    }
  };
  ramificar(new THREE.Vector3(0, -alto * 0.5, 0), new THREE.Vector3(0, 1, 0), alto * 0.34, 0.014, 0);
  return fundir(geos);
}

/*
 * Las CÉLULAS de la raíz vistas en corte: ladrillos, que es como se ven de
 * verdad. En una vive el arbúsculo (el mostrador) y en otra la VESÍCULA, donde
 * el hongo guarda grasa para aguantar la seca. Solo las paredes: lo de adentro
 * tiene que verse.
 */
export function celulasGeom({ w = 0.66, h = 0.36, n = 3, grosor = 0.014 } = {}) {
  const formas = [];
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + cw * (i + 0.5);
    formas.push(tira(x - cw / 2, h / 2, x + cw / 2, h / 2, grosor));
    formas.push(tira(x - cw / 2, -h / 2, x + cw / 2, -h / 2, grosor));
    formas.push(tira(x - cw / 2, -h / 2, x - cw / 2, h / 2, grosor));
    formas.push(tira(x + cw / 2, -h / 2, x + cw / 2, h / 2, grosor));
  }
  return fundir(formas.map((f) => indexar(pintarGeo(new THREE.ShapeGeometry(f, 1), PALETA_SUELO.celula))));
}

/* ── LA RED del corte ────────────────────────────────────────────────────────
 * No se inventa raíces: se enchufa a las PUNTAS de verdad que bajan de la capa
 * de arriba. Si la red no toca las raíces que uno está viendo, la lección no se
 * cree. Manda hifas ABAJO, a minar las grietas de la roca (de allá sale el
 * fósforo del trueque), y las deja subir entre las raíces: la red no es una
 * capa, es un tejido que envuelve todo; la dibujamos por bandas solo para poder
 * nombrarla.
 */
export function redCorte({ puntas, banda, cara, tier = 'alto', seed = 41 }) {
  const r = rng(seed);
  const libres = [];
  const alto = banda.techo - banda.piso;
  const x0 = CORTE_X.sutura + 0.14;
  const anchoUtil = CORTE_X.der - CORTE_X.sutura - 0.28;
  const nLibres = tier === 'alto' ? 20 : tier === 'medio' ? 13 : 7;
  for (let i = 0; i < nLibres; i++) {
    const espora = r() > 0.8;
    libres.push({
      pos: new THREE.Vector3(
        x0 + r() * anchoUtil,
        banda.techo - 0.07 - r() * (alto - 0.14),
        cara - 0.07 - r() * 0.45,
      ),
      tipo: espora ? 'espora' : 'nodo',
      planta: null,
    });
  }
  // las hifas que bajan a MINAR la roca: sueltan ácidos y arrancan el fósforo
  // pegado al mineral, donde ninguna raíz llega jamás
  const nMina = tier === 'bajo' ? 2 : 4;
  for (let i = 0; i < nMina; i++) {
    libres.push({
      pos: new THREE.Vector3(
        x0 + 0.3 + r() * (anchoUtil - 0.6),
        banda.piso - 0.05 - r() * 0.2,
        cara - 0.1 - r() * 0.3,
      ),
      tipo: 'mina',
      planta: null,
    });
  }
  /* Nos enchufamos a las puntas MÁS HONDAS de cada mata, y no a las que caigan
     dentro de una franja: que las TRES hermanas queden conectadas es la lección
     —el maíz es justo el que más depende del hongo, por fasciculado y somero—, y
     no puede quedar a la suerte del sorteo. Tomando las más hondas de cada una,
     las tres entran siempre y el micelio tampoco se sube a ensuciar la
     hojarasca. */
  const porMata = new Map();
  for (const p of puntas) {
    if (!porMata.has(p.planta)) porMata.set(p.planta, []);
    porMata.get(p.planta).push(p);
  }
  const kMata = tier === 'alto' ? 3 : 2;
  const enchufe = [];
  for (const lista of porMata.values()) {
    enchufe.push(...[...lista].sort((a, b) => a.pos.y - b.pos.y).slice(0, kMata));
  }
  const { nodos, hilos } = construirRed(enchufe, libres, { vecinos: tier === 'alto' ? 2 : 1 }, seed);
  const geo = geometriaRed(hilos, { tubK: tier === 'alto' ? 12 : 8, tubM: 4, radioHilo: 0.013 });
  const curvas = hilos.map(curvaHilo);
  const pulsos = pulsosDeRed(hilos, tier === 'alto' ? 64 : tier === 'medio' ? 28 : 0, seed + 12);
  return { nodos, hilos, geo, curvas, pulsos };
}

/* ── LA MEMORIA DEL SUELO ────────────────────────────────────────────────────
 * Hifas que cruzan la sutura desde el suelo vivo hacia el cansado. Es lo más
 * importante que dice este corte y no se puede recortar: la red vuelve si hay de
 * dónde —un rastrojo, un lindero, este pedazo de al lado—. La lección no termina
 * en el regaño: termina en que sí se puede.
 */
export function recolonizacion({ y = -0.7, cara, n = 3, seed = 67 }) {
  const r = rng(seed);
  const hilos = [];
  for (let i = 0; i < n; i++) {
    const y0 = y - r() * 0.45;
    const a = new THREE.Vector3(CORTE_X.sutura + 0.2 + r() * 0.3, y0, cara - 0.09 - r() * 0.22);
    const b = new THREE.Vector3(CORTE_X.izq + 0.14 + r() * 0.28, y0 - 0.12 - r() * 0.4, cara - 0.11 - r() * 0.2);
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 0.09 + r() * 0.1;
    hilos.push({ a, b, mid, puente: true, grosor: 1.1 + r() * 0.4, color: PALETA.puente.clone(), ida: true });
  }
  const geo = geometriaRed(hilos, { tubK: 10, tubM: 4, radioHilo: 0.012 });
  return {
    geo,
    curvas: hilos.map(curvaHilo),
    // van SIEMPRE del vivo hacia el cansado: la dirección es el mensaje
    pulsos: hilos.map((_, i) => ({
      hilo: i, t0: r(), vel: 0.045 + r() * 0.02, dir: 1,
      color: PALETA.puente.clone(), tipo: 'vuelve', tam: 0.95,
    })),
  };
}

/*
 * LO QUE QUEDA EN EL SUELO CANSADO: hifas ROTAS —cables cortados por el disco,
 * ya sin brillo— y esporas DORMIDAS. No está muerto: está esperando. Esa
 * diferencia es toda la lección de esta franja.
 */
export function sueloCansadoVida({ cara, techo = -0.45, piso = -2.3, tier = 'alto', seed = 83 }) {
  const r = rng(seed);
  const geos = [];
  const n = tier === 'bajo' ? 5 : 11;
  const x0 = CORTE_X.izq + 0.1;
  const ancho = CORTE.cansado - 0.2;
  for (let i = 0; i < n; i++) {
    const a = new THREE.Vector3(x0 + r() * ancho, techo - r() * (techo - piso), cara - 0.06 - r() * 0.3);
    const b = a.clone().add(new THREE.Vector3((r() - 0.5) * 0.22, (r() - 0.5) * 0.18, (r() - 0.5) * 0.1));
    const geo = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, 0.009, 3, false);
    pintarGeo(indexar(geo), PALETA_SUELO.hifaRota);
    geos.push(geo);
  }
  const esporas = Array.from({ length: tier === 'bajo' ? 3 : 6 }, () => ({
    pos: new THREE.Vector3(x0 + r() * ancho, techo - 0.1 - r() * (techo - piso - 0.2), cara - 0.05 - r() * 0.25),
    esc: 0.8 + r() * 0.6,
    fase: r() * Math.PI * 2,
  }));
  return { rotas: fundir(geos), esporas };
}

/* ── EL HUMUS: la esponja ────────────────────────────────────────────────────
 * La tierra buena NO es polvo: es GRUMO. Y el grumo lo pega la glomalina, una
 * goma que suelta el propio hongo. Entre grumo y grumo queda el poro, y ahí es
 * donde se guarda el agua del verano y por donde respira la raíz. Por eso un
 * suelo vivo se ve GORDO —esponja, aire, bulto— y uno cansado se ve apretado y
 * liso: la diferencia no es el color, es la ESTRUCTURA. Eso es lo que hay que
 * lograr que se vea de un vistazo.
 */
export function agregadosHumus({ x0, x1, techo, piso, cara, tier = 'alto', seed = 61 }) {
  const r = rng(seed);
  const geos = [];
  const alto = techo - piso;
  const n = tier === 'alto' ? 46 : tier === 'medio' ? 26 : 12;
  for (let i = 0; i < n; i++) {
    const esc = 0.055 + r() * 0.075;
    const col = PALETA_SUELO.agregado.clone().lerp(PALETA_SUELO.humusGrumo, r() * 0.9);
    pieza(geos, new THREE.DodecahedronGeometry(1, 0), col, {
      pos: [
        x0 + 0.08 + r() * (x1 - x0 - 0.16),
        techo - 0.04 - r() * (alto - 0.08),
        cara - 0.03 - r() * 0.4,
      ],
      rot: [r() * 3, r() * 3, r() * 3],
      esc: [esc * (0.85 + r() * 0.5), esc * (0.7 + r() * 0.5), esc * (0.85 + r() * 0.4)],
    });
  }
  // el agua GUARDADA en el poro: esto es lo que se pierde cuando el suelo se
  // vuelve polvo, y es exactamente lo que se echa de menos en el veranito
  const gotas = Array.from({ length: tier === 'bajo' ? 3 : 9 }, () => ({
    pos: new THREE.Vector3(
      x0 + 0.14 + r() * (x1 - x0 - 0.28),
      techo - 0.1 - r() * (alto - 0.2),
      cara - 0.02,
    ),
    esc: 0.022 + r() * 0.02,
    fase: r() * Math.PI * 2,
  }));
  return { geo: fundir(geos), gotas };
}

/*
 * LA LOMBRIZ. No es un adorno rosado: se come la hojarasca y la caga hecha
 * humus —el humus es literalmente eso—, y al pasar deja un TÚNEL por donde entra
 * el aire y baja el agua. Media docena de lombrices en un terrón es el mejor
 * examen de suelo que hay, y es gratis. La quema las mata de una.
 * Devuelve la curva por donde va (el componente le pone la onda que la mueve) y
 * el túnel que va dejando atrás.
 */
export function lombrizCorte({ x = 0, y = -0.8, cara, largo = 0.66, seed = 73 } = {}) {
  const r = rng(seed);
  const z = cara - 0.06;
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x - largo * 0.5, y - 0.1 - r() * 0.05, z - 0.14),
    new THREE.Vector3(x - largo * 0.18, y + 0.06, z - 0.02),
    new THREE.Vector3(x + largo * 0.16, y - 0.08, z),
    new THREE.Vector3(x + largo * 0.5, y + 0.02, z - 0.1),
  ], false, 'catmullrom', 0.5);
  // el túnel: lo que la lombriz DEJA, que vale más que la lombriz misma
  const tunel = new THREE.TubeGeometry(curva, 18, 0.052, 6, false);
  pintarGeo(indexar(tunel), PALETA_SUELO.tunel);
  return { curva, tunel, seg: 13 };
}

/* ── LA ROCA MADRE: el tiempo geológico ──────────────────────────────────────
 * Abajo la piedra todavía es un solo cuerpo. Subiendo, el agua se mete por la
 * grieta, hiela, empuja, y la piedra se va partiendo en bloques cada vez más
 * chiquitos hasta que arriba ya no es piedra: es tierra recién nacida. Ese
 * degradado ES el nacimiento del suelo, y hay que poder leerlo sin texto.
 * Y de esa grieta sale el FÓSFORO que el hongo va a minar y a vender: la
 * lección cierra abajo y no arriba, porque el mercado empieza en la piedra.
 */
export function rocaCorte({ x0, x1, techo, piso, cara, tier = 'alto', seed = 55 }) {
  const r = rng(seed);
  const geos = [];
  const alto = techo - piso;
  // la roca SANA del fondo: todavía entera, todavía no es de nadie
  pieza(geos, new THREE.BoxGeometry(x1 - x0, 0.18, CORTE.prof * 0.92), PALETA_SUELO.rocaSana, {
    pos: [(x0 + x1) / 2, piso + 0.07, 0],
  });
  const n = tier === 'alto' ? 26 : tier === 'medio' ? 16 : 9;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(r(), 0.85); // 0 abajo (bloque grande) → 1 arriba (grava)
    const esc = 0.3 * (1 - t * 0.8) + 0.03;
    const col = t < 0.45
      ? PALETA_SUELO.rocaSana.clone().lerp(PALETA_SUELO.rocaFracturada, t / 0.45)
      : PALETA_SUELO.rocaFracturada.clone().lerp(PALETA_SUELO.saprolita, (t - 0.45) / 0.55);
    pieza(geos, new THREE.DodecahedronGeometry(1, 0), col, {
      pos: [x0 + 0.1 + r() * (x1 - x0 - 0.2), piso + 0.12 + t * (alto - 0.16), cara - 0.04 - r() * 0.36],
      rot: [r() * 3, r() * 3, r() * 3],
      esc: [esc * (0.8 + r() * 0.6), esc * (0.55 + r() * 0.5), esc * (0.8 + r() * 0.4)],
    });
  }
  // las VETAS: por ahí se mete el agua, se mete la hifa, y la piedra cede
  const nv = tier === 'bajo' ? 2 : 5;
  for (let i = 0; i < nv; i++) {
    const ax = x0 + 0.15 + r() * (x1 - x0 - 0.3);
    const ay = piso + 0.06 + r() * alto * 0.45;
    const bx = ax + (r() - 0.5) * 0.55;
    const by = ay + 0.22 + r() * alto * 0.5;
    pieza(geos, new THREE.ShapeGeometry(tira(ax, ay, bx, by, 0.012 + r() * 0.012), 1), PALETA_SUELO.vetaMineral, {
      pos: [0, 0, cara - 0.018],
    });
  }
  /* Los MINERALES que suben de la grieta a la red. Van lentísimos a propósito:
     esto no pasa en una cosecha, pasa en siglos. Si se movieran rico, mentiría. */
  const minerales = Array.from({ length: tier === 'bajo' ? 0 : tier === 'medio' ? 10 : 18 }, () => ({
    x: x0 + 0.15 + r() * (x1 - x0 - 0.3),
    y0: piso + 0.1 + r() * alto * 0.6,
    z: cara - 0.06 - r() * 0.3,
    sube: alto * 0.65 + r() * 0.9,
    vel: 0.012 + r() * 0.016,
    fase: r() * Math.PI * 2,
    esc: 0.5 + r() * 0.7,
  }));
  return { geo: fundir(geos), minerales };
}

/* ── LA LUPA: la escala que el campesino nunca ve ────────────────────────────
 * En una cucharada de esta tierra hay más bichos que gente en el país, y son
 * ellos los que de verdad mandan. Se dibuja como LUPA —no como adorno— porque la
 * honestidad de la lección exige decir que esto NO se ve a simple vista: aquí
 * hay que creerle al vidrio. Adentro: bacterias, hifas, un colémbolo y un ácaro.
 * Coordenadas locales de la lupa (disco de radio 1).
 */
export function vidaInvisible({ tier = 'alto', seed = 97 } = {}) {
  const r = rng(seed);
  const enDisco = (rad) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * rad;
    return new THREE.Vector2(Math.cos(a) * d, Math.sin(a) * d);
  };
  const bacterias = Array.from({ length: tier === 'alto' ? 38 : tier === 'medio' ? 20 : 10 }, () => {
    const p = enDisco(0.86);
    return { pos: new THREE.Vector3(p.x, p.y, 0), esc: 0.16 + r() * 0.2, fase: r() * Math.PI * 2 };
  });
  const geos = [];
  const nh = tier === 'bajo' ? 3 : 7;
  for (let i = 0; i < nh; i++) {
    const a = enDisco(0.8);
    const b = enDisco(0.8);
    const m = new THREE.Vector2().addVectors(a, b).multiplyScalar(0.5);
    const geo = new THREE.TubeGeometry(
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(a.x, a.y, 0),
        new THREE.Vector3(m.x + (r() - 0.5) * 0.3, m.y + (r() - 0.5) * 0.3, 0),
        new THREE.Vector3(b.x, b.y, 0),
      ),
      8, 0.014, 3, false,
    );
    pintarGeo(indexar(geo), PALETA.micelio);
    geos.push(geo);
  }
  return { bacterias, hifas: fundir(geos) };
}

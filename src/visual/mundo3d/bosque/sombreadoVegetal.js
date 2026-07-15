/*
 * sombreadoVegetal — el TALLER común de la vegetación procedural del páramo.
 *
 * Aquí vive lo que el DR de realismo-3d-vegetacion (2026-06-19) identifica como
 * el mayor retorno visual por costo, y que la primera versión de la flora NO
 * tenía. El diagnóstico del DR era exacto: un cono/esfera de follaje sobre un
 * cilindro, con UN color plano horneado por parte, se lee como "árbol de navidad".
 *
 * Las cuatro recetas que aplicamos aquí (DR §2 y §"Entregable"):
 *
 *   1. SOMBREADO con profundidad (§1 "Sombreado plano"): en vez de un color
 *      plano, cada vértice recibe oclusión ambiental horneada (qué tan hundido
 *      está en la masa de follaje) + gradiente de altura (el sol pega arriba) +
 *      un dejo de translucidez en el borde de la copa (la hoja a contraluz).
 *      Es gratis en runtime: viaja en el atributo `color`.
 *   2. SILUETA irregular (§1 "Silueta irreal"): el borde de la copa se modula
 *      con ruido y los cúmulos se siembran con huecos → el cielo se ve a través.
 *   3. JERARQUÍA de ramas (§1 "Ausencia de jerarquía"): troncos con curva y
 *      conicidad reales, ramas que nacen en ángulo áureo y se subdividen.
 *   4. FUSIÓN SEGURA: `mergeGeometries` devuelve **null en silencio** si se
 *      mezclan geometrías indexadas con no-indexadas → r3f hace `if(!geo) return
 *      null` y la especie NO SE DIBUJA sin un solo error en consola. Ya mordió
 *      dos veces. Aquí se desindexa TODO y se truena fuerte si el retorno es null.
 *
 * Todo es three core puro: corre headless (sin contexto GL) y es testeable.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* PRNG determinista (LCG): el mismo bosque en cada carga, nunca azar por frame. */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const UP = new THREE.Vector3(0, 1, 0);

/* -------------------------------------------------------------------------- */
/*  Ruido determinista (sin dependencias)                                      */
/* -------------------------------------------------------------------------- */

/** Hash escalar estable → [0,1). Base del ruido de valor. */
function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  h -= Math.floor(h);
  return h;
}

const suave = (t) => t * t * (3 - 2 * t); // smoothstep

/**
 * Ruido de valor 3D en [0,1], continuo y determinista. Sirve para romper la
 * perfección geométrica: arruga la corteza, muerde el borde de la copa, mancha
 * el color. Barato: se evalúa en tiempo de construcción, nunca por frame.
 */
export function ruido3D(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = suave(x - xi);
  const yf = suave(y - yi);
  const zf = suave(z - zi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), xf);
  const x10 = lerp(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), xf);
  const x11 = lerp(c(0, 1, 1), c(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf);
}

/** Ruido fractal (2 octavas): detalle grueso + fino. Devuelve [0,1]. */
export function ruidoFbm(x, y, z) {
  return ruido3D(x, y, z) * 0.65 + ruido3D(x * 2.3, y * 2.3, z * 2.3) * 0.35;
}

/* -------------------------------------------------------------------------- */
/*  Fusión segura (la trampa del null silencioso)                              */
/* -------------------------------------------------------------------------- */

/** Desindexa si hace falta. Uniformar índice es lo que evita el merge → null. */
export function desindexar(geo) {
  return geo.index ? geo.toNonIndexed() : geo;
}

/**
 * Fusiona partes en UNA geometría (1 draw-call por especie).
 *
 * TRUENA si el merge devuelve null en vez de dejar la especie invisible: ese
 * fallo silencioso ya costó dos depuraciones largas. Todas las partes se
 * desindexan primero (poliedros vienen no-indexados y cilindros/conos sí →
 * mezclarlos es exactamente lo que devuelve null).
 *
 * @param {THREE.BufferGeometry[]} partes
 * @param {string} etiqueta  nombre de la especie, para que el error diga QUIÉN.
 */
export function fusionarSeguro(partes, etiqueta = 'sin-nombre') {
  const buenas = partes.filter(Boolean).map(desindexar);
  if (!buenas.length) {
    throw new Error(`[sombreadoVegetal] "${etiqueta}": no hay partes que fusionar.`);
  }
  // Todas deben declarar los MISMOS atributos o el merge devuelve null.
  const refAttrs = Object.keys(buenas[0].attributes).sort().join(',');
  for (let i = 0; i < buenas.length; i++) {
    const attrs = Object.keys(buenas[i].attributes).sort().join(',');
    if (attrs !== refAttrs) {
      throw new Error(
        `[sombreadoVegetal] "${etiqueta}": la parte ${i} tiene atributos [${attrs}] `
        + `pero se esperaba [${refAttrs}]. mergeGeometries devolvería null y la `
        + 'especie no se dibujaría. Revise que TODAS las partes pasen por pintar*().',
      );
    }
  }
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error(
      `[sombreadoVegetal] "${etiqueta}": mergeGeometries devolvió NULL. `
      + 'Causa típica: mezcla de geometrías indexadas y no-indexadas, o atributos '
      + 'dispares. La especie habría quedado INVISIBLE sin error.',
    );
  }
  g.computeVertexNormals();
  return g;
}

/* -------------------------------------------------------------------------- */
/*  Colocación                                                                 */
/* -------------------------------------------------------------------------- */

/** Coloca una geometría (transforma sus vértices) con pos/rot/escala. */
export function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el eje +Y de la geometría hacia `dir` y la ubica en `pos`. */
export function apuntar(geo, pos, dir, esc = [1, 1, 1], giro = 0) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  if (giro) q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, giro));
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    q,
    new THREE.Vector3(esc[0], esc[1], esc[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  Horneado de color por vértice — el corazón del realismo (DR §"mayor        */
/*  retorno": AO + gradiente + translucidez + variación)                       */
/* -------------------------------------------------------------------------- */

/** Aplica un color por vértice calculado por `fn(x, y, z, i) → THREE.Color`. */
export function pintarPorVertice(geo, fn) {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const col = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i, c);
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Color plano en todos los vértices. Para piezas pequeñas (bayas, flores). */
export function pintarPlano(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  return pintarPorVertice(geo, () => c);
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Hornea el sombreado de un CÚMULO DE FOLLAJE (la receta #1 del DR).
 *
 * Tres capas que, juntas, sacan a la copa de "masa sólida verde":
 *   · AO: el vértice se oscurece según lo HUNDIDO que está en la masa de la
 *     copa (distancia al centro del cúmulo, normalizada por su radio). El
 *     interior queda en penumbra y el borde se enciende → volumen real.
 *   · Gradiente de altura: arriba pega el sol, abajo queda en sombra propia.
 *   · Translucidez de borde: en la piel exterior la hoja se lee a contraluz →
 *     se mezcla un verde más claro y amarillento (la falsa SSS del DR, pero
 *     horneada: cero costo de shader, corre en Android barato).
 *
 * @param {THREE.BufferGeometry} geo  geometría YA colocada en coords del árbol.
 * @param {object} o
 * @param {THREE.Color|string} o.base    verde de la hoja en penumbra.
 * @param {THREE.Color|string} o.sol     verde iluminado (arriba/afuera).
 * @param {THREE.Color|string} [o.luz]   tinte de contraluz (hoja translúcida).
 * @param {[number,number,number]} o.centro  centro del cúmulo (coords del árbol).
 * @param {number} o.radio               radio del cúmulo.
 * @param {number} [o.yMin]   base del rango de altura del gradiente.
 * @param {number} [o.yMax]   tope del rango de altura del gradiente.
 * @param {number} [o.ao]                fuerza de la oclusión (0..1).
 * @param {number} [o.manchas]           variación de ruido por vértice.
 */
export function hornearFollaje(geo, o) {
  const base = new THREE.Color(o.base);
  const sol = new THREE.Color(o.sol);
  const luz = new THREE.Color(o.luz ?? '#cfd98a');
  const [cx, cy, cz] = o.centro;
  const radio = Math.max(0.001, o.radio);
  const yMin = o.yMin ?? cy - radio;
  const yMax = o.yMax ?? cy + radio;
  const aoK = o.ao ?? 0.62;
  const manchas = o.manchas ?? 0.1;
  const tmp = new THREE.Color();

  return pintarPorVertice(geo, (x, y, z) => {
    // Profundidad dentro del cúmulo: 0 en el corazón → 1 en la piel exterior.
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) / radio;
    const piel = clamp01(d);
    // AO: el corazón de la copa queda oscuro; la piel, expuesta.
    const ao = 1 - aoK * (1 - piel * piel);
    // Gradiente de altura: el sol viene de arriba.
    const alt = clamp01((y - yMin) / Math.max(0.001, yMax - yMin));
    tmp.copy(base).lerp(sol, alt * 0.75 + piel * 0.25);
    // Contraluz: solo en la piel exterior, y más arriba que abajo.
    const contra = clamp01((piel - 0.72) / 0.28) * (0.35 + alt * 0.4);
    if (contra > 0) tmp.lerp(luz, contra * 0.45);
    tmp.multiplyScalar(ao);
    // Manchas: rompe el plano uniforme (nubes de hoja más clara/oscura).
    if (manchas > 0) {
      const n = ruidoFbm(x * 1.7 + 11, y * 1.7, z * 1.7);
      tmp.multiplyScalar(1 + (n - 0.5) * manchas * 2);
    }
    return tmp;
  });
}

/**
 * Hornea el sombreado de CORTEZA: grieta oscura / cresta clara, oclusión de
 * contacto contra el suelo y velo de líquen abajo (DR §"Corteza sin textura").
 *
 * @param {THREE.BufferGeometry} geo  tronco/rama YA colocado.
 * @param {object} o
 * @param {THREE.Color|string} o.grieta  fondo de la fisura.
 * @param {THREE.Color|string} o.cuerpo  corteza madura.
 * @param {THREE.Color|string} [o.cresta] lámina expuesta (papel del Polylepis).
 * @param {THREE.Color|string} [o.liquen] líquen que trepa el pie.
 * @param {number} [o.escalaGrano]  frecuencia del grano de corteza.
 * @param {number} [o.hastaLiquen]  altura hasta donde trepa el líquen.
 */
export function hornearCorteza(geo, o) {
  const grieta = new THREE.Color(o.grieta);
  const cuerpo = new THREE.Color(o.cuerpo);
  const cresta = new THREE.Color(o.cresta ?? o.cuerpo);
  const liquen = o.liquen ? new THREE.Color(o.liquen) : null;
  const grano = o.escalaGrano ?? 5.5;
  const hastaLiquen = o.hastaLiquen ?? 0;
  const tmp = new THREE.Color();

  return pintarPorVertice(geo, (x, y, z) => {
    // Grano de corteza: fibras verticales (mucha frecuencia en el plano XZ,
    // poca en Y → la veta corre a lo largo del tronco, como en la madera real).
    const v = ruidoFbm(x * grano * 2.2, y * grano * 0.5, z * grano * 2.2);
    tmp.copy(grieta).lerp(cuerpo, clamp01(v * 1.5));
    if (v > 0.62) tmp.lerp(cresta, clamp01((v - 0.62) / 0.38) * 0.8);
    // Oclusión de contacto: el pie del árbol vive en penumbra.
    const pie = clamp01(y / 1.1);
    tmp.multiplyScalar(0.55 + 0.45 * pie);
    // Líquen del páramo trepando la base (mancha, no capa uniforme).
    if (liquen && y < hastaLiquen) {
      const m = ruidoFbm(x * 3.1 + 5, y * 3.1, z * 3.1 + 5);
      const cuanto = clamp01((hastaLiquen - y) / hastaLiquen) * clamp01((m - 0.42) / 0.58);
      tmp.lerp(liquen, cuanto * 0.75);
    }
    return tmp;
  });
}

/* -------------------------------------------------------------------------- */
/*  Geometría orgánica: troncos y ramas con conicidad y arruga reales          */
/* -------------------------------------------------------------------------- */

/**
 * Tubo orgánico sobre una curva: conicidad real + arruga de corteza en la
 * geometría (no un normal-map). Es la pieza con la que se hacen troncos, ramas
 * y raíces. El DR insiste: un cilindro perfecto se delata; la conicidad y la
 * irregularidad son baratas y valen mucho.
 *
 * @param {THREE.Curve} curva
 * @param {object} o
 * @param {number} o.tubular  segmentos a lo largo.
 * @param {number} o.radial   segmentos alrededor.
 * @param {(t:number)=>number} o.taper  radio-mundo en t∈[0,1].
 * @param {number} [o.arruga]  amplitud relativa del relieve de corteza.
 * @param {number} [o.semilla] desfase del relieve (para que no se repita).
 */
export function tuboOrganico(curva, o) {
  const { tubular, radial, taper } = o;
  const arruga = o.arruga ?? 0.12;
  const semilla = o.semilla ?? 0;
  const geo = new THREE.TubeGeometry(curva, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const nAnillo = radial + 1;

  const centros = [];
  for (let i = 0; i <= tubular; i++) centros.push(curva.getPointAt(i / tubular));

  const v = new THREE.Vector3();
  const off = new THREE.Vector3();
  for (let k = 0; k < pos.count; k++) {
    const anillo = Math.floor(k / nAnillo);
    const j = k % nAnillo;
    const t = anillo / tubular;
    const ang = (j / radial) * Math.PI * 2;
    const centro = centros[Math.min(anillo, centros.length - 1)];

    v.fromBufferAttribute(pos, k);
    off.subVectors(v, centro);
    // Arruga: surcos que corren a lo largo + grano fino, más marcados abajo.
    const surco = Math.sin(ang * 7 + semilla + t * 1.6) * 0.55
      + Math.sin(ang * 15 - semilla * 2 + t * 3) * 0.25
      + (ruido3D(Math.cos(ang) * 3 + semilla, t * 9, Math.sin(ang) * 3) - 0.5) * 1.4;
    const disp = 1 + surco * arruga * (1 + (1 - t) * 0.5);
    v.copy(centro).addScaledVector(off, Math.max(0.02, taper(t) * disp));
    pos.setXYZ(k, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** Taper lineal de r0 (base) a r1 (punta). */
export const taperLineal = (r0, r1 = 0.02) => (t) => Math.max(0.012, r0 * (1 - t) + r1 * t);

/**
 * Taper de TRONCO: raigón ensanchado al pie (contrafuertes), adelgazamiento
 * potencial hacia la copa y pulsos de nudo. Nada de conos.
 */
export function taperTronco(r0, r1, raigon = 0.35) {
  return (t) => {
    const base = (r0 - r1) * Math.pow(Math.max(0, 1 - t), 1.4) + r1;
    const pie = r0 * raigon * Math.exp(-t * 8);
    const nudo = r0 * 0.06 * Math.sin(t * 6.5) * Math.sin(t * Math.PI);
    return Math.max(0.015, base + pie + nudo);
  };
}

/**
 * Curva de tronco con inclinación, curvatura y torsión deterministas. Un árbol
 * real pelea con el viento: no es un eje recto.
 */
export function curvaTronco({ altura, inclina = 0.1, sinuoso = 0.12, giro = 0 }, seed = 1) {
  const r = rng(seed);
  const n = 5;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = altura * t;
    // La inclinación crece con la altura; la sinuosidad serpentea alrededor.
    const lean = inclina * altura * t * t;
    const ang = giro + t * Math.PI * 1.3;
    const s = sinuoso * altura * (0.25 + t * 0.75);
    pts.push(new THREE.Vector3(
      Math.cos(giro) * lean + Math.cos(ang) * s * (r() * 0.6 + 0.2),
      y,
      Math.sin(giro) * lean + Math.sin(ang) * s * (r() * 0.6 + 0.2),
    ));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

/* -------------------------------------------------------------------------- */
/*  Cúmulos de follaje con HUECOS y borde irregular (anti árbol-de-navidad)    */
/* -------------------------------------------------------------------------- */

/**
 * Siembra puntos de hoja dentro de un elipsoide, PERO:
 *   · con rechazo por distancia mínima (Poisson pobre) → no se apelmazan;
 *   · con huecos: el ruido decide dónde NO hay hoja → el cielo entra;
 *   · con borde mordido: el radio se modula por dirección → silueta irregular.
 *
 * Esto es, literalmente, lo que separa una copa creíble de una bola de helado.
 *
 * @returns {{pos:[number,number,number], esc:number, giro:[number,number,number]}[]}
 */
export function sembrarFollaje({
  centro, radio, achatado = 0.78, n, semilla = 1,
  huecos = 0.42, mordida = 0.34, distMin = 0.34,
}) {
  const r = rng(semilla);
  const puntos = [];
  const intentos = n * 14;
  for (let i = 0; i < intentos && puntos.length < n; i++) {
    // Dirección uniforme en la esfera.
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(th);
    const dy = u;
    const dz = s * Math.sin(th);
    // Borde mordido: el radio útil depende de la dirección (ruido) → la copa
    // deja de ser una esfera y adquiere bultos y entrantes.
    const muerde = 1 - mordida * ruidoFbm(dx * 2 + semilla, dy * 2, dz * 2);
    const rad = radio * muerde * Math.cbrt(r());
    const p = [
      centro[0] + dx * rad,
      centro[1] + dy * rad * achatado,
      centro[2] + dz * rad,
    ];
    // Huecos: el ruido apaga regiones enteras → claros dentro de la copa.
    if (huecos > 0 && ruidoFbm(p[0] * 1.15 + 31, p[1] * 1.15, p[2] * 1.15) < huecos * 0.55) continue;
    // Rechazo por cercanía: nada de grumos apelmazados.
    let choca = false;
    for (let k = 0; k < puntos.length; k++) {
      const q = puntos[k].pos;
      if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 < distMin * distMin) {
        choca = true;
        break;
      }
    }
    if (choca) continue;
    puntos.push({
      pos: /** @type {[number, number, number]} */ (p),
      esc: 0.62 + r() * 0.55,
      giro: /** @type {[number, number, number]} */ ([r() * Math.PI, r() * Math.PI, r() * Math.PI]),
    });
  }
  return puntos;
}

/**
 * Un "matojo" de hoja: poliedro achatado y deformado con ruido. No es una
 * esfera — es un manojo irregular. Con `hornearFollaje` encima, se lee como
 * masa de hojas y no como bola.
 */
export function matojoHoja(radio, semilla = 1, deform = 0.42) {
  const g = new THREE.IcosahedronGeometry(radio, 0);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = ruidoFbm(v.x * 2.6 + semilla, v.y * 2.6, v.z * 2.6) - 0.5;
    v.multiplyScalar(1 + n * deform * 2);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  return g;
}

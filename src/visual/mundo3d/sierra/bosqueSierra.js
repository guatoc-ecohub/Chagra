/*
 * bosqueSierra — la DISPOSICIÓN del bosque sobre la ladera. Datos puros: cero
 * three, cero React. Decide DÓNDE va cada árbol; la geometría la pone
 * `arbolMayor.geom.js` y el montaje `GaleriaSierraArboles.jsx`.
 *
 * ── POR QUÉ EXISTE ──────────────────────────────────────────────────────────
 * El veredicto del operador señaló "la disposición" con nombre propio. Y tenía
 * razón: la ladera era un monte PELADO con cuatro árboles gigantes en fila, uno
 * por piso, repartidos a intervalos parejos de X. Nada de eso existe en la
 * naturaleza, y el ojo lo cachó al instante: sin bosque alrededor no hay ESCALA
 * —un árbol solo en una loma lisa se lee como un juguete sobre una mesa— y una
 * fila regular se lee como una grilla, que es lo contrario de un monte.
 *
 * ── LA REGLA (el DR de realismo, §disposición biogeográfica) ────────────────
 * "Los árboles no crecen en una cuadrícula": agrupamiento, claros, sotobosque,
 * borde, y densidad mandada por ruido. Aquí eso se aterriza así:
 *
 *   1. BANDA DE ALTITUD, no de X. Cada especie vive en su franja de altura real
 *      (su piso térmico) y se siembra por RECHAZO: se propone un punto y se
 *      acepta solo si la altura del terreno ahí cae en su banda. Como la ladera
 *      tiene relieve, el bosque se acomoda solo siguiendo las curvas de nivel:
 *      sube por las vaguadas, se corta en los filos. Nadie dibujó ese contorno —
 *      sale de cruzar la banda con el terreno, que es como pasa de verdad.
 *   2. RODALES, no reparto parejo. Los árboles nacen en GRUPOS alrededor de unos
 *      pocos centros, con caída gaussiana. Entre rodal y rodal queda monte
 *      abierto.
 *   3. LÍNEA ARBÓREA. Por encima del páramo NO hay árboles: superpáramo y nival
 *      van pelados. La queñua (Polylepis) es el último árbol y por eso marca el
 *      filo del bosque — es literalmente el bosque más alto del mundo.
 *   4. CLAROS. Cada héroe se para en su propio claro: el bosque lo rodea pero no
 *      se le encima, así sigue siendo el hito que se toca para entrar.
 *   5. BORDE. Los árboles del filo de la banda salen más chicos (achaparrados por
 *      el viento y el frío), como en un ecotono real.
 *
 * Todo determinista (rng de semilla): el mismo bosque en todos los equipos, y
 * cachea limpio en el service worker.
 */
import { rng, ESPECIES, JITTER_GIRO } from './arbolMayor.geom.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/*
 * La franja de altitud de cada especie, en FRACCIÓN de la altura del monte
 * (0 = orilla del mar, 1 = cumbre). Coinciden con las bandas de color del
 * terreno: el bosque y el piso térmico cuentan la misma historia.
 *
 * `sube` es cuánto trepa la banda con el clima (0=hoy … 1=2050): el mismo
 * corrimiento que ya aplica el monte a su color. El bosque MIGRA con su piso.
 */
export const BANDAS_BOSQUE = {
  ceiba: { min: 0.015, max: 0.15, sube: 1.0 },
  guayacan: { min: 0.13, max: 0.33, sube: 1.05 },
  roble: { min: 0.31, max: 0.53, sube: 1.2 },
  quenua: { min: 0.5, max: 0.7, sube: 1.0 }, // el último bosque: arriba, nada
};

/** El corrimiento máximo de las bandas con el clima (mismo número que el monte). */
export const SUBIDA_MAX = 0.14;

/** La banda de una especie ya desplazada por el clima `d` (0=hoy, 1=2050). */
export function bandaConClima(especie, d = 0) {
  const b = BANDAS_BOSQUE[especie];
  if (!b) return null;
  const off = d * SUBIDA_MAX * b.sube;
  return { min: clamp(b.min + off, 0, 0.95), max: clamp(b.max + off, 0, 0.96) };
}

/*
 * Cuántos árboles de relleno por especie y tier. NO son draw-calls: cada especie
 * (por variante) es UN InstancedMesh. Son instancias, que cuestan triángulos.
 * 'bajo' guarda lo justo para que la ladera no se lea pelada.
 */
export const BOSQUE_TIER = {
  alto: { ceiba: 16, guayacan: 26, roble: 40, quenua: 32 },
  medio: { ceiba: 8, guayacan: 12, roble: 20, quenua: 15 },
  bajo: { ceiba: 3, guayacan: 5, roble: 8, quenua: 6 },
};
export const bosqueDeTier = (tier) => BOSQUE_TIER[tier] || BOSQUE_TIER.medio;

/**
 * Siembra los árboles de UNA especie por rechazo dentro de su banda de altitud.
 *
 * @param {object} arg
 * @param {string} arg.especie          clave de ESPECIES.
 * @param {number} arg.cuantos
 * @param {(x:number,z:number)=>number} arg.altura  altura del terreno en mundo.
 * @param {number} arg.cima             altura de referencia (para la fracción).
 * @param {{x0:number,x1:number,z0:number,z1:number}} arg.area  dónde se puede sembrar.
 * @param {Array<{x:number,z:number,r:number}>} [arg.claros]  zonas prohibidas.
 * @param {number} [arg.d]              clima 0..1.
 * @param {number} [arg.seed]
 * @param {number} [arg.variantes]      cuántas variantes de geometría repartir.
 * @returns {Array<{pos:[number,number,number], giroY:number, escala:number, tint:[number,number,number], variante:number}>}
 */
export function sembrarEspecie({
  especie,
  cuantos,
  altura,
  cima,
  area,
  claros = [],
  d = 0,
  seed = 1,
  variantes = 3,
}) {
  const banda = bandaConClima(especie, d);
  if (!banda || cuantos <= 0) return [];
  const r = rng(seed);
  const out = [];

  // ── 1) Centros de RODAL: pocos, dentro de la banda. El bosque nace en grupos. ──
  const nGrupos = Math.max(2, Math.round(cuantos / 5));
  const grupos = [];
  let intentos = 0;
  while (grupos.length < nGrupos && intentos < 900) {
    intentos++;
    const x = lerp(area.x0, area.x1, r());
    const z = lerp(area.z0, area.z1, r());
    const yf = altura(x, z) / cima;
    if (yf < banda.min || yf > banda.max) continue;
    grupos.push({ x, z, radio: 1.1 + r() * 2.2 });
  }
  if (!grupos.length) return [];

  // ── 2) Árboles alrededor de los rodales, por rechazo contra la banda ──
  intentos = 0;
  const tope = cuantos * 90;
  while (out.length < cuantos && intentos < tope) {
    intentos++;
    const g = grupos[Math.floor(r() * grupos.length) % grupos.length];
    // caída hacia el borde del rodal (√ = uniforme en el disco; sin √ = apretado
    // al centro, que es lo que hace un rodal de verdad)
    const ang = r() * Math.PI * 2;
    const rad = g.radio * r() * r() * 1.6;
    const x = g.x + Math.cos(ang) * rad;
    const z = g.z + Math.sin(ang) * rad;
    if (x < area.x0 || x > area.x1 || z < area.z0 || z > area.z1) continue;

    const y = altura(x, z);
    const yf = y / cima;
    // la banda manda: aquí es donde el bosque agarra la curva de nivel
    if (yf < banda.min || yf > banda.max) continue;

    // los claros de los héroes no se invaden
    let enClaro = false;
    for (const c of claros) {
      const dx = x - c.x, dz = z - c.z;
      if (dx * dx + dz * dz < c.r * c.r) { enClaro = true; break; }
    }
    if (enClaro) continue;

    // no se pisan entre ellos
    let choca = false;
    for (const o of out) {
      const dx = x - o.pos[0], dz = z - o.pos[2];
      if (dx * dx + dz * dz < 0.34) { choca = true; break; }
    }
    if (choca) continue;

    // ── 3) BORDE: al filo de su banda el árbol sale achaparrado (ecotono real) ──
    const centro = (banda.min + banda.max) / 2;
    const mitad = Math.max(0.001, (banda.max - banda.min) / 2);
    const alFilo = clamp(Math.abs(yf - centro) / mitad, 0, 1);
    const vigor = lerp(1, 0.62, alFilo * alFilo);

    out.push({
      pos: /** @type {[number, number, number]} */ ([x, y, z]),
      // giro CHICO a propósito: la luz va horneada y un giro grande la haría
      // mentir (ver §ROTACIÓN en arbolMayor.geom.js). La variedad la dan las
      // variantes de geometría, no el giro.
      giroY: (r() - 0.5) * 2 * JITTER_GIRO,
      // Escala CHICA a propósito: son el bosque de fondo, no el hito. El héroe
      // de cada piso mide 2-3x esto — la proporción de un emergente viejo sobre
      // el dosel, que es justo lo que se ve en un bosque real. Con la escala
      // grande, el bosque se comía la montaña y al héroe.
      escala: vigor * (0.26 + r() * 0.2),
      tint: tinte(r),
      variante: Math.floor(r() * variantes) % variantes,
    });
  }
  return out;
}

/**
 * Variación de color por instancia (R3 del DR): que no haya dos árboles iguales.
 * @returns {[number, number, number]}
 */
function tinte(r) {
  const f = 0.9 + r() * 0.2; // claro/oscuro
  const verde = 1 + (r() - 0.5) * 0.1; // más o menos verde
  const cl = (v) => clamp(v, 0.72, 1.15);
  return [cl(f), cl(f * verde), cl(f * (1 - (verde - 1) * 0.5))];
}

/**
 * Todo el bosque de relleno de la ladera.
 *
 * @param {object} arg
 * @param {(x:number,z:number)=>number} arg.altura
 * @param {number} arg.cima
 * @param {{x0:number,x1:number,z0:number,z1:number}} arg.area
 * @param {object} arg.conteos          bosqueDeTier(tier).
 * @param {Array<{x:number,z:number,r:number}>} arg.claros
 * @param {number} [arg.d=0]            clima.
 * @param {number} [arg.variantes=3]
 * @param {number} [arg.seed=4242]
 * @returns {Record<string, Array>} instancias por especie.
 */
export function distribucionBosque({
  altura,
  cima,
  area,
  conteos,
  claros = [],
  d = 0,
  variantes = 3,
  seed = 4242,
}) {
  /** @type {Record<string, any[]>} */
  const out = {};
  let i = 0;
  for (const especie of Object.keys(BANDAS_BOSQUE)) {
    if (!ESPECIES[especie]) continue;
    i++;
    out[especie] = sembrarEspecie({
      especie,
      cuantos: conteos[especie] || 0,
      altura,
      cima,
      area,
      claros,
      d,
      variantes,
      seed: seed + i * 131,
    });
  }
  return out;
}

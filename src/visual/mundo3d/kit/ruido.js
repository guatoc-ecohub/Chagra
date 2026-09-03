/*
 * kit/ruido — el RUIDO y el AZAR DETERMINISTA compartidos de los mundos 3D.
 *
 * Antes cada escena copiaba su propio `function ruido(wx, wz)` y su propio
 * `rng(seed)`: la auditoría de congruencia (2026-07-16) encontró la MISMA
 * función de ruido de terreno copiada byte-a-byte en seis escenas (cafetal,
 * cacao, papa y sus geom) y el PRNG reimplementado a mano una docena de veces.
 * Dos matas sembradas con dos copias del mismo ruido NO quedan en el mismo sitio
 * si una copia deriva: la congruencia se pierde en silencio. Aquí viven las
 * versiones ÚNICAS.
 *
 * Dos azares, dos usos (a propósito):
 *   · rng(seed)      LCG — el PRNG de la LÍNEA DE GEOMETRÍA (flora/fauna
 *                    procedural). Es el que ya usa `sombreadoVegetal`; se
 *                    re-exporta desde su casa canónica para no bifurcar la
 *                    secuencia (una misma semilla debe dar el MISMO árbol aquí
 *                    y en el bosque).
 *   · crearRng(sem)  mulberry32 — el PRNG de PARTÍCULAS/nubes/dispersión, de más
 *                    calidad estadística; re-exportado de `particulasData` (su
 *                    casa canónica, three-free) para que los mockups y la capa
 *                    viva compartan la misma nube en cada montaje/SSR/test.
 *
 * Y el ruido:
 *   · ruidoTerreno(wx, wz)  — el ruido 2D de TERRENO (tres octavas de seno,
 *                    ~[-1, 1]). Idéntico al que seis escenas tenían copiado;
 *                    es lo que colorea la ladera y decide dónde asoma la tierra.
 *   · ruido3D / ruidoFbm    — el ruido de VALOR 3D (para arrugar corteza, morder
 *                    la copa, manchar color), re-exportado de `sombreadoVegetal`.
 *
 * Todo es matemática pura: corre headless (sin contexto GL), es testeable y no
 * cuesta por frame (se evalúa en tiempo de construcción).
 */

/* Los azares canónicos, desde sus casas de origen (cero bifurcación). */
export { rng } from '../bosque/sombreadoVegetal.js';
export { crearRng } from '../particulasData.js';

/* El ruido de valor 3D (arruga/mordida/mancha), desde su casa canónica. */
export { ruido3D, ruidoFbm } from '../bosque/sombreadoVegetal.js';

/**
 * Ruido 2D de TERRENO en coordenadas de mundo (metros): tres octavas de seno
 * desfasadas. Devuelve aproximadamente [-1, 1], continuo y determinista (no
 * depende de semilla: el mismo (wx, wz) da siempre el mismo valor, así dos
 * escenas pintan el suelo coherente). Es la función que estaba copiada literal
 * en cafetal/cacao/papa (y sus geom): esta es la ÚNICA.
 *
 * Barato: se evalúa por vértice EN CONSTRUCCIÓN del terreno, nunca por frame.
 *
 * @param {number} wx  coordenada X de mundo.
 * @param {number} wz  coordenada Z de mundo.
 * @returns {number} ruido en ~[-1, 1].
 */
export function ruidoTerreno(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/** Recorta a [0, 1]. Útil al normalizar altura/pendiente para gradientes. */
export const saturar = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** smoothstep(a, b, x): 0 antes de `a`, 1 después de `b`, curva suave en medio. */
export function smoothstep(a, b, x) {
  const t = saturar((x - a) / (b - a || 1e-6));
  return t * t * (3 - 2 * t);
}

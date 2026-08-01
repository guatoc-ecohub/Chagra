/*
 * cacheArboles — la CACHÉ de geometrías de árbol, compartida por toda la escena.
 *
 * Vive en su propio módulo, y no dentro de `ArbolMayor.jsx`, por dos razones:
 *   · Fast Refresh: un archivo de componente que además exporta funciones pierde
 *     el refresco en caliente (regla `react-refresh/only-export-components`).
 *   · Es un recurso de ESCENA, no de componente: los cuatro héroes, sus
 *     acompañantes y los ~100 árboles del bosque comparten las mismas mallas.
 *
 * Construir un árbol cuesta (ramifica, hornea AO/contraluz, fusiona). Como
 * `geomArbol` es determinista —misma clave, misma malla—, se puede cachear sin
 * miedo y compartir la MISMA instancia de geometría entre meshes.
 *
 * ⚠️ Justo porque se comparte, ningún componente puede hacerle `dispose()` al
 * desmontarse: le arrancaría la malla de las manos a otro que sigue vivo. Se
 * libera todo junto con `limpiarCacheArboles()`, y eso lo llama quien desmonta
 * la ESCENA entera.
 */
import { geomArbol } from './arbolMayor.geom.js';

/** @type {Map<string, import('three').BufferGeometry>} */
const cache = new Map();

/**
 * Geometría de un árbol, cacheada. Determinista: misma clave → misma malla.
 *
 * @param {string} tipo  clave de ESPECIES ('quenua'|'roble'|'guayacan'|'ceiba').
 * @param {object} [opts] `{ q, variante, sss }` (ver arbolMayor.geom.js).
 * @returns {import('three').BufferGeometry}
 */
export function geomCacheada(tipo, { q = 1, variante = 0, sss = true } = {}) {
  const clave = `${tipo}|${q}|${variante}|${sss ? 1 : 0}`;
  let geo = cache.get(clave);
  if (!geo) {
    geo = geomArbol(tipo, { q, variante, sss });
    cache.set(clave, geo);
  }
  return geo;
}

/** Libera las geometrías compartidas. La llama quien desmonta la ESCENA entera. */
export function limpiarCacheArboles() {
  for (const geo of cache.values()) geo.dispose();
  cache.clear();
}

/** Cuántas mallas hay cacheadas (para pruebas y diagnóstico). */
export const tamanoCacheArboles = () => cache.size;

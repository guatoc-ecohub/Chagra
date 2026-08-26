/**
 * duracionAviso — cuánto debe quedarse un aviso de Angelita en pantalla antes
 * de auto-cerrarse. Módulo de datos puro (sin React, sin red, sin estado) a
 * propósito: en un archivo aparte de `BurbujaAngelita.jsx` para no mezclar
 * función pura con componente (Fast Refresh, `react-refresh/only-export-components`).
 *
 * MISMA fórmula tuneada del husmeo autónomo del valle 3D
 * (`mockups/valle/Valle3D.jsx`, función local `duracionAviso`) — reexpuesta
 * aquí para que cualquier host de `BurbujaAngelita` fuera del valle (el
 * componente global de producción `AngelitaAvisoGlobal`, P5) auto-cierre con
 * el mismo criterio, sin reinventarlo: lo que tarda la máquina de escribir en
 * ponerlo (≈16 ms/letra) MÁS el tiempo de leerlo con calma (≈70 ms/letra ≈
 * 170 palabras/min, ritmo cómodo para leer despacio).
 */

/* Piso: ningún aviso dura menos que esto (feedback operador: "desaparecen muy
   rápido"). Techo: 16s para que la burbuja no se quede pegada. */
const AVISO_VISIBLE_MIN_MS = 7000;
const AVISO_VISIBLE_MAX_MS = 16000;

/**
 * @param {string|null|undefined} mensaje
 * @returns {number} milisegundos que el aviso debe quedarse en pantalla.
 */
export function duracionAviso(mensaje) {
  const n = String(mensaje || '').length;
  if (!n) return AVISO_VISIBLE_MIN_MS;
  return Math.min(
    AVISO_VISIBLE_MAX_MS,
    Math.max(AVISO_VISIBLE_MIN_MS, Math.round(n * 16 + n * 70 + 1200)),
  );
}

export default duracionAviso;

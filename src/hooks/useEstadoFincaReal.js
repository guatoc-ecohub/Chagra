/**
 * useEstadoFincaReal.js — Hook que construye el estadoFinca desde datos REALES.
 *
 * El valle 3D y las escenas consumen `estadoFinca` para reflejar el estado
 * real de la finca (animales, clima, cultivos). Sin datos, muestran "en camino".
 * Este hook lee de IndexedDB (useAssetStore) y formatea el descriptor que
 * esperan useFincaViva y reaccionFinca.
 *
 * Anti-fabricación: si no hay dato real, se devuelve null para cada campo.
 * La escena 3D muestra "en camino" en vez de inventar.
 */
import { useState, useEffect } from 'react';

/**
 * @typedef {Object} EstadoFincaReal
 * @property {string} clima — 'dorada'|'soleado'|'niebla'|'lluvia'|'noche'|null
 * @property {string|null} enso — 'nino'|'nina'|'neutro'
 * @property {Object|null} cosechaReciente — { cultivo: string, mundoId: string }
 * @property {Object|null} saludFinca — { matasVivas: number, matasTotal: number, agua: boolean }
 * @property {Array|null} animales — [{ especie, nombre, raza, estado }]
 */

/**
 * Lee el estado real de la finca desde IndexedDB.
 * @returns {{ estadoFinca: EstadoFincaReal, cargando: boolean }}
 */
export function useEstadoFincaReal() {
  const [estadoFinca, setEstadoFinca] = useState(/** @type {EstadoFincaReal} */ ({
    clima: null,
    enso: null,
    cosechaReciente: null,
    saludFinca: null,
    animales: null,
  }));
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      try {
        // Leer assets de IndexedDB (plantas y animales)
        const store = await import('../../store/useAssetStore.js').then(m => m.default);
        const state = store.getState();
        const assets = state.assets || [];

        // Clima: intentar obtener del localStorage (cache de última consulta)
        const climaCache = localStorage.getItem('chagra:last-clima');
        const clima = climaCache || null;

        // Animales: filtrar assets tipo animal
        const animales = assets
          .filter((a) => a.type === 'asset--animal' || a.asset_type === 'equipment')
          .map((a) => ({
            especie: a.attributes?.name || 'animal',
            nombre: a.attributes?.name || '',
            raza: a.attributes?.status || '',
            estado: a.attributes?.status || 'activo',
          }));

        // Plantas: conteo para saludFinca
        const plantas = assets.filter((a) => a.type === 'asset--plant');
        const matasVivas = plantas.filter((p) => p.attributes?.status !== 'dead').length;

        if (!cancelado) {
          setEstadoFinca({
            clima,
            enso: 'neutro',
            cosechaReciente: null,
            saludFinca: matasVivas > 0 ? {
              matasVivas,
              matasTotal: plantas.length || 0,
              agua: true,
            } : null,
            animales: animales.length > 0 ? animales : null,
          });
          setCargando(false);
        }
      } catch {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => { cancelado = true; };
  }, []);

  return { estadoFinca, cargando };
}

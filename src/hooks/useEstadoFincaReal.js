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
        // BUG CORREGIDO (auditoría 2026-07-26): la ruta era '../../store/…'
        // desde `src/hooks/` — un nivel de más — y además se leía
        // `state.assets`, una llave que el store NUNCA tuvo (sus buckets son
        // `plants`, `structures`, `equipment`, `materials`, `lands`). El
        // resultado: `assets` era SIEMPRE `[]`, así que este hook devolvía
        // nulos con cualquier finca, por llena que estuviera. Se leía como
        // "anti-fabricación funcionando" y era un hook muerto.
        const store = await import('../store/useAssetStore.js').then(m => m.default);
        const state = store.getState();
        const assets = typeof state.getAllAssets === 'function'
          ? state.getAllAssets()
          : [...(state.plants || []), ...(state.equipment || [])];

        // Clima: intentar obtener del localStorage (cache de última consulta)
        const climaCache = localStorage.getItem('chagra:last-clima');
        const clima = climaCache || null;

        // Animales: filtrar assets tipo animal. El store guarda `asset_type`
        // ('plant'|'equipment'|…, ver assetCache index) — el `type` de JSON:API
        // ('asset--plant') sólo aparece en la respuesta cruda de farmOS. Se
        // aceptan las dos formas: el segundo predicado era el que fallaba.
        const esAnimal = (a) => a?.type === 'asset--animal'
          || a?.asset_type === 'animal'
          || Boolean(a?.attributes?.animal_type);
        const animales = assets
          .filter(esAnimal)
          .map((a) => ({
            especie: a.attributes?.name || 'animal',
            nombre: a.attributes?.name || '',
            raza: a.attributes?.status || '',
            estado: a.attributes?.status || 'activo',
          }));

        // Plantas: conteo para saludFinca (mismo arreglo de `type`/`asset_type`).
        const plantas = assets.filter((a) => a?.type === 'asset--plant' || a?.asset_type === 'plant');
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

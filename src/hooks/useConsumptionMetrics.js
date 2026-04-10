import { useEffect, useState, useMemo } from 'react';
import { logCache } from '../db/logCache';

/**
 * useConsumptionMetrics — agregador offline de aplicaciones de insumo (Fase 14.2).
 *
 * Lee el store `logs` de IndexedDB, filtra por `type === 'log--input'` que
 * coincida con el nombre del material en la ventana temporal, y genera una
 * serie temporal diaria de consumo.
 *
 * No consume el estado de Zustand (`logsByAsset`) porque ese cubo solo
 * contiene logs de assets abiertos en la UI. Para analytics globales por
 * material necesitamos leer directamente del cache IDB.
 *
 * @param {string} materialName - nombre canónico del material ("Bokashi", "Biol", ...)
 * @param {number} days         - ventana temporal en días (default 30)
 * @returns {{ labels: string[], values: number[], total: number, loading: boolean }}
 */
export const useConsumptionMetrics = (materialName, days = 30) => {
  const [inputLogs, setInputLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const logs = await logCache.getByType('log--input');
        if (!cancelled) setInputLogs(logs);
      } catch (err) {
        console.error('[useConsumptionMetrics] Error leyendo log cache:', err);
        if (!cancelled) setInputLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onTaskAdded = () => {
      // Re-query cuando se encola un nuevo log optimista o cuando un pull rehidrata
      (async () => {
        try {
          const logs = await logCache.getByType('log--input');
          if (!cancelled) setInputLogs(logs);
        } catch (err) {
          console.error('[useConsumptionMetrics] Error recargando log cache:', err);
        }
      })();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('taskAdded', onTaskAdded);
      window.addEventListener('syncCompleted', onTaskAdded);
    }
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('taskAdded', onTaskAdded);
        window.removeEventListener('syncCompleted', onTaskAdded);
      }
    };
  }, []);

  return useMemo(() => {
    const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

    // Filtrar aplicaciones del material específico en la ventana temporal.
    // Matching por substring en `attributes.name` que incluye "Aplicación de X".
    const relevant = inputLogs
      .filter((log) => {
        if ((log.timestamp || log.attributes?.timestamp || 0) < cutoff) return false;
        const name = log.attributes?.name || '';
        return materialName ? name.includes(materialName) : true;
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    // Agregación diaria
    const series = relevant.reduce((acc, log) => {
      const ts = log.timestamp || log.attributes?.timestamp || 0;
      const date = new Date(ts * 1000).toISOString().split('T')[0];
      const qty = parseFloat(log.attributes?.quantity?.value) || 0;
      acc[date] = (acc[date] || 0) + qty;
      return acc;
    }, {});

    const labels = Object.keys(series);
    const values = Object.values(series);
    const total = values.reduce((a, b) => a + b, 0);

    return { labels, values, total, loading };
  }, [inputLogs, materialName, days, loading]);
};

export default useConsumptionMetrics;

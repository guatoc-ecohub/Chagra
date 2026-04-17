import { useEffect, useState, useMemo } from 'react';
import { logCache } from '../db/logCache';

/**
 * useConsumptionMetrics — agregador offline de aplicaciones de insumo.
 *
 * Lee el store `logs` de IndexedDB, filtra por `type === 'log--input'` que
 * coincida con el nombre del material en la ventana temporal, y genera una
 * serie temporal diaria de consumo.
 */

interface InputLog {
  timestamp?: number;
  attributes?: {
    name?: string;
    timestamp?: number;
    quantity?: { value?: number | string; unit?: string } | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ConsumptionMetrics {
  labels: string[];
  values: number[];
  total: number;
  loading: boolean;
}

export const useConsumptionMetrics = (
  materialName: string | null | undefined,
  days: number = 30
): ConsumptionMetrics => {
  const [inputLogs, setInputLogs] = useState<InputLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const logs = (await logCache.getByType('log--input')) as unknown as InputLog[];
        if (!cancelled) setInputLogs(logs);
      } catch (err) {
        console.error('[useConsumptionMetrics] Error leyendo log cache:', err);
        if (!cancelled) setInputLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onTaskAdded = () => {
      (async () => {
        try {
          const logs = (await logCache.getByType('log--input')) as unknown as InputLog[];
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

  return useMemo<ConsumptionMetrics>(() => {
    const cutoff = Math.floor(Date.now() / 1000) - days * 86400;

    const relevant = inputLogs
      .filter((log) => {
        const ts = log.timestamp || log.attributes?.timestamp || 0;
        if (ts < cutoff) return false;
        const name = log.attributes?.name || '';
        return materialName ? name.includes(materialName) : true;
      })
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const series = relevant.reduce<Record<string, number>>((acc, log) => {
      const ts = log.timestamp || log.attributes?.timestamp || 0;
      const dateKey = new Date(ts * 1000).toISOString().split('T')[0] ?? '';
      const rawQty = log.attributes?.quantity?.value;
      const qty = parseFloat(String(rawQty ?? 0)) || 0;
      acc[dateKey] = (acc[dateKey] || 0) + qty;
      return acc;
    }, {});

    const labels = Object.keys(series);
    const values = Object.values(series);
    const total = values.reduce((a, b) => a + b, 0);

    return { labels, values, total, loading };
  }, [inputLogs, materialName, days, loading]);
};

export default useConsumptionMetrics;

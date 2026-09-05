import { useEffect, useState } from 'react';
import {
  describeSipsaPrice,
  fetchLatestSipsaPrice,
  resolveSipsaProductForCycleSpecies,
} from '../services/sipsaPriceService.js';

const CACHE = new Map();
const IN_FLIGHT = new Map();

async function loadLatestPrice(producto) {
  if (CACHE.has(producto)) return CACHE.get(producto);
  if (IN_FLIGHT.has(producto)) return IN_FLIGHT.get(producto);

  const pending = fetchLatestSipsaPrice(producto)
    .then((result) => {
      CACHE.set(producto, result);
      IN_FLIGHT.delete(producto);
      return result;
    })
    .catch(() => {
      IN_FLIGHT.delete(producto);
      return null;
    });

  IN_FLIGHT.set(producto, pending);
  return pending;
}

export function useSipsaLatestPrice({ speciesKey = null, producto = null } = {}) {
  const resolvedProducto = typeof producto === 'string' && producto.trim()
    ? producto.trim()
    : resolveSipsaProductForCycleSpecies(speciesKey);

  const [state, setState] = useState(() => {
    const cached = resolvedProducto ? CACHE.get(resolvedProducto) || null : null;
    return {
      loading: Boolean(resolvedProducto) && !cached,
      producto: resolvedProducto,
      result: cached,
      summary: describeSipsaPrice(cached, resolvedProducto || ''),
    };
  });

  useEffect(() => {
    let alive = true;
    const commit = (nextState) => {
      Promise.resolve().then(() => {
        if (alive) setState(nextState);
      });
    };

    if (!resolvedProducto) {
      commit({
        loading: false,
        producto: null,
        result: null,
        summary: describeSipsaPrice(null, ''),
      });
      return undefined;
    }

    const cached = CACHE.get(resolvedProducto) || null;
    if (cached) {
      commit({
        loading: false,
        producto: resolvedProducto,
        result: cached,
        summary: describeSipsaPrice(cached, resolvedProducto),
      });
      return undefined;
    }

    commit({
      loading: true,
      producto: resolvedProducto,
      result: cached,
      summary: describeSipsaPrice(cached, resolvedProducto),
    });

    loadLatestPrice(resolvedProducto).then((result) => {
      if (!alive) return;
      setState({
        loading: false,
        producto: resolvedProducto,
        result,
        summary: describeSipsaPrice(result, resolvedProducto),
      });
    });

    return () => {
      alive = false;
    };
  }, [resolvedProducto]);

  return state;
}

export const __TEST__ = {
  clearCache() {
    CACHE.clear();
    IN_FLIGHT.clear();
  },
};

export default useSipsaLatestPrice;

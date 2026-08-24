import { useMemo } from 'react';
import { useSipsaLatestPrice } from './useSipsaLatestPrice';
import { resolverPrecioReferenciaVivo } from '../services/marketplaceService';

/**
 * useSipsaMarketReference — precio de REFERENCIA del marketplace desde el FEED
 * VIVO SIPSA (`get_precio_sipsa`) con FALLBACK HONESTO a la foto estática
 * (`precioReferencia.js`).
 *
 * Reusa el cliente/caché existentes: el fetch en vivo pasa por
 * `useSipsaLatestPrice` → `fetchLatestSipsaPrice` → `getPrecioSipsa`
 * (sidecarClient). Este hook NO abre un segundo canal de datos; solo compone el
 * resultado crudo con el fallback estático vía la función pura
 * `resolverPrecioReferenciaVivo`.
 *
 * Gating: el fetch en vivo y la referencia solo se computan con un producto de
 * 3+ caracteres. Así el sidecar no se consulta mientras el productor recién
 * empieza a escribir en el formulario de publicación, y el detalle de una
 * oferta (nombre completo) siempre obtiene su referencia.
 *
 * @param {string} producto — nombre del producto (texto libre).
 * @returns {{ referencia: object|null, loading: boolean }}
 *   `referencia` es el view-model de `resolverPrecioReferenciaVivo` (o `null`
 *   con menos de 3 caracteres). `loading` es true solo mientras el feed vivo
 *   está en vuelo (nunca bloquea: la UI ya tiene el fallback estático).
 */
export function useSipsaMarketReference(producto) {
  const q = typeof producto === 'string' ? producto.trim() : '';
  const activo = q.length >= 3 ? q : null;

  const { loading, result } = useSipsaLatestPrice({ producto: activo });

  const referencia = useMemo(
    () => (activo ? resolverPrecioReferenciaVivo(activo, result) : null),
    [activo, result],
  );

  return { referencia, loading: Boolean(activo) && loading };
}

export default useSipsaMarketReference;

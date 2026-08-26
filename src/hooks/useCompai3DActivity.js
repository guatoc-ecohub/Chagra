import { useCallback, useEffect, useRef } from 'react';

const IDLE_MS = 1800;

/**
 * P6: comparte el estado efímero de interacción de todas las escenas 3D.
 * El compai vive dentro del mundo, así que durante el gesto de cámara se
 * atenúa y vuelve solo cuando termina el idle. No escribe Assets ni logs.
 */
export default function useCompai3DActivity() {
  const timerRef = useRef(null);

  const limpiarTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const marcarActivo = useCallback(() => {
    limpiarTimer();
    document.documentElement.setAttribute('data-compai-3d-interaction', 'active');
  }, [limpiarTimer]);

  const marcarIdle = useCallback(() => {
    limpiarTimer();
    timerRef.current = setTimeout(() => {
      document.documentElement.removeAttribute('data-compai-3d-interaction');
      timerRef.current = null;
    }, IDLE_MS);
  }, [limpiarTimer]);

  useEffect(() => () => {
    limpiarTimer();
    document.documentElement.removeAttribute('data-compai-3d-interaction');
  }, [limpiarTimer]);

  return {
    onPointerDownCapture: marcarActivo,
    onPointerMoveCapture: marcarActivo,
    onWheelCapture: marcarActivo,
    onPointerUpCapture: marcarIdle,
    onPointerCancelCapture: marcarIdle,
  };
}

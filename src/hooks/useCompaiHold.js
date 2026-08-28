import { useCallback, useEffect, useRef } from 'react';
import { activarEscucha } from '../services/escuchaService.js';

/** Umbral canónico del gesto «Hola Chagra» en una superficie 3D. */
export const COMPAI_HOLD_MS = 1600;

/* Superficies DOM que representan al compai fuera del FAB 2D. El selector es
   deliberadamente explícito para no convertir cualquier gesto del canvas en
   una activación de escucha. */
const SELECTOR_COMPAI = '.mundo-abeja, .valle-abeja, .vcalma-abeja, .vv-abeja';

function esSuperficieCompai(target) {
  return Boolean(target?.closest?.(SELECTOR_COMPAI));
}

/**
 * Devuelve handlers para el host DOM de una escena que contiene un compai.
 * El host puede ser un `<Canvas>` de R3F o un contenedor DOM que reciba los
 * eventos que Drei `<Html>` deja burbujear.
 */
export default function useCompaiHold({ enabled = true } = {}) {
  const timerRef = useRef(null);
  const pointerIdRef = useRef(null);

  const cancelar = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pointerIdRef.current = null;
  }, []);

  const iniciar = useCallback((event) => {
    if (!enabled || event.isPrimary === false || !esSuperficieCompai(event.target)) return;
    cancelar();
    pointerIdRef.current = event.pointerId ?? null;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      activarEscucha({ fuente: 'hold' });
    }, COMPAI_HOLD_MS);
  }, [cancelar, enabled]);

  const terminar = useCallback((event) => {
    if (pointerIdRef.current === null || event.pointerId == null || event.pointerId === pointerIdRef.current) {
      cancelar();
    }
  }, [cancelar]);

  useEffect(() => cancelar, [cancelar]);

  return {
    onPointerDown: iniciar,
    onPointerUp: terminar,
    onPointerCancel: terminar,
    onPointerLeave: terminar,
  };
}

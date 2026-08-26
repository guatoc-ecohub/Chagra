/**
 * Compatibilidad con el contrato histórico del roam 2D.
 *
 * La máquina vive en useComportamientoCompai. Este adaptador conserva el API
 * que ya consumen CompaiOverlay y sus pruebas, pero hereda persistencia,
 * presencia y aparición mística del motor transversal.
 */
import { useCallback, useRef } from 'react';
import useComportamientoCompai from './useComportamientoCompai.js';

export default function useCompaiRoam(ref, opciones = {}) {
  const motor = useComportamientoCompai(ref, {
    especie: opciones.especie || 'angelita',
    activo: opciones.activo ?? true,
    pausado: opciones.pausado ?? false,
    soloX: opciones.soloX ?? true,
    contentAware: opciones.contentAware ?? true,
    superficie: opciones.superficie || 'overlay',
  });

  // Compatibilidad con CompaiOverlay y su contrato histórico de arrastre.
  // AgentFab usa useCompaiDraggable como dueño del puesto persistente; este
  // adaptador sólo conserva los handlers del overlay legado.
  const arrastre = useRef(null);
  const superficie = opciones.superficie || 'overlay';
  const especie = opciones.especie || 'angelita';
  const storageKey = `chagra:compai:posicion:${especie}:${superficie}`;
  const escribirPosicion = useCallback((x, y) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = x || y
      ? `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      : '';
    try {
      localStorage.setItem(storageKey, JSON.stringify({ x, y }));
    } catch (_error) {
      // Sin persistencia disponible, el compai sigue siendo arrastrable.
    }
  }, [ref, storageKey]);
  const onPointerDown = useCallback((event) => {
    motor.handlers.onPointerDown(event);
    if (event.target?.closest?.('[data-compai-no-drag]')) return;
    arrastre.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }, [motor.handlers]);
  const onPointerMove = useCallback((event) => {
    const inicio = arrastre.current;
    if (!inicio || inicio.pointerId !== event.pointerId) return;
    escribirPosicion(event.clientX - inicio.x, event.clientY - inicio.y);
  }, [escribirPosicion]);
  const onPointerUp = useCallback((event) => {
    if (arrastre.current?.pointerId === event.pointerId) arrastre.current = null;
  }, []);

  return {
    ...motor,
    handlers: {
      ...motor.handlers,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  };
}

/**
 * useCompaiDraggable — hook para arrastrar el FAB del compai y persistir su posición.
 * 
 * Características:
 * - Posición natural: inferior-derecha (bottom: max(90px, calc(env(safe-area-inset-bottom) + 90px)), right: 14)
 * - Arrastre con mouse/touch
 * - Persistencia en localStorage
 * - No interfiere con el menú ni el glow
 * - Contiene el FAB dentro del viewport
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.enabled - Si el arrastre está habilitado
 * @param {string} options.storageKey - Clave para localStorage (default: 'compai-position')
 * @returns {Object} - { position, isDragging, dragHandlers }
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'compai-position';
const NATURAL_POSITION = {
  bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 90px))',
  right: 14,
};
const MIN_PADDING = 14;

function clampAxis(value, minimum, maximum) {
  return Math.max(minimum, Math.min(value, maximum));
}

/**
 * Clamps the CSS bottom/right offsets using the measured painted overflow of
 * the avatar, not just the 84px interaction box.
 */
export function clampPosition(position, viewport, metrics, padding = MIN_PADDING) {
  const minRight = padding + metrics.overflowRight;
  const maxRight = viewport.width - metrics.width - metrics.overflowLeft - padding;
  const minBottom = padding + metrics.overflowBottom;
  const maxBottom = viewport.height - metrics.height - metrics.overflowTop - padding;

  return {
    right: clampAxis(position.right, minRight, maxRight),
    bottom: clampAxis(position.bottom, minBottom, maxBottom),
  };
}

export default function useCompaiDraggable({ enabled = true, storageKey = STORAGE_KEY } = {}) {
  // Cargar posición inicial desde localStorage
  const getInitialPosition = useCallback(() => {
    if (!enabled) return null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verificar que la posición sea válida
        if (parsed && typeof parsed.bottom === 'number' && typeof parsed.right === 'number') {
          return parsed;
        }
      }
    } catch (_error) {
      // Silenciar error de localStorage: no es crítico
    }
    return null;
  }, [enabled, storageKey]);

  const [position, setPosition] = useState(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef(null);
  const elementStartPos = useRef(null);
  const compaiRef = useRef(null);

  // Guardar posición en localStorage cuando cambie
  useEffect(() => {
    if (!enabled || !position) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch (_error) {
      // Silenciar error de localStorage: no es crítico
    }
  }, [position, enabled, storageKey]);

  // Convertir posición CSS a valores numéricos para el arrastre
  const getNumericPosition = useCallback((element) => {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    return {
      bottom: viewportHeight - rect.bottom,
      right: viewportWidth - rect.right,
    };
  }, []);

  // La caja interactiva sigue siendo 84px, pero el arte puede pintar fuera de
  // ella por overflow visible. Medimos la huella real del botón principal en
  // cada clamp, con distancia independiente a los cuatro bordes.
  const getVisualMetrics = useCallback((element) => {
    const root = Array.from(element?.children || []).find(
      (child) => child.tagName === 'BUTTON' && child.dataset.compaiNoDrag !== 'true',
    ) || element;
    const rootRect = root.getBoundingClientRect();
    const rects = [rootRect, ...Array.from(root.querySelectorAll('svg, svg *'))
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width || rect.height)];
    const visual = rects.reduce((bounds, rect) => ({
      left: Math.min(bounds.left, rect.left),
      top: Math.min(bounds.top, rect.top),
      right: Math.max(bounds.right, rect.right),
      bottom: Math.max(bounds.bottom, rect.bottom),
    }), { left: rootRect.left, top: rootRect.top, right: rootRect.right, bottom: rootRect.bottom });

    return {
      width: rootRect.width || 84,
      height: rootRect.height || 84,
      overflowLeft: Math.max(0, rootRect.left - visual.left),
      overflowTop: Math.max(0, rootRect.top - visual.top),
      overflowRight: Math.max(0, visual.right - rootRect.right),
      overflowBottom: Math.max(0, visual.bottom - rootRect.bottom),
    };
  }, []);

  const constrainPosition = useCallback((x, y) => {
    const metrics = getVisualMetrics(compaiRef.current);
    return clampPosition(
      { right: x, bottom: y },
      { width: window.innerWidth, height: window.innerHeight },
      metrics,
    );
  }, [compaiRef, getVisualMetrics]);

  // A stale persisted position can become invalid after a viewport resize or
  // device rotation. Re-clamp it once the real button is mounted and again on
  // resize, without changing the user's chosen location otherwise.
  useEffect(() => {
    if (!enabled || !position || !compaiRef.current) return undefined;
    const ajustar = () => {
      const next = constrainPosition(position.right, position.bottom);
      if (next.right !== position.right || next.bottom !== position.bottom) setPosition(next);
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [enabled, position, compaiRef, constrainPosition]);

  // Iniciar arrastre
  const handleDragStart = useCallback((clientX, clientY) => {
    if (!enabled || !compaiRef.current) return;

    const numericPos = getNumericPosition(compaiRef.current);
    if (!numericPos) return;

    dragStartPos.current = { x: clientX, y: clientY };
    elementStartPos.current = numericPos;
    setIsDragging(true);
  }, [enabled, getNumericPosition]);

  // Durante el arrastre
  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDragging || !dragStartPos.current || !elementStartPos.current) return;

    const deltaX = dragStartPos.current.x - clientX;
    const deltaY = dragStartPos.current.y - clientY;

    const newRight = elementStartPos.current.right + deltaX;
    const newBottom = elementStartPos.current.bottom + deltaY;

    const constrained = constrainPosition(newRight, newBottom);
    setPosition(constrained);
  }, [isDragging, constrainPosition]);

  // Finalizar arrastre
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragStartPos.current = null;
    elementStartPos.current = null;
  }, []);

  // Manejadores de eventos para el contenedor
  const handleMouseDown = useCallback((e) => {
    // Solo permitir arrastre en el botón principal, no en el interruptor de silencio
    if (e.target.closest('[data-compai-no-drag="true"]')) return;
    if (e.button !== 0) return; // Solo clic izquierdo
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleDragMove(e.clientX, e.clientY);
  }, [isDragging, handleDragMove]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    handleDragEnd();
  }, [isDragging, handleDragEnd]);

  // Manejadores táctiles
  const handleTouchStart = useCallback((e) => {
    if (e.target.closest('[data-compai-no-drag="true"]')) return;
    const touch = e.touches[0];
    if (!touch) return;
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    handleDragMove(touch.clientX, touch.clientY);
  }, [isDragging, handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    handleDragEnd();
  }, [isDragging, handleDragEnd]);

  // Efecto para registrar eventos globales de arrastre
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Calcular estilo de posición
  const positionStyle = position
    ? {
        bottom: position.bottom,
        right: position.right,
      }
    : NATURAL_POSITION;

  return {
    compaiRef,
    position,
    isDragging,
    positionStyle,
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
    },
    resetPosition: useCallback(() => {
      setPosition(null);
      try {
        localStorage.removeItem(storageKey);
      } catch (_error) {
        // Silenciar error de localStorage: no es crítico
      }
    }, [storageKey]),
  };
}

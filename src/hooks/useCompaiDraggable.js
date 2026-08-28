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
const FAB_SIZE = 84;
const MIN_PADDING = 14;

// Unifica eventos de mouse y touch. Algunos consumidores disparan el handler
// táctil con un evento sin `touches` (por ejemplo, gestos sintetizados); ese
// caso debe degradar sin tumbar el FAB.
function obtenerPuntoCliente(evento) {
  return evento.touches?.[0] ?? evento.changedTouches?.[0] ?? evento;
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

  // Contener el elemento dentro del viewport
  const constrainPosition = useCallback((x, y) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Asegurar que el FAB no se salga de la pantalla
    const maxX = viewportWidth - FAB_SIZE - MIN_PADDING;
    const maxY = viewportHeight - FAB_SIZE - MIN_PADDING;

    return {
      right: Math.max(MIN_PADDING, Math.min(x, maxX)),
      bottom: Math.max(MIN_PADDING, Math.min(y, maxY)),
    };
  }, []);

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
    const punto = obtenerPuntoCliente(e);
    if (!Number.isFinite(punto.clientX) || !Number.isFinite(punto.clientY)) return;
    handleDragStart(punto.clientX, punto.clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const punto = obtenerPuntoCliente(e);
    if (!Number.isFinite(punto.clientX) || !Number.isFinite(punto.clientY)) return;
    e.preventDefault();
    handleDragMove(punto.clientX, punto.clientY);
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

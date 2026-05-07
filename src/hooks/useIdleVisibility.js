import { useEffect, useState } from 'react';

/**
 * useIdleVisibility — devuelve `isVisible` (boolean) que pasa a `false`
 * tras `idleMs` sin interacción del usuario, y vuelve a `true` con
 * cualquier mousemove / touch / scroll / keydown / click.
 *
 * Caso de uso: auto-hide de FABs flotantes para no tapar contenido cuando
 * el operador está leyendo/observando una pantalla quieta. Reaparecen al
 * mínimo movimiento.
 *
 * Spec usuario externo (feedback 2026-05-06, bug #2 baseline): los FAB
 * tapaban el widget Cola de tareas en el dashboard home. Solución
 * convergente: auto-hide tras 2s sin interacción.
 *
 * Implementación:
 *   - Listeners pasivos en window (mousemove, touchstart, touchmove,
 *     scroll, keydown, click).
 *   - Tras `idleMs` sin eventos, isVisible = false.
 *   - Cualquier evento reset el timer + isVisible = true.
 *   - Cleanup en unmount: remueve listeners + clear timer.
 *
 * Uso típico:
 *   const isVisible = useIdleVisibility(2000);
 *   <button style={{ opacity: isVisible ? 1 : 0,
 *                    pointerEvents: isVisible ? 'auto' : 'none',
 *                    transition: 'opacity 250ms ease' }}>
 *
 * @param {number} idleMs Milisegundos sin actividad antes de ocultar (default 2000)
 * @returns {boolean} isVisible
 */
export default function useIdleVisibility(idleMs = 2000) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timer;

    const reset = () => {
      setIsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIsVisible(false), idleMs);
    };

    // Iniciar el timer al montar (sin actividad inicial → ocultar tras idleMs)
    reset();

    const events = ['mousemove', 'touchstart', 'touchmove', 'scroll', 'keydown', 'click'];
    events.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [idleMs]);

  return isVisible;
}

import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * useAngelitaPresencia — "moverse a su estado natural cuando la persona hace
 * mouse over o toca la pantalla" (pedido del operador 2026-08-24).
 *
 * Angelita no está siempre gesticulando: cuando la persona está presente
 * (mueve el mouse por encima / toca la pantalla) ella DESPIERTA a su estado
 * natural — el idle vivo de 'acompana' (flota, respira, mira alrededor,
 * micro-gestos) — y tras un rato sin señales de presencia se aquieta.
 *
 * Regla dura de la casa: NO pisa un estado ACTIVO del agente (pensando,
 * respondiendo, preocupada…) — la presencia solo la despierta cuando está en
 * un estado pasivo (idle/acompana). Eso lo decide el consumidor con `esPasivo`.
 *
 * Solo escucha ventana con listeners pasivos; se limpia al desmontar. Sin
 * efectos si `activo=false` (los call-sites históricos no cambian).
 */

const ESTADOS_PASIVOS = new Set(['acompana', 'idle', 'acompaña', undefined, null, '']);

/** ¿Es un estado pasivo (idle) que la presencia PUEDE despertar sin pisar
 *  una actuación conversacional real? */
export function esPasivo(estado) {
  return ESTADOS_PASIVOS.has(estado);
}

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.activo=false]  enciende la escucha de presencia.
 * @param {number} [opts.duracionMs=3200]  cuánto sigue "despierta" tras la
 *   última señal de presencia antes de aquietarse.
 * @returns {{ despierta: boolean, handlers: Object, despertar: () => void }}
 *   `despierta` para derivar el estado/idle; `handlers` para pegar al nodo del
 *   avatar (hover directo del bicho); `despertar` por si el host quiere forzarlo.
 */
export function useAngelitaPresencia({ activo = false, duracionMs = 3200 } = {}) {
  const [despierta, setDespierta] = useState(false);
  const timer = useRef(0);

  const despertar = useCallback(() => {
    if (!activo) return;
    setDespierta(true);
    if (typeof window !== 'undefined') {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDespierta(false), duracionMs);
    }
  }, [activo, duracionMs]);

  useEffect(() => {
    if (!activo || typeof window === 'undefined') return undefined;
    // "mouse over o toca la pantalla": cualquier señal de presencia en la
    // ventana. pointermove cubre el hover del desktop; pointerdown/touchstart
    // cubren el toque en móvil (donde no hay hover). Listeners pasivos.
    const señal = () => despertar();
    window.addEventListener('pointermove', señal, { passive: true });
    window.addEventListener('pointerdown', señal, { passive: true });
    window.addEventListener('touchstart', señal, { passive: true });
    return () => {
      window.removeEventListener('pointermove', señal);
      window.removeEventListener('pointerdown', señal);
      window.removeEventListener('touchstart', señal);
      window.clearTimeout(timer.current);
    };
  }, [activo, despertar]);

  // Handlers para el hover DIRECTO del avatar (además de la ventana), útiles
  // cuando el avatar vive en un contenedor que atrapa el puntero.
  const handlers = activo
    ? { onPointerEnter: despertar, onPointerDown: despertar, onTouchStart: despertar }
    : {};

  return { despierta, handlers, despertar };
}

export default useAngelitaPresencia;

import { useEffect, useState, useRef } from 'react';

/**
 * useIdleDetection — devuelve `idle: true` después de N segundos sin
 * actividad del usuario. Detecta mousemove, mousedown, keydown,
 * touchstart, scroll, wheel y visibilitychange.
 *
 * Cuando la pestaña queda en background (Page Visibility API), el
 * timer NO corre — sin esto, después de minimizar el navegador todos
 * los dashboards se marcarían como idle inmediatamente al volver.
 *
 * Operator 2026-05-28: quiere que los botones del dashboard fade-out
 * por inactividad para resaltar el fondo de biodiversidad. Default
 * delay 12s — suficiente para que no estorbe al user leyendo pero
 * suficientemente rápido para que vea la transformación si deja la
 * app abierta sin tocar nada.
 *
 * @param {number} delayMs — tiempo de inactividad para considerar idle
 * @param {boolean} enabled — desactiva la detección (default true)
 * @returns {boolean} idle
 */
export default function useIdleDetection(delayMs = 12000, enabled = true) {
    const [idle, setIdle] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!enabled) {
            setIdle(false);
            return;
        }

        const reset = () => {
            // BUGFIX 2026-05-28 operador: `if (idle) setIdle(false)` tenía closure
            // stale — `idle` quedaba capturado del primer render. Después de que
            // el timer disparaba setIdle(true), los siguientes mousemove/touch
            // ejecutaban el reset con el `idle=false` viejo del closure y NUNCA
            // desactivaban el screen saver. Fix: setIdle(false) siempre — React
            // skipea el re-render si el valor no cambió.
            setIdle(false);
            if (timerRef.current) clearTimeout(timerRef.current);
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                timerRef.current = setTimeout(() => setIdle(true), delayMs);
            }
        };

        const onVisibilityChange = () => {
            if (typeof document === 'undefined') return;
            if (document.visibilityState === 'visible') {
                reset();
            } else {
                // Tab en background: pausar timer
                if (timerRef.current) clearTimeout(timerRef.current);
            }
        };

        // Eventos que cuentan como actividad
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click'];
        events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
        document.addEventListener('visibilitychange', onVisibilityChange);

        // Kickoff timer
        reset();

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            events.forEach((ev) => window.removeEventListener(ev, reset));
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
        // idle como dep haría que cada cambio idle resetee el timer — bad.
        // Sólo dependemos de delayMs/enabled.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [delayMs, enabled]);

    return idle;
}

import { useEffect, useRef } from 'react';

/**
 * Set de viewKeys "armadas" en ESTE page-load: una viewKey se arma la primera
 * vez que el usuario hace scroll en ella (onScroll → guarda posición). Vive a
 * nivel de módulo (no de componente) para persistir entre montajes/desmontajes
 * de la misma sesión de página, pero se reinicia en un page-load fresco
 * (login / abrir la app / refresh) porque el módulo se vuelve a evaluar.
 *
 * Sirve para `restoreOnReturnOnly`: distinguir una ENTRADA NUEVA (primer mount
 * del runtime → la key no está armada) de un REGRESO desde un detalle (mount
 * posterior → la key sí está armada porque el usuario ya scrolleó antes de
 * irse al detalle).
 */
const armedViews = new Set();

/**
 * useScrollRestoration — preserva scroll position al navegar entre vistas.
 *
 * usuaria piloto reportó (#103, field test 2026-05-01):
 * > "Al devolverme me envía al inicio de la app y debo realizar scroll
 * >  nuevamente a la parte de los iconos. Mejorar esto."
 *
 * El bug: navigate(view) en App.jsx desmonta la screen actual + monta nueva.
 * React inicializa la nueva sin recordar dónde estaba el scroll de la
 * anterior. Cuando user vuelve, scroll vuelve a top.
 *
 * Fix: persistir scrollTop en sessionStorage por viewKey + restaurar en
 * mount. sessionStorage (no localStorage) porque tabs/sessions
 * independientes deben tener scroll independiente; al cerrar pestaña se
 * limpia naturalmente.
 *
 * Uso:
 *   useScrollRestoration('dashboard'); // dentro del componente de la screen
 *
 * Targetea `<main>` del ScreenShell (único scroll container por screen).
 * Si la screen no usa ScreenShell, fallback a window.scroll (no aplica
 * acá pero seguro).
 *
 * Throttle: actualiza sessionStorage cada 200ms durante scroll para
 * minimizar writes (sessionStorage es sync). Restore es instantáneo en
 * mount.
 *
 * @param {string} viewKey - identificador único de la vista.
 * @param {string} [selector='main'] - selector del contenedor scrolleable.
 * @param {object} [options]
 * @param {boolean} [options.restoreOnReturnOnly=false] - si es true, NO
 *   restaura en la entrada nueva (primer mount del page-load): hace scroll a 0
 *   (top). Solo restaura al VOLVER de un detalle/sub-ruta dentro de la misma
 *   sesión de página. Operador 2026-06-15: en el home, entrar fresco/post-login
 *   debe dejar al usuario ARRIBA, no en la posición baja de la sesión anterior.
 */
export function useScrollRestoration(viewKey, selector = 'main', options = {}) {
  const { restoreOnReturnOnly = false } = options;
  const restoredRef = useRef(false);

  useEffect(() => {
    const key = `chagra:scroll:${viewKey}`;
    // selector: 'main' por defecto (ScreenShell). Para vistas custom como
    // DashboardLive que no usan ScreenShell, pasar otro selector
    // (ej. `[data-scroll-restore="dashboard-live"]`).
    const mainEl = document.querySelector(selector);
    if (!mainEl) return;

    // Restore en mount (single shot por mount)
    if (!restoredRef.current) {
      // ENTRADA NUEVA vs REGRESO (restoreOnReturnOnly): si la vista NO está
      // armada en este page-load, es una entrada fresca (login / abrir app /
      // refresh) → NO restaurar, dejar el scroll arriba (top). Si ya está
      // armada, el usuario scrolleó antes de ir a un detalle y ahora vuelve →
      // restaurar su posición (fix #103 intacto).
      const isFreshEntry = restoreOnReturnOnly && !armedViews.has(key);
      if (isFreshEntry) {
        // Garantizar top en la entrada fresca incluso si un scroll previo del
        // navegador o un anchor dejó el contenedor desplazado.
        requestAnimationFrame(() => {
          mainEl.scrollTop = 0;
        });
      } else {
        const saved = sessionStorage.getItem(key);
        if (saved !== null) {
          const top = parseInt(saved, 10);
          if (!Number.isNaN(top) && top > 0) {
            // requestAnimationFrame para esperar render del contenido inicial
            requestAnimationFrame(() => {
              mainEl.scrollTop = top;
            });
          }
        }
      }
      restoredRef.current = true;
    }

    // Save on scroll, throttled 200ms
    let timeoutId = null;
    const onScroll = () => {
      // El usuario scrolleó esta vista en este page-load → queda "armada": un
      // futuro remount (volver de un detalle) contará como REGRESO y restaurará.
      armedViews.add(key);
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(key, String(mainEl.scrollTop));
        timeoutId = null;
      }, 200);
    };
    mainEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      mainEl.removeEventListener('scroll', onScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
        // Save final state al desmontar
        sessionStorage.setItem(key, String(mainEl.scrollTop));
      }
    };
  }, [viewKey, selector, restoreOnReturnOnly]);
}

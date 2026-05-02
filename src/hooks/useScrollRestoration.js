import { useEffect, useRef } from 'react';

/**
 * useScrollRestoration — preserva scroll position al navegar entre vistas.
 *
 * Lili reportó (#103, field test 2026-05-01):
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
 */
export function useScrollRestoration(viewKey) {
  const restoredRef = useRef(false);

  useEffect(() => {
    const key = `chagra:scroll:${viewKey}`;
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    // Restore en mount (single shot por mount)
    if (!restoredRef.current) {
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
      restoredRef.current = true;
    }

    // Save on scroll, throttled 200ms
    let timeoutId = null;
    const onScroll = () => {
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
  }, [viewKey]);
}

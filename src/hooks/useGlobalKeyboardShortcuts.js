import { useEffect } from 'react';

/**
 * useGlobalKeyboardShortcuts — atajos de teclado globales.
 *
 * Quick-win UX 2026-05-28 demo Diana: el usuario power (en laptop o iPad
 * con teclado externo) puede invocar Ayuda con "?" desde cualquier pantalla
 * sin tener que volver al dashboard. Es el patrón que usan Slack/Linear/
 * GitHub y la gente lo descubre por accidente (positivo).
 *
 * Mapeo:
 *   - "?"           → abre help (manual de uso) navegando con CustomEvent.
 *   - "g" + "h"     → go home (dashboard). Patrón Gmail/Linear.
 *
 * No interfiere con inputs (chequea event.target tagName + isContentEditable
 * + role="textbox"). Solo en touch puro no se activa (no hay teclado).
 */
export function useGlobalKeyboardShortcuts({ enabled = true } = {}) {
  useEffect(() => {
    if (!enabled) return undefined;

    let gPressed = false;
    let gTimer = null;

    const isEditableTarget = (target) => {
      if (!target) return false;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (target.isContentEditable) return true;
      if (target.getAttribute?.('role') === 'textbox') return true;
      return false;
    };

    const navigateGlobal = (view) => {
      window.dispatchEvent(new CustomEvent('chagra:nav', { detail: view }));
    };

    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      // "?" abre ayuda — typical es shift+/ en QWERTY ES/EN.
      if (e.key === '?') {
        e.preventDefault();
        navigateGlobal('help');
        return;
      }

      // "g" + "h" → go home. Inspirado en Gmail/Linear.
      if (e.key === 'g' && !gPressed) {
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          gPressed = false;
          gTimer = null;
        }, 800);
        return;
      }
      if (gPressed && e.key === 'h') {
        e.preventDefault();
        gPressed = false;
        if (gTimer) {
          clearTimeout(gTimer);
          gTimer = null;
        }
        navigateGlobal('dashboard');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [enabled]);
}

export default useGlobalKeyboardShortcuts;

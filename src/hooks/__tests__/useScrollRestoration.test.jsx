import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollRestoration } from '../useScrollRestoration';

/**
 * useScrollRestoration — cubre el fix de BUG 2 (operador 2026-06-15):
 * `restoreOnReturnOnly` debe dejar el scroll ARRIBA (0) en una entrada nueva
 * (primer mount del page-load) y SOLO restaurar la posición guardada al VOLVER
 * de un detalle (mount posterior, tras haber scrolleado). El comportamiento
 * clásico (sin la opción) debe seguir restaurando en cada mount (fix #103).
 *
 * Nota: el hook usa requestAnimationFrame para aplicar el scroll tras el primer
 * render; en estos tests lo hacemos síncrono con un mock que ejecuta el callback
 * de inmediato. El Set `armedViews` es module-level (persiste entre montajes del
 * mismo page-load, como en producción); para no contaminar tests usamos una
 * viewKey ÚNICA por caso.
 */

function makeScroller(selector, initialTop = 0) {
  const el = document.createElement('div');
  // El selector que pasamos al hook es un atributo data-* para que
  // document.querySelector lo encuentre.
  el.setAttribute('data-scroll-test', selector);
  el.scrollTop = initialTop;
  document.body.appendChild(el);
  return el;
}

let rafSpy;

beforeEach(() => {
  // rAF síncrono: ejecuta el callback de inmediato para poder aseverar scrollTop.
  rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
  sessionStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  rafSpy.mockRestore();
  document.body.innerHTML = '';
});

describe('useScrollRestoration — restoreOnReturnOnly (BUG 2)', () => {
  it('entrada nueva (primer mount): NO restaura, deja el scroll en 0', () => {
    const sel = 'fresh-entry';
    const el = makeScroller(sel, 999);
    // Hay una posición guardada de una "sesión anterior", pero como es entrada
    // fresca (la key no está armada en este page-load) debe ignorarse → top.
    sessionStorage.setItem(`chagra:scroll:${sel}`, '500');

    renderHook(() =>
      useScrollRestoration(sel, `[data-scroll-test="${sel}"]`, { restoreOnReturnOnly: true }),
    );

    expect(el.scrollTop).toBe(0);
  });

  it('regreso de un detalle: SÍ restaura la posición guardada tras scrollear', () => {
    const sel = 'return-from-detail';
    const el = makeScroller(sel, 0);

    // 1er mount (entrada fresca) → queda en 0.
    const first = renderHook(() =>
      useScrollRestoration(sel, `[data-scroll-test="${sel}"]`, { restoreOnReturnOnly: true }),
    );
    expect(el.scrollTop).toBe(0);

    // El usuario scrollea → onScroll arma la vista y agenda el guardado
    // (throttle 200ms). Al desmontar (ir a un detalle) con un timeout pendiente,
    // el cleanup guarda el estado FINAL de inmediato (sin esperar el throttle).
    el.scrollTop = 420;
    el.dispatchEvent(new Event('scroll'));
    first.unmount();
    expect(sessionStorage.getItem(`chagra:scroll:${sel}`)).toBe('420');

    // Se navega a un detalle y se vuelve → REMONTA. Reiniciamos el scroll del
    // contenedor (nuevo nodo) y montamos de nuevo: ahora la vista YA está armada
    // (mismo page-load) → debe restaurar 420.
    const el2 = makeScroller(sel, 0);
    // Quitar el primer nodo para que querySelector encuentre el nuevo.
    el.remove();
    renderHook(() =>
      useScrollRestoration(sel, `[data-scroll-test="${sel}"]`, { restoreOnReturnOnly: true }),
    );
    expect(el2.scrollTop).toBe(420);
  });
});

describe('useScrollRestoration — comportamiento clásico (#103, sin la opción)', () => {
  it('restaura la posición guardada ya en el primer mount', () => {
    const sel = 'classic-restore';
    const el = makeScroller(sel, 0);
    sessionStorage.setItem(`chagra:scroll:${sel}`, '300');

    renderHook(() => useScrollRestoration(sel, `[data-scroll-test="${sel}"]`));

    expect(el.scrollTop).toBe(300);
  });

  it('no restaura nada si no hay posición guardada (queda en 0)', () => {
    const sel = 'classic-empty';
    const el = makeScroller(sel, 0);

    renderHook(() => useScrollRestoration(sel, `[data-scroll-test="${sel}"]`));

    expect(el.scrollTop).toBe(0);
  });

  it('selector inexistente: no rompe (no-op)', () => {
    expect(() =>
      renderHook(() => useScrollRestoration('nope', '[data-scroll-test="does-not-exist"]')),
    ).not.toThrow();
  });
});

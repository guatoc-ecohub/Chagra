/**
 * useAngelitaGuia.test.js — el mecanismo REUTILIZABLE de "Angelita señala y
 * enseña" (nace en dia-en-finca, pensado para regarse a toda pantalla 2D).
 *
 * Cubre lo que pide el encargo:
 *   1. Se posiciona respecto al ELEMENTO real (no coordenadas fijas), y se
 *      recalcula si el elemento se mueve (scroll) o el viewport cambia.
 *   2. Respeta prefers-reduced-motion (expone `quieta`, aparece sin demora).
 *   3. El texto/gesto de cada parada es EXACTAMENTE el declarado por la
 *      pantalla (con `variar:false`) y `angelitaVariedad` solo viste una vez
 *      activo, sin pisar el contenido factual.
 *   4. Recorrido: siguiente/anterior/ir encadenan varias paradas; una sola
 *      parada funciona igual (responde a "uno solo").
 *
 * NOTA DE INFRAESTRUCTURA DE TEST: una actualización de estado disparada por
 * un `setTimeout` (no envuelto en un `act()` explícito en el sitio de
 * llamada) deja pendiente el `useLayoutEffect` que depende de ella hasta el
 * PRÓXIMO corte de `act()` — si ese corte es el único que esperamos, el rAF
 * que ese efecto agenda no alcanza a dispararse. `asentar()` resuelve esto
 * con varios cortes cortos de `act()` en vez de uno solo largo (patrón
 * verificado con una reproducción mínima fuera de este hook).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAngelitaGuia, { calcularPuestoGuia } from '../useAngelitaGuia.js';
import { variantesDeterministas } from '../../services/angelitaVariedad.js';

function stubReducedMotion(matches) {
  vi.stubGlobal('matchMedia', (q) => ({
    matches: q.includes('reduce') ? matches : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

/** Un DOMRect de mentiras, con las cuatro esquinas que pide getBoundingClientRect. */
function rectFalso({ top, left, width, height }) {
  return { top, left, right: left + width, bottom: top + height, width, height };
}

/** Un "elemento" mínimo: solo lo que el hook toca. */
function elementoFalso(rect) {
  let actual = rect;
  return {
    getBoundingClientRect: () => actual,
    _mover: (nuevo) => {
      actual = nuevo;
    },
  };
}

/**
 * Deja correr varios cortes CORTOS de `act()` hasta que `predicado` sea
 * cierto (o se agoten los intentos). Ver nota de infraestructura arriba.
 */
async function asentar(result, predicado = () => true, { intentos = 12, pasoMs = 20 } = {}) {
  for (let i = 0; i < intentos; i += 1) {
    if (predicado(result.current)) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, pasoMs));
    });
  }
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('calcularPuestoGuia — geometría pura', () => {
  it('null sin rect (elemento aún no montado)', () => {
    expect(calcularPuestoGuia(null)).toBeNull();
  });

  it('percha en la esquina con MÁS aire y clampea dentro del viewport', () => {
    // Tarjeta casi de borde a borde (14px de margen a cada lado): el aire es
    // parejo — gana 'derecha' (empate hacia el lado de lectura natural).
    const rect = rectFalso({ top: 200, left: 14, width: 362, height: 180 });
    const puesto = calcularPuestoGuia(rect, { tamano: 64, margen: 14, viewportW: 390, viewportH: 844 });
    expect(puesto.lado).toBe('derecha');
    expect(puesto.direccion).toBe('izquierda'); // perchada a la derecha, apunta a la izquierda
    expect(puesto.x).toBeGreaterThanOrEqual(14);
    expect(puesto.x + 64).toBeLessThanOrEqual(390 - 14 + 0.01);
    expect(puesto.y).toBeGreaterThanOrEqual(14);
    expect(puesto.enVista).toBe(true);
  });

  it('con mucho más aire a la izquierda, percha ahí y mira a la derecha', () => {
    // Elemento angosto, pegado al borde derecho: casi todo el aire libre
    // queda a la izquierda.
    const rect = rectFalso({ top: 100, left: 340, width: 40, height: 40 });
    const puesto = calcularPuestoGuia(rect, { tamano: 64, viewportW: 390, viewportH: 844 });
    expect(puesto.lado).toBe('izquierda');
    expect(puesto.direccion).toBe('derecha');
  });

  it('acepta lado forzado por la parada (pisa la elección automática)', () => {
    const rect = rectFalso({ top: 100, left: 14, width: 362, height: 100 });
    const puesto = calcularPuestoGuia(rect, { ladoForzado: 'izquierda', viewportW: 390, viewportH: 844 });
    expect(puesto.lado).toBe('izquierda');
  });

  it('un elemento scrolleado fuera de pantalla queda fuera de vista', () => {
    const rect = rectFalso({ top: -900, left: 14, width: 362, height: 180 });
    const puesto = calcularPuestoGuia(rect, { viewportW: 390, viewportH: 844 });
    expect(puesto.enVista).toBe(false);
  });

  it('jamás se sale del viewport aunque el margen pedido sea imposible', () => {
    const rect = rectFalso({ top: 0, left: 0, width: 10, height: 10 });
    const puesto = calcularPuestoGuia(rect, { tamano: 400, margen: 40, viewportW: 390, viewportH: 844 });
    expect(puesto.x).toBeGreaterThanOrEqual(0);
    expect(puesto.y).toBeGreaterThanOrEqual(0);
  });
});

describe('useAngelitaGuia — se posiciona respecto al ELEMENTO, no a coordenadas fijas', () => {
  it('mide el rect real del elemento de la parada activa', async () => {
    const el = elementoFalso(rectFalso({ top: 300, left: 14, width: 362, height: 150 }));
    const paradas = [{ id: 'cafe', ref: { current: el }, texto: 'Guarde el café.', gesto: 'senala' }];

    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));
    await asentar(result, (r) => r.posicion !== null);

    expect(result.current.posicion).toBeTruthy();
    expect(result.current.visible).toBe(true);
    expect(result.current.parada.texto).toBe('Guarde el café.');
  });

  it('recalcula cuando el elemento se mueve (scroll) y sigue clampeado', async () => {
    const el = elementoFalso(rectFalso({ top: 300, left: 14, width: 362, height: 150 }));
    const paradas = [{ id: 'cafe', ref: { current: el }, texto: 'Guarde el café.' }];
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));
    await asentar(result, (r) => r.posicion !== null);
    const yAntes = result.current.posicion.y;

    // El usuario hizo scroll: la tarjeta subió 500px, ahora fuera de pantalla.
    el._mover(rectFalso({ top: -800, left: 14, width: 362, height: 150 }));
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await asentar(result, (r) => r.posicion && r.posicion.y !== yAntes);

    expect(result.current.posicion.y).not.toBe(yAntes);
    // El elemento ya no está en pantalla: la guía se sabe "fuera de vista".
    expect(result.current.enVista).toBe(false);
  });

  it('sin elemento montado (ref.current null) no hay posición ni se rompe', async () => {
    const paradas = [{ id: 'fantasma', ref: { current: null }, texto: 'x' }];
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0 }));
    await asentar(result, (r) => r.lista !== undefined); // deja correr unos cortes igual
    expect(result.current.posicion).toBeNull();
    expect(result.current.visible).toBe(false);
  });

  it('acepta un getter función además de un ref de React (mapas de refs dinámicos)', async () => {
    const el = elementoFalso(rectFalso({ top: 50, left: 14, width: 100, height: 40 }));
    const paradas = [{ id: 'dinamico', ref: () => el, texto: 'x' }];
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));
    await asentar(result, (r) => r.posicion !== null);
    expect(result.current.posicion).toBeTruthy();
  });
});

describe('useAngelitaGuia — respeta prefers-reduced-motion', () => {
  it('con reduced-motion: quieta=true y aparece YA (sin esperar la demora)', async () => {
    stubReducedMotion(true);
    const el = elementoFalso(rectFalso({ top: 100, left: 14, width: 200, height: 80 }));
    const paradas = [{ id: 'a', ref: { current: el }, texto: 'x' }];
    // demoraInicialMs alto a propósito: si respetara la demora, este test
    // fallaría (nunca alcanzaría a esperar tanto).
    const { result } = renderHook(() =>
      useAngelitaGuia(paradas, { demoraInicialMs: 60_000, variar: false }),
    );
    expect(result.current.quieta).toBe(true);
    await asentar(result, (r) => r.visible === true);
    expect(result.current.visible).toBe(true);
  });

  it('sin reduced-motion: quieta=false', () => {
    stubReducedMotion(false);
    const { result } = renderHook(() => useAngelitaGuia([], {}));
    expect(result.current.quieta).toBe(false);
  });
});

describe('useAngelitaGuia — el texto y el gesto son EXACTAMENTE lo declarado', () => {
  it('con variar:false, el texto de cada parada es el literal declarado', async () => {
    const elA = elementoFalso(rectFalso({ top: 100, left: 14, width: 200, height: 80 }));
    const elB = elementoFalso(rectFalso({ top: 400, left: 14, width: 200, height: 80 }));
    const paradas = [
      { id: 'a', ref: { current: elA }, texto: 'El café mojado coge hongos.', gesto: 'senala' },
      { id: 'b', ref: { current: elB }, texto: 'El agua de lluvia no trae cloro.', gesto: 'invita' },
    ];
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));
    await asentar(result, (r) => r.posicion !== null);

    expect(result.current.parada.id).toBe('a');
    expect(result.current.parada.texto).toBe('El café mojado coge hongos.');
    expect(result.current.parada.gesto).toBe('senala');

    act(() => result.current.siguiente());
    await asentar(result, (r) => r.parada?.id === 'b');

    expect(result.current.parada.id).toBe('b');
    expect(result.current.parada.texto).toBe('El agua de lluvia no trae cloro.');
    expect(result.current.parada.gesto).toBe('invita');
  });

  it('sin gesto declarado, el default es "senala" (guiar es el caso base)', async () => {
    const el = elementoFalso(rectFalso({ top: 100, left: 14, width: 200, height: 80 }));
    const paradas = [{ id: 'a', ref: { current: el }, texto: 'x' }];
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));
    await asentar(result, (r) => r.posicion !== null);
    expect(result.current.parada.gesto).toBe('senala');
  });

  it('con variar:true (default), el texto mostrado sigue siendo una variante fiel del pool determinista', async () => {
    const el = elementoFalso(rectFalso({ top: 100, left: 14, width: 200, height: 80 }));
    const base = 'El tallo se pone quebradizo justo donde nace la flor.';
    const paradas = [{ id: 'a', ref: { current: el }, texto: base, tipo: 'sugerencia' }];
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0 }));
    await asentar(result, (r) => r.posicion !== null);
    const pool = variantesDeterministas(base, 'sugerencia');
    expect(pool).toContain(result.current.parada.texto);
  });
});

describe('useAngelitaGuia — encadena un recorrido, o responde a uno solo', () => {
  function armarParadas(n) {
    return Array.from({ length: n }, (_, i) => ({
      id: `p${i}`,
      ref: { current: elementoFalso(rectFalso({ top: 100 * (i + 1), left: 14, width: 200, height: 60 })) },
      texto: `texto ${i}`,
    }));
  }

  it('una sola parada: esPrimera y esUltima a la vez, sin romper siguiente()/anterior()', async () => {
    const paradas = armarParadas(1);
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));
    await asentar(result, (r) => r.posicion !== null);

    expect(result.current.total).toBe(1);
    expect(result.current.esPrimera).toBe(true);
    expect(result.current.esUltima).toBe(true);

    act(() => result.current.siguiente());
    expect(result.current.indice).toBe(0); // no hay a dónde ir: se queda

    act(() => result.current.anterior());
    expect(result.current.indice).toBe(0);
  });

  it('varias paradas: siguiente/anterior/ir recorren la secuencia completa', async () => {
    const paradas = armarParadas(3);
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));
    await asentar(result, (r) => r.posicion !== null);

    expect(result.current.indice).toBe(0);
    act(() => result.current.siguiente());
    expect(result.current.indice).toBe(1);
    act(() => result.current.siguiente());
    expect(result.current.indice).toBe(2);
    expect(result.current.esUltima).toBe(true);
    act(() => result.current.siguiente()); // ya no hay más: se queda en la última
    expect(result.current.indice).toBe(2);

    act(() => result.current.ir('p0'));
    expect(result.current.indice).toBe(0);
    act(() => result.current.anterior()); // ya está en la primera: se queda
    expect(result.current.indice).toBe(0);
  });
});

describe('useAngelitaGuia — cerrar y recordarCierreId', () => {
  it('cerrar() apaga la guía; con recordarCierreId lo persiste para la próxima', async () => {
    const el = elementoFalso(rectFalso({ top: 100, left: 14, width: 200, height: 80 }));
    const paradas = [{ id: 'a', ref: { current: el }, texto: 'x' }];
    const { result } = renderHook(() =>
      useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false, recordarCierreId: 'pantalla-x' }),
    );
    await asentar(result, (r) => r.posicion !== null);
    expect(result.current.visible).toBe(true);

    act(() => result.current.cerrar());
    expect(result.current.visible).toBe(false);
    expect(localStorage.getItem('chagra:angelita:guia:pantalla-x')).toBe('1');

    // Un montaje NUEVO (p. ej. el usuario recarga la pantalla) respeta el cierre.
    const otra = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, recordarCierreId: 'pantalla-x' }));
    expect(otra.result.current.cerrada).toBe(true);
    expect(otra.result.current.visible).toBe(false);
  });

  it('reiniciar() borra el cierre persistido y vuelve a la primera parada', async () => {
    const el = elementoFalso(rectFalso({ top: 100, left: 14, width: 200, height: 80 }));
    const paradas = [{ id: 'a', ref: { current: el }, texto: 'x' }];
    const { result } = renderHook(() =>
      useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false, recordarCierreId: 'pantalla-y' }),
    );
    await asentar(result, (r) => r.posicion !== null);
    act(() => result.current.cerrar());
    expect(localStorage.getItem('chagra:angelita:guia:pantalla-y')).toBe('1');

    act(() => result.current.reiniciar());
    expect(result.current.cerrada).toBe(false);
    expect(localStorage.getItem('chagra:angelita:guia:pantalla-y')).toBeNull();
  });
});

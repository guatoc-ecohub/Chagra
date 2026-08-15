/**
 * useCompaiRoam.test.js — el deambular físico del compai por la franja inferior.
 *
 * jsdom no pinta ni corre un rAF real de browser, así que controlamos el reloj
 * de animación a mano: `requestAnimationFrame` se stubea para CAPTURAR el
 * callback del loop y lo invocamos con timestamps crecientes, y `performance.now`
 * / `Math.random` se fijan para determinismo. Se cubre el CONTRATO: los gates
 * (reduced-motion, activo=false), el desplazamiento real (transform escrito,
 * `caminando`/`hacia` reactivos) y el regreso a casa al pausar.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCompaiRoam from '../useCompaiRoam.js';

/** Instala un rAF controlable: guarda el último callback para dispararlo a mano. */
function instalarRafManual() {
  const estado = { cb: /** @type {FrameRequestCallback|null} */ (null) };
  vi.stubGlobal('requestAnimationFrame', (cb) => { estado.cb = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { estado.cb = null; });
  return estado;
}

function fijarReducedMotion(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('useCompaiRoam', () => {
  beforeEach(() => {
    fijarReducedMotion(false);
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('estado inicial: no camina y mira a la izquierda por defecto', () => {
    instalarRafManual();
    const el = document.createElement('div');
    const ref = { current: el };
    const { result } = renderHook(() => useCompaiRoam(ref, { pausado: false }));
    expect(result.current.caminando).toBe(false);
    expect(result.current.hacia).toBe('izquierda');
  });

  it('gate reduced-motion: no deambula ni escribe transform', () => {
    fijarReducedMotion(true);
    const raf = instalarRafManual();
    const el = document.createElement('div');
    el.style.transform = 'translate3d(-20px, 0, 0)';
    const ref = { current: el };
    const { result } = renderHook(() => useCompaiRoam(ref, { pausado: false }));
    expect(el.style.transform).toBe('');
    expect(raf.cb).toBeNull();
    expect(result.current.caminando).toBe(false);
  });

  it('gate activo=false: limpia el transform y no agenda frames', () => {
    const raf = instalarRafManual();
    const el = document.createElement('div');
    el.style.transform = 'translate3d(-40px, 0, 0)';
    const ref = { current: el };
    renderHook(() => useCompaiRoam(ref, { activo: false }));
    expect(el.style.transform).toBe('');
    expect(raf.cb).toBeNull();
  });

  it('deambula: tras la pausa de arranque camina hacia la izquierda y escribe transform', () => {
    const raf = instalarRafManual();
    const el = document.createElement('div');
    const ref = { current: el };
    const { result } = renderHook(() => useCompaiRoam(ref, { pausado: false }));

    // reposoHasta = performance.now()(1000) + ARRANQUE(900) = 1900.
    act(() => { raf.cb?.(2000); }); // >1900 → elige destino y arranca la marcha
    act(() => { raf.cb?.(2200); }); // avanza (dt real → paso > 0)

    expect(result.current.caminando).toBe(true);
    expect(result.current.hacia).toBe('izquierda');
    expect(el.style.transform).toContain('translate3d(-');
  });

  it('pausado: regresa a casa (hacia la derecha) y se detiene en x=0', () => {
    const raf = instalarRafManual();
    const el = document.createElement('div');
    const ref = { current: el };
    const { result, rerender } = renderHook(
      ({ pausado }) => useCompaiRoam(ref, { pausado }),
      { initialProps: { pausado: false } },
    );

    // Camina hacia la izquierda varios frames (se aleja lo suficiente para que
    // el regreso abarque más de un frame).
    act(() => { raf.cb?.(2000); });
    act(() => { raf.cb?.(2200); });
    act(() => { raf.cb?.(2400); });
    expect(el.style.transform).toContain('translate3d(-');

    // Ahora se pausa (panel abierto): debe volver a casa mirando a la derecha.
    rerender({ pausado: true });
    act(() => { raf.cb?.(2600); });
    expect(result.current.hacia).toBe('derecha'); // vuelve hacia la esquina

    // Muchos frames largos → aterriza en casa (transform vacío) y quieto.
    for (let t = 3000; t <= 40000; t += 2000) {
      act(() => { raf.cb?.(t); });
    }
    expect(el.style.transform).toBe('');
    expect(result.current.caminando).toBe(false);
  });
});

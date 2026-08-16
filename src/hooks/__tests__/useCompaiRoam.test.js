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

  it('estado inicial: no camina, mira a la izquierda y aún no ha parado (parada=0)', () => {
    instalarRafManual();
    const el = document.createElement('div');
    const ref = { current: el };
    const { result } = renderHook(() => useCompaiRoam(ref, { pausado: false }));
    expect(result.current.caminando).toBe(false);
    expect(result.current.hacia).toBe('izquierda');
    expect(result.current.parada).toBe(0);
  });

  it('moverse-para-explicar: al LLEGAR a un punto del paseo, para (caminando=false) e incrementa `parada`', () => {
    // Franja diminuta (innerWidth chico) → la caminata es corta y llega en
    // pocos frames, así el test no depende de decenas de fotogramas.
    const anchoOriginal = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 30, configurable: true });
    try {
      const raf = instalarRafManual();
      const el = document.createElement('div');
      const ref = { current: el };
      const { result } = renderHook(() => useCompaiRoam(ref, { pausado: false }));

      // reposoHasta = 1000 + ARRANQUE(900) = 1900 → arranca a los >1900ms.
      act(() => { raf.cb?.(2000); }); // elige destino y arranca (dt=0, aún sin avance)
      expect(result.current.parada).toBe(0);
      // avanza en frames de 100ms (dt=0.05 → ~1.7px/frame) hasta cubrir la
      // franja corta y aterrizar en el destino.
      for (let t = 2100; t <= 2600; t += 100) {
        act(() => { raf.cb?.(t); });
      }

      expect(result.current.caminando).toBe(false); // llegó y se detuvo
      expect(result.current.parada).toBeGreaterThanOrEqual(1); // marcó la parada
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: anchoOriginal, configurable: true });
    }
  });

  it('gate reduced-motion: no deambula ni escribe transform', () => {
    fijarReducedMotion(true);
    const raf = instalarRafManual();
    const el = document.createElement('div');
    el.style.transform = 'translate3d(-20px, 0, 0)';
    el.style.opacity = '0.2';
    const ref = { current: el };
    const { result } = renderHook(() => useCompaiRoam(ref, {
      pausado: false,
      mistico: true,
      zonas: ['abajo', 'medio', 'arriba'],
    }));
    expect(el.style.transform).toBe('');
    expect(el.style.opacity).toBe('');
    expect(raf.cb).toBeNull();
    expect(result.current.caminando).toBe(false);
  });

  it('mistico apagado conserva el roam y no toca opacity', () => {
    const raf = instalarRafManual();
    const el = document.createElement('div');
    el.style.opacity = '0.7';
    const ref = { current: el };
    const { result } = renderHook(() => useCompaiRoam(ref, {
      pausado: false,
      mistico: false,
    }));

    act(() => { raf.cb?.(2000); });
    act(() => { raf.cb?.(2200); });

    expect(result.current.caminando).toBe(true);
    expect(el.style.transform).toContain('translate3d(-');
    expect(el.style.opacity).toBe('0.7');
  });

  it('mistico camina horizontal sin fade y teletransporta solo en vertical', () => {
    const anchoOriginal = window.innerWidth;
    const altoOriginal = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { value: 30, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    try {
      const raf = instalarRafManual();
      const el = document.createElement('div');
      const ref = { current: el };
      const { result } = renderHook(() => useCompaiRoam(ref, {
        pausado: false,
        mistico: true,
        fraccionAncho: 1,
        zonas: ['abajo', 'arriba'],
      }));

      act(() => { raf.cb?.(2000); });
      act(() => { raf.cb?.(2200); });
      expect(result.current.caminando).toBe(true);
      expect(el.style.transform).toContain(', 0, 0)');
      expect(el.style.opacity).toBe('');

      // Llega horizontalmente a x=-15 y queda en reposo en la zona abajo.
      for (let t = 2300; t <= 3000; t += 100) {
        act(() => { raf.cb?.(t); });
      }
      expect(result.current.parada).toBe(1);
      expect(result.current.zona).toBe('abajo');
      expect(el.style.transform).toContain('translate3d(-15.0px, 0, 0)');

      // Termina el reposo horizontal y empieza el fade vertical hacia arriba.
      act(() => { raf.cb?.(7000); });
      expect(Number(el.style.opacity)).toBeLessThan(1);
      expect(el.style.transform).toContain(', 0, 0)');

      // El fade-out termina con opacity=0 y el mismo nodo cambia solo de Y.
      for (let t = 7100; t <= 7400; t += 100) {
        act(() => { raf.cb?.(t); });
      }
      expect(el.style.opacity).toBe('0');
      expect(el.style.transform).toContain('translate3d(-15.0px, -384.0px, 0)');

      // El fade-in lo deja visible en la zona arriba, conservando el x.
      for (let t = 7500; t <= 7900; t += 100) {
        act(() => { raf.cb?.(t); });
      }
      expect(el.style.transform).toContain('translate3d(-15.0px, -384.0px, 0)');
      expect(el.style.opacity).toBe('1');
      expect(result.current.zona).toBe('arriba');
      expect(result.current.parada).toBeGreaterThanOrEqual(2);
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: anchoOriginal, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: altoOriginal, configurable: true });
    }
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
      ({ pausado }) => useCompaiRoam(ref, {
        pausado,
        mistico: true,
        zonas: ['abajo', 'medio', 'arriba'],
      }),
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

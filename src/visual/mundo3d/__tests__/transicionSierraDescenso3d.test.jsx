/*
 * El modo `escena3d` de la transición: que se encienda SOLO cuando toca, y que
 * al encenderse NO le cambie nada al contrato que ya estaba en producción.
 *
 * La regla de la casa detrás de este archivo: «instrucción nueva = ADITIVA».
 * El Paso 3 agrega un modo; no le puede mover el reloj, los tiers ni el
 * reduced-motion al modo que ya corre.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import TransicionSierraMundo from '../TransicionSierraMundo.jsx';
import { LLAVE_VISTO } from '../sierra/descensoSierra.js';

vi.mock('../sierra/EscenaDescensoSierra.jsx', () => ({
  default: ({ plan, fase, tier }) => (
    <div
      data-testid="escena3d-mock"
      data-cota={plan?.destino}
      data-total={plan?.total}
      data-fase={fase}
      data-tier={tier}
    />
  ),
}));

const esperarLienzo = () => screen.findByTestId('escena3d-mock');

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('opt-in: los defaults públicos NO cambian', () => {
  it('sin pedirlo, NO monta 3D — sigue siendo la columna CSS de siempre', () => {
    render(<TransicionSierraMundo activa direccion="bajar" tier="alto" />);
    const tsm = screen.getByTestId('tsm');
    expect(tsm.dataset.escena3d).toBe('0');
    expect(tsm.className).toBe('tsm');
    expect(screen.queryByTestId('escena3d-mock')).toBeNull();
  });

  it('con `?descenso3d=1` sí lo monta (mismo patrón que ?cielo=1 del lote Sylva)', async () => {
    window.history.replaceState({}, '', '/?descenso3d=1');
    render(<TransicionSierraMundo activa direccion="bajar" tier="alto" />);
    await esperarLienzo();
    expect(screen.getByTestId('tsm').dataset.escena3d).toBe('1');
  });

  it('la prop `escena3d={false}` gana sobre la query: apagar siempre se puede', () => {
    window.history.replaceState({}, '', '/?descenso3d=1');
    render(<TransicionSierraMundo activa escena3d={false} tier="alto" />);
    expect(screen.getByTestId('tsm').dataset.escena3d).toBe('0');
  });
});

describe('las cuatro puertas conservadoras', () => {
  it('tier bajo → cae a la columna CSS (§10.5: no es fracaso, es la salida limpia)', () => {
    render(<TransicionSierraMundo activa escena3d tier="bajo" />);
    expect(screen.getByTestId('tsm').dataset.escena3d).toBe('0');
    expect(screen.queryByTestId('escena3d-mock')).toBeNull();
  });

  it('reduced-motion → corte simple, jamás un viaje de 4 s', () => {
    render(<TransicionSierraMundo activa escena3d tier="alto" reducedMotion />);
    expect(screen.getByTestId('tsm').dataset.escena3d).toBe('0');
    expect(document.querySelector('.tsm__corte')).not.toBeNull();
  });

  it('la SUBIDA de vuelta a la Sierra no es un descenso', () => {
    render(<TransicionSierraMundo activa escena3d tier="alto" direccion="subir" />);
    expect(screen.getByTestId('tsm').dataset.escena3d).toBe('0');
  });

  it('si ya lo vio, no vuelve a correr (corre UNA vez)', () => {
    window.localStorage.setItem(LLAVE_VISTO, '1');
    render(<TransicionSierraMundo activa escena3d tier="alto" />);
    expect(screen.getByTestId('tsm').dataset.escena3d).toBe('0');
  });
});

describe('el contrato temporal NO se toca', () => {
  it('modo CSS: sigue en 1 500 ms con la mitad a los 750 (producción intacta)', () => {
    vi.useFakeTimers();
    const mitad = vi.fn();
    const fin = vi.fn();
    render(<TransicionSierraMundo activa tier="alto" onMitad={mitad} onFin={fin} />);
    vi.advanceTimersByTime(749);
    expect(mitad).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(mitad).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1499 - 751);
    expect(fin).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(fin).toHaveBeenCalledTimes(1);
  });

  it('modo CSS en tier bajo: 1 050 ms (el factor 0,7 se conserva)', () => {
    vi.useFakeTimers();
    const fin = vi.fn();
    render(<TransicionSierraMundo activa tier="bajo" onFin={fin} />);
    vi.advanceTimersByTime(1049);
    expect(fin).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(fin).toHaveBeenCalledTimes(1);
  });

  it('modo 3D: 4 200 ms con la mitad a los 2 100, y cada callback UNA vez', () => {
    vi.useFakeTimers();
    const mitad = vi.fn();
    const fin = vi.fn();
    render(
      <TransicionSierraMundo activa escena3d tier="alto" onMitad={mitad} onFin={fin} />,
    );
    vi.advanceTimersByTime(2099);
    expect(mitad).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(mitad).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(4199 - 2101);
    expect(fin).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(fin).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(mitad).toHaveBeenCalledTimes(1);
    expect(fin).toHaveBeenCalledTimes(1);
  });

  it('modo 3D en tier medio: 2 800 ms (§3.2)', () => {
    vi.useFakeTimers();
    const fin = vi.fn();
    render(<TransicionSierraMundo activa escena3d tier="medio" onFin={fin} />);
    vi.advanceTimersByTime(2799);
    expect(fin).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(fin).toHaveBeenCalledTimes(1);
  });

  it('al terminar, queda marcado «ya lo vio»', () => {
    vi.useFakeTimers();
    render(<TransicionSierraMundo activa escena3d tier="alto" />);
    expect(window.localStorage.getItem(LLAVE_VISTO)).toBeNull();
    vi.advanceTimersByTime(4300);
    expect(window.localStorage.getItem(LLAVE_VISTO)).toBe('1');
  });
});

describe('lo que el descenso recibe', () => {
  it('la cota del usuario llega al plan, y sin ella para en la banda templada', async () => {
    render(<TransicionSierraMundo activa escena3d tier="alto" msnmUsuario={2640} />);
    expect((await esperarLienzo()).dataset.cota).toBe('2640');
    cleanup();
    render(<TransicionSierraMundo activa escena3d tier="alto" />);
    expect((await esperarLienzo()).dataset.cota).toBe('1500');
  });

  it('la fase ENSO viva se pasa tal cual (nunca una constante horneada)', async () => {
    render(
      <TransicionSierraMundo activa escena3d tier="alto" faseEnso="el_nino" msnmUsuario={2640} />,
    );
    expect((await esperarLienzo()).dataset.fase).toBe('el_nino');
  });

  it('el rótulo de altitud arranca en la cumbre y declara la falta de ubicación', async () => {
    render(<TransicionSierraMundo activa escena3d tier="alto" />);
    await esperarLienzo();
    const alt = document.querySelector('.tsm__altimetro');
    expect(alt).not.toBeNull();
    expect(alt.textContent).toContain('5.775 m');
    expect(alt.textContent.toLowerCase()).toContain('ubicaci');
  });
});

describe('PASO 1 + PASO 3 — píldora retirada y aterrizaje en tres tiempos', () => {
  /* El aterrizaje se compone SOLO cuando el viaje está PARADO en la cota
     (`?msnm=` en la URL, el caso que el diseño captura y el gate mide). Los
     tres tiempos corren por setTimeout: T0 a los 3 612 ms (86 % de 4 200),
     T1 a +800 y T2 a +1 600. */
  /**
   * @param {object} [opts]
   * @param {number} [opts.msnm]
   * @param {'neutral'|'el_nino'|'la_nina'} [opts.faseEnso]
   * @param {object|null} [opts.climaVivo]
   * @param {Array} [opts.sugerencias]
   */
  async function montarEnCota({ msnm = 2640, faseEnso = 'neutral', climaVivo = null, sugerencias = [] } = {}) {
    window.history.replaceState({}, '', `/?descenso3d=1&msnm=${msnm}`);
    vi.useFakeTimers();
    render(
      <TransicionSierraMundo
        activa
        escena3d
        tier="alto"
        faseEnso={faseEnso}
        climaVivo={climaVivo}
        sugerencias={sugerencias}
      />,
    );
    await act(async () => {});
  }

  it('🚪 0 píldoras: la caja oscura `.tsm__aterrizaje` ya no existe', async () => {
    await montarEnCota({ msnm: 2640 });
    act(() => vi.advanceTimersByTime(5400));
    expect(document.querySelector('.tsm__aterrizaje')).toBeNull();
    expect(document.querySelector('.tsm__aviso')).toBeNull();
    expect(document.querySelector('.tsm__tiza')).toBeNull();
  });

  it('T0 — la cota para con «a la altura de su finca», sin tinta ni pizarra aún', async () => {
    await montarEnCota({ msnm: 2640 });
    expect(document.querySelector('[data-testid="tsm-t0"]')).toBeNull();
    act(() => vi.advanceTimersByTime(3700));
    const t0 = document.querySelector('[data-testid="tsm-t0"]');
    expect(t0).not.toBeNull();
    expect(t0.textContent).toContain('2.640 m');
    expect(t0.textContent.toLowerCase()).toContain('a la altura de su finca');
    expect(t0.textContent.toLowerCase()).toContain('piso frío');
    expect(document.querySelector('[data-testid="tsm-t1"]')).toBeNull();
    expect(document.querySelector('[data-testid="tsm-t2"]')).toBeNull();
  });

  it('T1 — el ahora en tinta bajo la cota, y T2 aún calla', async () => {
    const climaVivo = {
      senal: true,
      tieneOpenMeteo: true,
      condicion: 'niebla',
      temp: 6.4,
      tempMin: 1.9,
      helada: true,
      ensoFamily: 'nino',
      alertas: [{ tipo: 'helada', mensaje: 'aviso de helada en el páramo' }],
    };
    await montarEnCota({ msnm: 2640, faseEnso: 'el_nino', climaVivo });
    act(() => vi.advanceTimersByTime(3700));
    act(() => vi.advanceTimersByTime(800)); // 4 500 ms: T1 dentro, T2 aún no
    const t1 = document.querySelector('[data-testid="tsm-t1"]');
    expect(t1).not.toBeNull();
    expect(t1.textContent.toLowerCase()).toContain('niebla de ladera · 6° · ahora');
    expect(t1.textContent.toLowerCase()).toContain('aviso de helada en el páramo');
    expect(document.querySelector('[data-testid="tsm-t2"]')).toBeNull();
    act(() => vi.advanceTimersByTime(800)); // 5 300 ms: entra T2
    expect(document.querySelector('[data-testid="tsm-t2"]')).not.toBeNull();
  });

  it('T2 — una sola tiza de helada, firmada, y el ENSO en frío es MÁS helada, no menos', async () => {
    const climaVivo = {
      senal: true,
      tieneOpenMeteo: true,
      condicion: 'niebla',
      temp: 6.4,
      tempMin: 1.9,
      helada: true,
      ensoFamily: 'nino',
      alertas: [],
    };
    await montarEnCota({ msnm: 2200, faseEnso: 'el_nino', climaVivo });
    act(() => vi.advanceTimersByTime(5400));
    const t2 = document.querySelector('[data-testid="tsm-t2"]');
    expect(t2).not.toBeNull();
    const txt = t2.textContent.toLowerCase();
    expect(txt).toMatch(/hela/);
    expect(txt).toContain('más helada, no menos');
    expect(txt).not.toMatch(/más calor/);
    expect(t2.textContent).toMatch(/\S/); // el rótulo de la firma no va vacío
  });

  it('🔴 sin señal de helada y bajo El Niño a 2.200 m, la tiza ENSO (prioridad 5) avisa de helada', async () => {
    await montarEnCota({ msnm: 2200, faseEnso: 'el_nino' });
    act(() => vi.advanceTimersByTime(5400));
    const t2 = document.querySelector('[data-testid="tsm-t2"]');
    expect(t2).not.toBeNull();
    expect(t2.textContent.toLowerCase()).toMatch(/hela/);
    expect(t2.textContent.toLowerCase()).not.toMatch(/más calor/);
  });

  it('a 900 m bajo El Niño la tiza dice calor (el ENSO se lee POR PISO), sin helada', async () => {
    await montarEnCota({ msnm: 900, faseEnso: 'el_nino' });
    act(() => vi.advanceTimersByTime(5400));
    const t2 = document.querySelector('[data-testid="tsm-t2"]');
    expect(t2).not.toBeNull();
    expect(t2.textContent.toLowerCase()).toMatch(/calor/);
    expect(t2.textContent.toLowerCase()).not.toMatch(/hela/);
  });

  it('si ninguna prioridad aplica, la pizarra calla: «nada» es válido', async () => {
    await montarEnCota({ msnm: 2640, faseEnso: 'neutral' }); // sin climaVivo ni ENSO
    act(() => vi.advanceTimersByTime(5400));
    expect(document.querySelector('[data-testid="tsm-t2"]')).toBeNull();
  });

  it('sin ubicación no pinta composición ni clima: solo el altímetro lo declara', async () => {
    window.history.replaceState({}, '', '/?descenso3d=1'); // sin `?msnm=`: viaje, no aterrizaje
    render(<TransicionSierraMundo activa escena3d tier="alto" />);
    await esperarLienzo();
    expect(document.querySelector('.tsm__altimetro small').textContent.toLowerCase()).toContain(
      'ubicaci',
    );
    expect(document.querySelector('[data-testid="tsm-t0"]')).toBeNull();
  });

  it('🚪 conteo del gate en T2 final: 1 rótulo de cota · 1 tinta · ≤1 pizarra · 0 píldoras', async () => {
    const climaVivo = {
      senal: true,
      condicion: 'lluvia',
      temp: 14.2,
      tempMin: 2.1,
      helada: true,
      ensoFamily: 'neutral',
    };
    await montarEnCota({ msnm: 2640, faseEnso: 'neutral', climaVivo });
    act(() => vi.advanceTimersByTime(5400));
    expect(document.querySelectorAll('.tsm__aterrizaje').length).toBe(0);
    expect(document.querySelectorAll('[data-testid="tsm-t0"]').length).toBe(1);
    expect(document.querySelectorAll('[data-testid="tsm-t1"]').length).toBe(1);
    expect(document.querySelectorAll('.tsm__pizarra').length).toBeLessThanOrEqual(1);
  });

  it('🚪 PUERTA 2 — el descenso completo NO toca `compai:companero`', () => {
    vi.useFakeTimers();
    window.localStorage.setItem('compai:companero', 'jaguar');
    const antes = JSON.stringify({ ...window.localStorage });
    render(<TransicionSierraMundo activa escena3d tier="alto" msnmUsuario={2640} />);
    vi.advanceTimersByTime(4300); // el viaje entero, de punta a punta
    const despues = { ...window.localStorage };
    expect(despues['compai:companero']).toBe('jaguar');
    // Lo único que el descenso escribe es su propia marca de «ya lo vio».
    delete despues[LLAVE_VISTO];
    expect(JSON.stringify(despues)).toBe(antes);
  });
});

describe('PASO 5 — la tiza de helada por el hook, con su prioridad', () => {
  /* La salida de `derivarClima3D` (la forma que `useClima3DVivo` ya expone). */
  const climaVivo = {
    senal: true,
    tieneOpenMeteo: true,
    condicion: 'niebla',
    temp: 6.4,
    tempMin: 1.9,
    helada: true,
    ensoFamily: 'nino',
    alertas: [{ tipo: 'helada', mensaje: 'aviso de helada en el páramo' }],
  };

  async function montarEnCota(climaVivoProp, sugerencias) {
    window.history.replaceState({}, '', '/?descenso3d=1&msnm=2640');
    vi.useFakeTimers();
    render(
      <TransicionSierraMundo
        activa
        escena3d
        tier="alto"
        faseEnso="el_nino"
        climaVivo={climaVivoProp}
        sugerencias={sugerencias}
      />,
    );
    await act(async () => {});
  }

  it('la prioridad manda: la tiza de helada tapa la del cultivo (una sola tiza)', async () => {
    await montarEnCota(
      { ...climaVivo, ensoFamily: 'neutral' },
      [{ suggestion: { severity: 'critical', text: 'proteja su gulupa esta noche' } }],
    );
    act(() => vi.advanceTimersByTime(5400));
    const t2 = document.querySelector('[data-testid="tsm-t2"]');
    expect(t2).not.toBeNull();
    expect(t2.textContent).toContain('Puede helar');
    expect(t2.textContent).not.toContain('proteja su gulupa');
  });

  it('sin helada y con la alerta de SU cultivo, la tiza pasa al cultivo', async () => {
    await montarEnCota(
      { ...climaVivo, helada: false, tempMin: 8, ensoFamily: 'neutral' },
      [{ suggestion: { severity: 'warning', text: 'proteja su gulupa esta noche' } }],
    );
    act(() => vi.advanceTimersByTime(5400));
    const t2 = document.querySelector('[data-testid="tsm-t2"]');
    expect(t2).not.toBeNull();
    expect(t2.textContent).toContain('proteja su gulupa');
  });

  it('sin señal el aterrizaje no inventa clima: nada de tinta, avisos ni tiza extra', async () => {
    window.history.replaceState({}, '', '/?descenso3d=1&msnm=2640&enso=neutral');
    vi.useFakeTimers();
    render(
      <TransicionSierraMundo
        activa
        escena3d
        tier="alto"
        faseEnso="neutral"
        climaVivo={{ ...climaVivo, senal: false }}
      />,
    );
    await act(async () => {});
    act(() => vi.advanceTimersByTime(5400));
    const t1 = document.querySelector('[data-testid="tsm-t1"]');
    const t2 = document.querySelector('[data-testid="tsm-t2"]');
    expect(t1).toBeNull();
    expect(t2).toBeNull();
    expect(document.querySelector('.tsm__llegada').textContent).not.toMatch(/· ahora/);
    expect(document.querySelector('.tsm__llegada').textContent).not.toMatch(/esta noche baja/);
  });
});

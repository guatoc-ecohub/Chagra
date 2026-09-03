/*
 * El modo `escena3d` de la transición: que se encienda SOLO cuando toca, y que
 * al encenderse NO le cambie nada al contrato que ya estaba en producción.
 *
 * La regla de la casa detrás de este archivo: «instrucción nueva = ADITIVA».
 * El Paso 3 agrega un modo; no le puede mover el reloj, los tiers ni el
 * reduced-motion al modo que ya corre.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

describe('PASO 4 — el aterrizaje, en pantalla', () => {
  it('con cota y clima reales dice el clima de hoy y el piso, sin inventar', async () => {
    render(
      <TransicionSierraMundo
        activa
        escena3d
        tier="alto"
        msnmUsuario={2640}
        faseEnso="neutral"
        clima={{ descripcion: 'llovizna', temperatura: 14.2 }}
      />,
    );
    await esperarLienzo();
    const caja = document.querySelector('.tsm__aterrizaje');
    expect(caja.textContent).toContain('llovizna, 14°');
    expect(caja.textContent.toLowerCase()).toContain('piso frío');
    expect(document.querySelector('.tsm__altimetro small').textContent).toContain('2.640 m');
  });

  it('🔴 a 2.200 m bajo El Niño avisa de HELADA, no de calor', async () => {
    render(
      <TransicionSierraMundo activa escena3d tier="alto" msnmUsuario={2200} faseEnso="el_nino" />,
    );
    await esperarLienzo();
    const txt = document.querySelector('.tsm__aterrizaje').textContent.toLowerCase();
    expect(txt).toMatch(/hela/);
    expect(txt).not.toMatch(/más calor/);
  });

  it('a 900 m bajo El Niño sí avisa de calor, y NO de helada', async () => {
    render(
      <TransicionSierraMundo activa escena3d tier="alto" msnmUsuario={900} faseEnso="el_nino" />,
    );
    await esperarLienzo();
    const txt = document.querySelector('.tsm__aterrizaje').textContent.toLowerCase();
    expect(txt).toMatch(/calor/);
    expect(txt).not.toMatch(/hela/);
  });

  it('sin ubicación no pinta clima ni piso: solo lo declara', async () => {
    render(<TransicionSierraMundo activa escena3d tier="alto" />);
    await esperarLienzo();
    expect(document.querySelector('.tsm__altimetro small').textContent.toLowerCase()).toContain(
      'ubicaci',
    );
    expect(document.querySelector('.tsm__aterrizaje').textContent).not.toMatch(/Hoy en su predio/);
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

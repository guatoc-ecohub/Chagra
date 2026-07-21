/*
 * Regresión del bug P1 de huérfanos-3D (2026-07-21): `VistaGlobalSierra.jsx`
 * (la montaña maestra) no tenía NINGÚN handler de clic — tocar una banda de
 * piso térmico no hacía nada. `PisosTermicosBandas.jsx` y
 * `TransicionSierraMundo.jsx` se construyeron en la misma ola para resolver
 * exactamente esto y quedaron huérfanos (nadie los conectó).
 *
 * Este archivo NO puede montar `<VistaGlobalSierra>` completo: trae su propio
 * `<Canvas>` r3f (WebGL2), y este repo no mockea un contexto WebGL en jsdom
 * (ningún test existente en `visual/mundo3d/__tests__` monta un `<Canvas>`
 * real — ver `particulasData.test.js` etc.: la convención es testear la capa
 * de DATOS/LÓGICA, three-free). Por eso el cableo se extrajo a un hook
 * exportado `useViajeSierra` (three-free) que SÍ es testeable, y se prueba:
 *
 *   1. Cada piso térmico de `pisosTermicos.js` (la fuente de datos que
 *      `PisosTermicosBandas` ya consumía) declara al menos un mundo con
 *      `view`, y ese `view` es una ruta REAL manejada por el router central
 *      de la app (`case '<view>':` en App.jsx) — nada de rutas fantasma.
 *   2. `useViajeSierra` (el handler real que `VistaGlobalSierra` usa) arma el
 *      viaje correcto al seleccionar un piso, y navega de VERDAD
 *      (`onNavigate`) a mitad de cubierta — nunca a la vista.
 *   3. Integración end-to-end con el `TransicionSierraMundo` REAL (temporal,
 *      con fake timers): tocar → cubre → a mitad navega → al final se apaga.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { render, renderHook, act, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import { useViajeSierra } from '../VistaGlobalSierra.jsx';
import TransicionSierraMundo from '../TransicionSierraMundo.jsx';
import { PISOS_TERMICOS, compatibilidadPiso } from '../pisosTermicos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/* Conjunto de vistas realmente manejadas por el router central (App.jsx no
 * tiene un registry dedicado: el switch de `navigate(view)` ES la fuente de
 * verdad). Lectura de texto: no requiere montar App.jsx (2800+ líneas, auth,
 * servicios) solo para confirmar que una vista existe. */
function rutasReales() {
  const appPath = path.resolve(__dirname, '../../../App.jsx');
  const src = fs.readFileSync(appPath, 'utf8');
  const vistas = new Set();
  for (const m of src.matchAll(/case '([a-z0-9_]+)':/g)) vistas.add(m[1]);
  return vistas;
}

describe('pisosTermicos.js — cada piso apunta a un mundo con ruta real', () => {
  test('todo piso térmico declara al menos un mundo con `view` no vacío', () => {
    expect(PISOS_TERMICOS.length).toBeGreaterThan(0);
    PISOS_TERMICOS.forEach((piso) => {
      expect(Array.isArray(piso.mundos), piso.id).toBe(true);
      expect(piso.mundos.length, piso.id).toBeGreaterThan(0);
      piso.mundos.forEach((m) => {
        expect(typeof m.view, `${piso.id}.${m.id}`).toBe('string');
        expect(m.view.length, `${piso.id}.${m.id}`).toBeGreaterThan(0);
      });
    });
  });

  test('el destino de CADA banda (piso.mundos[0]) es una ruta real de App.jsx — nada de rutas fantasma', () => {
    const rutas = rutasReales();
    expect(rutas.size).toBeGreaterThan(50); // sanity: el switch se leyó de verdad
    // el MISMO arreglo que renderiza `PisosTermicosBandas` (una banda por piso).
    const { pisos } = compatibilidadPiso(null);
    expect(pisos.length).toBe(PISOS_TERMICOS.length);
    pisos.forEach((piso) => {
      const destino = piso.mundos[0];
      expect(rutas.has(destino.view), `banda "${piso.id}" -> onNavigate('${destino.view}')`).toBe(true);
    });
  });
});

describe('useViajeSierra — el handler real de "tocar banda → bajar al mundo"', () => {
  test('seleccionar un piso arma el viaje hacia su mundo primario', () => {
    const { result } = renderHook(() => useViajeSierra(() => {}));
    const piso = PISOS_TERMICOS.find((p) => p.id === 'paramo');
    act(() => result.current.handleSeleccionPiso(piso));
    expect(result.current.viaje).toMatchObject({
      activa: true,
      direccion: 'bajar',
      pisoDestino: 'paramo',
      view: piso.mundos[0].view,
      data: { pisoId: 'paramo', mundoId: piso.mundos[0].id },
    });
  });

  test('a mitad de cubierta navega de verdad, con pisoId y mundoId', () => {
    const onNavigate = vi.fn();
    const { result } = renderHook(() => useViajeSierra(onNavigate));
    const piso = PISOS_TERMICOS.find((p) => p.id === 'templado'); // mundos[0] = cafe
    act(() => result.current.handleSeleccionPiso(piso));
    expect(onNavigate).not.toHaveBeenCalled(); // aún no cubrió: no navega antes de tiempo
    act(() => result.current.handleMitad());
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('cafe', { pisoId: 'templado', mundoId: 'cafe' });
  });

  test('un viaje a la vez: tocar otro piso mientras hay uno activo se ignora', () => {
    const { result } = renderHook(() => useViajeSierra(() => {}));
    const paramo = PISOS_TERMICOS.find((p) => p.id === 'paramo');
    const calido = PISOS_TERMICOS.find((p) => p.id === 'calido');
    act(() => result.current.handleSeleccionPiso(paramo));
    act(() => result.current.handleSeleccionPiso(calido));
    expect(result.current.viaje.pisoDestino).toBe('paramo');
  });

  test('piso sin mundos asociados no arma un viaje (honestidad: nunca finge una ruta)', () => {
    const { result } = renderHook(() => useViajeSierra(() => {}));
    act(() => result.current.handleSeleccionPiso({ id: 'inventado', mundos: [] }));
    expect(result.current.viaje).toBeNull();
  });

  test('handleFin apaga el viaje sin perder el resto del estado', () => {
    const { result } = renderHook(() => useViajeSierra(() => {}));
    const piso = PISOS_TERMICOS.find((p) => p.id === 'frio');
    act(() => result.current.handleSeleccionPiso(piso));
    act(() => result.current.handleFin());
    expect(result.current.viaje.activa).toBe(false);
    expect(result.current.viaje.pisoDestino).toBe('frio');
  });
});

/* Arnés mínimo: la MISMA integración que monta `VistaGlobalSierra` (hook +
 * `TransicionSierraMundo` real como hermano), sin el `<Canvas>` r3f. */
function ArnesSierra({ onNavigate, piso }) {
  const { viaje, handleSeleccionPiso, handleMitad, handleFin } = useViajeSierra(onNavigate);
  return (
    <div>
      <button type="button" onClick={() => handleSeleccionPiso(piso)}>
        tocar banda
      </button>
      <TransicionSierraMundo
        activa={!!viaje?.activa}
        direccion={viaje?.direccion || 'bajar'}
        pisoDestino={viaje?.pisoDestino || ''}
        tier="alto"
        reducedMotion={false}
        onMitad={handleMitad}
        onFin={handleFin}
      />
    </div>
  );
}

describe('Integración end-to-end (hook + TransicionSierraMundo real, fake timers)', () => {
  test('tocar → cubre pantalla → a mitad navega → al final se apaga', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const piso = PISOS_TERMICOS.find((p) => p.id === 'templado'); // -> 'cafe'
    const { getByRole, container } = render(<ArnesSierra onNavigate={onNavigate} piso={piso} />);

    fireEvent.click(getByRole('button', { name: 'tocar banda' }));
    expect(container.querySelector('[data-testid="tsm"]')).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    // VIAJE_MS=1500 (tier alto, sin reduced-motion) · MITAD_FRAC=0.5 (fuente:
    // TransicionSierraMundo.jsx — no exportadas, se replican los valores).
    act(() => vi.advanceTimersByTime(749));
    expect(onNavigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('cafe', { pisoId: 'templado', mundoId: 'cafe' });

    act(() => vi.advanceTimersByTime(750)); // hasta el total: onFin
    expect(container.querySelector('[data-testid="tsm"]')).not.toBeInTheDocument();
  });
});

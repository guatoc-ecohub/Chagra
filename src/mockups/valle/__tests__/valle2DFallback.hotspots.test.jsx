/*
 * Regresión del bug P0 de huérfanos-3D (2026-07-21): `Valle2DFallback.jsx`
 * —el camino que ven los equipos de gama baja— usaba constantes de
 * proyección obsoletas y dejaba lugares reales de `valleData.js` fuera del
 * 0–100% visible del viewBox (p.ej. `animales` ≈ -28%, `disenio` ≈ 114.5%
 * con las constantes viejas): en un celular modesto el campesino no podía
 * tocarlos.
 *
 * Este test asegura DOS cosas:
 *   1. La proyección pura (`pct`) de TODOS los lugares de `MUNDOS_VALLE` cae
 *      dentro de [0,100]% en ambos ejes — para que un lugar nuevo que se
 *      agregue a `valleData.js` no pueda volver a quedar fuera de pantalla.
 *   2. El fallback REALMENTE RENDERIZADO posiciona sus botones tocables (los
 *      lugares, la alerta del día y Angelita) dentro de ese mismo rango —
 *      no solo la fórmula en aislamiento, sino lo que el usuario ve.
 */
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Valle2DFallback, { pct } from '../Valle2DFallback.jsx';
import { MUNDOS_VALLE, COSA_DEL_DIA } from '../valleData';

afterEach(() => cleanup());

function pctDeEstilo(el) {
  // jsdom expone left/top en `%` tal cual se escribieron en el style inline.
  return {
    left: parseFloat(el.style.left),
    top: parseFloat(el.style.top),
  };
}

describe('Valle2DFallback — ningún lugar queda fuera de pantalla (gama baja)', () => {
  test('la proyección pura (pct) de cada lugar de valleData.js cae en [0,100]%', () => {
    expect(MUNDOS_VALLE.length).toBeGreaterThan(0);
    MUNDOS_VALLE.forEach((m) => {
      const { left, top } = pct(m.pos[0], m.pos[2]);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(100);
    });
  });

  test('cada botón de lugar renderizado queda dentro del viewBox visible', () => {
    const { container } = render(
      <Valle2DFallback clima="soleado" onEntrar={() => {}} onAlerta={() => {}} />,
    );
    const botones = container.querySelectorAll('.valle2d__poi');
    expect(botones.length).toBe(MUNDOS_VALLE.length);
    botones.forEach((btn) => {
      const { left, top } = pctDeEstilo(btn);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left).toBeLessThanOrEqual(100);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(100);
    });
  });

  test('la alerta del día (cosa del día) también queda visible', () => {
    const ancla = MUNDOS_VALLE.find((m) => m.id === COSA_DEL_DIA.anclaMundo);
    expect(ancla).toBeTruthy(); // si el ancla cambia de id, esto avisa primero
    const { container } = render(
      <Valle2DFallback clima="soleado" onEntrar={() => {}} onAlerta={() => {}} />,
    );
    const alerta = container.querySelector('.valle2d__alerta');
    expect(alerta).toBeInTheDocument();
    const { left, top } = pctDeEstilo(alerta);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left).toBeLessThanOrEqual(100);
    // el letrero cuelga 12% arriba de su lugar: también debe quedar clampeado.
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(100);
  });

  test('Angelita (la abeja) se posiciona dentro del rango visible', () => {
    const { container } = render(<Valle2DFallback clima="soleado" onEntrar={() => {}} />);
    const abeja = container.querySelector('.valle2d__abeja');
    expect(abeja).toBeInTheDocument();
    const { left, top } = pctDeEstilo(abeja);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left).toBeLessThanOrEqual(100);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(100);
  });
});

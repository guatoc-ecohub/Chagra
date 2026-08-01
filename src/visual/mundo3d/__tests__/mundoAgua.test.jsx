/*
 * EL MUNDO DEL AGUA — contrato del recorrido (feat mundo3d-agua).
 *
 * El mundo del agua es UNA entrada de datos del registro (mundoData.js) sobre
 * el arquetipo `flujo`. Este test congela sus sí-o-sí:
 *   1. Los 6 puntos del recorrido existen (nacimiento, ronda, quebrada,
 *      riesgo/cuidado, bocatoma, cultivo regado) y cada `view` es un case REAL
 *      de App.jsx (regla de oro: re-rutear, nunca reimplementar).
 *   2. El device-tiering cae al gemelo 2D (`mirror`, motivo `flujo`) con los
 *      MISMOS params (curva + hitos): el dibujo cuenta el mismo recorrido.
 *   3. El gemelo 2D monta three-free en jsdom y sus puntos re-rutean de verdad.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

import Mundo from '../Mundo.jsx';
import { MUNDO } from '../mundoData.js';
import { resolverMundo } from '../resolverMundo.js';

afterEach(() => cleanup());

const __dir = path.dirname(fileURLToPath(import.meta.url));
const appSrc = fs.readFileSync(path.resolve(__dir, '../../../App.jsx'), 'utf8');

const agua = MUNDO.agua;

describe('mundo del agua — el recorrido completo como datos', () => {
  test('es el arquetipo flujo, con landmark en el valle y entrada de la abeja', () => {
    expect(agua.escena).toBe('flujo');
    expect(agua.valle?.tipo).toBe('quebrada');
    expect(agua.entrada?.narra).toBe('agua');
    expect(typeof agua.entrada?.zoom).toBe('number');
  });

  test('los 6 puntos del recorrido están y cada view existe en App.jsx', () => {
    const ids = (agua.hotspots || []).map((h) => h.id);
    ['nacimiento', 'ronda', 'quebrada', 'riesgo', 'bocatoma', 'cultivo'].forEach((id) => {
      expect(ids, `falta el punto '${id}' del recorrido`).toContain(id);
    });
    for (const h of agua.hotspots) {
      expect(
        appSrc.includes(`case '${h.view}':`),
        `la vista '${h.view}' del punto '${h.id}' no existe en App.jsx`,
      ).toBe(true);
    }
  });

  test('la curva y los hitos son datos compartidos por el 3D y su gemelo 2D', () => {
    expect(Array.isArray(agua.params.curva)).toBe(true);
    expect(agua.params.curva.length).toBeGreaterThanOrEqual(4);
    const hitos = agua.params.hitos;
    expect(hitos.ronda?.arboles).toBeGreaterThan(0);
    expect(hitos.riesgo?.t).toBeGreaterThan(0);
    expect(hitos.bocatoma?.t).toBeGreaterThan(hitos.riesgo.t); // la toma va aguas abajo del cuidado
    expect(Array.isArray(hitos.cultivo?.pos)).toBe(true);
  });

  test('tier alto → diorama 3D flujo; equipo humilde → gemelo mirror con los mismos params', () => {
    const alto = resolverMundo('agua', 'alto');
    expect(alto.modo).toBe('3d');
    expect(alto.escena).toBe('flujo');

    const bajo = resolverMundo('agua', 'bajo');
    expect(bajo.modo).toBe('2d');
    expect(bajo.escena).toBe('mirror'); // el fallback2d declarado
    expect(bajo.motivo).toBe('flujo');
    // el gemelo recibe la MISMA data del recorrido
    expect(bajo.entrada.params.hitos).toEqual(agua.params.hitos);
    expect(bajo.entrada.params.curva).toEqual(agua.params.curva);
  });

  test('el gemelo 2D monta three-free y sus 6 puertas re-rutean', () => {
    const onHotspot = vi.fn();
    const { container } = render(
      <Mundo mundoId="agua" tier="bajo" onHotspot={onHotspot} onSalir={() => {}} />,
    );
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    // los 6 puntos del recorrido son botones reales
    const botones = container.querySelectorAll('.mundo2d__hotspot');
    expect(botones.length).toBe(6);
    fireEvent.click(screen.getByRole('button', { name: 'La huerta regada' }));
    expect(onHotspot).toHaveBeenCalledWith('hortalizas', undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Donde nace el agua' }));
    expect(onHotspot).toHaveBeenCalledWith('agua', { tema: 'nacimiento' });
  });
});

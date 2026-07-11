/*
 * EL MUNDO DEL CAFÉ — contrato del beneficio (feat mundo3d-cafe).
 *
 * El mundo del café es UNA entrada de datos del registro (mundoData.js) que
 * REUSA el arquetipo `flujo` del mundo del agua (el beneficio húmedo ES un
 * proceso de gravedad + agua). Este test congela sus sí-o-sí:
 *   1. Es el arquetipo `flujo`, con landmark de cafetal en el valle.
 *   2. Sus puntos (café, cereza, sombra, broca) existen y cada `view` es un
 *      case REAL de App.jsx (regla de oro: re-rutear, nunca reimplementar).
 *   3. La curva del beneficio y sus hitos (incl. cerezas, taza y fauna) son
 *      datos; el device-tiering cae al gemelo `mirror` con los MISMOS params.
 *   4. El gemelo 2D monta three-free en jsdom y sus puertas re-rutean de verdad.
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

const cafe = MUNDO.cafe;

describe('mundo del café — el beneficio como datos sobre el arquetipo flujo', () => {
  test('REUSA el arquetipo flujo, con landmark de cafetal y entrada de la abeja', () => {
    expect(cafe.escena).toBe('flujo');
    expect(cafe.valle?.tipo).toBe('cafetal');
    expect(cafe.entrada?.narra).toBe('cafe');
    expect(typeof cafe.entrada?.zoom).toBe('number');
  });

  test('los puntos del beneficio están y cada view existe en App.jsx', () => {
    const ids = (cafe.hotspots || []).map((h) => h.id);
    ['cafe', 'cereza', 'sombra', 'broca'].forEach((id) => {
      expect(ids, `falta el punto '${id}' del beneficio`).toContain(id);
    });
    for (const h of cafe.hotspots) {
      expect(
        appSrc.includes(`case '${h.view}':`),
        `la vista '${h.view}' del punto '${h.id}' no existe en App.jsx`,
      ).toBe(true);
    }
  });

  test('la curva y los hitos del beneficio son datos compartidos 3D ↔ 2D', () => {
    expect(Array.isArray(cafe.params.curva)).toBe(true);
    expect(cafe.params.curva.length).toBeGreaterThanOrEqual(4);
    const hitos = cafe.params.hitos;
    expect(hitos.ronda?.arboles).toBeGreaterThan(0);        // los árboles de sombra
    expect(hitos.cerezas?.n).toBeGreaterThan(0);            // las cerezas en los cafetos
    expect(hitos.riesgo?.t).toBeGreaterThan(0);             // la broca sin veneno (ámbar)
    expect(hitos.bocatoma?.t).toBeGreaterThan(hitos.riesgo.t); // la despulpadora va aguas abajo
    expect(Array.isArray(hitos.cultivo?.pos)).toBe(true);
    expect(Array.isArray(hitos.taza?.pos)).toBe(true);      // de la cereza a la taza
    expect(hitos.fauna?.some((f) => f.tipo === 'colibri')).toBe(true); // el colibrí poliniza
  });

  test('tier alto → diorama 3D flujo; equipo humilde → gemelo mirror con los mismos params', () => {
    const alto = resolverMundo('cafe', 'alto');
    expect(alto.modo).toBe('3d');
    expect(alto.escena).toBe('flujo');

    const bajo = resolverMundo('cafe', 'bajo');
    expect(bajo.modo).toBe('2d');
    expect(bajo.escena).toBe('mirror'); // el fallback2d declarado
    expect(bajo.motivo).toBe('flujo');
    // el gemelo recibe la MISMA data del beneficio
    expect(bajo.entrada.params.hitos).toEqual(cafe.params.hitos);
    expect(bajo.entrada.params.curva).toEqual(cafe.params.curva);
  });

  test('el gemelo 2D monta three-free y sus puertas re-rutean', () => {
    const onHotspot = vi.fn();
    const { container } = render(
      <Mundo mundoId="cafe" tier="bajo" onHotspot={onHotspot} onSalir={() => {}} />,
    );
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    const botones = container.querySelectorAll('.mundo2d__hotspot');
    expect(botones.length).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: 'Sombra y guamos' }));
    expect(onHotspot).toHaveBeenCalledWith('asociaciones', undefined);
    fireEvent.click(screen.getByRole('button', { name: 'La cereza por dentro' }));
    expect(onHotspot).toHaveBeenCalledWith('cafe', { tema: 'cereza' });
  });
});

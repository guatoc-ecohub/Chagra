// @ts-nocheck
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import ShowcaseArtesania, {
  PatronesArtesania,
  BandaChumbe,
  GrecaEscalonada,
  FranjasMochila,
  MarcoTelar,
  VasijaSilueta,
} from '../ArtesaniaAndina.jsx';
import {
  PALETA_ANDINA,
  ROLES_ANDINOS,
  acentoAndino,
  secuenciaFranjas,
  pathVasija,
  pathGrecaEscalonada,
  lineaQueRespira,
  VASIJA_TIPOS,
} from '../artesaniaAndina.js';

afterEach(() => cleanup());

describe('artesanía andina — generadores puros (three-free)', () => {
  test('paleta y roles: fondo/línea empatan con el mundo, 5 acentos cíclicos', () => {
    expect(ROLES_ANDINOS.fondo).toBe(PALETA_ANDINA.crudo);
    expect(ROLES_ANDINOS.linea).toBe(PALETA_ANDINA.tinta);
    expect(ROLES_ANDINOS.acentos).toHaveLength(5);
    expect(acentoAndino(0)).toBe(acentoAndino(5));
    expect(acentoAndino(-1)).toBe(ROLES_ANDINOS.acentos[4]);
  });

  test('franjas: deterministas por seed y llenan el alto exacto', () => {
    const a = secuenciaFranjas({ alto: 120, seed: 7 });
    const b = secuenciaFranjas({ alto: 120, seed: 7 });
    const c = secuenciaFranjas({ alto: 120, seed: 19 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.reduce((s, f) => s + f.alto, 0)).toBeCloseTo(120);
  });

  test('paths: vasijas (todos los perfiles) y greca cierran; la línea respira con Q', () => {
    VASIJA_TIPOS.forEach((tipo) => {
      const d = pathVasija(tipo, { alto: 60 });
      expect(d.startsWith('M ')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
    });
    expect(pathGrecaEscalonada({}).endsWith('Z')).toBe(true);
    expect(lineaQueRespira(0, 0, 100, 0, { ondas: 3 })).toContain('Q');
    expect(lineaQueRespira(0, 0, 100, 0, { seed: 7 })).toBe(lineaQueRespira(0, 0, 100, 0, { seed: 7 }));
  });
});

describe('artesanía andina — primitivas SVG montables', () => {
  test('el showcase monta completo: patrones en defs, rombos y las 3 vasijas', () => {
    const { container } = render(<ShowcaseArtesania ancho={720} />);
    const svg = container.querySelector('svg.artesania-showcase');
    expect(svg).toBeInTheDocument();
    expect(container.querySelector('#artesania-rombos')).toBeInTheDocument();
    expect(container.querySelector('#artesania-zigzag')).toBeInTheDocument();
    expect(container.querySelector('#artesania-escalonado')).toBeInTheDocument();
    expect(container.querySelector('.artesania-respira')).toBeInTheDocument();
    expect(container.querySelectorAll('path').length).toBeGreaterThan(20);
  });

  test('cada primitiva es un <g> montable por props dentro de un svg anfitrión', () => {
    const { container } = render(
      <svg viewBox="0 0 400 400">
        <defs>
          <PatronesArtesania prefijo="p1" />
        </defs>
        {/** @type {any} */ (<BandaChumbe x={10} y={10} ancho={200} alto={24} />)}
        {/** @type {any} */ (<GrecaEscalonada x={10} y={80} ancho={200} />)}
        {/** @type {any} */ (<FranjasMochila x={10} y={100} ancho={100} alto={80} seed={3} />)}
        {/** @type {any} */ (<MarcoTelar x={120} y={100} ancho={200} alto={120} />)}
        <VasijaSilueta x={60} y={360} alto={80} tipo="cantaro" />
      </svg>,
    );
    expect(container.querySelector('#p1-rombos')).toBeInTheDocument();
    expect(container.querySelectorAll('g').length).toBeGreaterThan(5);
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(4);
  });
});

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import {
  CapaCielo,
  Parallax,
  CAPAS_PARALLAX,
  transformCapa,
  cieloEscena,
  tonoLuz,
  GuardianEspirituBase,
  SceneFincaOrganismo,
  SCENES,
  SCN_BEAT_MS,
  SCN_KRAFT_CLASS,
} from '../index.js';

afterEach(() => cleanup());

describe('src/visual/scenes — smoke de las escenas base', () => {
  test('CapaCielo monta dentro de un <svg> (noche y día) sin romper', () => {
    const { container, rerender } = render(
      <svg viewBox="0 0 390 360">
        <CapaCielo cielo={{ luz: 'noche', condicion: 'despejado', tema: 'biopunk' }} cx={300} cy={70} r={26} />
      </svg>,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
    // de día con lluvia: aparece la cortina de lluvia
    rerender(
      <svg viewBox="0 0 390 360">
        <CapaCielo cielo={{ luz: 'dia', condicion: 'lluvia' }} cx={300} cy={70} r={26} />
      </svg>,
    );
    expect(container.querySelector('.scn-lluvia')).toBeInTheDocument();
  });

  test('Parallax apila una capa por cada entrada con su transform', () => {
    const camara = { tx: 10, ty: 20, s: 1.1 };
    const { getByTestId } = render(
      <Parallax
        camara={camara}
        alturaCapa={700}
        data-testid="px"
        capas={[
          { id: 'cielo', f: CAPAS_PARALLAX.cielo, contenido: <div className="c-cielo" /> },
          { id: 'principal', f: CAPAS_PARALLAX.principal, interactiva: true, contenido: <div className="c-pral" /> },
        ]}
      />,
    );
    const capas = getByTestId('px').querySelectorAll('.scn-capa');
    expect(capas).toHaveLength(2);
    expect(capas[0].style.transform).toBe(transformCapa(camara, CAPAS_PARALLAX.cielo));
    expect(capas[1].className).toContain('scn-capa--interactiva');
  });

  test('GuardianEspirituBase monta el disco con glow y su avatar hijo', () => {
    const { container } = render(
      <GuardianEspirituBase acc="#2dffc4" accRgb="45, 255, 196" title="Chivito de páramo">
        <g className="mi-avatar" filter="url(#scn-ge-glow)"><circle r="4" /></g>
      </GuardianEspirituBase>,
    );
    expect(container.querySelector('.scn-espiritu-halo')).toBeInTheDocument();
    expect(container.querySelector('#scn-ge-glow')).toBeInTheDocument();
    expect(container.querySelector('.mi-avatar')).toBeInTheDocument();
  });

  test('SceneFincaOrganismo (re-exportada desde el barrel) monta el corazón', () => {
    const { getByTestId } = render(<SceneFincaOrganismo estructura={{ tiene: false }} />);
    expect(getByTestId('fvo-corazon')).toBeInTheDocument();
  });

  test('helpers puros: tonoLuz y cieloEscena resuelven la hora/tema', () => {
    expect(tonoLuz({ luz: 'atardecer' })).toBe('atardecer');
    expect(tonoLuz({ luz: 'nada-raro' })).toBe('dia');
    expect(cieloEscena({ luz: 'noche', tema: 'biopunk' }, 'finca')).toEqual(['#0c1830', '#26404d']);
    expect(cieloEscena({ luz: 'dia' }, 'finca')).toEqual(['#7ac3da', '#c8e8cb']);
  });

  test('registro SCENES y constantes exportadas', () => {
    expect(Object.keys(SCENES)).toEqual(
      expect.arrayContaining(['capa-cielo', 'parallax', 'guardian-espiritu', 'finca-organismo']),
    );
    expect(SCN_BEAT_MS).toBe(5200);
    expect(SCN_KRAFT_CLASS).toBe('scn-kraft');
  });
});

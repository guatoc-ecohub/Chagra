/**
 * EscenaAtmosfera — las 18 capas de efecto están presentes (CA-3) y la escena
 * obedece a sus props (D-2) sin calcular nada por su cuenta.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import EscenaAtmosfera from './EscenaAtmosfera.jsx';

afterEach(() => cleanup());

/** El mismo conteo que el gate corre contra el DOM vivo (spec §2, CA-3). */
function contar(root) {
  const q = (sel) => root.querySelectorAll(sel).length;
  return {
    cielos: q('.ca-cielo'), estrellas: q('.ca-estrella'), gotas: q('.ca-gota'), bancos: q('.ca-banco'),
    jirones: q('.ca-jiron'), motas: q('.ca-mota'), luciernagas: q('.ca-luci'), rayos: q('.ca-rayos path'),
    montes: q('.ca-monte'), frailejones: q('.ca-frailejon'), hojas: q('.ca-hoja'), grades: q('.ca-grade'),
    scrims: q('.ca-scrim'), vineta: q('.ca-vineta'), jironUI: q('.ca-jiron-ui'), astro: q('.ca-astro'),
    laderaLuz: q('.ca-ladera-luz'), bruma: q('.ca-bruma'), suelo: q('.ca-suelo'), pasto: q('.ca-pasto'),
    nubes: q('.ca-nube'), rotura: q('.ca-nube-rotura'),
  };
}

describe('EscenaAtmosfera — las 18 capas (CA-3)', () => {
  it('cuenta exactamente lo que el mockup tenía, más la nube-masa', () => {
    const { container } = render(<EscenaAtmosfera condicion="nublado" luz="dia" />);
    expect(contar(container)).toEqual({
      cielos: 6, estrellas: 26, gotas: 30, bancos: 6, jirones: 4, motas: 16, luciernagas: 11,
      rayos: 6, montes: 3, frailejones: 4, hojas: 36, grades: 6, scrims: 2, vineta: 1, jironUI: 1,
      astro: 1, laderaLuz: 1, bruma: 1, suelo: 1, pasto: 1, nubes: 7, rotura: 1,
    });
  });

  it('la escena es decorativa (aria-hidden) y el contenido va encima', () => {
    const { container, getByTestId } = render(
      <EscenaAtmosfera condicion="lluvia" luz="noche"><p data-testid="hijo">hola</p></EscenaAtmosfera>,
    );
    expect(getByTestId('escena-atmosfera').getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.ca-jiron-ui').getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.ca-contenido [data-testid="hijo"]')).not.toBeNull();
  });

  it('refleja las props en data-clima/data-luz/data-enso y no inventa condición', () => {
    const { getByTestId, rerender } = render(<EscenaAtmosfera luz="dia" />);
    const root = getByTestId('escena-atmosfera-root');
    expect(root.hasAttribute('data-clima')).toBe(false);
    expect(root.getAttribute('data-luz')).toBe('dia');
    expect(root.hasAttribute('data-enso')).toBe(false);
    rerender(<EscenaAtmosfera condicion="niebla" luz="amanecer" enso="nina" forzado />);
    expect(root.getAttribute('data-clima')).toBe('niebla');
    expect(root.getAttribute('data-luz')).toBe('amanecer');
    expect(root.getAttribute('data-enso')).toBe('nina');
    expect(root.getAttribute('data-forzado')).toBe('1');
    rerender(<EscenaAtmosfera condicion="despejado" luz="dia" enso="neutral" />);
    expect(root.hasAttribute('data-enso')).toBe(false);
  });

  it('las partículas son deterministas: dos renders dan el mismo cuadro', () => {
    const a = render(<EscenaAtmosfera condicion="lluvia" luz="dia" />).container.innerHTML;
    cleanup();
    const b = render(<EscenaAtmosfera condicion="lluvia" luz="dia" />).container.innerHTML;
    expect(a).toBe(b);
  });
});

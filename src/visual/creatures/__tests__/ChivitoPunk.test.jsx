import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import ChivitoPunk from '../ChivitoPunk.jsx';

/**
 * ChivitoPunk — cuerpo 2.5D que reusa el rig F24 del valle. Mismo contrato de
 * pruebas que GuacamayaCompai.test.jsx — ver ese archivo para el detalle de
 * qué cuida cada caso.
 */
describe('ChivitoPunk', () => {
  test('renderiza el cuerpo real (data-creature=chivito-punk, role=img)', () => {
    const { container } = render(<ChivitoPunk state="idle" />);
    const svg = container.querySelector('svg[data-creature="chivito-punk"]');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('role', 'img');
  });

  test('trae el rig del valle inlineado (marcado real, no vacío)', () => {
    const { container } = render(<ChivitoPunk state="idle" />);
    const g = container.querySelector('svg[data-creature="chivito-punk"] > g');
    expect(g.innerHTML.length).toBeGreaterThan(500);
    expect(g.innerHTML).toContain('chivitoWrap');
  });

  test('respeta el tamaño (size) y el título accesible', () => {
    const { container } = render(<ChivitoPunk size={40} title="Mi chivito" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveAttribute('aria-label', 'Mi chivito');
  });

  test('state="speaking" marca data-visema para lip-sync', () => {
    const { container } = render(<ChivitoPunk state="speaking" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-visema', 'V2');
  });

  test('dos instancias simultáneas namespacean sus ids (sin colisión)', () => {
    const { container } = render(
      <div>
        <ChivitoPunk />
        <ChivitoPunk />
      </div>,
    );
    const svgs = container.querySelectorAll('svg[data-creature="chivito-punk"]');
    expect(svgs.length).toBe(2);
    const idsA = [...svgs[0].querySelectorAll('[id]')].map((n) => n.id);
    const idsB = [...svgs[1].querySelectorAll('[id]')].map((n) => n.id);
    expect(idsA.length).toBeGreaterThan(0);
    expect(idsA.some((id) => idsB.includes(id))).toBe(false);
  });

  test('guacamaya y chivito-punk renderizados juntos tampoco colisionan ids (#cuerpoRig compartido en origen)', async () => {
    const GuacamayaCompaiMod = await import('../GuacamayaCompai.jsx');
    const GuacamayaCompai = GuacamayaCompaiMod.default;
    const { container } = render(
      <div>
        <GuacamayaCompai />
        <ChivitoPunk />
      </div>,
    );
    const guaca = container.querySelector('svg[data-creature="guacamaya"]');
    const chivito = container.querySelector('svg[data-creature="chivito-punk"]');
    const idsGuaca = [...guaca.querySelectorAll('[id]')].map((n) => n.id);
    const idsChivito = [...chivito.querySelectorAll('[id]')].map((n) => n.id);
    expect(idsGuaca.some((id) => idsChivito.includes(id))).toBe(false);
  });

  test('trae su <style> con el CSS del rig recortado (sin el chrome de página del valle)', () => {
    const { container } = render(<ChivitoPunk />);
    const style = container.querySelector('svg style');
    expect(style).toBeInTheDocument();
    expect(style.textContent).not.toContain('#burbuja');
    expect(style.textContent).not.toContain('font-family:Georgia');
  });
});

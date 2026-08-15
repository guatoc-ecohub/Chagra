import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import JaguarCompai from '../JaguarCompai.jsx';

/**
 * JaguarCompai — cuerpo 2.5D del compañero elegible, reusa el rig F24 del
 * valle (ver comentario del componente). NO confundir con
 * `visual/creatures/Jaguar.jsx`, el felino rubber-hose dibujado a mano que
 * siguen usando las escenas 3D del mundo y el kart (otro archivo, otro
 * propósito). Cubre: monta el svg con el contrato data-creature/role="img",
 * el rig+defs quedaron inline (hay markup real, no un placeholder vacío), y
 * dos instancias simultáneas NO comparten ids (el bug de cruce que motivó
 * `nsRigValle.js`) — mismas garantías que `GuacamayaCompai.test.jsx`.
 */
describe('JaguarCompai', () => {
  test('renderiza el cuerpo real (data-creature=jaguar, role=img)', () => {
    const { container } = render(<JaguarCompai state="idle" />);
    const svg = container.querySelector('svg[data-creature="jaguar"]');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('role', 'img');
  });

  test('trae el rig del valle inlineado (marcado real, no vacío)', () => {
    const { container } = render(<JaguarCompai state="idle" />);
    const g = container.querySelector('svg[data-creature="jaguar"] > g');
    expect(g.innerHTML.length).toBeGreaterThan(500);
    expect(g.innerHTML).toContain('jaguarWrap');
  });

  test('respeta el tamaño (size) y el título accesible', () => {
    const { container } = render(<JaguarCompai size={40} title="Mi jaguar" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveAttribute('aria-label', 'Mi jaguar');
  });

  test('state="speaking" marca data-visema para lip-sync', () => {
    const { container } = render(<JaguarCompai state="speaking" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-visema', 'V2');
  });

  test('state="idle" no trae data-visema', () => {
    const { container } = render(<JaguarCompai state="idle" />);
    expect(container.querySelector('svg')).not.toHaveAttribute('data-visema');
  });

  test('dos instancias simultáneas namespacean sus ids (sin colisión)', () => {
    const { container } = render(
      <div>
        <JaguarCompai />
        <JaguarCompai />
      </div>,
    );
    const svgs = container.querySelectorAll('svg[data-creature="jaguar"]');
    expect(svgs.length).toBe(2);
    const idsA = [...svgs[0].querySelectorAll('[id]')].map((n) => n.id);
    const idsB = [...svgs[1].querySelectorAll('[id]')].map((n) => n.id);
    expect(idsA.length).toBeGreaterThan(0);
    // ningún id de la primera instancia se repite en la segunda
    expect(idsA.some((id) => idsB.includes(id))).toBe(false);
  });

  test('trae su <style> con el CSS del rig recortado (sin el chrome de página del valle)', () => {
    const { container } = render(<JaguarCompai />);
    const style = container.querySelector('svg style');
    expect(style).toBeInTheDocument();
    expect(style.textContent).not.toContain('#burbuja');
    expect(style.textContent).not.toContain('font-family:Georgia');
  });
});

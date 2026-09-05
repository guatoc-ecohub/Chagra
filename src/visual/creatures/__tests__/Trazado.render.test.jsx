import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChivitoTrazado } from '../ChivitoTrazado.jsx';
import { LuciernagaTrazado } from '../LuciernagaTrazado.jsx';
import { CREATURES } from '../index.js';

describe('criaturas auto-trazadas', () => {
  it('monta la piel generada y mantiene el punk reservado a actuando', () => {
    const { container } = render(
      <>
        <ChivitoTrazado data-testid="normal" punk />
        <ChivitoTrazado data-testid="punk" punk modo="actuando" />
      </>,
    );
    const roots = container.querySelectorAll('[data-creature="chivito-punk"]');
    expect(roots).toHaveLength(2);
    expect(roots[0].querySelector('svg')).toBeTruthy();
    expect(roots[0].querySelector('svg').outerHTML).not.toBe(roots[1].querySelector('svg').outerHTML);
    expect(roots[0]).toHaveAttribute('data-modo', 'normal');
    expect(roots[1]).toHaveAttribute('data-modo', 'actuando');
    expect(roots[0].querySelector('clipPath').id).not.toBe(roots[1].querySelector('clipPath').id);
  });

  it('monta luciérnaga con estado de linterna', () => {
    const { container } = render(<LuciernagaTrazado linterna="apagada" />);
    const root = container.querySelector('[data-creature="luciernaga"]');
    expect(root).toHaveAttribute('data-linterna', 'apagada');
    expect(root.querySelector('svg')).toBeTruthy();
    expect(root.querySelectorAll('path').length).toBeGreaterThan(100);
  });

  it('el registro visible de la PWA usa tinta para los slugs canónicos', () => {
    expect(CREATURES.luciernaga.Component).toBe(LuciernagaTrazado);
    expect(CREATURES['chivito-punk'].Component).toBe(ChivitoTrazado);
  });
});

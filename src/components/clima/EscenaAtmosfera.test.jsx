import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import EscenaAtmosfera from './EscenaAtmosfera';

afterEach(cleanup);

const CONTEOS = {
  '.ca-cielo': 6, '.ca-estrella': 26, '.ca-gota': 30, '.ca-banco': 6,
  '.ca-jiron': 4, '.ca-mota': 16, '.ca-luci': 11, '.ca-rayos-giro path': 6,
  '.ca-monte': 3, '.ca-tallo': 4, '.ca-hoja': 36, '.ca-sombra-planta': 4,
  '.ca-grade': 6, '.ca-scrim': 2, '.ca-vineta': 1, '.ca-jiron-ui': 1,
  '.ca-astro': 1, '.ca-ladera-luz': 1, '.ca-bruma': 1, '.ca-suelo': 1, '.ca-pasto': 1,
  '.ca-capa--nubes': 1, '.ca-techo': 1, '.ca-techo-sombra': 1, '.ca-claro': 1, '.ca-techo-bajo': 1, '.ca-techo-bajo-lomo': 1, '.ca-techo-bajo-base': 1, '.ca-nube': 6,
  '.ca-pegajoso': 1, '.ca-frente-nublado': 1, '.ca-nube-frente': 7, '.ca-sombra-pasa': 1, '.ca-bruma-frente': 1,
};

describe('Escena atmosférica decorativa', () => {
  it('conserva el inventario completo en las 16 combinaciones', () => {
    const { container, rerender } = render(<EscenaAtmosfera />);
    for (const condicion of ['despejado', 'nublado', 'lluvia', 'niebla']) {
      for (const luz of ['amanecer', 'dia', 'atardecer', 'noche']) {
        rerender(<EscenaAtmosfera condicion={condicion} luz={luz} />);
        for (const [selector, count] of Object.entries(CONTEOS)) {
          expect(container.querySelectorAll(selector), `${condicion}/${luz}: ${selector}`).toHaveLength(count);
        }
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
        expect(container.firstChild).toHaveAttribute('data-clima', condicion);
        expect(container.firstChild).toHaveAttribute('data-luz', luz);
      }
    }
    expect(container.textContent).toBe('');
  });

  it('las partículas conservan posiciones y tiempos tras cambiar clima y remontar', () => {
    const { container, rerender, unmount } = render(<EscenaAtmosfera condicion="lluvia" luz="dia" />);
    const particleStyles = (root) => [...root.querySelectorAll('.ca-estrella, .ca-gota, .ca-banco, .ca-jiron, .ca-mota, .ca-luci')]
      .map((node) => node.getAttribute('style'));
    const original = particleStyles(container);
    rerender(<EscenaAtmosfera condicion="niebla" luz="noche" />);
    expect(particleStyles(container)).toEqual(original);
    unmount();
    const second = render(<EscenaAtmosfera condicion="lluvia" luz="dia" />);
    expect(particleStyles(second.container)).toEqual(original);
  });

  it('sin condición no asume sol y neutral no emite atributo ENSO', () => {
    const { container } = render(<EscenaAtmosfera luz="dia" enso="neutral" />);
    expect(container.firstChild).not.toHaveAttribute('data-clima');
    expect(container.firstChild).not.toHaveAttribute('data-enso');
  });

  it('dos escenas no comparten el identificador del gradiente', () => {
    const { container } = render(<><EscenaAtmosfera /><EscenaAtmosfera /></>);
    const ids = [...container.querySelectorAll('linearGradient')].map((el) => el.id);
    expect(new Set(ids).size).toBe(2);
    for (const root of container.querySelectorAll('.ca-atmosfera')) {
      expect(root.querySelector('.ca-rayos-giro path')).toHaveAttribute('fill', `url(#${root.querySelector('linearGradient').id})`);
    }
  });
});

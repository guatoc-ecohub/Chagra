/*
 * IconosEtapaCiclo.test.jsx — el set de iconos de etapa de ciclo.
 *
 * Task #iconos-especie-ciclo: verifica que las seis etapas rindan un glifo
 * distinto, coherente (mismo trazo + currentColor) y accesible según se use
 * decorativo o rotulado.
 */
import { createElement } from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  IconoEtapaCiclo,
  IconoGerminacion,
  IconoVegetativo,
  IconoFloracion,
  IconoFructificacion,
  IconoCosecha,
  IconoProducto,
  ICONOS_ETAPA_POR_ORDEN,
} from './IconosEtapaCiclo.jsx';

describe('IconosEtapaCiclo — set de etapa de ciclo', () => {
  it('exporta las seis etapas en orden fenológico', () => {
    expect(ICONOS_ETAPA_POR_ORDEN).toHaveLength(6);
    expect(ICONOS_ETAPA_POR_ORDEN).toEqual([
      IconoGerminacion,
      IconoVegetativo,
      IconoFloracion,
      IconoFructificacion,
      IconoCosecha,
      IconoProducto,
    ]);
  });

  it('cada etapa rinde un <svg> con geometría propia (glifos distintos)', () => {
    const marcado = ICONOS_ETAPA_POR_ORDEN.map((Icono) => {
      const { container } = render(createElement(Icono));
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      // Serializa la geometría del glifo (paths/ellipses/circles) para comparar.
      return container.innerHTML.replace(/\s+/g, '');
    });
    // Ningún par de etapas comparte el mismo dibujo.
    expect(new Set(marcado).size).toBe(6);
  });

  it('todo el set usa un trazo coherente sobre currentColor', () => {
    ICONOS_ETAPA_POR_ORDEN.forEach((Icono) => {
      const { container } = render(createElement(Icono));
      const g = container.querySelector('g');
      expect(g).toHaveAttribute('stroke', 'currentColor');
      expect(g).toHaveAttribute('stroke-width', '1.9');
    });
  });

  it('respeta el tamaño pedido', () => {
    const { container } = render(<IconoGerminacion size={24} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('es decorativo por defecto (aria-hidden, sin rol)', () => {
    const { container } = render(<IconoCosecha />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(container.querySelector('title')).toBeNull();
  });

  it('con title pasa a role="img" con su <title> accesible', () => {
    const { container, getByTitle } = render(<IconoCosecha title="Cosecha" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).toHaveAttribute('aria-label', 'Cosecha');
    expect(getByTitle('Cosecha')).toBeInTheDocument();
  });

  describe('IconoEtapaCiclo — despacho por orden', () => {
    it('elige el glifo de cada orden 1..6', () => {
      for (let orden = 1; orden <= 6; orden += 1) {
        const { container } = render(<IconoEtapaCiclo orden={orden} />);
        expect(container.querySelector('svg')).toHaveAttribute(
          'data-etapa-orden',
          String(orden),
        );
      }
    });

    it('recorta el orden fuera de rango a una etapa válida', () => {
      const bajo = render(<IconoEtapaCiclo orden={0} />);
      expect(bajo.container.querySelector('svg')).toHaveAttribute('data-etapa-orden', '1');

      const alto = render(<IconoEtapaCiclo orden={99} />);
      expect(alto.container.querySelector('svg')).toHaveAttribute('data-etapa-orden', '6');

      const nan = render(<IconoEtapaCiclo orden={undefined} />);
      // undefined → default 1
      expect(nan.container.querySelector('svg')).toHaveAttribute('data-etapa-orden', '1');
    });
  });
});

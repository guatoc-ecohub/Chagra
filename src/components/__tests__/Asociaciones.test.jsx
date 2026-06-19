import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';

import Asociaciones from '../Asociaciones';
import { filterAsociacionesByRole } from '../../services/asociacionesFilter';
import arquetipos from '../../data/asociaciones-arquetipos.json';

describe('Asociaciones', () => {
  test('renderiza los arquetipos como tarjetas con especies, beneficio y fuente', () => {
    render(<Asociaciones profile={{ rol: 'campesino' }} />);

    expect(screen.getByRole('heading', { name: 'Asociaciones / Policultivos' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Milpa \(Tres Hermanas\)/ })).toHaveTextContent('maíz + fríjol + ahuyama');
    expect(screen.getByText('LER 1.32, el fríjol fija nitrógeno')).toBeInTheDocument();
    expect(screen.getAllByText(/Fuente:/)[0]).toHaveTextContent('DR-ASOCIACIONES-2026-06-18');
  });

  test('filtra arquetipos por rol del usuario', () => {
    const visibles = filterAsociacionesByRole(arquetipos, { rol: 'urbano' });

    expect(visibles.map((item) => item.id)).toEqual(['hortaliza_repelente']);

    render(<Asociaciones profile={{ rol: 'urbano' }} />);
    expect(screen.getByRole('article', { name: /Cebolla \+ zanahoria/ })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /Milpa/ })).not.toBeInTheDocument();
  });

  test('el operador ve todos los arquetipos', () => {
    const visibles = filterAsociacionesByRole(arquetipos, { rol: 'urbano' }, { esOperador: true });

    expect(visibles).toHaveLength(5);
    expect(visibles.map((item) => item.id)).toEqual([
      'milpa',
      'saf_cafe',
      'saf_cacao',
      'frutal_cobertura',
      'hortaliza_repelente',
    ]);
  });

  test('muestra estado vacio cuando el rol no tiene asociaciones', () => {
    render(<Asociaciones profile={{ rol: 'socio' }} />);

    expect(screen.getByText('No hay asociaciones sugeridas para este perfil todavía.')).toBeInTheDocument();
  });

  test('cada tarjeta expone lista de roles como texto de apoyo', () => {
    render(<Asociaciones profile={{ rol: 'cafetero' }} />);

    const card = screen.getByRole('article', { name: /SAF café/ });
    expect(within(card).getByText('campesino, cafetero')).toBeInTheDocument();
  });
});

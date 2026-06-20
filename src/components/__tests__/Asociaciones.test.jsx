import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, test, expect } from 'vitest';

import Asociaciones from '../Asociaciones';
import useAssetStore from '../../store/useAssetStore';

describe('Asociaciones', () => {
  beforeEach(() => {
    useAssetStore.setState({ plants: [] });
  });

  test('renderiza una experiencia accionable por cultivo con métricas reales', () => {
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    expect(screen.getByRole('heading', { name: 'Asociaciones útiles por cultivo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cultivo a planear')).toHaveValue('maiz');

    const milpa = screen.getByRole('article', { name: /Milpa de maíz/ });
    expect(within(milpa).getByText(/Compañeras: fríjol, ahuyama/)).toBeInTheDocument();
    expect(within(milpa).getByText('ASOCIA_CON: tutor vivo')).toBeInTheDocument();
    expect(within(milpa).getByText('LER aprox. 2')).toBeInTheDocument();
    expect(within(milpa).getByText('arvenses -24-55%')).toBeInTheDocument();
    expect(within(milpa).getByText(/hinojo \(ANTAGONIST_OF\)/)).toBeInTheDocument();
    expect(within(milpa).getByText('Diagrama de siembra')).toBeInTheDocument();
  });

  test('permite elegir otro cultivo y muestra sus recomendaciones', () => {
    render(<Asociaciones profile={{ rol: 'cafetero' }} />);

    fireEvent.change(screen.getByLabelText('Cultivo a planear'), { target: { value: 'cafe' } });

    const cafe = screen.getByRole('article', { name: /Café con guamo/ });
    expect(within(cafe).getByText(/Compañeras: guamo, plátano/)).toBeInTheDocument();
    expect(within(cafe).getByText('fijación N 168 kg/ha')).toBeInTheDocument();
    expect(within(cafe).getByText('sombra 30-50%')).toBeInTheDocument();
  });

  test('toma el cultivo desde plantas de la finca cuando existe', () => {
    useAssetStore.setState({
      plants: [
        {
          id: 'p1',
          attributes: {
            name: 'Café lote norte',
            species_slug: 'coffea_arabica',
          },
        },
      ],
    });

    render(<Asociaciones profile={{ rol: 'campesino' }} />);

    expect(screen.getByLabelText('Cultivo a planear')).toHaveValue('cafe');
    expect(screen.getByText(/Detectado en tu finca: café/)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: /Café con guamo/ })).toBeInTheDocument();
  });

  test('filtra por rol salvo operador', () => {
    render(<Asociaciones profile={{ rol: 'urbano' }} />);

    expect(screen.getByRole('article', { name: /Zanahoria con cebolla/ })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: /Milpa/ })).not.toBeInTheDocument();
  });

  test('el operador ve cultivos de todos los arquetipos', () => {
    render(<Asociaciones profile={{ rol: 'urbano' }} esOperador />);

    const selector = screen.getByLabelText('Cultivo a planear');
    expect(within(selector).getByRole('option', { name: 'café' })).toBeInTheDocument();
    expect(within(selector).getByRole('option', { name: 'cacao' })).toBeInTheDocument();
    expect(within(selector).getByRole('option', { name: 'zanahoria' })).toBeInTheDocument();
  });
});

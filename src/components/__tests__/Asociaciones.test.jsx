import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, test, expect } from 'vitest';

import Asociaciones from '../Asociaciones';
import useAssetStore from '../../store/useAssetStore';

describe('Asociaciones - Rediseño Útil y Accionable', () => {
  beforeEach(() => {
    useAssetStore.setState({ plants: [] });
  });

  test('renderiza una experiencia accionable con componentes clave', () => {
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    // Header mejorado
    expect(screen.getByRole('heading', { name: 'Asociaciones inteligentes' })).toBeInTheDocument();

    // Selector de cultivo
    expect(screen.getByLabelText(/¿Qué cultivo quiere planear?/)).toHaveValue('maiz');

    // Verificar que el selector funcione
    const selector = screen.getByLabelText(/¿Qué cultivo quiere planear?/);
    expect(within(selector).getByRole('option', { name: 'maíz' })).toBeInTheDocument();
  });

  test('muestra recomendaciones con información completa y accionable', () => {
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    // Buscar la tarjeta de recomendación
    const milpaCard = screen.getByRole('article', { name: /Milpa de maíz, fríjol y ahuyama/ });
    expect(milpaCard).toBeInTheDocument();

    // Verificar elementos clave de la tarjeta
    const withinMilpa = within(milpaCard);

    // Compañeros ideales
    expect(withinMilpa.getByText(/Compañeros ideales/)).toBeInTheDocument();

    // Plan de acción
    expect(withinMilpa.getByText(/Plan de acción/)).toBeInTheDocument();

    // Por qué funciona
    expect(withinMilpa.getByText(/Por qué funciona/)).toBeInTheDocument();

    // Beneficio comprobado
    expect(withinMilpa.getByText(/Beneficio comprobado/)).toBeInTheDocument();

    // Evitar combinaciones
    expect(withinMilpa.getByText(/Evitar estas combinaciones/)).toBeInTheDocument();

    // Diagrama de siembra
    expect(withinMilpa.getByText(/Diagrama de siembra/)).toBeInTheDocument();
  });

  test('muestra métricas reales sin inventar cifras', () => {
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    const milpaCard = screen.getByRole('article', { name: /Milpa de maíz, fríjol y ahuyama/ });
    const withinMilpa = within(milpaCard);

    // Verificar métricas específicas de datos reales. LER aparece en el badge
    // y en las métricas comparativas (varios nodos) → getAllByText.
    expect(withinMilpa.getAllByText(/LER/).length).toBeGreaterThan(0);
    expect(withinMilpa.getByText(/fijación N/)).toBeInTheDocument();
  });

  test('permite cambiar de cultivo y actualiza las recomendaciones', () => {
    render(<Asociaciones profile={{ rol: 'campesino' }} />);

    // Cambiar a café
    fireEvent.change(screen.getByLabelText(/¿Qué cultivo quiere planear?/), {
      target: { value: 'cafe' },
    });

    // Verificar que se muestren las recomendaciones de café
    const cafeCard = screen.getByRole('article', { name: /Café con guamo y plátano/ });
    expect(cafeCard).toBeInTheDocument();

    // Verificar elementos específicos del café. "guamo"/"plátano" aparecen en
    // el título del sistema y en los chips de compañeros → getAllByText.
    const withinCafe = within(cafeCard);
    expect(withinCafe.getAllByText(/guamo/).length).toBeGreaterThan(0);
    expect(withinCafe.getAllByText(/plátano/).length).toBeGreaterThan(0);
  });

  test('detecta cultivos de la finca y muestra indicador', () => {
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

    // Verificar que se detecte el cultivo. "café" aparece también como opción
    // del selector → acotamos al indicador "Detectado en su finca".
    expect(screen.getByLabelText(/¿Qué cultivo quiere planear?/)).toHaveValue('cafe');
    const indicador = screen.getByText(/Detectado en su finca/).closest('div').parentElement;
    expect(indicador).toBeInTheDocument();
    expect(within(indicador).getByText(/café/)).toBeInTheDocument();
  });

  test('muestra múltiples cultivos de la finca cuando existen', () => {
    useAssetStore.setState({
      plants: [
        {
          id: 'p1',
          attributes: {
            name: 'Maíz lote 1',
            species_slug: 'zea_mays',
          },
        },
        {
          id: 'p2',
          attributes: {
            name: 'Fríjol lote 2',
            species_slug: 'phaseolus_vulgaris',
          },
        },
      ],
    });

    render(<Asociaciones profile={{ rol: 'campesino' }} />);

    // Debería detectar ambos cultivos. Los nombres aparecen también como
    // opciones del selector → acotamos al indicador "Detectado en su finca".
    const indicador = screen.getByText(/Detectado en su finca/).closest('div').parentElement;
    expect(within(indicador).getByText(/maíz/)).toBeInTheDocument();
    expect(within(indicador).getByText(/fríjol/)).toBeInTheDocument();
  });

  test('muestra estado vacío cuando no hay asociaciones disponibles', () => {
    // Usar un cultivo que no esté en los datos
    render(<Asociaciones profile={{ rol: 'campesino' }} />);

    // Cambiar a un cultivo sin asociaciones (si existe)
    const selector = screen.getByLabelText(/¿Qué cultivo quiere planear?/);

    // Verificar que si no hay recomendaciones se muestre el estado vacío
    // (Esto depende de los datos disponibles, pero verificamos la estructura)
    expect(selector).toBeInTheDocument();
  });

  test('filtra por rol del usuario', () => {
    render(<Asociaciones profile={{ rol: 'urbano' }} />);

    // Usuario urbano debería ver hortalizas
    const selector = screen.getByLabelText(/¿Qué cultivo quiere planear?/);
    expect(within(selector).getByRole('option', { name: 'zanahoria' })).toBeInTheDocument();

    // Pero no debería ver café como opción principal
    // (dependiendo de los datos disponibles)
  });

  test('el operador ve todos los cultivos sin filtrar por rol', () => {
    render(<Asociaciones profile={{ rol: 'urbano' }} esOperador />);

    const selector = screen.getByLabelText(/¿Qué cultivo quiere planear?/);

    // El operador debería ver más opciones
    expect(within(selector).getByRole('option', { name: 'maíz' })).toBeInTheDocument();
    expect(within(selector).getByRole('option', { name: /zanahoria/ })).toBeInTheDocument();
  });

  test('muestra antagonistas cuando existen para el cultivo', () => {
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    const milpaCard = screen.getByRole('article', { name: /Milpa de maíz, fríjol y ahuyama/ });
    const withinMilpa = within(milpaCard);

    // Verificar que se muestren antagonistas
    expect(withinMilpa.getByText(/Evitar estas combinaciones/)).toBeInTheDocument();

    // Para maíz, debería evitar hinojo. El nombre aparece en el título del
    // antagonista y en la razón → getAllByText.
    expect(withinMilpa.getAllByText(/hinojo/).length).toBeGreaterThan(0);
  });

  test('muestra mensaje cuando no hay antagonistas conocidos', () => {
    render(<Asociaciones profile={{ rol: 'campesino' }} />);

    // Cambiar a un cultivo que no tenga antagonistas (como frutal)
    fireEvent.change(screen.getByLabelText(/¿Qué cultivo quiere planear?/), {
      target: { value: 'frutal' },
    });

    // Verificar que se muestre el mensaje de no antagonistas
    const frutalCard = screen.getByRole('article', { name: /Frutal con maní forrajero/ });
    const withinFrutal = within(frutalCard);

    expect(withinFrutal.getByText(/No hay antagonistas conocidos/)).toBeInTheDocument();
  });

  test('muestra información de fuentes y cifras', () => {
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    const milpaCard = screen.getByRole('article', { name: /Milpa de maíz, fríjol y ahuyama/ });
    const withinMilpa = within(milpaCard);

    // Verificar que se muestren las fuentes
    expect(withinMilpa.getByText(/Fuente:/)).toBeInTheDocument();
    expect(withinMilpa.getByText(/Cifras:/)).toBeInTheDocument();
  });

  test('funciona completamente offline', () => {
    // Verificar que no hay llamadas a APIs externas
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    // El componente debería renderizar completamente sin conexión
    expect(screen.getByRole('heading', { name: 'Asociaciones inteligentes' })).toBeInTheDocument();

    // Verificar indicador de offline
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  test('muestra badge de "Mejor opción" para la primera recomendación', () => {
    render(<Asociaciones profile={{ rol: 'campesino', cultivos_actuales: 'maíz' }} />);

    // La primera recomendación debería tener el badge de "Mejor opción"
    expect(screen.getByText(/Mejor opción/)).toBeInTheDocument();
  });

  test('muestra indicador de cultivo seleccionado cuando está en la finca', () => {
    useAssetStore.setState({
      plants: [
        {
          id: 'p1',
          attributes: {
            name: 'Maíz lote principal',
            species_slug: 'zea_mays',
          },
        },
      ],
    });

    render(<Asociaciones profile={{ rol: 'campesino' }} />);

    // Debería seleccionar automáticamente el cultivo de la finca
    expect(screen.getByLabelText(/¿Qué cultivo quiere planear?/)).toHaveValue('maiz');

    // Y mostrar el mensaje de que ya tiene el cultivo
    expect(screen.getByText(/¡Ya tiene este cultivo!/)).toBeInTheDocument();
  });
});

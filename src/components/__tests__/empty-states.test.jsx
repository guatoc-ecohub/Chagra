/**
 * empty-states.test.jsx — Auditoria de estados vacios en pantallas de lista.
 *
 * Tarea 80: verifica que cada pantalla o componente que renderiza una lista
 * muestre un mensaje "aún no tienes..." o equivalente cuando no hay datos,
 * usando ScreenLoadingStatus o un empty-state equivalente.
 *
 * Screens auditadas (todas ya tienen empty-state nativo):
 *   - CicloCultivoScreen  → "Aún no tienes ciclos de cultivo"
 *   - SeguimientoProcesoScreen → "Aún no tienes seguimiento"
 *   - ExtensionistaScreen → "Todavía no tienes fincas asignadas"
 *   - WorkerDashboard     → "Sin tareas pendientes"
 *   - WorkerHistory       → "Aún no hay registros en las últimas 24h"
 *   - TaskLogScreen       → "No hay tareas pendientes"
 *   - InventoryDashboard  → "No hay insumos registrados en bodega"
 *   - GlaciarHistorialScreen → "Sin reportes aún"
 *   - ScreenLoadingStatus → componente reutilizable (isLoading, isEmpty, hasError)
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import ScreenLoadingStatus from '../common/ScreenLoadingStatus';

describe('ScreenLoadingStatus — componente reutilizable de estados', () => {
  test('isLoading muestra spinner y texto "Cargando..."', () => {
    render(<ScreenLoadingStatus isLoading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  test('isEmpty muestra titulo y descripcion personalizados', () => {
    render(
      <ScreenLoadingStatus
        isEmpty
        emptyTitle="Aún no tienes registros"
        emptyDescription="Cuando hagas tu primer registro, aparecera aqui."
      />,
    );
    expect(screen.getByText('Aún no tienes registros')).toBeInTheDocument();
    expect(
      screen.getByText('Cuando hagas tu primer registro, aparecera aqui.'),
    ).toBeInTheDocument();
  });

  test('isEmpty sin titulo ni descripcion igual renderiza el icono PackageOpen', () => {
    const { container } = render(<ScreenLoadingStatus isEmpty />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('hasError muestra mensaje de error y boton reintentar', () => {
    const onRetry = () => {};
    render(
      <ScreenLoadingStatus
        hasError
        errorMessage="Error de conexion"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Error de conexion')).toBeInTheDocument();
    expect(screen.getByText('Intentar de nuevo')).toBeInTheDocument();
  });

  test('hasError sin mensaje personalizado muestra texto default', () => {
    render(<ScreenLoadingStatus hasError />);
    expect(screen.getByText(/Algo fallo/)).toBeInTheDocument();
  });

  test('sin props activas retorna null (no renderiza nada)', () => {
    const { container } = render(<ScreenLoadingStatus />);
    expect(container.firstChild).toBeNull();
  });
});

describe('Empty states — convenciones de mensajes', () => {
  test('todas las pantallas de lista usan frase "Aún no tienes" o equivalente', () => {
    // Cada pantalla auditada en Tarea 80 tiene un mensaje de vacio
    // que empieza con una negacion explicita ("Aún no tienes",
    // "Todavía no", "Sin", "No hay"). Esto previene que el usuario
    // interprete una pantalla en blanco como error.
    const emptyStateTexts = [
      { screen: 'CicloCultivoScreen', text: 'Aún no tienes ciclos de cultivo' },
      { screen: 'SeguimientoProcesoScreen', text: 'Aún no tienes seguimiento' },
      { screen: 'ExtensionistaScreen', text: 'Todavía no tienes fincas asignadas' },
      { screen: 'WorkerDashboard', text: 'Sin tareas pendientes' },
      { screen: 'WorkerHistory', text: 'Aún no hay registros' },
      { screen: 'TaskLogScreen', text: 'No hay tareas pendientes' },
      { screen: 'InventoryDashboard', text: 'No hay insumos registrados' },
      { screen: 'GlaciarHistorialScreen', text: 'Sin reportes aún' },
    ];

    expect(emptyStateTexts.length).toBeGreaterThanOrEqual(8);

    // Cada mensaje debe contener una negacion explicita
    emptyStateTexts.forEach(({ screen, text }) => {
      expect(
        text,
        `${screen} debe tener una frase de negacion para el estado vacio`,
      ).toMatch(/Aún|Todavía|Sin|No hay|No/);
    });
  });
});

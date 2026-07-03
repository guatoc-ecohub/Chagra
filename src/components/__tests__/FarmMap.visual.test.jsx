import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * FarmMap — capa visual (leyenda de campo, chips de zonas, EmptyState).
 *
 * Leaflet es pesado (canvas/tiles) y no es lo que probamos acá: lo
 * stubbeamos con un doble mínimo. Lo que sí se ejercita de verdad es el
 * componente React: overlays, estados y navegación por chips (viewport).
 */

const { mapStub, fgLayers, leafletStub, storeState } = vi.hoisted(() => {
  const fgLayers = [];
  const mapStub = {
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 4.53, lng: -73.92 })),
    getZoom: vi.fn(() => 15),
    fitBounds: vi.fn(),
    setView: vi.fn(),
  };
  const makeLayer = () => ({
    bindPopup: vi.fn(),
    openPopup: vi.fn(),
    getBounds: vi.fn(() => 'layer-bounds'),
    getLatLng: vi.fn(() => ({ lat: 0, lng: 0 })),
  });
  const fgStub = {
    addTo: vi.fn(() => fgStub),
    clearLayers: vi.fn(() => { fgLayers.length = 0; }),
    addLayer: vi.fn((l) => fgLayers.push(l)),
    getLayers: vi.fn(() => fgLayers),
    getBounds: vi.fn(() => 'fg-bounds'),
  };
  const leafletStub = {
    map: vi.fn(() => mapStub),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    featureGroup: vi.fn(() => fgStub),
    polygon: vi.fn(() => makeLayer()),
    circleMarker: vi.fn(() => makeLayer()),
  };
  const storeState = { current: { plants: [], structures: [], lands: [] } };
  return { mapStub, fgLayers, leafletStub, storeState };
});

vi.mock('leaflet', () => ({ default: leafletStub }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

// Store: selector-style zustand double, estado por test.
vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector(storeState.current),
}));

// logCache toca IndexedDB: doble vacío (solo se usa con showTasks).
vi.mock('../../db/logCache', () => ({
  logCache: { getAll: vi.fn(async () => []) },
}));

import FarmMap from '../FarmMap';

const POLY = 'POLYGON ((-73.92 4.53, -73.91 4.53, -73.91 4.54, -73.92 4.53))';

const makeLand = (id, name) => ({
  id,
  type: 'asset--land',
  attributes: { name, intrinsic_geometry: { value: POLY }, land_type: 'field' },
});

const makePlant = (id, parentId) => ({
  id,
  type: 'asset--plant',
  attributes: { name: `Planta ${id}` },
  relationships: { parent: { data: [{ id: parentId, type: 'asset--land' }] } },
});

beforeEach(() => {
  vi.clearAllMocks();
  fgLayers.length = 0;
  storeState.current = { plants: [], structures: [], lands: [] };
  localStorage.clear();
});

describe('FarmMap — capa visual', () => {
  test('sin activos: muestra EmptyState honesto y oculta leyenda y chips', () => {
    render(<FarmMap />);

    expect(screen.getByTestId('farm-map-empty')).toBeInTheDocument();
    expect(screen.getByText('Sin lugares en el mapa todavía')).toBeInTheDocument();
    expect(screen.queryByTestId('farm-map-legend')).not.toBeInTheDocument();
    expect(screen.queryByTestId('farm-map-chip-all')).not.toBeInTheDocument();
  });

  test('con zonas: chips de navegación con nombre + conteo de cultivos, y leyenda', () => {
    storeState.current = {
      lands: [makeLand('z1', 'Era de aromáticas'), makeLand('z2', 'Invernadero')],
      plants: [makePlant('p1', 'z1'), makePlant('p2', 'z1'), makePlant('p3', 'z2')],
      structures: [],
    };
    render(<FarmMap />);

    // Chips: "Toda la finca" + una por zona con geometría
    expect(screen.getByTestId('farm-map-chip-all')).toBeInTheDocument();
    expect(screen.getByText('Era de aromáticas')).toBeInTheDocument();
    expect(screen.getByText('Invernadero')).toBeInTheDocument();
    expect(screen.getByLabelText('2 cultivos')).toBeInTheDocument();
    expect(screen.getByLabelText('1 cultivos')).toBeInTheDocument();

    // Leyenda de campo con los tres tipos base
    const legend = screen.getByTestId('farm-map-legend');
    expect(legend).toHaveTextContent('Zona');
    expect(legend).toHaveTextContent('Estructura');
    expect(legend).toHaveTextContent('Cultivo');

    // Sin EmptyState cuando hay datos
    expect(screen.queryByTestId('farm-map-empty')).not.toBeInTheDocument();
  });

  test('tocar un chip encuadra la zona (fitBounds) y lo marca activo', async () => {
    storeState.current = {
      lands: [makeLand('z1', 'Era de aromáticas')],
      plants: [],
      structures: [],
    };
    render(<FarmMap />);

    const chip = screen.getByTestId('farm-map-chip-z1');
    const chipAll = screen.getByTestId('farm-map-chip-all');
    expect(chipAll).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    mapStub.fitBounds.mockClear();
    fireEvent.click(chip);

    await waitFor(() => expect(chip).toHaveAttribute('aria-pressed', 'true'));
    expect(chipAll).toHaveAttribute('aria-pressed', 'false');
    expect(mapStub.fitBounds).toHaveBeenCalledWith(
      'layer-bounds',
      expect.objectContaining({ maxZoom: 18 }),
    );

    // "Toda la finca" vuelve al encuadre global
    fireEvent.click(chipAll);
    await waitFor(() => expect(chipAll).toHaveAttribute('aria-pressed', 'true'));
    expect(mapStub.fitBounds).toHaveBeenLastCalledWith(
      'fg-bounds',
      expect.objectContaining({ maxZoom: 18 }),
    );
  });

  test('focusZoneId oculta los chips (drill-down externo manda)', () => {
    storeState.current = {
      lands: [makeLand('z1', 'Era de aromáticas')],
      plants: [],
      structures: [],
    };
    render(<FarmMap focusZoneId="z1" />);

    expect(screen.queryByTestId('farm-map-chip-all')).not.toBeInTheDocument();
    expect(screen.queryByTestId('farm-map-chip-z1')).not.toBeInTheDocument();
  });

  test('showTasks agrega los tipos de tarea a la leyenda', () => {
    storeState.current = {
      lands: [makeLand('z1', 'Era de aromáticas')],
      plants: [],
      structures: [],
    };
    render(<FarmMap showTasks />);

    const legend = screen.getByTestId('farm-map-legend');
    expect(legend).toHaveTextContent('Observación');
    expect(legend).toHaveTextContent('Cosecha');
    expect(legend).toHaveTextContent('Mantenimiento');
  });
});

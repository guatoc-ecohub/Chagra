// @ts-nocheck
/**
// @ts-nocheck
 * LocationDetectedScreen.coarse.test.jsx — corrección de ubicación gruesa
 * (#coarse-location, 2026-05-30).
 *
 * El operador reportó: en Brave/NixOS sin GPS, `navigator.geolocation` ubica
 * por IP/wifi con accuracy de varios km → cae en la cabecera municipal y la
 * altitud derivada es la de la cabecera (ej. Choachí 1923 msnm), no la de la
 * finca real (2580 msnm). Esa altitud equivocada envenena la viabilidad de
 * cultivos y las alertas de helada del agente.
 *
 * Esta suite verifica el comportamiento de la pantalla:
 *   1. Lectura gruesa (accuracy > umbral) → muestra el aviso de corrección.
 *   2. Lectura fina (accuracy < 50 m, GPS celular) → NO muestra el aviso.
 *   3. La altitud manual escrita gana sobre la derivada y se guarda con
 *      `altitud_source: 'manual'`.
 *   4. Al confirmar se dispara `chagra:location-updated` (ClimaStrip refresca).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// react-leaflet es pesado (canvas/tiles) — lo stubbeamos. No es lo que
// probamos acá; solo necesitamos que el componente monte.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('leaflet', () => ({
  default: { icon: () => ({}), Marker: { prototype: { options: {} } } },
}));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: 'icon.png' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: 'shadow.png' }));

// locationService: mockeamos solo la red (resolveUbicacion / forwardGeocode);
// isCoarseLocation y getPisoTermicoInfo se mantienen REALES (lógica pura que
// queremos ejercitar de verdad).
vi.mock('../../services/locationService', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    resolveUbicacion: vi.fn(async ({ lat, lng, altitud }) => ({
      lat,
      lng,
      municipio: 'Choachí',
      departamento: 'Cundinamarca',
      // Simula la altitud DERIVADA de la cabecera (Open-Elevation en el
      // centroide del municipio): 1923 msnm. Es la altitud "mala".
      altitud: altitud != null ? Math.round(altitud) : 1923,
      // Marca la fuente como cabecera para que handleConfirm pueda hacer coalesce.
      altitud_fuente: altitud != null ? 'dado' : 'cabecera',
      pisoTermico: null,
      cultivosRecomendados: [],
    })),
    forwardGeocode: vi.fn(async () => null),
  };
});

const saveProfile = vi.fn();
vi.mock('../../services/userProfileService', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    saveProfile: (...a) => saveProfile(...a),
    // getProfile devuelve perfil vacío por defecto (sin altitud previa).
    getProfile: () => ({}),
  };
});

vi.mock('../../services/fincaActiveStore', () => {
  const store = { setIndoorZone: vi.fn() };
  const useFincaActiveStore = (selector) => selector(store);
  return { useFincaActiveStore, default: useFincaActiveStore };
});

vi.mock('../../utils/colombiaLocations', () => ({
  getDepartamentos: () => [],
  getMunicipios: () => [],
  findMunicipio: () => null,
}));

import LocationDetectedScreen from '../LocationDetectedScreen';

function mockGeolocation(accuracy) {
  const getCurrentPosition = vi.fn((success) => {
    success({
      coords: {
        latitude: 4.5306,
        longitude: -73.9247,
        altitude: null, // navegador de escritorio no entrega altitud GPS
        accuracy,
      },
    });
  });
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

describe('LocationDetectedScreen — corrección de ubicación gruesa', () => {
  beforeEach(() => {
    saveProfile.mockClear();
  });

  test('lectura GRUESA (accuracy 12 km) muestra el aviso de corrección', async () => {
    mockGeolocation(12000);
    render(<LocationDetectedScreen onConfirm={vi.fn()} onBack={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('coarse-location-warning')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('coarse-location-warning')).toHaveTextContent(
      /señal aproximada/i,
    );
  });

  test('lectura FINA (accuracy 30 m, GPS celular) NO muestra el aviso', async () => {
    mockGeolocation(30);
    render(<LocationDetectedScreen onConfirm={vi.fn()} onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getByTestId('map')).toBeInTheDocument());
    // Esperar a que la altitud derivada aparezca → el bloque enriquecido montó.
    await screen.findByTestId('altitud-manual-input');
    expect(screen.queryByTestId('coarse-location-warning')).not.toBeInTheDocument();
  });

  test('la altitud manual GANA sobre la derivada y se guarda como manual', async () => {
    mockGeolocation(12000); // gruesa → derivada 1923 (cabecera)
    const onConfirm = vi.fn();
    render(<LocationDetectedScreen onConfirm={onConfirm} onBack={vi.fn()} />);

    const input = await screen.findByTestId('altitud-manual-input');
    // El operador escribe su altura real: 2580 msnm.
    fireEvent.change(input, { target: { value: '2580' } });

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(saveProfile).toHaveBeenCalledTimes(1);
    const saved = saveProfile.mock.calls[0][0];
    expect(saved.finca_altitud).toBe('2580'); // NO 1923
    expect(saved.altitud_source).toBe('manual');

    // onConfirm también recibe la altitud efectiva (manual).
    expect(onConfirm.mock.calls[0][0].altitud).toBe(2580);
    expect(onConfirm.mock.calls[0][0].altitud_source).toBe('manual');
  });

  test('sin altitud manual y fuente cabecera, se guarda con source cabecera', async () => {
    // GPS preciso (accuracy 30m) pero el mock de resolveUbicacion devuelve
    // altitud_fuente='cabecera' (simula el fallback offline). Sin altitud previa
    // en el perfil, la cabecera SÍ se guarda (mejor que nada).
    mockGeolocation(30);
    render(<LocationDetectedScreen onConfirm={vi.fn()} onBack={vi.fn()} />);

    await screen.findByTestId('altitud-manual-input');
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    const saved = saveProfile.mock.calls[0][0];
    expect(saved.finca_altitud).toBe('1923');
    // La fuente refleja de dónde vino: 'cabecera' (no 'derived', #1213-fix).
    expect(saved.altitud_source).toBe('cabecera');
    expect(saved.ubicacion_accuracy).toBe(30);
  });

  test('al confirmar dispara chagra:location-updated (ClimaStrip refresca)', async () => {
    mockGeolocation(30);
    const listener = vi.fn();
    window.addEventListener('chagra:location-updated', listener);
    render(<LocationDetectedScreen onConfirm={vi.fn()} onBack={vi.fn()} />);

    await screen.findByTestId('altitud-manual-input');
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('chagra:location-updated', listener);
  });
});

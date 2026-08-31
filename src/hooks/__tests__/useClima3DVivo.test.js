import { describe, expect, test } from 'vitest';
import { derivarClima3D } from '../useClima3DVivo.js';

const hoy = new Date().toISOString().slice(0, 10);

function snapshot(overrides = {}) {
  return {
    fetched_at: '2026-08-26T12:00:00.000Z',
    enso_status: { phase: 'nino_moderado', label: 'El Niño moderado', oni_value: 1.1, trend: 'rising' },
    openmeteo: {
      available: true,
      now: { temp: 16.4, rh: 76, cloud: 82, precip: 6.2, viento: 12 },
      forecast_7d: [{ date: hoy, temp_min: 7.2, temp_max: 19.8, precip_mm: 6.2 }],
    },
    location_context: { municipio: 'Zona de prueba', precision: 'exact', elevation: 2800 },
    ...overrides,
  };
}

describe('derivarClima3D', () => {
  test('traduce lluvia y ENSO del snapshot compartido', () => {
    const clima = derivarClima3D(snapshot());

    expect(clima.senal).toBe(true);
    expect(clima.lluvia).toBe(true);
    expect(clima.ensoFamily).toBe('nino');
    expect(clima.oni).toBe(1.1);
    expect(clima.temp).toBe(16.4);
    expect(clima.ubicacion).toBe('Zona de prueba');
    expect(clima.pisoTermico.id).toBe('frio');
  });

  test('enciende niebla o helada solo con evidencia compatible', () => {
    const niebla = derivarClima3D(snapshot({
      openmeteo: {
        available: true,
        now: { temp: 8, rh: 98, cloud: 96, precip: 0, viento: 4 },
        forecast_7d: [{ date: hoy, temp_min: 5, temp_max: 13, precip_mm: 0 }],
      },
      alertas_locales: [{ tipo: 'Helada', mensaje: 'Proteja el semillero' }],
    }));

    expect(niebla.niebla).toBe(true);
    expect(niebla.helada).toBe(true);
  });

  test('sin snapshot no inventa cifras ni fenómenos', () => {
    const clima = derivarClima3D(null);

    expect(clima.senal).toBe(false);
    expect(clima.temp).toBeNull();
    expect(clima.lluviaMm).toBeNull();
    expect(clima.lluvia).toBe(false);
    expect(clima.niebla).toBe(false);
    expect(clima.helada).toBe(false);
  });
});

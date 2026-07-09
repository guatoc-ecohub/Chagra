import { describe, it, expect } from 'vitest';
import { summarizeProfileLocation, formatLocationContext } from '../locationDisplay.js';

describe('locationDisplay', () => {
  it('resuelve barrio urbano desde el perfil legado', () => {
    const location = summarizeProfileLocation({
      barrio: 'Chapinero',
      municipio: 'Bogota',
      departamento: 'Cundinamarca',
      finca_altitud: 2640,
    });

    expect(location.tipo).toBe('barrio');
    expect(location.sublocalidad).toBe('Chapinero');
    expect(location.label).toBe('Barrio Chapinero');
    expect(formatLocationContext(location)).toBe('Barrio Chapinero · Bogota, Cundinamarca · 2640 msnm');
  });

  it('resuelve vereda rural desde el perfil legado', () => {
    const location = summarizeProfileLocation({
      vereda: 'El Curi',
      municipio: 'Choachi',
      departamento: 'Cundinamarca',
      altitud: 2580,
    });

    expect(location.tipo).toBe('vereda');
    expect(location.sublocalidad).toBe('El Curi');
    expect(location.label).toBe('Vereda El Curi');
    expect(formatLocationContext(location)).toBe('Vereda El Curi · Choachi, Cundinamarca · 2580 msnm');
  });
});

import { describe, expect, it } from 'vitest';
import { buildClimaCultivoSuggestions } from '../climaCultivoSuggestions.js';

const clima = {
  tieneOpenMeteo: true,
  tieneEnso: true,
  ensoFamily: 'nina',
  temp: 17,
  tempMin: 12,
  pronostico: [
    { date: '2026-08-26', temp_min: 12, precip_mm: 0 },
    { date: '2026-08-27', temp_min: 10, temp_max: 17, precip_mm: 8.4, horas_hr_alta: 8 },
  ],
  alertas: [],
};

describe('buildClimaCultivoSuggestions', () => {
  it('devuelve una tarjeta por cultivo real y prioriza la señal más severa', () => {
    const result = buildClimaCultivoSuggestions({
      plants: [
        { attributes: { name: 'Papa #01', _speciesSlug: 'solanum_tuberosum', _chagra_plant_meta: { fenologia: 'floración' } } },
        { attributes: { name: 'Papa #02', _speciesSlug: 'solanum_tuberosum' } },
        { attributes: { name: 'Café', _speciesSlug: 'coffea_arabica' } },
      ],
      climaLive: clima,
      graph: {
        species: {
          solanum_tuberosum: { temp_min: 10, temp_max: 18, helada_letal: -2 },
          coffea_arabica: { temp_min: 18, temp_max: 22, helada_letal: 0 },
        },
      },
      regionLine: 'La Niña en los Andes trae más lluvia.',
      ensoFamily: 'nina',
    });

    expect(result).toHaveLength(2);
    expect(result.every((item) => item.suggestion)).toBe(true);
    expect(result.map((item) => item.name)).toEqual(expect.arrayContaining(['Café', 'Papa']));
    expect(result.find((item) => item.name === 'Café').suggestion.text).toMatch(/18 °C/);
    expect(result.find((item) => item.name === 'Papa').count).toBe(2);
  });

  it('no inventa una ficha para un cultivo desconocido', () => {
    const result = buildClimaCultivoSuggestions({
      plants: [{ attributes: { name: 'Cultivo de la finca' } }],
      climaLive: clima,
      graph: { species: {} },
    });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('no-data');
    expect(result[0].suggestion).toBeNull();
  });

  it('usa una alerta climática ya disponible y no crea un umbral propio', () => {
    const result = buildClimaCultivoSuggestions({
      plants: [{ attributes: { name: 'Tomate', _speciesSlug: 'solanum_lycopersicum_san_marzano' } }],
      climaLive: {
        ...clima,
        alertas: [{ tipo: 'Lluvia fuerte', mensaje: 'Revise drenajes hoy.', severidad: 'critical' }],
      },
      graph: { species: { solanum_lycopersicum_san_marzano: { temp_min: 20, temp_max: 28, helada_letal: 0 } } },
    });

    expect(result[0].suggestion.severity).toBe('critical');
    expect(result[0].suggestion.text).toContain('Revise drenajes hoy.');
  });
});

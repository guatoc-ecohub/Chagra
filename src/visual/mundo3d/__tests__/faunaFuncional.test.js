import { describe, expect, it } from 'vitest';
import { coreografia } from '../faunaFuncional.js';
import { vientoDeClima } from '../useFincaViva.js';

const VIENTO_HACIA_ESTE = { direccion: { x: 1, z: 0 }, fuerza: 20 };

describe('coreografia con percepción por viento', () => {
  it('mantiene el gesto histórico sin viento y sesga controlador/polinizador en sentidos opuestos', () => {
    const tPatrulla = 3.2;
    const patrullaNeutra = coreografia('patrulla', tPatrulla, 0.7);
    const patrullaContraViento = coreografia('patrulla', tPatrulla, 0.7, VIENTO_HACIA_ESTE);
    expect(coreografia('patrulla', tPatrulla, 0.7, null)).toEqual(patrullaNeutra);
    expect(patrullaContraViento[0]).toBeLessThan(patrullaNeutra[0]);

    // En esta fase el polinizador ya está saltando entre flores, por lo que
    // deriva a favor del mismo vector real de viento.
    const tSalto = 4.2;
    const polinizadorNeutro = coreografia('polinizar', tSalto, 0.3);
    const polinizadorConViento = coreografia('polinizar', tSalto, 0.3, VIENTO_HACIA_ESTE);
    expect(polinizadorConViento[0]).toBeGreaterThan(polinizadorNeutro[0]);
    expect(coreografia('polinizar', tSalto, 0.3, VIENTO_HACIA_ESTE)).toEqual(polinizadorConViento);
  });

  it('solo publica viento cuando Open-Meteo entrega velocidad y rumbo reales', () => {
    const now = new Date('2026-08-29T12:00:00-05:00');
    const viento = vientoDeClima({
      openmeteo: {
        available: true,
        forecast_7d: [{ date: '2026-08-29', wind_speed_10m_max: 18, wind_direction_10m_dominant: 90 }],
      },
    }, now);
    expect(viento).toMatchObject({ fuerza: 18, direccion: { grados: 90 } });
    // Rumbo meteorológico 90° viene del este, por tanto viaja hacia el oeste.
    expect(viento.direccion.x).toBeCloseTo(-1);
    expect(vientoDeClima({ openmeteo: { available: true, forecast_7d: [{ date: '2026-08-29', wind_speed_10m_max: 18 }] } }, now)).toBeNull();
  });
});

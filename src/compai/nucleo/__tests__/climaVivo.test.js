/**
 * climaVivo — el compAI reacciona al clima real (#111).
 *
 * Contratos que cuidamos:
 *   - sin forecast (o vacío) → null, nunca inventa un aviso.
 *   - helada (temp_min_c de mañana <= 2°C) manda sobre lluvia y sequía.
 *   - lluvia fuerte (precip_mm de mañana >= 5mm) sin helada → aviso amable.
 *   - sequía (3 días seguidos < 1mm) sólo dispara con los 3 días completos.
 *   - un día cálido y sin lluvia relevante → null (no todo es una reacción).
 */
import { describe, it, expect } from 'vitest';
import { reaccionAlClima, UMBRAL_HELADA_C, UMBRAL_LLUVIA_MM } from '../climaVivo';

describe('reaccionAlClima', () => {
  it('sin forecast real, no reacciona (anti-fabricación)', () => {
    expect(reaccionAlClima()).toBeNull();
    expect(reaccionAlClima({ forecast7d: [] })).toBeNull();
    expect(reaccionAlClima({ forecast7d: null })).toBeNull();
  });

  it('helada: temp_min_c de mañana en el umbral dispara aviso alta + gesto abriga', () => {
    const r = reaccionAlClima({
      forecast7d: [
        { temp_min_c: 8, precip_mm: 0 },
        { temp_min_c: UMBRAL_HELADA_C, precip_mm: 0 },
      ],
    });
    expect(r).not.toBeNull();
    expect(r.tipo).toBe('helada');
    expect(r.severidad).toBe('alta');
    expect(r.gesto).toBe('abriga');
  });

  it('helada manda sobre lluvia si ambas señales están presentes el mismo día', () => {
    const r = reaccionAlClima({
      forecast7d: [
        { temp_min_c: 8, precip_mm: 0 },
        { temp_min_c: 0, precip_mm: 20 },
      ],
    });
    expect(r.tipo).toBe('helada');
  });

  it('lluvia fuerte de mañana sin helada → aviso media + gesto emociona', () => {
    const r = reaccionAlClima({
      forecast7d: [
        { temp_min_c: 12, precip_mm: 0 },
        { temp_min_c: 11, precip_mm: UMBRAL_LLUVIA_MM },
      ],
    });
    expect(r.tipo).toBe('lluvia');
    expect(r.severidad).toBe('media');
    expect(r.gesto).toBe('emociona');
  });

  it('sequía: 3 días seguidos secos (incluye hoy) → aviso baja + gesto pideAgua', () => {
    const r = reaccionAlClima({
      forecast7d: [
        { temp_min_c: 15, precip_mm: 0 },
        { temp_min_c: 15, precip_mm: 0.2 },
        { temp_min_c: 15, precip_mm: 0 },
      ],
    });
    expect(r.tipo).toBe('sequia');
    expect(r.severidad).toBe('baja');
    expect(r.gesto).toBe('pideAgua');
  });

  it('sequía no dispara si falta cualquiera de los 3 días de dato', () => {
    const r = reaccionAlClima({
      forecast7d: [
        { temp_min_c: 15, precip_mm: 0 },
        { temp_min_c: 15 }, // sin precip_mm
      ],
    });
    expect(r).toBeNull();
  });

  it('día templado y sin lluvia relevante: no reacciona (no todo es alerta)', () => {
    const r = reaccionAlClima({
      forecast7d: [
        { temp_min_c: 14, precip_mm: 2 },
        { temp_min_c: 13, precip_mm: 2 },
        { temp_min_c: 14, precip_mm: 3 },
      ],
    });
    expect(r).toBeNull();
  });

  it('sin día de mañana, usa hoy como mejor dato disponible', () => {
    const r = reaccionAlClima({ forecast7d: [{ temp_min_c: 0, precip_mm: 0 }] });
    expect(r).not.toBeNull();
    expect(r.tipo).toBe('helada');
  });
});

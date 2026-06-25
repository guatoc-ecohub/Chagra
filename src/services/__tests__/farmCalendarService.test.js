import { describe, it, expect } from 'vitest';
import {
  buildPlantCalendar,
  aggregateMonthlyMatrix,
  entriesForMonth,
  CALENDAR_LAYERS,
} from '../farmCalendarService';

// Fecha fija para reproducibilidad: 15 de enero de 2026.
const NOW = new Date('2026-01-15T12:00:00Z').getTime();

describe('farmCalendarService — grounding y deflección honesta', () => {
  it('una especie sin datos de ciclo no inventa fechas (status no_data)', () => {
    const cal = buildPlantCalendar({
      id: 'x1',
      name: 'Planta rara',
      speciesSlug: 'especie_inexistente_xyz',
      species: null,
      sowingDate: null,
      altitudeM: 1800,
      now: NOW,
    });
    expect(cal.status).toBe('no_data');
    expect(cal.kind).toBe('no_data');
    expect(cal.entries).toHaveLength(0);
  });

  it('un perenne real (café) proyecta floración/cosecha sobre los 12 meses', () => {
    const cal = buildPlantCalendar({
      id: 'c1',
      name: 'Café',
      speciesSlug: 'coffea_arabica',
      species: { id: 'coffea_arabica', nombre_comun: 'Café', category: 'frutales_perennes' },
      sowingDate: null,
      altitudeM: 1800,
      now: NOW,
    });
    expect(cal.status).toBe('ok');
    expect(cal.kind).toBe('perennial');
    // El café (bimodal) tiene meses de cosecha reales en perennialCycles.
    const cosecha = cal.entries.filter((e) => e.layer === 'cosecha');
    expect(cosecha.length).toBeGreaterThan(0);
    expect(cosecha[0].months.length).toBeGreaterThan(0);
    // Cada entrada lleva su procedencia (nunca vacía).
    for (const e of cal.entries) {
      expect(typeof e.source).toBe('string');
      expect(e.source.length).toBeGreaterThan(0);
    }
  });

  it('un cultivo anual con plantilla y fecha de siembra produce fenología + cosecha groundeadas', () => {
    const cal = buildPlantCalendar({
      id: 't1',
      name: 'Tomate',
      speciesSlug: 'solanum_lycopersicum',
      species: { id: 'solanum_lycopersicum', nombre_comun: 'Tomate', category: 'hortalizas_fruto' },
      sowingDate: NOW,
      altitudeM: 1800,
      now: NOW,
    });
    expect(cal.status).toBe('ok');
    const layers = new Set(cal.entries.map((e) => e.layer));
    // Debe haber al menos siembra y alguna etapa fenológica.
    expect(layers.has('siembra')).toBe(true);
    expect(cal.entries.every((e) => Array.isArray(e.months) && e.months.length > 0)).toBe(true);
    // Todas las capas presentes son válidas.
    for (const l of layers) expect(CALENDAR_LAYERS).toContain(l);
  });

  it('aggregateMonthlyMatrix respeta el filtro de capas activas', () => {
    const cal = buildPlantCalendar({
      id: 'c2',
      name: 'Café',
      speciesSlug: 'coffea_arabica',
      species: { id: 'coffea_arabica', category: 'frutales_perennes' },
      sowingDate: null,
      altitudeM: null,
      now: NOW,
    });
    const all = aggregateMonthlyMatrix([cal], null);
    const onlyCosecha = aggregateMonthlyMatrix([cal], new Set(['cosecha']));
    const totalAll = all.reduce((s, c) => s + c.total, 0);
    const totalCosecha = onlyCosecha.reduce((s, c) => s + c.total, 0);
    expect(totalAll).toBeGreaterThanOrEqual(totalCosecha);
    expect(totalCosecha).toBeGreaterThan(0);
    // entriesForMonth solo devuelve entradas de la capa activa.
    for (let m = 1; m <= 12; m++) {
      const e = entriesForMonth(cal, m, new Set(['cosecha']));
      expect(e.every((x) => x.layer === 'cosecha')).toBe(true);
    }
  });
});

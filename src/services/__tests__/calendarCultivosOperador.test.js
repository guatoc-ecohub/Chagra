/**
 * calendarCultivosOperador — guarda de regresión para los CULTIVOS PILARES de la
 * finca del operador en el "Calendario de la finca".
 *
 * Bug (2026-06-25): el calendario salía VACÍO ("No tengo datos de ciclo … no
 * invento fechas") para Tomate, Tomate Cherry, Fresa y Guayaba cuando el operador
 * nombraba sus plantas con un calificador de estructura/ubicación predial
 * ("Fresa - Invernadero #1", "Guayaba - Invernadero"). El nombre no resolvía a
 * ninguna especie del catálogo → sin plantilla → no_data. La fenología/ciclo
 * perenne YA existían y estaban grounded; el fallo era la resolución nombre→slug.
 *
 * Este test recorre la MISMA cadena que CalendarioFincaScreen
 * (matchSpeciesInCatalog → buildPlantCalendar) contra el catálogo OSS REAL que
 * ships en la app (subset v3.2 → catalog.sqlite), no un fixture sintético, para
 * que cualquier regresión en la resolución o en los datos grounded lo rompa.
 *
 * Invariante anti-alucinación (también cubierto): una planta sin datos de ciclo
 * NO inventa fechas; cae a no_data y la UI deflexiona honestamente.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { matchSpeciesInCatalog } from '../../utils/speciesResolver';
import { buildPlantCalendar } from '../farmCalendarService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const SUBSET_PATH = path.join(REPO_ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');
const catalog = JSON.parse(readFileSync(SUBSET_PATH, 'utf8')).species || [];

// Fecha fija y siembra fija para reproducibilidad.
const NOW = new Date('2026-06-25T12:00:00Z').getTime();
const SOWN = new Date('2026-03-01T12:00:00Z').getTime();

/** Reproduce el paso de CalendarioFincaScreen: nombre del asset → calendario. */
function calendarFor(name, slug) {
  const species = matchSpeciesInCatalog(catalog, slug, name);
  const speciesSlug = species?.id || species?.slug || slug;
  return buildPlantCalendar({
    id: slug,
    name,
    speciesSlug,
    species,
    sowingDate: SOWN,
    altitudeM: 1800,
    now: NOW,
  });
}

describe('Calendario de finca — cultivos pilares del operador', () => {
  // [nombre del asset como lo escribe el operador, slug derivado, kind esperado]
  const PILARES = [
    ['Tomate (Solanum lycopersicum)', 'tomate', 'annual'],
    ['Tomate Cherry (Solanum lycopersicum var. cerasiforme)', 'tomate_cherry', 'annual'],
    ['Fresa (Fragaria × ananassa)', 'fresa', 'annual'],
    ['Fresa - Invernadero #1', 'fresa_invernadero', 'annual'],
    ['Fresa - Invernadero #10', 'fresa_invernadero', 'annual'],
    ['Guayaba (Psidium guajava)', 'guayaba', 'perennial'],
    ['Guayaba - Invernadero', 'guayaba_invernadero', 'perennial'],
  ];

  for (const [name, slug, expectedKind] of PILARES) {
    it(`"${name}" produce calendario (no "sin ciclo")`, () => {
      const cal = calendarFor(name, slug);
      expect(cal.status).toBe('ok');
      expect(cal.kind).toBe(expectedKind);
      expect(cal.entries.length).toBeGreaterThan(0);
      // Cada entrada lleva una fuente real (grounding, anti-alucinación).
      for (const e of cal.entries) {
        expect(typeof e.source).toBe('string');
        expect(e.source.length).toBeGreaterThan(0);
      }
    });
  }

  it('Fresa usa la plantilla fenológica grounded (Agrosavia), no genérica', () => {
    const cal = calendarFor('Fresa - Invernadero #1', 'fresa_invernadero');
    expect(cal.isGeneric).toBe(false);
    const sources = cal.entries.map((e) => e.source).join(' | ');
    expect(sources.toLowerCase()).toContain('fresa');
  });

  it('Tomate usa la plantilla fenológica grounded de tomate (Agrosavia)', () => {
    const cal = calendarFor('Tomate (Solanum lycopersicum)', 'tomate');
    expect(cal.isGeneric).toBe(false);
    const sources = cal.entries.map((e) => e.source).join(' | ');
    expect(sources.toLowerCase()).toContain('tomate');
  });

  it('Guayaba usa el ciclo PERENNE grounded (floración + cosecha de Agrosavia)', () => {
    const cal = calendarFor('Guayaba - Invernadero', 'guayaba_invernadero');
    expect(cal.kind).toBe('perennial');
    expect(cal.perennial).toBeTruthy();
    const layers = new Set(cal.entries.map((e) => e.layer));
    expect(layers.has('cosecha')).toBe(true); // tiene ventana de cosecha real
  });

  it('ANTI-ALUCINACIÓN: una especie sin datos de ciclo NO inventa fechas', () => {
    const cal = calendarFor('Planta Marciana Inexistente', 'planta_marciana_xyz');
    expect(cal.status).toBe('no_data');
    expect(cal.entries).toHaveLength(0);
  });
});

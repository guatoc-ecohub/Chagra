import { describe, it, expect } from 'vitest';
import { getSpeciesVisual, normalizeSpeciesText, SPECIES_TONE_CLASSES } from './speciesVisual';

// Set de iconos por especie para el catálogo/cards (feedback operador
// 2026-07). Estos tests fijan el contrato: determinístico, nunca vacío,
// keywords acotadas sin colisiones de substring (papa/papaya, uva/uchuva,
// rosa/rosado, cafe/cafetero) y fallback por categoría del seed v3.1.

describe('normalizeSpeciesText', () => {
  it('baja a minúsculas y quita tildes', () => {
    expect(normalizeSpeciesText('Fríjol CARGAMANTO')).toBe('frijol cargamanto');
    expect(normalizeSpeciesText('Ñame')).toBe('name');
  });

  it('tolera null/undefined/no-string', () => {
    expect(normalizeSpeciesText(null)).toBe('');
    expect(normalizeSpeciesText(undefined)).toBe('');
    expect(normalizeSpeciesText(/** @type {any} */ (42))).toBe('');
  });
});

describe('getSpeciesVisual — especies del catálogo v3.1', () => {
  it('resuelve cultivos núcleo por nombre común', () => {
    expect(getSpeciesVisual({ comun: 'Maíz criollo' }).emoji).toBe('🌽');
    expect(getSpeciesVisual({ comun: 'Papa Pastusa Suprema' }).emoji).toBe('🥔');
    expect(getSpeciesVisual({ comun: 'Café caturra / Castillo' }).emoji).toBe('☕');
    expect(getSpeciesVisual({ comun: 'Fresa' }).emoji).toBe('🍓');
    expect(getSpeciesVisual({ comun: 'Frijol arbustivo / voluble' }).emoji).toBe('🫘');
  });

  it('resuelve por nombre científico y por id canónico con "_"', () => {
    expect(getSpeciesVisual({ cientifico: 'Solanum lycopersicum' }).emoji).toBe('🍅');
    expect(getSpeciesVisual({ id: 'rubus_glaucus' }).emoji).toBe('🫐');
    expect(getSpeciesVisual({ id: 'persea_americana' }).emoji).toBe('🥑');
  });

  it('NO colisiona substrings: papa/papaya, uva/uchuva, rosa/rosado, cafe/cafetero', () => {
    expect(getSpeciesVisual({ comun: 'Papaya' }).emoji).not.toBe('🥔');
    expect(getSpeciesVisual({ comun: 'Uchuva' }).emoji).not.toBe('🍇');
    // "Guayacán rosado" es árbol de sombra, no una rosa.
    expect(getSpeciesVisual({ comun: 'Guayacán rosado' }).emoji).toBe('🌳');
    // "Nogal cafetero" es árbol de sombra, no café.
    expect(getSpeciesVisual({ comun: 'Nogal cafetero' }).emoji).toBe('🌳');
    // "Espinaca" no debe caer en piña.
    expect(getSpeciesVisual({ comun: 'Espinaca' }).emoji).toBe('🥬');
  });

  it('tomate de árbol y tomate de mesa comparten 🍅', () => {
    expect(getSpeciesVisual({ comun: 'Tomate de árbol / Tamarillo' }).emoji).toBe('🍅');
    expect(getSpeciesVisual({ comun: 'Tomate San Marzano' }).emoji).toBe('🍅');
  });

  it('cae al fallback por categoría cuando no hay keyword', () => {
    expect(getSpeciesVisual({ comun: 'Especie rara', categoria: 'frutales_perennes' }).emoji).toBe('🍎');
    expect(getSpeciesVisual({ comun: 'Especie rara', categoria: 'arboles_sombra' }).emoji).toBe('🌳');
    expect(getSpeciesVisual({ comun: 'Especie rara', categoria: 'abonos_verdes_coberturas' }).emoji).toBe('☘️');
  });

  it('las invasoras llevan tono rose (alerta suave), sin dejar de ser plantas', () => {
    const v = getSpeciesVisual({ comun: 'Helecho marranero' });
    expect(v.emoji).toBe('🌿');
    expect(v.tone).toBe('rose');
  });

  it('NUNCA retorna vacío: default 🌱 emerald', () => {
    expect(getSpeciesVisual({})).toEqual({ emoji: '🌱', tone: 'emerald' });
    expect(getSpeciesVisual(null)).toEqual({ emoji: '🌱', tone: 'emerald' });
    expect(getSpeciesVisual({ comun: 'zzz desconocida' })).toEqual({ emoji: '🌱', tone: 'emerald' });
  });

  it('todo tone emitido tiene clases tailwind declaradas', () => {
    const especies = [
      { comun: 'Maíz' }, { comun: 'Papa' }, { comun: 'Café' }, { comun: 'Fresa' },
      { comun: 'Mora andina' }, { comun: 'Uchuva' }, { comun: 'Ajo' }, { comun: 'Rosa' },
      { comun: 'Helecho marranero' }, { comun: 'Trébol blanco' }, { comun: 'Taruya' },
      { comun: 'x', categoria: 'atractores_polinizadores' }, {},
    ];
    especies.forEach((sp) => {
      const { tone } = getSpeciesVisual(sp);
      expect(SPECIES_TONE_CLASSES[tone], `tone sin clases: ${tone}`).toBeTruthy();
    });
  });
});

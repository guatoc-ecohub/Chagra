/**
 * build-dpo-dataset.test.mjs — valida el formato de los pares DPO y las piezas
 * puras del builder (extracción de especie, selección de `chosen`, split
 * anti-leakage por especie). No toca red ni disco.
 */

import { describe, it, expect } from 'vitest';
import {
  extractSpeciesSlug,
  collectCandidates,
  selectChosen,
  buildPairs,
  splitBySpecies,
  typeDistribution,
  CONTAMINATION_TYPES,
} from '../build-dpo-dataset.mjs';

// Registros juzgados sintéticos (mismo shape que los *.judged.jsonl reales):
// dos sondas, cada una con respuestas contaminadas y limpias en runs distintos.
const RECORDS = [
  {
    id: 'cross_thermal__allium_cepa', type: 'cross_thermal',
    query: '¿Puedo sembrar cebolla en piso cálido?', subject: 'Cebolla (Allium cepa L.)',
    response: 'Respuesta contaminada A: la cebolla se asocia con cacao del piso cálido.',
    contaminated: true, halluc_detected_count: 3, entities_grounded: 0, error: null,
  },
  {
    id: 'cross_thermal__allium_cepa', type: 'cross_thermal',
    query: '¿Puedo sembrar cebolla en piso cálido?', subject: 'Cebolla (Allium cepa L.)',
    response: 'Respuesta limpia groundeada: la cebolla prefiere clima frío/templado y no ese piso térmico.',
    contaminated: false, halluc_detected_count: 0, entities_grounded: 2, error: null,
  },
  {
    id: 'cross_thermal__allium_cepa', type: 'cross_thermal',
    query: '¿Puedo sembrar cebolla en piso cálido?', subject: 'Cebolla (Allium cepa L.)',
    response: 'Respuesta contaminada B distinta: crece igual que el arroz en tierra caliente.',
    contaminated: true, halluc_detected_count: 4, entities_grounded: 0, error: null,
  },
  {
    id: 'confusion_especie__solanum_lycopersicum_san_marzano', type: 'confusion_especie',
    query: 'Hábleme del tomate San Marzano y sus plagas.', subject: 'Tomate (Solanum lycopersicum)',
    response: 'Contaminada: el tomate San Marzano pertenece a la familia Rosaceae y tiene nematodos de la fresa.',
    contaminated: true, halluc_detected_count: 2, entities_grounded: 1, error: null,
  },
  {
    id: 'confusion_especie__solanum_lycopersicum_san_marzano', type: 'confusion_especie',
    query: 'Hábleme del tomate San Marzano y sus plagas.', subject: 'Tomate (Solanum lycopersicum)',
    response: 'Limpia: el tomate San Marzano es Solanaceae; entre sus problemas está el tizón tardío.',
    contaminated: false, halluc_detected_count: 0, entities_grounded: 3, error: null,
  },
  // Sonda sin ninguna respuesta contaminada -> no debe producir pares.
  {
    id: 'cross_crop__zea_mays', type: 'cross_crop',
    query: '¿Qué plagas tiene el maíz?', subject: 'Maíz (Zea mays L.)',
    response: 'Limpia: el maíz tiene gusano cogollero.',
    contaminated: false, halluc_detected_count: 0, entities_grounded: 2, error: null,
  },
];

describe('extractSpeciesSlug', () => {
  it('colapsa cultivares al binomio (género + epíteto)', () => {
    expect(extractSpeciesSlug('cross_thermal__allium_cepa', 'cross_thermal')).toBe('allium_cepa');
    expect(extractSpeciesSlug('cross_crop__solanum_lycopersicum_san_marzano', 'cross_crop')).toBe('solanum_lycopersicum');
    expect(extractSpeciesSlug('confusion_especie__solanum_lycopersicum_cerasiforme_uvalina', 'confusion_especie')).toBe('solanum_lycopersicum');
  });
  it('en pest_vs_disease toma la especie, no el organismo', () => {
    expect(extractSpeciesSlug('pest_vs_disease__coffea_arabica__hemileia_vastatrix_roya', 'pest_vs_disease')).toBe('coffea_arabica');
  });
  it('trata las sondas fixed como su propia especie (singleton)', () => {
    expect(extractSpeciesSlug('fixed__contacto_inventado_plaga_cuarentenaria', 'contacto_inventado'))
      .toBe('fixed__contacto_inventado_plaga_cuarentenaria');
  });
});

describe('collectCandidates + selectChosen', () => {
  it('agrupa por id y deduplica las contaminadas por texto', () => {
    const cands = collectCandidates(RECORDS);
    const cebolla = cands.find((c) => c.id === 'cross_thermal__allium_cepa');
    expect(cebolla.rejected).toHaveLength(2); // dos contaminadas DISTINTAS
    expect(cebolla.clean).toHaveLength(1);
    expect(cebolla.species).toBe('allium_cepa');
  });
  it('elige la limpia con menos alucinaciones / más groundeada como chosen', () => {
    const cands = collectCandidates(RECORDS);
    const cebolla = cands.find((c) => c.id === 'cross_thermal__allium_cepa');
    const chosen = selectChosen(cebolla.clean);
    expect(chosen.contaminated).toBe(false);
    expect(chosen.halluc_detected_count).toBe(0);
  });
});

describe('buildPairs — formato de los pares DPO', () => {
  const pairs = buildPairs(collectCandidates(RECORDS));

  it('produce un par por cada respuesta contaminada distinta con limpia disponible', () => {
    // cebolla: 2 rejected -> 2 pares; tomate: 1 rejected -> 1 par; maíz: 0.
    expect(pairs).toHaveLength(3);
  });

  it('cada par tiene prompt/chosen/rejected conversacionales bien formados', () => {
    for (const p of pairs) {
      // prompt = [system, user]
      expect(Array.isArray(p.prompt)).toBe(true);
      expect(p.prompt).toHaveLength(2);
      expect(p.prompt[0].role).toBe('system');
      expect(typeof p.prompt[0].content).toBe('string');
      expect(p.prompt[0].content.length).toBeGreaterThan(20);
      expect(p.prompt[1].role).toBe('user');
      expect(p.prompt[1].content.length).toBeGreaterThan(0);
      // chosen / rejected = [assistant]
      expect(p.chosen[0].role).toBe('assistant');
      expect(p.rejected[0].role).toBe('assistant');
      // chosen != rejected
      expect(p.chosen[0].content).not.toBe(p.rejected[0].content);
      expect(p.chosen[0].content.length).toBeGreaterThan(0);
      expect(p.rejected[0].content.length).toBeGreaterThan(0);
      // meta
      expect(CONTAMINATION_TYPES).toContain(p.meta.type);
      expect(typeof p.meta.species).toBe('string');
      expect(typeof p.meta.prompt_enriched).toBe('boolean');
    }
  });

  it('el system prompt base viene de buildEnrichedSystemPrompt (no inventado)', () => {
    expect(pairs[0].prompt[0].content).toContain('asistente agroecológico');
  });
});

describe('splitBySpecies — anti-leakage', () => {
  it('ninguna especie aparece en train y heldout a la vez', () => {
    const pairs = buildPairs(collectCandidates(RECORDS));
    const { train, heldout } = splitBySpecies(pairs, { ratio: 0.5 });
    const trainSp = new Set(train.map((p) => p.meta.species));
    const heldSp = new Set(heldout.map((p) => p.meta.species));
    for (const s of heldSp) expect(trainSp.has(s)).toBe(false);
  });

  it('es determinístico con el mismo seed', () => {
    const pairs = buildPairs(collectCandidates(RECORDS));
    const a = splitBySpecies(pairs, { ratio: 0.5, seed: 'x' });
    const b = splitBySpecies(pairs, { ratio: 0.5, seed: 'x' });
    expect(a.stats.heldout_species_list).toEqual(b.stats.heldout_species_list);
  });

  it('conserva todos los pares (train + heldout = total)', () => {
    const pairs = buildPairs(collectCandidates(RECORDS));
    const { train, heldout } = splitBySpecies(pairs);
    expect(train.length + heldout.length).toBe(pairs.length);
  });
});

describe('typeDistribution', () => {
  it('cuenta pares por tipo con las 5 claves presentes', () => {
    const pairs = buildPairs(collectCandidates(RECORDS));
    const d = typeDistribution(pairs);
    expect(Object.keys(d).sort()).toEqual([...CONTAMINATION_TYPES].sort());
    expect(d.cross_thermal + d.confusion_especie).toBe(3);
  });
});

import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.join(__dirname, '../../catalog/chagra-catalog-seed-v3.1.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
const speciesById = new Map(catalog.species.map((species) => [species.id, species]));
const sourcesById = new Map(catalog.sources.map((source) => [source.id, source]));

const expectedSpecies = {
  vanilla_planifolia: {
    common: 'Vainilla',
    scientific: 'Vanilla planifolia Jacks. ex Andrews',
    family: 'Orchidaceae',
  },
  selenicereus_megalanthus: {
    common: 'Pitahaya amarilla',
    scientific: 'Selenicereus megalanthus (K.Schum. ex Vaupel) Moran',
    family: 'Cactaceae',
  },
  plukenetia_volubilis: {
    common: 'Sacha inchi',
    scientific: 'Plukenetia volubilis L.',
    family: 'Euphorbiaceae',
  },
  anacardium_occidentale: {
    common: 'Marañón',
    scientific: 'Anacardium occidentale L.',
    family: 'Anacardiaceae',
  },
  bactris_gasipaes: {
    common: 'Palmito de chontaduro',
    scientific: 'Bactris gasipaes Kunth',
    family: 'Arecaceae',
  },
  annona_muricata: {
    common: 'Guanábana',
    scientific: 'Annona muricata L.',
    family: 'Annonaceae',
  },
  dioscorea_alata_rotundata: {
    common: 'Ñame',
    scientific: 'Dioscorea alata L. / Dioscorea rotundata Poir.',
    family: 'Dioscoreaceae',
  },
  oxalis_tuberosa: {
    common: 'Oca / Hibia',
    scientific: 'Oxalis tuberosa Molina',
    family: 'Oxalidaceae',
  },
  ullucus_tuberosus: {
    common: 'Ulluco / Chugua',
    scientific: 'Ullucus tuberosus Caldas',
    family: 'Basellaceae',
  },
};

const institutionalSourcePattern = /^(agrosavia|ica|sinchi)-/;

describe('catalog commercial species batch', () => {
  it('adds the requested commercial species with taxonomic identity', () => {
    for (const [id, expected] of Object.entries(expectedSpecies)) {
      const species = speciesById.get(id);

      expect(species, id).toBeDefined();
      expect(species.nombre_comun).toBe(expected.common);
      expect(species.nombre_cientifico).toBe(expected.scientific);
      expect(species.familia_botanica).toBe(expected.family);
      expect(species.valor_pedagogico.trim().length).toBeGreaterThanOrEqual(200);
      expect(species.validation_level).toBe('claude_draft');
    }
  });

  it('uses at least two Tier A institutional sources for each species', () => {
    for (const id of Object.keys(expectedSpecies)) {
      const species = speciesById.get(id);
      const institutionalSources = species.source_ids
        .map((sourceId) => sourcesById.get(sourceId))
        .filter((source) => source?.tier === 'A' && institutionalSourcePattern.test(source.id));

      expect(institutionalSources.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('documents phenology, pests and diseases for each new species', () => {
    for (const id of Object.keys(expectedSpecies)) {
      const species = speciesById.get(id);
      const phenologyText = `${species.propagation?.notas || ''} ${species.valor_pedagogico}`;
      const stages = (species.propagation?.notas || '')
        .replace(/^Fenologia:\s*/, '')
        .split(',')
        .map((stage) => stage.trim())
        .filter(Boolean);

      expect(phenologyText, `${id} Fenologia`).toContain('Fenologia:');
      expect(stages.length, id).toBeGreaterThanOrEqual(5);
      expect(species.plagas_criticas?.length, id).toBeGreaterThanOrEqual(2);
      expect(species.enfermedades_criticas?.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps compatible companions symmetric', () => {
    for (const id of Object.keys(expectedSpecies)) {
      const species = speciesById.get(id);

      for (const companionId of species.companions || []) {
        const companion = speciesById.get(companionId);
        expect(companion, `${id} -> ${companionId}`).toBeDefined();
        expect(companion.companions || [], `${companionId} -> ${id}`).toContain(id);
      }
    }
  });
});
